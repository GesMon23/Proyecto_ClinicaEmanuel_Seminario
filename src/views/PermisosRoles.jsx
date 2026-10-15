import React, { useEffect, useMemo, useRef, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';
import { useAuth } from '@/contexts/auth-context';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { CAMPO, ETIQUETA } from '@/constants/formularios';
import { cn } from '@/utils/cn';
import Cargando from '@/components/Cargando';

// Gestión de Usuarios > Permisos de Roles: cada rol es un grupo de pestañas. Un usuario ve una pestaña si alguno
// de sus roles activos la tiene. El backend aplica los cambios en la siguiente petición de cada usuario.

const NUEVO = 'nuevo';
const VACIO = { nombre: '', descripcion: '', estado: true, permisos: [] };
const CASILLA = 'h-4 w-4 accent-green-700 cursor-pointer';

const mensajeDeError = (e, porDefecto) => e?.response?.data?.error || porDefecto;
const mismoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Casilla de un módulo: marcada si tiene todas sus pestañas, a medias si tiene algunas
function CasillaModulo({ marcadas, total, onCambio, etiqueta }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = marcadas > 0 && marcadas < total; }, [marcadas, total]);
  return (
    <label className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-300 cursor-pointer">
      <input ref={ref} type="checkbox" className={CASILLA} checked={marcadas === total} onChange={onCambio} />
      {etiqueta}
      <span className="ml-auto text-xs font-normal text-slate-500 dark:text-slate-400">{marcadas}/{total}</span>
    </label>
  );
}

