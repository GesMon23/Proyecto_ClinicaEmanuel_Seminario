import React, { useEffect, useMemo, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';

const RolesUsuarios = () => {
  const [usuarioQuery, setUsuarioQuery] = useState('');
  const [user, setUser] = useState(null); // {id_usuario, nombre_usuario}
  const [rolesActivos, setRolesActivos] = useState([]); // [{id_rol, nombre}]
  const [rolesUsuario, setRolesUsuario] = useState([]); // ids
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [saving, setSaving] = useState(false);
  const [stateSaving, setStateSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { tipo: 'estado'|'roles', payload }
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const selectedSet = useMemo(() => new Set(rolesUsuario), [rolesUsuario]);

  const buscarUsuario = async () => {
    setMensaje('');
    setUser(null);
    setRolesUsuario([]);
    try {
      if (!usuarioQuery || usuarioQuery.length < 3) {
        setMensaje('Ingrese al menos 3 caracteres de usuario');
        return;
      }
      setLoading(true);
      const { data } = await api.get('/usuarios/by-usuario', { params: { usuario: usuarioQuery } });
      setUser(data);
      // Cargar roles activos y roles del usuario en paralelo
      const [rActivos, rUsuario] = await Promise.all([
        api.get('/roles/activos'),
        api.get(`/usuarios/${data.id_usuario}/roles`),
      ]);
      setRolesActivos(rActivos.data || []);
      setRolesUsuario((rUsuario.data || []).map(r => r.id_rol));
    } catch (e) {
      setMensaje(e?.response?.data?.error || e.message || 'No fue posible buscar');
    } finally {
      setLoading(false);
    }
  };

  const startConfirm = (tipo, payload) => {
    setConfirmPassword('');
    setConfirmError('');
    setConfirmAction({ tipo, payload });
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmPassword('');
    setConfirmError('');
  };

  const doConfirmed = async () => {
    if (!confirmAction) return;
    try {
      setConfirmError('');
      // confirmar contraseña del usuario autenticado
      await api.post('/auth/confirm-password', { password: confirmPassword });

      if (confirmAction.tipo === 'estado') {
        setStateSaving(true);
        const { id_usuario, target } = confirmAction.payload || {};
        await api.patch(`/usuarios/${id_usuario}/estado`, { estado: target });
        setUser(prev => ({ ...(prev || {}), estado: target }));
        setMensaje(target ? 'Usuario activado' : 'Usuario inactivado');
      } else if (confirmAction.tipo === 'roles') {
        setSaving(true);
        await api.put(`/usuarios/${user.id_usuario}/roles`, { roles: rolesUsuario });
        setMensaje('Roles actualizados correctamente');
      }
      closeConfirm();
    } catch (e) {
      setConfirmError(e?.response?.data?.error || e.message || 'Contraseña incorrecta o error al confirmar');
    } finally {
      setSaving(false);
      setStateSaving(false);
    }
  };

  const toggleRol = (id_rol) => {
    setRolesUsuario(prev => {
      const s = new Set(prev);
      if (s.has(id_rol)) s.delete(id_rol); else s.add(id_rol);
      return Array.from(s);
    });
  };

  const guardar = () => {
    if (!user?.id_usuario) return;
    setMensaje('');
    startConfirm('roles', {});
  };

  // Cargar roles activos al montar por facilidad (también se cargan tras buscar)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/roles/activos');
        setRolesActivos(data || []);
      } catch (_) {}
    })();
  }, []);

  return (
    <div className="w-full px-4 md:px-8">
      <div className="w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md mt-8 w-full">
          <div className="p-6 min-w-[280px]">
            {/* Encabezado */}
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                  Roles de Usuarios
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            {/* Buscador de usuario */}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Usuario</label>
                <input
                  type="text"
                  value={usuarioQuery}
                  onChange={(e) => setUsuarioQuery((e.target.value || '').slice(0, 8))}
                  maxLength={8}
                  placeholder="Ingrese usuario (ej: juanperez)"
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <button
                type="button"
                onClick={buscarUsuario}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {mensaje && (
              <div className="mt-4 p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {mensaje}
              </div>
            )}

            {/* Panel de roles */}
            {user && (
              <div className="mt-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-slate-700 dark:text-slate-200 flex items-center gap-3">
                    <span>
                      Usuario: <span className="font-semibold">{user.nombre_usuario}</span> (ID: {user.id_usuario})
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${user?.estado === false ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'}`}>
                      {user?.estado === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startConfirm('estado', { id_usuario: user.id_usuario, target: user?.estado === false ? true : false })}
                      disabled={stateSaving}
                      className={`px-3 py-2 rounded-md text-white disabled:opacity-50 ${user?.estado === false ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {stateSaving ? 'Aplicando...' : (user?.estado === false ? 'Activar' : 'Inactivar')}
                    </button>
                    <button
                      type="button"
                      onClick={guardar}
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {rolesActivos.map(r => (
                    <label
                      key={r.id_rol}
                      className="flex items-center gap-2 p-3 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(r.id_rol)}
                        onChange={() => toggleRol(r.id_rol)}
                      />
                      <span className="text-slate-800 dark:text-slate-100">{r.nombre}</span>
                    </label>
                  ))}
                  {rolesActivos.length === 0 && (
                    <div className="text-slate-500 dark:text-slate-400">No hay roles activos configurados.</div>
                  )}
                </div>
              </div>
            )}
            {/* Modal Confirmación */}
            {confirmAction && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirmar acción</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {confirmAction.tipo === 'estado' ? 'Confirma tu contraseña para cambiar el estado del usuario.' : 'Confirma tu contraseña para guardar los cambios de roles.'}
                  </p>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  {confirmError && (
                    <div className="mt-2 p-2 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                      {confirmError}
                    </div>
                  )}
                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={closeConfirm} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                    <button type="button" onClick={doConfirmed} className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800">Confirmar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesUsuarios;
