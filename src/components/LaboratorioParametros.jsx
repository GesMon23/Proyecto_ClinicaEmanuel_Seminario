// Componente para ingresar resultados de laboratorio por paciente
import React, { useRef } from "react";
import { Col, Form, Row } from "react-bootstrap";
import './LaboratorioParametros.css';
import CustomModal from '@/components/CustomModal.jsx';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { useAviso } from '@/hooks/useAviso';
import { cn } from '@/utils/cn';
import { CampoLab, SelectPeriodicidad } from './laboratorioParametros/CampoLab';
import SeccionExamen from './laboratorioParametros/SeccionExamen';
import { useLaboratorio } from './laboratorioParametros/useLaboratorio';

const UBICACION_BUSQUEDA = "w-full sm:min-w-[100px] sm:w-auto";

function LaboratorioParametros({ onSubmit }) {
  const { modal, mostrar } = useAviso();
  const lab = useLaboratorio({ mostrarAviso: mostrar, alGuardar: onSubmit });
  const refAfiliacion = useRef(null);
  const { valores, paciente } = lab;

  // Tras guardar, el foco vuelve al campo de No. Afiliación para el siguiente paciente
  const guardar = async (e) => {
    await lab.guardar(e);
    setTimeout(() => refAfiliacion.current?.focus(), 0);
  };

  return (
    <>
      <CustomModal {...modal} />
      <Form onSubmit={guardar} className="space-y-6">
        {paciente && (
          <div
            className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200 border border-green-700 dark:border-green-400 rounded-xl py-3 mb-6 text-center text-lg font-semibold tracking-wide w-full"
            style={{ fontSize: 22, letterSpacing: 0.5 }}
          >
            {paciente}
          </div>
        )}

        <Row className="mb-3">
          <Col md={12} xs={12}>
            <Form.Group>
              <Form.Label className="font-medium dark:text-gray-300">No. Afiliación <span className="text-rose-500">*</span></Form.Label>
              <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-stretch md:items-center gap-2">
                <Form.Control
                  type="text"
                  value={lab.noAfiliacion}
                  onChange={(e) => lab.setNoAfiliacion(e.target.value)}
                  required
                  placeholder="Ingrese número de afiliación"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                  style={{ flex: 2 }}
                  ref={refAfiliacion}
                />
                <button type="button" className={cn(BOTON_PRINCIPAL, UBICACION_BUSQUEDA)} onClick={lab.buscar}>Buscar</button>
                <button type="button" className={cn(BOTON_LIMPIAR, UBICACION_BUSQUEDA)} onClick={lab.limpiar}>Limpiar</button>
                <div className="hidden md:block flex-grow" />
                {paciente && (
                  <>
                    <Form.Group className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[220px] md:mr-4">
                      <Form.Label className="block mb-1 dark:text-gray-300">Examen realizado <span className="text-rose-500">*</span></Form.Label>
                      <Form.Select
                        value={valores.examen_realizado || ''}
                        onChange={(e) => lab.cambiar('examen_realizado', e.target.value)}
                        required
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded px-3 py-2 text-base"
                      >
                        <option value="">Seleccione</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="w-full sm:w-auto sm:min-w-[220px]">
                      <Form.Label className="dark:text-gray-300">Fecha de laboratorio <span className="text-rose-500">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        value={valores.fecha_laboratorio || ''}
                        onChange={(e) => lab.cambiar('fecha_laboratorio', e.target.value)}
                        required
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    </Form.Group>
                  </>
                )}
              </div>
              {lab.error && <div className="text-red-600 dark:text-red-400 font-medium mt-2">{lab.error}</div>}
            </Form.Group>
          </Col>
        </Row>

        {/* "No": solo periodicidad y causa */}
        {paciente && valores.examen_realizado === 'No' && (
          <Row className="mb-3">
            <Col md={12} sm={12} xs={12}>
              <SelectPeriodicidad value={valores.idPerLaboratorio || ''} onChange={(e) => lab.cambiar('idPerLaboratorio', e.target.value)} />
              <CampoLab
                etiqueta="Causa de no realizado" requerido tipo="textarea" rows={6}
                value={valores.causa_no_realizado || ''} onChange={(e) => lab.cambiar('causa_no_realizado', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </Col>
          </Row>
        )}

        {/* "Sí": todos los demás campos */}
        {paciente && valores.examen_realizado === 'Sí' && <SeccionExamen lab={lab} />}

        {paciente && (
          <div className="flex mt-4">
            <button type="submit" className={BOTON_PRINCIPAL} disabled={lab.guardando}>
              {lab.guardando ? 'Guardando...' : 'Guardar resultados'}
            </button>
          </div>
        )}
      </Form>
    </>
  );
}

export default LaboratorioParametros;
