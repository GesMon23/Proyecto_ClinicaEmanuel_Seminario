# Despliegue

El sistema corre con `docker compose` en cuatro contenedores: PostgreSQL (`db`), API (`backend`),
frontend con nginx (`frontend`) y, en los servidores, Caddy (`caddy`) para HTTPS. El mismo
`docker-compose.yml` sirve para todos los entornos; cada uno tiene su propio `.env` (plantilla: `.env.example`).

```
Internet ──443──> caddy ──> frontend (nginx: SPA + /api) ──> backend :3001 ──> db :5432
                                                               │
                                                     volúmenes: fotos, tmp       volumen: pgdata
```

| Entorno        | Dominio                       | Imágenes                     | Datos                         |
|----------------|-------------------------------|------------------------------|-------------------------------|
| Local          | http://localhost:8080         | se construyen (`--build`)    | de prueba                     |
| Preproducción  | https://pre.clinicaemanuel.com.gt | `ETIQUETA=<sha>` del CI  | copia **anonimizada**         |
| Producción     | https://clinicaemanuel.com.gt | la misma `<sha>` ya probada  | reales, con respaldo diario   |

## Probar en local

Requiere Docker Desktop.

```bash
cp .env.example .env        # completar PGPASSWORD y JWT_SECRET
docker compose up --build   # http://localhost:8080
docker compose exec -e ADMIN_USUARIO=admin -e ADMIN_CONTRASENIA='Temporal#2026' backend node db/crear-admin.js
```

## Cómo se publica una versión

1. Cada push a `main` corre el CI (`.github/workflows/main.yml`): lint, build, migraciones sobre una base
   nueva y todas las pruebas. Si pasa, publica `ghcr.io/gesmon23/proyecto_clinicaemanuel_seminario/{backend,frontend}`
   con dos etiquetas: el SHA del commit y `main`.
2. **Preproducción:** en el servidor, poner `ETIQUETA=<sha>` en `.env` y:
   ```bash
   docker compose --profile tls pull
   docker compose --profile tls up -d
   curl -fsS https://pre.clinicaemanuel.com.gt/api/health
   ```
3. **Producción:** lo mismo con **la misma etiqueta** que se probó en preproducción. Nunca se construye
   en el servidor.
4. **Volver atrás:** poner la etiqueta anterior y repetir `pull` + `up -d`. Ojo: las migraciones no se
   deshacen solas; si la versión nueva aplicó una, revisar que la anterior siga funcionando con ella.

## Base de datos

- **Migraciones** (`backend/db/migraciones/NNN_nombre.sql`): el backend las aplica al arrancar, cada una
  en su transacción, registradas en `schema_migraciones`. Si una falla, el backend no arranca y la versión
  anterior sigue intacta. Para cambiar el esquema se agrega un archivo nuevo; nunca se edita uno aplicado
  (el runner lo detecta por hash y se detiene).
- **Primer usuario** de un entorno nuevo: `crear-admin.js` (arriba). Queda con todos los roles y debe
  cambiar la contraseña al ingresar. `backend/db/semillas/` es solo para desarrollo.
- **Respaldo** (producción, diario, guardado fuera del servidor):
  ```bash
  docker compose exec -T db pg_dump -U "$PGUSER" -Fc "$PGDATABASE" > respaldo_$(date +%F).dump
  docker run --rm -v <proyecto>_fotos:/fotos -v "$PWD":/out alpine tar czf /out/fotos_$(date +%F).tgz -C /fotos .
  ```
  Restaurar uno de prueba al menos una vez (por ejemplo en preproducción, después de anonimizarlo).

## Variables importantes

| Variable | Notas |
|---|---|
| `JWT_SECRET` | Obligatoria y distinta por entorno; el backend no arranca sin ella. |
| `PGDATABASE`, `PGUSER`, `PGPASSWORD` | Crean la base en el primer arranque del contenedor `db`. |
| `DOMINIO` | Caddy obtiene y renueva el certificado de este dominio (el DNS debe apuntar al servidor). |
| `PUERTO_HTTP` | En servidores `127.0.0.1:8080`, para que solo Caddy exponga 80/443. |
| `CORS_ORIGENES` | Solo si otro dominio consume la API; el propio dominio siempre se acepta. |
| `ETIQUETA` | SHA publicado por el CI. |

## Restricciones de la aplicación

- **Una sola réplica del backend por entorno**: la tarea que marca turnos faltantes y los eventos de la
  pantalla de TV viven en memoria del proceso.
- Las fotos se guardan en el volumen `fotos`: respaldarlo junto con la base.

## Pasar del servidor actual a este esquema

El servidor actual corre los contenedores a mano, con PostgreSQL instalado en el host y las fotos
**dentro del contenedor `seminario-backend`** (se pierden si se elimina). Antes de cambiar nada:

```bash
# 1. Sacar las fotos (verificar antes la ruta con: docker exec seminario-backend ls /app)
docker cp seminario-backend:/app/fotos ./fotos-respaldo
# 2. Respaldar la base del host
pg_dump -h 127.0.0.1 -U <usuario> -Fc <base> > migracion.dump
```

Después, **en este orden** (si el backend arranca antes, las migraciones crean un esquema vacío y la
restauración choca con él):

```bash
docker compose up -d db                                           # 3. solo la base
docker compose exec -T db pg_restore -U "$PGUSER" -d "$PGDATABASE" --no-owner < migracion.dump
docker compose run --rm --no-deps -v "$PWD/fotos-respaldo":/origen backend sh -c 'cp -r /origen/. /app/fotos/'
docker compose --profile tls up -d                                # 4. el resto
```

Como la base restaurada ya tiene tablas, la migración 001 se registra como línea base y solo se aplican
las siguientes. Ensayarlo completo primero en preproducción.
