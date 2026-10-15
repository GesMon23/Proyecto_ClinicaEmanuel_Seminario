import React from 'react';
import { Activity, Apple, Baby, Bone, Brain, Ear, Eye, HeartPulse, Hospital, Pill, Stethoscope, Syringe, User } from 'lucide-react';

const ICONOS = {
  'Pediatría': Baby,
  'Ginecología': User,
  'Oftalmología': Eye,
  'Ortopedia': Bone,
  'Cardiología': HeartPulse,
  'Otorrinolaringología': Ear,
  'Psicología': Brain,
  'Enfermería': Syringe,
  'Farmacia': Pill,
  'Laboratorio': Activity,
  'Rayos X': Activity,
  'Nutrición': Apple,
  'Hemodialisis': Stethoscope,
};

// Icono de la pestaña de cada clínica (Hospital si no hay uno específico)
export default function IconoClinica({ nombre }) {
  const Icono = ICONOS[nombre] || Hospital;
  return <Icono className="w-4 h-4 me-2" />;
}
