import React from 'react';
import ReporteTabular from './reportes/ReporteTabular';
import { REPORTES } from './reportes/definiciones';

const EgresoReporte = () => <ReporteTabular reporte={REPORTES.egreso} />;

export default EgresoReporte;
