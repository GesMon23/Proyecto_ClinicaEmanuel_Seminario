import React from 'react';
import ReporteTabular from './reportes/ReporteTabular';
import { REPORTES } from './reportes/definiciones';

const PacientesReporte = () => <ReporteTabular reporte={REPORTES.pacientes} />;

export default PacientesReporte;
