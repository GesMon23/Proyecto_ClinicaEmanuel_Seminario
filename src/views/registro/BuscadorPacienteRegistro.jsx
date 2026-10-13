import React from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { cn } from '@/utils/cn';

// Banner del paciente encontrado + búsqueda por No. de afiliación (Buscar / Limpiar)
export default function BuscadorPacienteRegistro({ paciente, noAfiliacion, onCambio, onBuscar, onLimpiar }) {
  return (
    <>
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
                value={noAfiliacion}
                onChange={(e) => onCambio(e.target.value)}
                placeholder="Ingrese número de afiliación"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                style={{ flex: 2 }}
              />
              <button type="button" className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')} onClick={onBuscar}>
                Buscar
              </button>
              <button type="button" className={cn(BOTON_LIMPIAR, 'w-full sm:w-auto')} onClick={onLimpiar}>
                Limpiar
              </button>
            </div>
          </Form.Group>
        </Col>
      </Row>
    </>
  );
}
