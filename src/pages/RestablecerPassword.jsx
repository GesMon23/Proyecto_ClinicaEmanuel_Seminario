// Pantalla del enlace de recuperación (/restablecer-contrasena?token=...): el usuario crea su nueva contraseña.
// Valida el enlace al abrirse; si venció o ya se usó, lo indica y ofrece volver al inicio de sesión.
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import logoClinica from '@/assets/logoClinica2.png';
import { BOTON_PRINCIPAL } from '@/constants/botones';

// Mismas reglas que el backend (PASSWORD_FUERTE)
const REQUISITOS = [
  ['Mínimo 8 caracteres', (v) => v.length >= 8],
  ['Una letra minúscula', (v) => /[a-z]/.test(v)],
  ['Una letra mayúscula', (v) => /[A-Z]/.test(v)],
  ['Un número', (v) => /\d/.test(v)],
  ['Un símbolo (por ejemplo # . ! @)', (v) => /[^A-Za-z0-9]/.test(v)],
];

const ENTRADA = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 '
  + 'focus:ring-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function Marco({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950" data-no-uppercase>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <img src={logoClinica} alt="Clínica Renal Emanuel" className="mx-auto mb-4 h-24 object-contain" />
        {children}
      </div>
    </div>
  );
}

export default function RestablecerPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [estado, setEstado] = useState('validando'); // validando | listo | invalido | hecho
  const [usuario, setUsuario] = useState('');
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!token) { setEstado('invalido'); return; }
    api.get('/auth/reset-password/info', { params: { token } })
      .then(({ data }) => { setUsuario(data.nombre_usuario); setEstado('listo'); })
      .catch((err) => { setError(err?.response?.data?.error || ''); setEstado('invalido'); });
  }, [token]);

  const cumple = REQUISITOS.map(([, prueba]) => prueba(nueva));
  const valida = cumple.every(Boolean) && nueva === confirmar;

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!cumple.every(Boolean)) { setError('La contraseña no cumple todos los requisitos.'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setGuardando(true);
    try {
      await api.post('/auth/reset-password', { token, nueva });
      setEstado('hecho');
    } catch (err) {
      const status = err?.response?.status;
      setError(err?.response?.data?.error || 'No fue posible guardar la contraseña. Intenta de nuevo.');
      if (status === 401) setEstado('invalido');
    } finally {
      setGuardando(false);
    }
  };

  const irAlLogin = () => navigate('/');

  if (estado === 'validando') {
    return <Marco><p className="text-center text-slate-600 dark:text-slate-300">Validando el enlace…</p></Marco>;
  }

  if (estado === 'invalido') {
    return (
      <Marco>
        <h1 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-50">Enlace no válido</h1>
        <p role="alert" className="mb-5 text-slate-600 dark:text-slate-300">
          {error || 'El enlace no es válido, ya se usó o venció. Solicita uno nuevo desde “¿Olvidaste tu contraseña?” en el inicio de sesión.'}
        </p>
        <button type="button" onClick={irAlLogin} className={`${BOTON_PRINCIPAL} w-full`}>Ir al inicio de sesión</button>
      </Marco>
    );
  }

  if (estado === 'hecho') {
    return (
      <Marco>
        <h1 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-50">Contraseña actualizada</h1>
        <p role="status" className="mb-5 text-slate-600 dark:text-slate-300">
          Ya puedes iniciar sesión con tu nueva contraseña. Te enviamos un aviso a tu correo.
        </p>
        <button type="button" onClick={irAlLogin} className={`${BOTON_PRINCIPAL} w-full`}>Ir al inicio de sesión</button>
      </Marco>
    );
  }

  return (
    <Marco>
      <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-50">Crea tu nueva contraseña</h1>
      <p className="mb-5 text-slate-600 dark:text-slate-300">Usuario: <strong className="text-slate-900 dark:text-slate-50">{usuario}</strong></p>
      <form onSubmit={guardar} noValidate>
        <input type="text" name="username" autoComplete="username" value={usuario} readOnly hidden />
        <label htmlFor="nueva" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Nueva contraseña</label>
        <input id="nueva" type="password" autoComplete="new-password" autoFocus value={nueva} onChange={(e) => setNueva(e.target.value)} className={ENTRADA} />

        <ul className="mb-4 mt-3 space-y-1 text-sm" aria-label="Requisitos de la contraseña">
          {REQUISITOS.map(([texto], i) => (
            <li key={texto} className={cumple[i] ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}>
              <span aria-hidden="true">{cumple[i] ? '✓' : '○'}</span> {texto}
              <span className="sr-only">{cumple[i] ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          ))}
        </ul>

        <label htmlFor="confirmar" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Confirmar contraseña</label>
        <input id="confirmar" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={ENTRADA} />
        {confirmar && nueva !== confirmar && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">Las contraseñas no coinciden.</p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>
        )}

        <button type="submit" disabled={!valida || guardando} className={`${BOTON_PRINCIPAL} mt-6 w-full`}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </Marco>
  );
}
