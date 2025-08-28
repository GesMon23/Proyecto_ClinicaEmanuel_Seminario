import React, { useEffect, useMemo, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';

const GestionEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // objeto empleado en edición
  const [showEdit, setShowEdit] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { tipo: 'editar'|'estado', payload: {...} }
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    const fetchEmpleados = async () => {
      setLoading(true);
      setError('');
      try {
        // Nota: endpoint pendiente en backend. Este GET intentará /empleados.
        // Si no existe, se manejará el error y se mostrará mensaje amigable.
        const res = await api.get('/empleados');
        setEmpleados(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.warn('API empleados no disponible aún:', e?.message || e);
        setError('Aún no hay un endpoint de listado de empleados disponible. Mostrando vista de ejemplo.');
        setEmpleados([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmpleados();
  }, []);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return empleados;
    return empleados.filter((e) => {
      const nombre = `${e.primer_nombre || ''} ${e.segundo_nombre || ''} ${e.otros_nombres || ''} ${e.primer_apellido || ''} ${e.segundo_apellido || ''}`.toLowerCase();
      return (
        String(e.dpi || '').toLowerCase().includes(term) ||
        nombre.includes(term) ||
        String(e.telefono || '').toLowerCase().includes(term) ||
        String(e.email || '').toLowerCase().includes(term)
      );
    });
  }, [empleados, q]);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await api.get('/empleados');
      setEmpleados(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('No se pudo refrescar empleados:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (emp) => {
    setEditing({ ...emp, _originalDpi: emp.dpi });
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditing(null);
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
    setConfirmError('');
    try {
      // 1) usuario actual
      const me = await api.get('/auth/me');
      const usuario = me?.data?.nombre_usuario || String(me?.data?.id_usuario || '');
      if (!usuario) throw new Error('Sesión inválida. Inicia sesión nuevamente.');
      if (!confirmPassword) {
        setConfirmError('Ingresa tu contraseña.');
        return;
      }
      // 2) confirmar contraseña
      await api.post('/auth/confirm-password', { usuario, password: confirmPassword });

      // 3) ejecutar acción
      if (confirmAction.tipo === 'estado') {
        const { dpi, activo } = confirmAction.payload;
        await api.patch(`/empleados/${encodeURIComponent(dpi)}/estado`, { activo });
        await refresh();
      } else if (confirmAction.tipo === 'editar') {
        const { dpi, data } = confirmAction.payload;
        await api.put(`/empleados/${encodeURIComponent(dpi)}`, data);
        await refresh();
        closeEdit();
      }
      closeConfirm();
    } catch (e) {
      setConfirmError(e.message || 'Error al confirmar la acción');
    }
  };

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
                  Gestión de Empleados
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            {/* Controles */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por DPI, nombre, teléfono o email"
                className="w-full md:max-w-md rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {filtrados.length} registro(s)
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                {error}
              </div>
            )}

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">DPI</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Teléfono</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Estado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-600 dark:text-slate-300">Cargando...</td>
                    </tr>
                  ) : filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-600 dark:text-slate-300">No hay empleados para mostrar.</td>
                    </tr>
                  ) : (
                    filtrados.map((e) => {
                      const nombre = `${e.primer_nombre || ''} ${e.segundo_nombre || ''} ${e.otros_nombres || ''} ${e.primer_apellido || ''} ${e.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim();
                      return (
                        <tr key={e.dpi} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{e.id_empleado}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{e.dpi}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{nombre || '—'}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{e.telefono || '—'}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{e.email || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.activo === false ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                              {e.activo === false ? 'Inactivo' : 'Activo'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                disabled={e.activo === false}
                                title={e.activo === false ? 'Empleado inactivo' : 'Editar empleado'}
                                className={`px-3 py-1.5 rounded-md border text-sm ${
                                  e.activo === false
                                    ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                onClick={() => e.activo !== false && openEdit(e)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-md bg-green-700 text-white hover:bg-green-800 text-sm"
                                onClick={() => startConfirm('estado', { dpi: e.dpi, activo: !e.activo })}
                              >
                                {e.activo === false ? 'Activar' : 'Inactivar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Nota */}
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Edición y activación/inactivación conectadas al backend.
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edición */}
      {showEdit && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Editar empleado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">ID Empleado</label>
                <input value={editing.id_empleado ?? ''} disabled className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">DPI</label>
                <input value={editing.dpi || ''} onChange={(e)=>setEditing(v=>({...v, dpi:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Primer Nombre</label>
                <input value={editing.primer_nombre || ''} onChange={(e)=>setEditing(v=>({...v, primer_nombre:e.target.value}))} className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Segundo Nombre</label>
                <input value={editing.segundo_nombre || ''} onChange={(e)=>setEditing(v=>({...v, segundo_nombre:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Otros Nombres</label>
                <input value={editing.otros_nombres || ''} onChange={(e)=>setEditing(v=>({...v, otros_nombres:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Primer Apellido</label>
                <input value={editing.primer_apellido || ''} onChange={(e)=>setEditing(v=>({...v, primer_apellido:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Segundo Apellido</label>
                <input value={editing.segundo_apellido || ''} onChange={(e)=>setEditing(v=>({...v, segundo_apellido:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Apellido Casada</label>
                <input value={editing.apellido_casada || ''} onChange={(e)=>setEditing(v=>({...v, apellido_casada:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha Ingreso</label>
                <input type="date" value={editing.fecha_ingreso || ''} onChange={(e)=>setEditing(v=>({...v, fecha_ingreso:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Dirección</label>
                <textarea value={editing.direccion || ''} onChange={(e)=>setEditing(v=>({...v, direccion:e.target.value}))} rows={2} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono</label>
                <input value={editing.telefono || ''} onChange={(e)=>setEditing(v=>({...v, telefono:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                <input type="email" value={editing.email || ''} onChange={(e)=>setEditing(v=>({...v, email:e.target.value}))} className="mt-1 w-full rounded-md border" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={closeEdit} className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
              <button
                type="button"
                disabled={editSubmitting}
                onClick={() => startConfirm('editar', { dpi: editing._originalDpi || editing.dpi, data: {
                  dpi: editing.dpi,
                  primer_nombre: editing.primer_nombre,
                  segundo_nombre: editing.segundo_nombre,
                  otros_nombres: editing.otros_nombres,
                  primer_apellido: editing.primer_apellido,
                  segundo_apellido: editing.segundo_apellido,
                  apellido_casada: editing.apellido_casada,
                  fecha_ingreso: editing.fecha_ingreso,
                  direccion: editing.direccion,
                  telefono: editing.telefono,
                  email: editing.email,
                } })}
                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirmar acción</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {confirmAction.tipo === 'estado' ? 'Confirma tu contraseña para cambiar el estado del empleado.' : 'Confirma tu contraseña para guardar los cambios.'}
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
  );
};

export default GestionEmpleados;
