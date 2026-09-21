import React, { useState } from 'react';
import { Button, Col, Form, Row } from "react-bootstrap";
import logoClinica from '@/assets/logoClinica2.png';
import CustomModal from '@/components/CustomModal';
import ConsultaPsicologia from '../components/ConsultaPsicologia';
import { useAviso } from '@/hooks/useAviso';
import FormularioEvaluacion from './psicologia/FormularioEvaluacion';
import { EVALUACION_VACIA, buscarPaciente, guardarEvaluacion, puntajeValido } from './psicologia/psicologia';

const CLASE_TAB = 'px-4 py-2 rounded-md font-semibold border transition-colors';
const TAB_ACTIVA = 'bg-green-800 text-white border-green-900';
const TAB_INACTIVA = 'bg-white dark:bg-slate-800 text-green-800 dark:text-white border-green-800 hover:bg-green-50 dark:hover:bg-slate-700';

const Psicologia = () => {
  const [tab, setTab] = useState('registro'); // 'registro' | 'consulta'
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

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="w-full mb-10">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden w-full mt-4">
          <div className="p-6 min-w-[280px]">
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">Psicología</span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              {[['registro', 'Registro'], ['consulta', 'Consulta']].map(([clave, texto]) => (
                <button key={clave} type="button" onClick={() => setTab(clave)} className={`${CLASE_TAB} ${tab === clave ? TAB_ACTIVA : TAB_INACTIVA}`}>
                  {texto}
                </button>
              ))}
            </div>

            {tab === 'registro' && (
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
                        <Button type="button" className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-16 rounded w-full sm:w-auto" onClick={handleBuscar}>
                          Buscar
                        </Button>
                        <Button type="button" className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-16 rounded w-full sm:w-auto" onClick={limpiarFormulario}>
                          Limpiar
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {paciente && <FormularioEvaluacion ev={evaluacion} onCambio={cambiar} onPuntaje={cambiarPuntaje} />}
              </Form>
            )}

            {tab === 'consulta' && <ConsultaPsicologia />}
          </div>
        </div>
      </div>

      <CustomModal {...modal} />
    </div>
  );
};

export default Psicologia;
