import React, { useState } from 'react';
import { Col, Form, Row } from "react-bootstrap";
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { cn } from '@/utils/cn';
import CustomModal from '@/components/CustomModal';
import ConsultaPsicologia from '../components/ConsultaPsicologia';
import { useAviso } from '@/hooks/useAviso';
import PantallaRegistro from './registro/PantallaRegistro';
import FormularioEvaluacion from './psicologia/FormularioEvaluacion';
import { EVALUACION_VACIA, buscarPaciente, guardarEvaluacion, puntajeValido } from './psicologia/psicologia';

const Psicologia = () => {
  const [paciente, setPaciente] = useState(null);
  const [noafiliacion, setNoAfiliacion] = useState("");
  const [evaluacion, setEvaluacion] = useState(EVALUACION_VACIA);
  const { modal, mostrar } = useAviso();

  const limpiarFormulario = () => {
    setNoAfiliacion("");
    setPaciente(null);
    setEvaluacion(EVALUACION_VACIA);
  };

  const handleBuscar = async () => {
    setPaciente(null);
    if (!noafiliacion) {
      mostrar('error', 'Campo requerido', 'Ingrese un número de afiliación.');
      return;
    }
    const { paciente: encontrado, titulo, mensaje } = await buscarPaciente(noafiliacion);
    if (encontrado) setPaciente(encontrado);
    else mostrar('error', titulo, mensaje);
  };

  const cambiar = (campo, valor) => setEvaluacion((prev) => ({ ...prev, [campo]: valor }));
  // Los puntajes KDQOL solo aceptan hasta 3 enteros y 2 decimales
  const cambiarPuntaje = (campo, valor) => { if (puntajeValido(valor)) cambiar(campo, valor); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!paciente || !evaluacion.motivo_consulta) {
      mostrar('error', 'Campos requeridos', 'Por favor complete todos los campos obligatorios.');
      return;
    }
    try {
      const { guardada, idInforme } = await guardarEvaluacion(noafiliacion, evaluacion);
      if (guardada) {
        mostrar('success', 'Éxito', idInforme
          ? `Evaluación psicológica guardada exitosamente. ID: ${idInforme}`
          : 'Evaluación psicológica guardada exitosamente.');
        limpiarFormulario();
      }
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      mostrar('error', 'Error', 'Error al guardar la evaluación psicológica.');
    }
  };

  const registro = (
    <Form onSubmit={guardar} className="space-y-6">
      {paciente && (
        <div className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200 border border-green-700 dark:border-green-400 rounded-xl py-4 mb-6 text-center">
          <div className="text-lg font-semibold"><strong>Paciente:</strong> {paciente.nombre}</div>
          <div className="text-md mt-2"><strong>Edad:</strong> {paciente.edad} años | <strong>Sexo:</strong> {paciente.sexo}</div>
        </div>
      )}

      <Row className="mb-4">
        <Col md={12}>
          <Form.Group>
            <Form.Label className="font-medium dark:text-gray-300 text-lg">Búsqueda de Paciente</Form.Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
              <Form.Control
                type="text"
                value={noafiliacion}
                onChange={(e) => setNoAfiliacion(e.target.value)}
                placeholder="Ingrese número de afiliación"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                style={{ flex: 2 }}
              />
              <button type="button" className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')} onClick={handleBuscar}>
                Buscar
              </button>
              <button type="button" className={cn(BOTON_LIMPIAR, 'w-full sm:w-auto')} onClick={limpiarFormulario}>
                Limpiar
              </button>
            </div>
          </Form.Group>
        </Col>
      </Row>

      {paciente && <FormularioEvaluacion ev={evaluacion} onCambio={cambiar} onPuntaje={cambiarPuntaje} />}
    </Form>
  );

  return (
    <>
      <PantallaRegistro modulo="psicologia" titulo="Psicología" registro={registro} consulta={<ConsultaPsicologia />} />
      <CustomModal {...modal} />
    </>
  );
};

export default Psicologia;
