import React, { useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import FilaParametro from './FilaParametro';
import { PARAMETROS_BASE } from './parametros';
import { CampoLab, SelectPeriodicidad } from './CampoLab';

// Campos que aparecen cuando el examen fue realizado: periodicidad, parámetros numéricos, accesos, virología y observación
export default function SeccionExamen({ lab }) {
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const { parametros, valores } = lab;
  const campo = (name) => ({ value: valores[name] || '', onChange: (e) => lab.cambiar(name, e.target.value) });

  const confirmarNuevo = () => {
    if (lab.agregarParametro(nuevo)) { setNuevo(''); setAgregando(false); }
  };
  const cancelarNuevo = () => { setAgregando(false); setNuevo(''); };

  // Parámetros en filas de dos; con solo los base, el botón "Agregar" ocupa el hueco de la última fila
  const filas = Array.from({ length: Math.ceil((parametros.length + 1) / 2) });
  const soloBase = parametros.length === PARAMETROS_BASE.length;

  return (
    <>
      <Row className="mb-3">
        <Col md={4} sm={6} xs={12}><SelectPeriodicidad {...campo('idPerLaboratorio')} /></Col>
      </Row>

      {filas.map((_, fila) => {
        const esUltimaFila = fila === Math.floor(parametros.length / 2);
        return (
          <Row className="mb-3" key={fila}>
            {parametros.slice(fila * 2, fila * 2 + 2).map((p) => (
              <FilaParametro
                key={p.param} parametro={p} lab={lab}
                esUltimo={p.param === parametros[parametros.length - 1].param} onAgregar={() => setAgregando(true)}
              />
            ))}
            {esUltimaFila && soloBase && (
              <Col md={6} sm={12} xs={12} className="mb-3">
                <Form.Group>
                  <Form.Label className="dark:text-gray-700">&nbsp;</Form.Label>
                  <div>
                    <Button
                      className="flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded shadow-md"
                      onClick={() => setAgregando(true)} title="Agregar nuevo parámetro"
                    >
                      Agregar
                      <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2"><i className="nc-icon nc-simple-add text-white text-xs" /></span>
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            )}
          </Row>
        );
      })}

      {agregando && (
        <Row className="mb-3">
          <Col md={8} sm={12} xs={12} className="mb-3">
            <Form.Group>
              <Form.Label className="dark:text-gray-300">Nuevo parámetro de laboratorio</Form.Label>
              <div className="flex items-center gap-2">
                <Form.Control
                  type="text" value={nuevo} onChange={(e) => setNuevo(e.target.value)} autoFocus
                  placeholder="Ingrese el nombre del nuevo parámetro"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
                <div className="flex flex-col gap-2 ml-2 items-center">
                  <Button
                    className="flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded shadow-md"
                    onClick={confirmarNuevo} title="Agregar parámetro" disabled={!nuevo.trim()}
                  >
                    Agregar
                    <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2"><i className="nc-icon nc-simple-add text-white text-xs" /></span>
                  </Button>
                  <Button className="flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded shadow-md" onClick={cancelarNuevo} title="Cancelar">
                    Cancelar
                    <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2"><i className="fas fa-times text-white text-xs font-bold" /></span>
                  </Button>
                </div>
              </div>
            </Form.Group>
          </Col>
        </Row>
      )}

      <Row className="mb-3">
        <Col md={4} sm={6} xs={12}><CampoLab etiqueta="Infección de acceso" requerido {...campo('infeccion_acceso')} /></Col>
        <Col md={4} sm={6} xs={12}><CampoLab etiqueta="Complicación de acceso" requerido {...campo('complicacion_acceso')} /></Col>
        <Col md={4} sm={6} xs={12}><CampoLab etiqueta="Virología" requerido {...campo('virologia')} /></Col>
      </Row>

      <Row className="mb-3">
        <Col md={4} sm={6} xs={12}>
          <CampoLab etiqueta="Antígeno Hepatitis C" requerido opciones={['Positivo', 'Negativo']} ancho="sm:min-w-[300px] md:min-w-[380px]" {...campo('antigeno_hepatitis_c')} />
        </Col>
        <Col md={4} sm={6} xs={12}>
          <CampoLab etiqueta="Antígeno de superficie" requerido opciones={['Positivo', 'Negativo']} ancho="sm:min-w-[300px] md:min-w-[360px]" {...campo('antigeno_superficie')} />
        </Col>
        <Col md={4} sm={6} xs={12}><CampoLab etiqueta="HIV" requerido {...campo('hiv')} /></Col>
      </Row>

      <Row className="mb-3">
        <Col md={12} sm={12} xs={12}>
          <CampoLab etiqueta="Observación" tipo="textarea" rows={3} placeholder="Ingrese aquí las observaciones del laboratorio" {...campo('observacion')} />
        </Col>
      </Row>
    </>
  );
}
