import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Encabezado de sesión para las llamadas que no pasan por axios (fetch de PDF, QR, fotos...)
export function encabezadoSesion() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Descarga un archivo de la API con la sesión (window.open o un <a href> no pueden enviar el token)
export async function descargarArchivo(ruta, nombre, params) {
  const { data, headers } = await api.get(ruta, { params, responseType: 'blob', timeout: 60000 });
  const encabezado = headers?.['content-disposition'] || '';
  const sugerido = (encabezado.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i) || [])[1];
  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = sugerido ? decodeURIComponent(sugerido) : nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Interceptor para requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        if (!config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, error => {
    console.error('Error en request:', error);
    return Promise.reject(error);
});

// Errores con los que el servidor indica que no hay sesión válida (vencida, cerrada o manipulada)
const SIN_SESION = new Set(['Sesión requerida', 'Token requerido', 'Token inválido']);
// Pantallas que funcionan sin sesión: no se redirige desde ellas
const PUBLICAS = ['/', '/restablecer-contrasena', '/turnos-tv'];

// Interceptor para responses (las respuestas exitosas no se registran: traen datos de pacientes)
api.interceptors.response.use(response => response, error => {
    if (error.response) {
        console.error('Error de respuesta:', {
            status: error.response.status,
            data: error.response.data,
        });

        // Sesión vencida: se limpia y se vuelve al inicio de sesión
        if (error.response.status === 401 && SIN_SESION.has(error.response.data?.error) && !PUBLICAS.includes(window.location.pathname)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.assign('/');
        }

        // Mejorar el mensaje de error
        error.message = `Error ${error.response.status}: ${error.response.data?.error || error.response.statusText}`;
    } else if (error.request) {
        console.error('No se recibió respuesta:', error.request);
        error.message = 'No se recibió respuesta del servidor';
    }

    return Promise.reject(error);
});

export default api;
