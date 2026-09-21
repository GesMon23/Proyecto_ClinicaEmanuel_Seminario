import React from 'react';
import ConsultaHistorial from './consultas/ConsultaHistorial';
import { CONSULTAS } from './consultas/definiciones';

const ConsultaReferencias = () => <ConsultaHistorial consulta={CONSULTAS.referencias} />;

export default ConsultaReferencias;
