import { useEffect, useState } from "react";
import api from "@/config/api";

export default function AdminResetUser() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState({ id_usuario: null, nombre_usuario: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (t) {
      // Consultar información del token (nombre del usuario)
      api
        .get(`/auth/admin/reset-user-token-info`, { params: { token: t } })
        .then(({ data }) => setUserInfo({
          id_usuario: data?.id_usuario ?? null,
          nombre_usuario: data?.nombre_usuario ?? null,
        }))
        .catch((err) => {
          setError(err?.response?.data?.error || err.message || "Token inválido");
        });
    }
  }, []);

  const onReset = async () => {
    setMsg("");
    setError("");
    if (!token) {
      setError("Token no presente en el enlace.");
      return;
    }
    setLoading(true);
    try {
      // No enviar contraseña, que la genere el backend
      const { data } = await api.post("/auth/admin/reset-user-password/token", { token });
      if (data?.ok) {
        setMsg("Contraseña restablecida. El usuario recibirá un correo con la nueva contraseña temporal.");
      } else {
        setError("No fue posible restablecer la contraseña.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Error al restablecer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-md bg-white dark:bg-slate-800 shadow p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
          Restablecer contraseña (Administrador)
        </h1>
        {userInfo?.nombre_usuario && (
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Usuario objetivo: <b>{userInfo.nombre_usuario}</b>
          </p>
        )}
        {!userInfo?.nombre_usuario && (
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Validando token...
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onReset}
            disabled={loading || !token}
            className="rounded bg-green-700 hover:bg-green-800 text-white px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Procesando..." : "Restablecer"}
          </button>
          {msg && <div className="text-green-600 dark:text-green-400 text-sm">{msg}</div>}
          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        </div>

        {!token && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Este enlace requiere un token válido. Verifica el correo recibido.
          </p>
        )}

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          La nueva contraseña será generada automáticamente por el sistema y enviada al correo del usuario.
          El administrador no verá la contraseña.
        </p>
      </div>
    </div>
  );
}