export default function PermisosRoles() {
  const { recargar } = useAuth() || {};
  const [catalogo, setCatalogo] = useState([]);
  const [roles, setRoles] = useState([]);
  const [seleccion, setSeleccion] = useState(null); // id_rol, NUEVO o null
  const [form, setForm] = useState(VACIO);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [password, setPassword] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const rolActual = roles.find((r) => r.id_rol === seleccion) || null;
  const original = seleccion === NUEVO ? VACIO : rolActual
    ? { nombre: rolActual.nombre, descripcion: rolActual.descripcion || '', estado: rolActual.estado, permisos: rolActual.permisos }
    : null;
  const hayCambios = Boolean(original) && (
    form.nombre !== original.nombre || form.descripcion !== original.descripcion
    || form.estado !== original.estado || !mismoConjunto(form.permisos, original.permisos));

  // Pestañas agrupadas por módulo, en el orden del catálogo
  const modulos = useMemo(() => {
    const grupos = new Map();
    catalogo.forEach((p) => { if (!grupos.has(p.modulo)) grupos.set(p.modulo, []); grupos.get(p.modulo).push(p); });
    return [...grupos.entries()];
  }, [catalogo]);

  const cargar = async () => {
    const [c, r] = await Promise.all([api.get('/permisos'), api.get('/roles')]);
    setCatalogo(c.data || []);
    setRoles(r.data || []);
    return r.data || [];
  };

  useEffect(() => {
    cargar()
      .catch((e) => setAviso({ tipo: 'error', texto: mensajeDeError(e, 'No fue posible cargar los roles') }))
      .finally(() => setCargando(false));
  }, []);

  const elegir = (id) => {
    if (hayCambios && !window.confirm('Hay cambios sin guardar en este rol. ¿Descartarlos?')) return;
    const rol = roles.find((r) => r.id_rol === id);
    setSeleccion(id);
    setAviso(null);
    setForm(rol ? { nombre: rol.nombre, descripcion: rol.descripcion || '', estado: rol.estado, permisos: rol.permisos } : VACIO);
  };

  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const alternar = (codigo) => setForm((f) => ({
    ...f, permisos: f.permisos.includes(codigo) ? f.permisos.filter((p) => p !== codigo) : [...f.permisos, codigo],
  }));
  const alternarModulo = (pestanas) => setForm((f) => {
    const codigos = pestanas.map((p) => p.codigo);
    const todas = codigos.every((c) => f.permisos.includes(c));
    return { ...f, permisos: todas ? f.permisos.filter((p) => !codigos.includes(p)) : [...new Set([...f.permisos, ...codigos])] };
  });

  const pedirConfirmacion = () => {
    if (form.nombre.trim().length < 3) {
      setAviso({ tipo: 'error', texto: 'El nombre del rol debe tener al menos 3 caracteres.' });
      return;
    }
    setPassword('');
    setErrorConfirmar('');
    setConfirmando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorConfirmar('');
    try {
      await api.post('/auth/confirm-password', { password });
    } catch (e) {
      setErrorConfirmar(mensajeDeError(e, 'Contraseña incorrecta'));
      setGuardando(false);
      return;
    }
    try {
      const cuerpo = { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() };
      let id = seleccion;
      if (seleccion === NUEVO) id = (await api.post('/roles', cuerpo)).data.id_rol;
      else await api.put(`/roles/${seleccion}`, cuerpo);
      setConfirmando(false);
      const nuevos = await cargar();
      const guardado = nuevos.find((r) => r.id_rol === id);
      setSeleccion(id);
      if (guardado) setForm({ nombre: guardado.nombre, descripcion: guardado.descripcion || '', estado: guardado.estado, permisos: guardado.permisos });
      setAviso({ tipo: 'ok', texto: seleccion === NUEVO ? 'Rol creado. Ya puedes asignarlo en la pestaña Roles.' : 'Rol guardado.' });
      // Si el rol es uno de los propios, el menú y las pestañas se actualizan sin volver a entrar
      if (typeof recargar === 'function') recargar().catch(() => {});
    } catch (e) {
      setConfirmando(false);
      setAviso({ tipo: 'error', texto: mensajeDeError(e, 'No fue posible guardar el rol') });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full px-4 md:px-8">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md mt-8 w-full">
        <div className="p-6 min-w-[280px]">
          <div className="w-full text-center mb-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <img src={logoClinica} alt="Logo Clínica" className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800" />
              <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">Permisos de Roles</span>
            </div>
            <hr className="mt-4 border-gray-300 dark:border-gray-600" />
          </div>

          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
            Cada rol es un grupo de pestañas. Un usuario ve una pestaña si alguno de sus roles activos la tiene;
            los cambios se aplican a sus usuarios de inmediato. Para que alguien vea solo una pestaña, crea un rol con
            esa pestaña y asígnaselo en <strong>Roles</strong>.
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

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Roles */}
            <div className="flex flex-col gap-2">
              <button type="button" className={cn(BOTON_PRINCIPAL, 'w-full')} onClick={() => elegir(NUEVO)}>+ Nuevo rol</button>
              {cargando && <Cargando texto="Cargando roles..." />}
              {roles.map((r) => (
                <button
                  key={r.id_rol}
                  type="button"
                  aria-pressed={seleccion === r.id_rol}
                  onClick={() => elegir(r.id_rol)}
                  className={cn('text-left rounded-lg border p-3 transition-colors',
                    seleccion === r.id_rol
                      ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 break-all">{r.nombre}</span>
                    {!r.estado && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">Inactivo</span>}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {r.permisos.length} {r.permisos.length === 1 ? 'pestaña' : 'pestañas'} · {r.usuarios} {r.usuarios === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </button>
              ))}
            </div>

            {/* Editor */}
            {!seleccion ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500 dark:text-slate-400">
                Elige un rol para ver y cambiar sus pestañas, o crea uno nuevo.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={ETIQUETA} htmlFor="rol-nombre">Nombre del rol</label>
                    <input id="rol-nombre" className={CAMPO} maxLength={60} value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} placeholder="Ej.: Llamado de turnos" />
                  </div>
                  <div>
                    <label className={ETIQUETA} htmlFor="rol-descripcion">Descripción</label>
                    <input id="rol-descripcion" className={CAMPO} maxLength={200} value={form.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} placeholder="Para qué sirve este rol" />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer w-fit">
                  <input type="checkbox" className={CASILLA} checked={form.estado} onChange={(e) => cambiar('estado', e.target.checked)} />
                  Rol activo
                </label>
                {!form.estado && rolActual?.usuarios > 0 && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    {rolActual.usuarios} {rolActual.usuarios === 1 ? 'usuario dejará' : 'usuarios dejarán'} de tener estas pestañas mientras el rol esté inactivo.
                  </p>
                )}

                <h3 className="mt-6 mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Pestañas <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({form.permisos.length} de {catalogo.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {modulos.map(([modulo, pestanas]) => (
                    <fieldset key={modulo} className="rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                      <legend className="sr-only">{modulo}</legend>
                      <CasillaModulo
                        etiqueta={modulo}
                        total={pestanas.length}
                        marcadas={pestanas.filter((p) => form.permisos.includes(p.codigo)).length}
                        onCambio={() => alternarModulo(pestanas)}
                      />
                      <div className="mt-3 flex flex-col gap-2 pl-6">
                        {pestanas.map((p) => (
                          <label key={p.codigo} className="flex items-start gap-2 text-slate-700 dark:text-slate-200 cursor-pointer" title={p.descripcion || ''}>
                            <input type="checkbox" className={cn(CASILLA, 'mt-1')} checked={form.permisos.includes(p.codigo)} onChange={() => alternar(p.codigo)} />
                            <span>{p.pestana}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" className={BOTON_LIMPIAR} disabled={!hayCambios} onClick={() => setForm(original)}>Descartar cambios</button>
                  <button type="button" className={BOTON_PRINCIPAL} disabled={!hayCambios || guardando} onClick={pedirConfirmacion}>
                    {seleccion === NUEVO ? 'Crear rol' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {confirmando && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div role="dialog" aria-modal="true" aria-labelledby="confirmar-rol" className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 id="confirmar-rol" className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirmar cambios</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Confirma tu contraseña para {seleccion === NUEVO ? 'crear el rol' : 'guardar los cambios del rol'} <strong>{form.nombre.trim()}</strong>.
                </p>
                <label className={ETIQUETA} htmlFor="rol-password">Contraseña</label>
                <input
                  id="rol-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && password) guardar(); }}
                  className={CAMPO}
                />
                {errorConfirmar && (
                  <div className="mt-2 p-2 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                    {errorConfirmar}
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setConfirmando(false)} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                  <button type="button" onClick={guardar} disabled={!password || guardando} className={BOTON_PRINCIPAL}>
                    {guardando ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
