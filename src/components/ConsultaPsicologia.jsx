import React from 'react';
import ConsultaHistorial from './consultas/ConsultaHistorial';
import { CONSULTAS } from './consultas/definiciones';

const ConsultaPsicologia = () => <ConsultaHistorial consulta={CONSULTAS.psicologia} />;

export default ConsultaPsicologia;
