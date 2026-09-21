import React from 'react';
import ConsultaHistorial from './consultas/ConsultaHistorial';
import { CONSULTAS } from './consultas/definiciones';

const ConsultaLaboratorios = () => <ConsultaHistorial consulta={CONSULTAS.laboratorios} />;

export default ConsultaLaboratorios;
