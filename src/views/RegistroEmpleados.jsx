import React, { useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';

const RegistroEmpleados = () => {
  const [form, setForm] = useState({
    dpi: '',
    primer_nombre: '',
    segundo_nombre: '',
    otros_nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    apellido_casada: '',
    fecha_nacimiento: '',
    sexo: '',
    direccion: '',
    telefono: '',
    email: '',
    fecha_ingreso: '',
  });
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      // Normalizar por campo
      if (name === 'sexo') {
        if (value !== 'Femenino') {
          return { ...prev, sexo: value, apellido_casada: '' };
        }
        return { ...prev, sexo: value };
      }

      // Solo dígitos y límite de longitud para DPI y teléfono
      if (name === 'dpi') {
        const soloDigitos = (value || '').replace(/\D/g, '').slice(0, 13);
        return { ...prev, dpi: soloDigitos };
      }
      if (name === 'telefono') {
        const soloDigitos = (value || '').replace(/\D/g, '').slice(0, 8);
        return { ...prev, telefono: soloDigitos };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.dpi && form.dpi.length !== 13) {
      setError('El DPI debe tener exactamente 13 caracteres');
      return;
    }
    // Abrir modal para confirmar contraseña antes de guardar
    setConfirmPassword('');
    setConfirmError('');
    setShowConfirm(true);
  };

  const confirmAndSave = async () => {
    setConfirmError('');
    setSubmitting(true);
    try {
      // Obtener usuario autenticado desde el backend
      let usuario = '';
      try {
        const me = await api.get('/auth/me');
        usuario = me?.data?.nombre_usuario || String(me?.data?.id_usuario || '');
      } catch (e) {
        // Si falla (401), pedir re-login
        setConfirmError('Sesión expirada o inválida. Inicia sesión nuevamente.');
        setSubmitting(false);
        return;
      }
      if (!confirmPassword) {
        setConfirmError('Ingresa tu contraseña.');
        setSubmitting(false);
        return;
      }
      // 1) Validar contraseña
      await api.post('/auth/confirm-password', { usuario, password: confirmPassword });
      // 2) Guardar empleado
      await api.post('/empleados', { ...form, activo: true, usuario });
      // Éxito: cerrar confirm, limpiar y mostrar éxito
      setShowConfirm(false);
      setForm({
        dpi: '', primer_nombre: '', segundo_nombre: '', otros_nombres: '', primer_apellido: '', segundo_apellido: '', apellido_casada: '', fecha_nacimiento: '', sexo: '', direccion: '', telefono: '', email: '', fecha_ingreso: '',
      });
      setShowSuccess(true);
    } catch (err) {
      setConfirmError(err.message || 'Error al confirmar o guardar.');
    } finally {
      setSubmitting(false);
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
                  Registro de Empleados
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            {/* Contenido de la vista */}
            {error && (
              <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}
            <form className="w-full space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">DPI *</label>
                  <input
                    type="text"
                    name="dpi"
                    maxLength={13}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={form.dpi}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Primer Nombre *</label>
                  <input
                    type="text"
                    name="primer_nombre"
                    value={form.primer_nombre}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Segundo Nombre</label>
                  <input
                    type="text"
                    name="segundo_nombre"
                    value={form.segundo_nombre}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Otros Nombres</label>
                  <input
                    type="text"
                    name="otros_nombres"
                    value={form.otros_nombres}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Primer Apellido *</label>
                  <input
                    type="text"
                    name="primer_apellido"
                    value={form.primer_apellido}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Segundo Apellido</label>
                  <input
                    type="text"
                    name="segundo_apellido"
                    value={form.segundo_apellido}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Apellido Casada</label>
                  <input
                    type="text"
                    name="apellido_casada"
                    value={form.sexo === 'Femenino' ? form.apellido_casada : ''}
                    onChange={handleChange}
                    placeholder="Ingrese el apellido casada"
                    disabled={form.sexo !== 'Femenino'}
                    className={`w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      form.sexo === 'Femenino'
                        ? 'border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-slate-800 dark:text-white'
                        : 'bg-gray-200 cursor-not-allowed text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    value={form.fecha_nacimiento}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sexo *</label>
                  <select
                    name="sexo"
                    value={form.sexo}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="">Seleccione el género</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Dirección *</label>
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    rows={3}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono *</label>
                  <input
                    type="text"
                    name="telefono"
                    maxLength={8}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.telefono}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha de Ingreso *</label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={form.fecha_ingreso}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setForm({
                    dpi: '', primer_nombre: '', segundo_nombre: '', otros_nombres: '', primer_apellido: '', segundo_apellido: '', apellido_casada: '', fecha_nacimiento: '', sexo: '', direccion: '', telefono: '', email: '', fecha_ingreso: '',
                  })}
                  className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800"
                >
                  Guardar
                </button>
              </div>
            </form>
            {/* Modal de confirmación de contraseña */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Confirmar acción</h3>
                  <p className="text-slate-600 dark:text-slate-300">Por favor ingresa tu contraseña para confirmar el registro del empleado.</p>
                  <div className="mt-4">
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
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={confirmAndSave}
                      className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-60"
                    >
                      {submitting ? 'Guardando...' : 'Confirmar y Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Modal de éxito */}
            {showSuccess && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Registro exitoso</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">El empleado se ingresó de manera exitosa.</p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSuccess(false)}
                      className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800"
                    >
                      Aceptar
                    </button>
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

export default RegistroEmpleados;
