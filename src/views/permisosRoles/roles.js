// Reglas y llamadas de la pantalla Permisos de Roles (sin React).
import api from '@/config/api';

export const NUEVO = 'nuevo';
export const ROL_VACIO = { nombre: '', descripcion: '', estado: true, permisos: [] };

export const mensajeDeError = (e, porDefecto) => e?.response?.data?.error || porDefecto;
export const mismoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Formulario editable a partir de un rol del servidor
export const formDeRol = (rol) => (rol
  ? { nombre: rol.nombre, descripcion: rol.descripcion || '', estado: rol.estado, permisos: rol.permisos }
  : ROL_VACIO);

export const hayCambios = (form, original) => Boolean(original) && (
  form.nombre !== original.nombre || form.descripcion !== original.descripcion
  || form.estado !== original.estado || !mismoConjunto(form.permisos, original.permisos));

// Pestañas agrupadas por módulo, en el orden del catálogo: [[modulo, [pestañas]], ...]
export function agruparPorModulo(catalogo) {
  const grupos = new Map();
  catalogo.forEach((p) => { if (!grupos.has(p.modulo)) grupos.set(p.modulo, []); grupos.get(p.modulo).push(p); });
  return [...grupos.entries()];
}

// Marca o desmarca una pestaña
export const alternarPermiso = (permisos, codigo) => (
  permisos.includes(codigo) ? permisos.filter((p) => p !== codigo) : [...permisos, codigo]);

// Marca todas las pestañas del módulo, o las desmarca si ya estaban todas
export function alternarModulo(permisos, pestanas) {
  const codigos = pestanas.map((p) => p.codigo);
  const todas = codigos.every((c) => permisos.includes(c));
  return todas ? permisos.filter((p) => !codigos.includes(p)) : [...new Set([...permisos, ...codigos])];
}

// ---- Servidor

export async function cargarCatalogoYRoles() {
  const [catalogo, roles] = await Promise.all([api.get('/permisos'), api.get('/roles')]);
  return { catalogo: catalogo.data || [], roles: roles.data || [] };
}

export const cargarRoles = async () => (await api.get('/roles')).data || [];

export const confirmarPassword = (password) => api.post('/auth/confirm-password', { password });

// Crea el rol (seleccion = NUEVO) o lo actualiza; devuelve su id
export async function guardarRol(seleccion, form) {
  const cuerpo = { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() };
  if (seleccion === NUEVO) return (await api.post('/roles', cuerpo)).data.id_rol;
  await api.put(`/roles/${seleccion}`, cuerpo);
  return seleccion;
}
