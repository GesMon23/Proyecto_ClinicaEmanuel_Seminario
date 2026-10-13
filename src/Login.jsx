import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logoClinica from "@/assets/logoClinica2.png"
import Background from "@/assets/backgroundLogin.png";
import { useNavigate } from "react-router-dom";
import api from '@/config/api';
import { BOTON_PRINCIPAL } from '@/constants/botones';
import { useAuth } from '@/contexts/auth-context';

import { CAMPO, ETIQUETA } from '@/constants/formularios';
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
  // Recuperación de contraseña: se pide un enlace con el usuario o el correo
  const [showForgot, setShowForgot] = useState(false);
  const [fpIdentificador, setFpIdentificador] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const abrirRecuperacion = (abrir) => { setShowForgot(abrir); setFpError(''); setFpMsg(''); setFpIdentificador(''); };
  const pedirEnlace = async (e) => {
    e?.preventDefault();
    setFpError(''); setFpMsg('');
    if (!fpIdentificador.trim()) { setFpError('Ingresa tu usuario o tu correo electrónico'); return; }
    setFpLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { identificador: fpIdentificador.trim() });
      setFpMsg(data?.mensaje || 'Si el usuario existe, recibirás un enlace en tu correo.');
    } catch (err) {
      // 503: el correo no está configurado o no se pudo enviar · 429: hay que esperar antes de repetir
      setFpError(err?.response?.data?.error || 'No fue posible enviar la solicitud. Intenta más tarde.');
    } finally {
      setFpLoading(false);
    }
  };
  // Consultar usuarios activos al montar el componente
  useEffect(() => {
    // Podrías limpiar mensajes al cargar
    setMensaje("");
  }, []);

  // Normaliza mensajes del login: mayúscula inicial y 'password' -> 'contraseña'
  const normalizeLoginError = (msg) => {
    try {
      let s = (msg || '').toString().trim();
      if (!s) return s;
      s = s.replace(/password/gi, 'contraseña');
      s = s.replace(/contrasena/gi, 'contraseña');
      // Mayúscula inicial del mensaje completo
      s = s.charAt(0).toUpperCase() + s.slice(1);
      return s;
    } catch {
      return msg;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (/[A-Z]/.test(usuario)) {
      setMensaje(normalizeLoginError("todos los caracteres del usuario deben ir en minúsculas"));
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
      setMensaje(normalizeLoginError(err?.response?.data?.error || 'No fue posible iniciar sesión'));
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
    <div className="bg-white dark:bg-gray-900" data-no-uppercase>
      <div className="flex justify-center h-screen bg-gray-100 dark:bg-slate-900">
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
                Expertos en salud renal, comprometidos contigo.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-2/6">
          <div className="flex-1">
            <div className="text-center">
              <img src={logoClinica} alt="" className="logo-transparente text-4xl font-bold text-center text-gray-700 dark:text-white"></img>
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
                    onClick={() => abrirRecuperacion(true)}
                    className="text-sm text-green-800 dark:text-green-400 hover:underline"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" data-no-uppercase>
          <div className="relative z-[10000] bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Cambiar contraseña</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Debes cambiar tu contraseña genérica antes de continuar.</p>
            <label className={ETIQUETA}>Nueva contraseña</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className={CAMPO}
            />
            <label className={`${ETIQUETA} mt-3`}>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={newPwd2}
              onChange={(e) => setNewPwd2(e.target.value)}
              className={CAMPO}
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
                className={BOTON_PRINCIPAL}
              >
                {changeLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
      {/* Modal Recuperación de Contraseña */}
      {showForgot && createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" data-no-uppercase>
          <form onSubmit={pedirEnlace} className="relative z-[10000] bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Recuperar contraseña</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Escribe tu usuario o tu correo electrónico. Te enviaremos un enlace para crear una nueva contraseña.
            </p>

            {fpMsg && (
              <div role="status" className="mb-3 p-3 rounded border border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                {fpMsg}
              </div>
            )}
            {fpError && (
              <div role="alert" className="mb-3 p-3 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                {fpError}
              </div>
            )}

            {!fpMsg && (
              <>
                <label htmlFor="fp-identificador" className={ETIQUETA}>Usuario o correo electrónico</label>
                <input
                  id="fp-identificador"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={fpIdentificador}
                  onChange={(e) => setFpIdentificador((e.target.value || '').slice(0, 120))}
                  className={CAMPO}
                />
              </>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={fpLoading}
                onClick={() => abrirRecuperacion(false)}
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {fpMsg ? 'Cerrar' : 'Cancelar'}
              </button>
              {!fpMsg && (
                <button type="submit" disabled={fpLoading} className={BOTON_PRINCIPAL}>
                  {fpLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              )}
            </div>
          </form>
        </div>
      ), document.body)}
    </div>
  );
};

export default LoginComponent;
