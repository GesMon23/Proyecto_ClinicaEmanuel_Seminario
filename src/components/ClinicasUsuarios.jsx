import React, { useEffect, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { CAMPO } from '@/constants/formularios';
import { cn } from '@/utils/cn';
import IconoClinica from './llamadoTurnos/IconoClinica';
import Cargando from './Cargando';
import {
  FUNCIONES, alternarClinica as conClinicaAlternada, cambiarModo as conModo, cargarClinicas, cargarUsuarios,
  eleccionDe, filtrarUsuarios, funcionVacia, guardarClinicas, ids, iguales, mensajeDeError,
} from './clinicasUsuarios/clinicas';

// Turnos > Clínicas por Usuario: en qué clínicas llama turnos cada usuario (pestaña Llamado) y para cuáles los
// crea, edita o cancela (pestaña Crear). Sin restricción, el usuario usa todas las clínicas.
// Las reglas y las llamadas al servidor están en clinicasUsuarios/clinicas.js.

const CASILLA = 'h-4 w-4 accent-green-700 cursor-pointer';

export default function ClinicasUsuarios() {
  const [clinicas, setClinicas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [eleccion, setEleccion] = useState(null); // { llamado: null | [ids], crear: null | [ids] }
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const usuario = usuarios.find((u) => u.id_usuario === seleccion) || null;
  const original = usuario ? eleccionDe(usuario) : null;
  const hayCambios = Boolean(usuario) && !iguales(eleccion, original);
  const nombreDe = (id) => clinicas.find((c) => Number(c.id_clinica) === id)?.descripcion || `#${id}`;
  const resumen = (lista) => (lista === null ? 'Todas' : lista.map(nombreDe).join(', '));

  useEffect(() => {
    Promise.all([cargarClinicas(), cargarUsuarios()])
      .then(([c, u]) => { setClinicas(c); setUsuarios(u); })
      .catch((e) => setAviso({ tipo: 'error', texto: mensajeDeError(e, 'No fue posible cargar los usuarios') }))
      .finally(() => setCargando(false));
  }, []);

  const elegir = (u) => {
    if (hayCambios && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
    setSeleccion(u.id_usuario);
    setEleccion(eleccionDe(u));
    setAviso(null);
  };

  const cambiarModo = (funcion, todas) => setEleccion((e) => conModo(e, funcion, todas, clinicas));
  const alternarClinica = (funcion, id) => setEleccion((e) => conClinicaAlternada(e, funcion, id));

  const guardar = async () => {
    const vacia = funcionVacia(eleccion);
    if (vacia) {
      setAviso({ tipo: 'error', texto: `${vacia.titulo}: marca al menos una clínica o elige "Todas las clínicas".` });
      return;
    }
    setGuardando(true);
    try {
      await guardarClinicas(seleccion, eleccion);
      const nuevos = await cargarUsuarios();
      setUsuarios(nuevos);
      const guardado = nuevos.find((u) => u.id_usuario === seleccion);
      if (guardado) setEleccion(eleccionDe(guardado));
      setAviso({ tipo: 'ok', texto: `Clínicas de ${usuario.nombre_usuario} guardadas. Se aplican en su siguiente acción.` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeDeError(e, 'No fue posible guardar las clínicas') });
    } finally {
      setGuardando(false);
    }
  };

  const visibles = filtrarUsuarios(usuarios, busqueda);

  return (
    <div className="w-full">
      <div className="w-full text-center mb-6">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <img src={logoClinica} alt="Logo Clínica" className="h-[140px] max-w-[280px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800" />
          <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">Clínicas por Usuario</h1>
        </div>
        <hr className="mt-4 border-gray-300 dark:border-gray-600" />
      </div>

      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Elige en qué clínicas puede <strong>llamar</strong> turnos cada usuario y para cuáles puede <strong>crearlos</strong>,
        editarlos o cancelarlos. Con <strong>Todas las clínicas</strong> el usuario no tiene restricción. Aquí aparecen los
        usuarios activos con la pestaña Llamado o Crear.
      </p>

      {aviso && (
        <div role={aviso.tipo === 'error' ? 'alert' : 'status'} className={cn('mb-4 p-3 rounded border',
          aviso.tipo === 'error'
            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300'
            : 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200')}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Usuarios */}
        <div className="flex flex-col gap-2">
          <input
            type="search"
            className={cn(CAMPO, 'mt-0')}
            placeholder="Buscar usuario o empleado"
            aria-label="Buscar usuario o empleado"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {cargando && <Cargando texto="Cargando usuarios..." />}
          {!cargando && visibles.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {usuarios.length === 0 ? 'Ningún usuario activo tiene las pestañas Llamado o Crear.' : 'Ningún usuario coincide con la búsqueda.'}
            </p>
          )}
          <div className="flex flex-col gap-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
            {visibles.map((u) => (
              <button
                key={u.id_usuario}
                type="button"
                aria-pressed={seleccion === u.id_usuario}
                onClick={() => elegir(u)}
                className={cn('text-left rounded-lg border p-3 transition-colors',
                  seleccion === u.id_usuario
                    ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-slate-800'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}
              >
                <span className="block font-semibold text-slate-800 dark:text-slate-100 break-all">{u.nombre_usuario}</span>
                {u.empleado && <span className="block text-sm text-slate-600 dark:text-slate-300">{u.empleado}</span>}
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {u.tiene_llamado && <>Llamado: {resumen(ids(u.clinicas_llamado))}</>}
                  {u.tiene_llamado && u.tiene_crear && <br />}
                  {u.tiene_crear && <>Crear: {resumen(ids(u.clinicas_crear))}</>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        {!usuario ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500 dark:text-slate-400">
            Elige un usuario para ver y cambiar sus clínicas.
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {usuario.nombre_usuario}
              {usuario.empleado && <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">{usuario.empleado}</span>}
            </h2>

            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {FUNCIONES.map((f) => {
                const lista = eleccion[f.clave];
                const nombreGrupo = `modo-${f.clave}`;
                return (
                  <fieldset key={f.clave} className="rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                    <legend className="px-1 font-semibold text-green-800 dark:text-green-300">{f.titulo}</legend>
                    {!usuario[f.tiene] && (
                      <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
                        Este usuario no tiene la pestaña {f.pestana}; esta elección se aplicará si se la asignan.
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input type="radio" className={CASILLA} name={nombreGrupo} checked={lista === null} onChange={() => cambiarModo(f.clave, true)} />
                        Todas las clínicas
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input type="radio" className={CASILLA} name={nombreGrupo} checked={lista !== null} onChange={() => cambiarModo(f.clave, false)} />
                        Solo estas clínicas:
                      </label>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 pl-6">
                      {clinicas.map((c) => {
                        const id = Number(c.id_clinica);
                        return (
                          <label key={id} className={cn('flex items-center gap-2', lista === null ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 cursor-pointer')}>
                            <input
                              type="checkbox"
                              className={CASILLA}
                              disabled={lista === null}
                              checked={lista === null || lista.includes(id)}
                              onChange={() => alternarClinica(f.clave, id)}
                            />
                            <IconoClinica nombre={c.descripcion} />
                            {c.descripcion}
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(lista) && lista.length === 0 && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">Marca al menos una clínica.</p>
                    )}
                  </fieldset>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className={BOTON_LIMPIAR} disabled={!hayCambios} onClick={() => setEleccion(original)}>Descartar cambios</button>
              <button type="button" className={BOTON_PRINCIPAL} disabled={!hayCambios || guardando} onClick={guardar}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
