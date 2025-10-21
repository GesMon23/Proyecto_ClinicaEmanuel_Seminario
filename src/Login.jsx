import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logoClinica from "@/assets/logoClinica2.png"
import Background from "@/assets/backgroundLogin.png";
import { useNavigate } from "react-router-dom";
import api from '@/config/api';
import { useAuth } from '@/contexts/auth-context';

const LoginComponent = () => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  // Cambio de contraseña forzado
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth() || {};
  // Recuperación de contraseña
  const [showForgot, setShowForgot] = useState(false);
  const [fpDpi, setFpDpi] = useState('');
  const [fpNombres, setFpNombres] = useState('');
  const [fpApellidos, setFpApellidos] = useState('');
  const [fpTelefono, setFpTelefono] = useState('');
  const [fpUsuario, setFpUsuario] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  // Consultar usuarios activos al montar el componente
  useEffect(() => {
    // Podrías limpiar mensajes al cargar
    setMensaje("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (/[A-Z]/.test(usuario)) {
      setMensaje("Todos los caracteres del usuario deben ir en minúsculas");
      return;
    }
    try {
      const { data } = await api.post('/auth/login', { usuario, password });
      // Guardar sesión siempre para poder autorizar /auth/change-password si aplica
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (typeof login === 'function') login(data.token, data.user);
      if (data.mustChangePassword) {
        // Abrir modal de cambio, usando la contraseña actual ingresada
        setShowChangePwd(true);
      } else {
        navigate('/layout/dashboard');
      }
    } catch (err) {
      setMensaje(err?.response?.data?.error || 'No fue posible iniciar sesión');
    }
  };

  const doChangePassword = async () => {
    try {
      setChangeError('');
      if (!newPwd || newPwd.length < 8) {
        setChangeError('La nueva contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (newPwd !== newPwd2) {
        setChangeError('Las contraseñas no coinciden');
        return;
      }
      setChangeLoading(true);
      // Usamos la contraseña actual que el usuario ingresó en el login
      const token = localStorage.getItem('token');
      await api.post('/auth/change-password', { actual: password, nueva: newPwd }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      // Cerrar modal y navegar al dashboard
      setShowChangePwd(false);
      setNewPwd('');
      setNewPwd2('');
      navigate('/layout/dashboard');
    } catch (e) {
      setChangeError(e?.response?.data?.error || e.message || 'No fue posible cambiar la contraseña');
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="flex justify-center h-screen" style={{ background: "#edf2f7" }}>
        <div
          className="hidden bg-cover bg-black bg-opacity-50 lg:block lg:w-2/3"
          style={{
            backgroundImage:
              "url(" + Background + ")",
          }}
        >
          <div className="flex items-center h-full px-20 bg-gray-900 bg-opacity-40">
            <div>
              <h2 className="text-4xl font-bold text-white">Clínica Renal Emanuel</h2>
              <p className="max-w-xl mt-3 text-gray-300">
                Inserte frase motivadora o de identidad de la empresa
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-2/6">
          <div className="flex-1">
            <div className="text-center">
              <img src={logoClinica} alt="" className="text-4xl font-bold text-center text-gray-700 dark:text-white"></img>
            </div>
            <div className="mt-8">
              <form onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="usuario" className="block mb-2 text-sm text-gray-600 dark:text-gray-200">
                    Usuario
                  </label>
                  <input
                    type="text"
                    name="usuario"
                    id="usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    maxLength={8}
                    className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-md dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
                  />
                </div>
                <div className="mt-6">
                  <div className="flex justify-between mb-2">
                    <label htmlFor="password" className="text-sm text-gray-600 dark:text-gray-200">
                      Contraseña
                    </label>
                  </div>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-md dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
                  />
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-green-800 rounded-md hover:bg-green-700 focus:outline-none focus:bg-green-600 focus:ring focus:ring-green-500 focus:ring-opacity-50"
                  >
                    Iniciar Sesión
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setFpError(''); setFpMsg(''); setFpDpi(''); setFpNombres(''); setFpApellidos(''); setFpTelefono(''); setFpUsuario(''); }}
                    className="text-sm text-green-800 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                {mensaje && (
                  <div className="mt-4 text-center text-red-600 font-bold">{mensaje}</div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Modal Cambio de Contraseña */}
      {showChangePwd && createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="relative z-[10000] bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Cambiar contraseña</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Debes cambiar tu contraseña genérica antes de continuar.</p>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nueva contraseña</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            {changeError && (
              <div className="mt-2 p-2 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                {changeError}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={changeLoading}
                onClick={() => { setShowChangePwd(false); setNewPwd(''); setNewPwd2(''); }}
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={changeLoading}
                onClick={doChangePassword}
                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {changeLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
      {/* Modal Recuperación de Contraseña */}
      {showForgot && createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="relative z-[10000] bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Recuperar contraseña</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Completa tus datos para validar tu identidad.</p>

            {fpMsg && (
              <div className="mb-3 p-2 rounded border border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                {fpMsg}
              </div>
            )}
            {fpError && (
              <div className="mb-3 p-2 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                {fpError}
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">DPI</label>
            <input
              type="text"
              value={fpDpi}
              onChange={(e) => setFpDpi((e.target.value || '').replace(/\D+/g, '').slice(0, 13))}
              inputMode="numeric"
              maxLength={13}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Nombres</label>
            <input
              type="text"
              value={fpNombres}
              onChange={(e) => setFpNombres(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Apellidos</label>
            <input
              type="text"
              value={fpApellidos}
              onChange={(e) => setFpApellidos(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Teléfono</label>
            <input
              type="text"
              value={fpTelefono}
              onChange={(e) => setFpTelefono((e.target.value || '').replace(/\D+/g, '').slice(0, 8))}
              inputMode="numeric"
              maxLength={8}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Nombre de usuario</label>
            <input
              type="text"
              value={fpUsuario}
              onChange={(e) => setFpUsuario((e.target.value || '').slice(0, 32))}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={fpLoading}
                onClick={() => { setShowForgot(false); setFpError(''); setFpMsg(''); setFpDpi(''); setFpNombres(''); setFpApellidos(''); setFpTelefono(''); setFpUsuario(''); }}
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={fpLoading}
                onClick={async () => {
                  try {
                    setFpError(''); setFpMsg('');
                    if (!fpDpi || fpDpi.length !== 13) { setFpError('DPI debe tener 13 dígitos'); return; }
                    if (!fpNombres || !fpApellidos) { setFpError('Nombres y apellidos son requeridos'); return; }
                    if (!fpTelefono || fpTelefono.length !== 8) { setFpError('Teléfono debe tener 8 dígitos'); return; }
                    if (!fpUsuario) { setFpError('Nombre de usuario es requerido'); return; }
                    setFpLoading(true);
                    await api.post('/auth/forgot-password', {
                      dpi: fpDpi,
                      nombres: fpNombres,
                      apellidos: fpApellidos,
                      telefono: fpTelefono,
                      usuario: fpUsuario,
                    });
                    setFpMsg('Solicitud enviada. Nos pondremos en contacto para validar tu identidad.');
                    setTimeout(() => {
                      setShowForgot(false);
                      setFpError(''); setFpMsg(''); setFpDpi(''); setFpNombres(''); setFpApellidos(''); setFpTelefono(''); setFpUsuario('');
                    }, 1200);
                  } catch (e) {
                    setFpError(e?.response?.data?.error || e.message || 'No fue posible enviar la solicitud');
                  } finally {
                    setFpLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {fpLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default LoginComponent;
