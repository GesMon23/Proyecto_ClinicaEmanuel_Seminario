// Aspecto de cada clínica en la pantalla de la TV. La clave se busca sin tildes ni mayúsculas porque el nombre
// real viene de tbl_clinica.descripcion (p. ej. "HEMODIÁLISIS" en vez de "Hemodialisis").
import { Apple, Brain, HeartPulse, Hash } from 'lucide-react';

export const CLINICAS_POR_DEFECTO = ['Hemodialisis', 'Nutrición', 'Psicología'];

const CONFIGURACION = {
  Hemodialisis: {
    icon: HeartPulse, color: 'bg-green-50', borderColor: 'border-green-500', iconColor: 'text-green-600',
    textColor: 'text-green-900', badgeColor: 'bg-green-100 text-green-800',
  },
  Nutrición: {
    icon: Apple, color: 'bg-green-50', borderColor: 'border-green-600', iconColor: 'text-green-700',
    textColor: 'text-green-900', badgeColor: 'bg-green-100 text-green-800',
  },
  Psicología: {
    icon: Brain, color: 'bg-teal-50', borderColor: 'border-teal-600', iconColor: 'text-teal-700',
    textColor: 'text-teal-900', badgeColor: 'bg-teal-100 text-teal-800',
  },
};

const GENERICA = {
  icon: Hash, color: 'bg-gray-50', borderColor: 'border-gray-400', iconColor: 'text-gray-600',
  textColor: 'text-gray-900', badgeColor: 'bg-gray-100 text-gray-800',
};

export const normalizarNombreClinica = (nombre) => (nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const PORCLAVE = Object.fromEntries(Object.entries(CONFIGURACION).map(([k, v]) => [normalizarNombreClinica(k), v]));

export const obtenerClinicaConfig = (clinica) => PORCLAVE[normalizarNombreClinica(clinica)] || GENERICA;
