from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Permite solicitudes desde el frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de la base de datos
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="db_clinica",
        user="postgres",
        password="root",
        cursor_factory=RealDictCursor
    )
    return conn

@app.get("/pacientes/{paciente_id}")
async def get_paciente(paciente_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM tbl_pacientes WHERE noAfiliacion = %s;', (paciente_id,))
        paciente = cur.fetchone()
        cur.close()
        conn.close()
        if paciente:
            return paciente
        else:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/asignacionPacientes")
async def get_asignacionPacientes(noafiliacion: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            SELECT 
                pac.noAfiliacion,
                pac.primernombre || ' ' || pac.segundonombre || ' ' || pac.primerapellido || ' ' || pac.segundoapellido AS nombrePaciente,
                tur.idTurno,
                cli.descripcion AS nombreclinica,
                tur.FechaTurno
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala
            WHERE tur.idturnoestado = 2 AND pac.noAfiliacion = %s;
        ''', (noafiliacion,))
        asignacionPacientes = cur.fetchall()  # Usa fetchall para obtener una lista
        cur.close()
        conn.close()
        return asignacionPacientes  # Devuelve una lista vacía si no hay registros
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.put("/actualizar-estado-turno/{turno_id}")
async def actualizar_estado_turno(turno_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualiza el estado del turno
        cur.execute('''
            UPDATE tbl_Turnos
            SET idturnoestado = 4
            WHERE idTurno = %s;
        ''', (  turno_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": f"Estado del turno {turno_id} actualizado a 4"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/crear-turno")
async def crear_turno(turno: dict):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Insertar el nuevo turno en la tabla tbl_Turnos
        cur.execute('''
            INSERT INTO tbl_Turnos (idTurno, noAfiliacion, idclinica, FechaCreacion, FechaTurno, idturnoestado)
            VALUES (
                15,  -- idTurno (deberías generar un ID único)
                %s, -- noAfiliacion
                (SELECT idsala FROM tbl_Clinica WHERE descripcion = %s), -- idclinica
                %s, -- FechaCreacion (usamos la fecha actual)
                %s, -- FechaTurno
                1   -- idturnoestado (1: Asignado)
            );
        ''', (turno["noAfiliacion"], turno["clinica"], turno["fechaTurno"], turno["fechaTurno"]))

        conn.commit()
        cur.close()
        conn.close()

        return {"success": True, "message": "Turno creado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/turno-mas-antiguo/{clinica}")
async def get_turno_mas_antiguo_por_clinica(clinica: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener el turno más antiguo de la clínica seleccionada
        cur.execute('''
            SELECT 
                pac.noAfiliacion,
                pac.primernombre || ' ' || pac.segundonombre || ' ' || pac.primerapellido || ' ' || pac.segundoapellido AS nombrePaciente,
                tur.idTurno as idturno,
                tur.idTurnoEstado,
                cli.descripcion AS nombreclinica,
                tur.FechaTurno
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala
            WHERE tur.idturnoestado = 1   -- Estado "Asignado"
            AND cli.descripcion =  %s  -- Filtrar por la clínica seleccionada
           ORDER BY tur.FechaTurno ASC  -- Ordenar por fecha más antigua
            LIMIT 1; -- Obtener solo el primer registro
        ''', (clinica,))
        
        turno_mas_antiguo = cur.fetchone()  # Obtener el primer registro
        cur.close()
        conn.close()
        
        if turno_mas_antiguo:
            return turno_mas_antiguo
        else:
            raise HTTPException(status_code=404, detail="No hay turnos pendientes para esta clínica")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/actualizar-turno/{turno_id}")
async def actualizar_turno(turno_id: int, turno: dict):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Actualizar la fecha del turno
        cur.execute('''
            UPDATE tbl_Turnos
            SET FechaTurno = %s
            WHERE idTurno = %s;
        ''', (turno["fechaTurno"], turno_id))

        conn.commit()
        cur.close()
        conn.close()

        return {"success": True, "message": "Turno actualizado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/finalizar-turno/{turno_id}")
async def finalizar_turno(turno_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualiza el estado del turno a 4 (Finalizado manualmente)
        cur.execute('''
            UPDATE tbl_Turnos
            SET idturnoestado = 4
            WHERE idTurno = %s;
        ''', (turno_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": f"Turno {turno_id} finalizado manualmente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/abandonar-turno/{turno_id}")
async def abandonar_turno(turno_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualiza el estado del turno a 4 (Finalizado manualmente)
        cur.execute('''
            UPDATE tbl_Turnos
            SET idturnoestado = 5
            WHERE idTurno = %s;
        ''', (turno_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": f"Turno {turno_id} finalizado manualmente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/llamar-turno/{turno_id}")
async def llamar_turno(turno_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualiza el estado del turno a "Llamado" (por ejemplo, estado 3)
        cur.execute('''
            UPDATE tbl_Turnos
            SET idturnoestado = 3
            WHERE idTurno = %s;
        ''', (turno_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": f"Turno {turno_id} ha sido llamado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clinicas")
async def get_clinicas():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener todas las clínicas desde la tabla Tbl_clinica
        cur.execute('''
            SELECT idSala, descripcion FROM Tbl_clinica;
        ''')
        
        clinicas = cur.fetchall()  # Obtener todos los registros
        cur.close()
        conn.close()
        
        if clinicas:
            return [clinica["descripcion"] for clinica in clinicas]  # Devolver solo las descripciones
        else:
            raise HTTPException(status_code=404, detail="No hay clínicas registradas")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/asignar-turno/{turno_id}")
async def asignar_turno(turno_id: int):

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Actualiza el estado del turno a "Asignado" (por ejemplo, estado 2)
        cur.execute('''
            UPDATE tbl_Turnos
            SET idturnoestado = 1
            WHERE idTurno = %s;
        ''', (turno_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": "Turno asignado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/turnos-siguientes")
async def get_turnos_siguientes():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            SELECT 
                tur.idTurno as idTurno,
                pac.noAfiliacion as noAfiliacion,
                pac.primernombre || ' ' || pac.primerapellido as nombrePaciente,
                cli.idsala as idclinica,
                cli.descripcion as nombreclinica
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala where tur.idturnoestado = 1;
        ''')
        turnos = cur.fetchall()
        cur.close()
        conn.close()
        return turnos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/turnoLlamado")
async def get_turnoLlamado():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            SELECT 
                pac.primernombre || ' ' || pac.segundonombre || ' ' || pac.primerapellido || ' ' || pac.segundoapellido AS nombrePaciente,
                cli.descripcion AS nombreclinica
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala
            WHERE tur.idturnoestado = 3;
        ''')
        turnoLlamado = cur.fetchall()
        cur.close()
        conn.close()
        if turnoLlamado:
            return turnoLlamado[0]  # Devuelve solo el primer elemento
        else:
            raise HTTPException(status_code=404, detail="No hay turnos en estado 'Llamado'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)