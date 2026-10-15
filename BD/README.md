# BD

El esquema de la base de datos ya no se mantiene aquí: vive en **`backend/db/migraciones/`** y lo aplica
`backend/db/migrar.js` (el contenedor del backend lo corre al arrancar; en desarrollo: `cd backend && npm run migrar`).

- `001_esquema_inicial.sql`: el esquema reconstruido completo (antes `BD/esquema_reconstruido.sql`).
- `002_…`, `003_…`: cambios posteriores. **Una migración aplicada no se edita**: cada cambio va en un
  archivo nuevo con el siguiente número.
- `backend/db/semillas/`: datos solo para desarrollo (usuario de prueba). Nunca en producción; ahí el
  primer usuario se crea con `node db/crear-admin.js` (ver `docs/despliegue.md`).

## historico/

Scripts anteriores al sistema de migraciones, conservados como referencia. **No los ejecutes** sobre una
base actual: el esquema de la 001 ya incluye su contenido y varios (p. ej. `hotfix_llamado_turnos.sql`)
contienen versiones *anteriores* de procedimientos que revertirían cambios.
