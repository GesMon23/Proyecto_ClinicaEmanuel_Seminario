// Reglas y llamadas de la pantalla Turnos > Clínicas por Usuario (sin React).
import api from '@/config/api';

export const FUNCIONES = [
  { clave: 'llamado', titulo: 'Llamado de turnos', pestana: 'Llamado', tiene: 'tiene_llamado', clinicas: 'clinicas_llamado' },
  { clave: 'crear', titulo: 'Creación de turnos', pestana: 'Crear', tiene: 'tiene_crear', clinicas: 'clinicas_crear' },
];

export const mensajeDeError = (e, porDefecto) => e?.response?.data?.error || e?.response?.data?.message || porDefecto;

const ordenar = (lista) => [...lista].sort((a, b) => a - b);

// Los ids llegan como texto (bigint de PostgreSQL); null = todas las clínicas
export const ids = (lista) => (Array.isArray(lista) ? ordenar(lista.map(Number)) : null);
export const eleccionDe = (u) => ({ llamado: ids(u.clinicas_llamado), crear: ids(u.clinicas_crear) });
export const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Pasa una función a "todas" (null) o a una lista; al restringir parte de todas las clínicas marcadas
export const cambiarModo = (eleccion, funcion, todas, clinicas) => ({
  ...eleccion, [funcion]: todas ? null : (eleccion[funcion] ?? ordenar(clinicas.map((c) => Number(c.id_clinica)))),
});

// Marca o desmarca una clínica de una función
export function alternarClinica(eleccion, funcion, id) {
  const actual = eleccion[funcion] || [];
  return { ...eleccion, [funcion]: actual.includes(id) ? actual.filter((x) => x !== id) : ordenar([...actual, id]) };
}

// Primera función restringida sin ninguna clínica marcada (no se puede guardar así)
export const funcionVacia = (eleccion) => FUNCIONES.find((f) => Array.isArray(eleccion[f.clave]) && eleccion[f.clave].length === 0) || null;

export const filtrarUsuarios = (usuarios, busqueda) => {
  const q = busqueda.trim().toLowerCase();
  return q ? usuarios.filter((u) => `${u.nombre_usuario} ${u.empleado}`.toLowerCase().includes(q)) : usuarios;
};

// ---- Servidor

export const cargarUsuarios = async () => (await api.get('/turnos/clinicas-usuarios')).data || [];
export const cargarClinicas = async () => (await api.get('/GclinicasT')).data || [];
export const guardarClinicas = (idUsuario, eleccion) => api.put(`/turnos/clinicas-usuarios/${idUsuario}`, eleccion);
