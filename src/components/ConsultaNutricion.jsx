import React from 'react';
import ConsultaHistorial from './consultas/ConsultaHistorial';
import { CONSULTAS } from './consultas/definiciones';

const ConsultaNutricion = () => <ConsultaHistorial consulta={CONSULTAS.nutricion} />;

export default ConsultaNutricion;
