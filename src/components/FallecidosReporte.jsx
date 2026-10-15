import React from 'react';
import ReporteTabular from './reportes/ReporteTabular';
import { REPORTES } from './reportes/definiciones';

const FallecidosReporte = () => <ReporteTabular reporte={REPORTES.fallecidos} />;

export default FallecidosReporte;
