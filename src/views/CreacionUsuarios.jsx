import React, { useEffect, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';

const CreacionUsuarios = () => {
  const [form, setForm] = useState({
    usuario: '',
    id_empleado: '',
  });
  const [empleados, setEmpleados] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usuarioMsg, setUsuarioMsg] = useState('Se genera de nombres y apellidos. Solo letras, 8 caracteres.');
  const [usuarioMsgIsError, setUsuarioMsgIsError] = useState(false);
  const [usuarioDisponible, setUsuarioDisponible] = useState(false);
  // Confirmación de acción
  const [confirmAction, setConfirmAction] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  // Modal de éxito
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Helpers para generar usuario de 8 letras
  const quitarAcentos = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const soloLetras = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  const generarUsuario8 = (emp) => {
    const partes = [
      emp?.primer_nombre,
      emp?.segundo_nombre,
      emp?.otros_nombres,
      emp?.primer_apellido,
      emp?.segundo_apellido,
      emp?.apellido_casada,
    ].filter(Boolean);
    // Priorizar primer nombre + primer apellido, luego añadir más
    let base = `${emp?.primer_nombre || ''}${emp?.primer_apellido || ''}${(emp?.segundo_nombre || '') + (emp?.segundo_apellido || '') + (emp?.apellido_casada || '')}`;
    base = soloLetras(quitarAcentos(base));
    if (base.length < 8) {
      // Si aún es corto, concatenar todas las partes
      base = soloLetras(quitarAcentos(partes.join('')));
    }
    base = base.slice(0, 8);
    if (base.length < 8) base = (base + 'xxxxxxxx').slice(0, 8);
    return base;
  };

  // Valida disponibilidad del usuario y actualiza mensajes/estado
  const validarUsuario = async (u) => {
    try {
      if (!u || u.length !== 8) {
        setUsuarioDisponible(false);
        setUsuarioMsg('Se genera de nombres y apellidos. Solo letras, 8 caracteres.');
        setUsuarioMsgIsError(false);
        return;
      }
      const { data } = await api.get('/usuarios/existe', { params: { usuario: u } });
      if (data?.existe) {
        setUsuarioMsg('El nombre de usuario ya existe. Por favor elige otro.');
        setUsuarioMsgIsError(true);
        setUsuarioDisponible(false);
      } else {
        setUsuarioMsg('Disponible.');
        setUsuarioMsgIsError(false);
        setUsuarioDisponible(true);
      }
    } catch (e) {
      console.error('No se pudo validar el usuario:', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [empRes, rolesRes] = await Promise.all([
          api.get('/empleados/sin-usuario'),
          api.get('/roles/activos'),
        ]);
        setEmpleados(Array.isArray(empRes.data) ? empRes.data : []);
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      } catch (e) {
        setError(e.message || 'No se pudieron cargar datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((v) => {
      let nuevoValor = value;
      // En usuario, permitir solo letras y máximo 8 caracteres
      if (name === 'usuario') {
        nuevoValor = soloLetras(nuevoValor).slice(0, 8);
      }
      const next = { ...v, [name]: nuevoValor };
      if (name === 'id_empleado') {
        const emp = empleados.find((x) => String(x.id_empleado) === String(value));
        if (emp) {
          const sugerido = generarUsuario8(emp);
          // Solo autocompletar si el usuario está vacío para no sobrescribir manualmente
          if (!v.usuario) {
            next.usuario = sugerido;
            // validar disponibilidad después de actualizar el estado
            Promise.resolve().then(() => validarUsuario(sugerido));
          }
        }
      }
      if (name === 'usuario') {
        setUsuarioMsg('Se genera de nombres y apellidos. Solo letras, 8 caracteres.');
        setUsuarioMsgIsError(false);
        setUsuarioDisponible(false);
      }
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Abrir modal de confirmación
    setConfirmPassword('');
    setConfirmError('');
    setConfirmAction(true);
  };

  const closeConfirm = () => {
    setConfirmAction(false);
    setConfirmPassword('');
    setConfirmError('');
  };

  const doConfirmed = async () => {
    try {
      setConfirmError('');
      // 1) usuario actual
      const me = await api.get('/auth/me');
      const usuarioActual = me?.data?.nombre_usuario || String(me?.data?.id_usuario || '');
      if (!usuarioActual) throw new Error('Sesión inválida. Inicia sesión nuevamente.');
      if (!confirmPassword) {
        setConfirmError('Ingresa tu contraseña.');
        return;
      }
      // 2) confirmar contraseña
      await api.post('/auth/confirm-password', { usuario: usuarioActual, password: confirmPassword });

      // 3) ejecutar creación
      setLoading(true);
      setError('');
      const payload = {
        usuario: form.usuario,
        id_empleado: form.id_empleado,
        roles: form.roles || [],
      };
      await api.post('/usuarios', payload);
      // Éxito
      closeConfirm();
      setForm({ usuario: '', id_empleado: '', roles: [] });
      setUsuarioDisponible(false);
      setUsuarioMsg('Se genera de nombres y apellidos. Solo letras, 8 caracteres.');
      setUsuarioMsgIsError(false);
      try {
        const [empRes, rolesRes] = await Promise.all([
          api.get('/empleados/sin-usuario'),
          api.get('/roles/activos'),
        ]);
        setEmpleados(Array.isArray(empRes.data) ? empRes.data : []);
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      } catch (re) {
        console.error('No se pudo refrescar listas:', re);
      }
      setSuccessMsg('Usuario creado correctamente');
      setSuccessOpen(true);
    } catch (e) {
      setConfirmError(e.message || 'Error al confirmar la acción');
    } finally {
      setLoading(false);
    }
  };

  const toggleRol = (id_rol) => {
    setForm((v) => {
      const actual = new Set(v.roles || []);
      if (actual.has(id_rol)) actual.delete(id_rol); else actual.add(id_rol);
      return { ...v, roles: Array.from(actual) };
    });
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
                  Creación de Usuarios
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Empleado</label>
            <select
              name="id_empleado"
              value={form.id_empleado}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
            >
              <option value="">{loading ? 'Cargando...' : 'Seleccione un empleado'}</option>
              {empleados.map((e) => (
                <option key={e.id_empleado} value={e.id_empleado}>
                  {`${e.id_empleado} - ${e.nombre_completo || ''} (DPI: ${e.dpi})`}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Usuario</label>
            <div className="mt-1 flex gap-2">
              <input
                name="usuario"
                value={form.usuario}
                onChange={onChange}
                onBlur={async () => { await validarUsuario(form.usuario); }}
                placeholder="8 letras (auto)"
                maxLength={8}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              />
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={async () => {
                  const emp = empleados.find((x) => String(x.id_empleado) === String(form.id_empleado));
                  if (emp) {
                    const sugerido = generarUsuario8(emp);
                    setForm((v) => ({ ...v, usuario: sugerido }));
                    await validarUsuario(sugerido);
                  }
                }}
                title="Generar usuario sugerido"
              >
                Generar
              </button>
            </div>
            <p className={`text-xs mt-1 ${usuarioMsgIsError ? 'text-red-600' : 'text-slate-500'}`}>{usuarioMsg}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Roles</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roles.map((r) => (
                <label key={r.id_rol} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={(form.roles || []).includes(r.id_rol)}
                    onChange={() => toggleRol(r.id_rol)}
                  />
                  <span className="font-medium">{r.nombre}</span>
                  {r.descripcion && <span className="text-sm text-slate-500">- {r.descripcion}</span>}
                </label>
              ))}
              {roles.length === 0 && !loading && (
                <span className="text-sm text-slate-500">No hay roles activos</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button type="reset" className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Limpiar</button>
            <button
              type="submit"
              disabled={loading || !/^[a-z]{8}$/.test(form.usuario) || !usuarioDisponible}
              className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </div>
      {/* Modal Confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirmar acción</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Confirma tu contraseña para crear el usuario.</p>
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
      {/* Modal Éxito */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Operación exitosa</h3>
            <p className="text-slate-600 dark:text-slate-300">{successMsg || 'Usuario creado correctamente.'}</p>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setSuccessOpen(false)} className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800">Aceptar</button>
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

export default CreacionUsuarios;
