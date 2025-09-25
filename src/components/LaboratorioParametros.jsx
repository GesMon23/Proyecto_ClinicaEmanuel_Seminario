// Componente para ingresar resultados de laboratorio por paciente
import React, { useState } from "react";
import api from '../config/api';
import './LaboratorioParametros.css';
import { Row, Col, Form, Button, Card } from "react-bootstrap";

const PARAMETROS_LAB_BASE = [
  { label: "Albúmina gr/dl", param: "Albúmina gr/dl" },
  { label: "Nivel de Hemoglobina (Hb = g/dl)", param: "Nivel de Hemoglobina (Hb = g/dl)" },
  { label: "Leucocitos", param: "Leucocitos" },
  { label: "Plaquetas", param: "Plaquetas" },
  { label: "Calcio mg/dl", param: "Calcio mg/dl" },
  { label: "Fósforo mg/dl", param: "Fósforo mg/dl" },
  { label: "Potasio", param: "Potasio" },
  { label: "Sodio", param: "Sodio" },
  { label: "Cloruro", param: "Cloruro" },
  { label: "Creatinina", param: "Creatinina" },
  { label: "BUN Pre-Hemodiálisis", param: "BUN Pre-Hemodiálisis" },
  { label: "Hormona Paratiroidea (PTH)", param: "Hormona Paratiroidea (PTH)" },
  { label: "Bun Post-Hemodiálisis", param: "Bun Post-Hemodiálisis" }
];

function LaboratorioParametros({ onSubmit }) {
  const [paciente, setPaciente] = useState(null);
  const [busquedaError, setBusquedaError] = useState("");
  const [noafiliacion, setNoAfiliacion] = useState("");
  const [valores, setValores] = useState({});
  const [parametrosLab, setParametrosLab] = useState(PARAMETROS_LAB_BASE);
  const [showAddParam, setShowAddParam] = useState(false);
  const [nuevoParametro, setNuevoParametro] = useState("");

  const handleChange = (param, value) => {
    setValores(v => ({ ...v, [param]: value }));
  };

  const handleAddParametro = () => {
    if (nuevoParametro.trim() === "") return;
    // Asegura que los campos agregados tengan la misma estructura visual
    setParametrosLab(prev => ([
      ...prev,
      { label: nuevoParametro, param: nuevoParametro }
    ]));
    setNuevoParametro("");
    setShowAddParam(false);
  };


  const handleEliminarUltimoParametro = () => {
    if (parametrosLab.length > PARAMETROS_LAB_BASE.length) {
      setParametrosLab(parametrosLab.slice(0, -1));
    }
  };


  const handleSubmit = e => {
    e.preventDefault();
    if (!noafiliacion) return;
    onSubmit(noafiliacion, valores);
    setValores({});
    setNoAfiliacion("");
  };

  return (
    <Form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo de afiliación y búsqueda de paciente */}
      {paciente && (
        <div className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200 border border-green-700 dark:border-green-400 rounded-xl py-3 mb-6 text-center text-lg font-semibold tracking-wide w-full" style={{ fontSize: 22, letterSpacing: 0.5 }}>
          {paciente}
        </div>
      )}
      <Row className="mb-3">
        <Col md={12} xs={12}>
          <Form.Group>
            <Form.Label className="font-medium dark:text-gray-300">No. Afiliación *</Form.Label>
            <>
              <div className="flex items-center gap-2">
                <Form.Control
                  type="number"
                  value={noafiliacion}
                  onChange={e => setNoAfiliacion(e.target.value)}
                  required
                  placeholder="Ingrese número de afiliación"
                  className="flex-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                  style={{ flex: 2 }}
                />
                <Button
                  type="button"
                  className="w-full sm:min-w-[100px] bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded"
                  onClick={async () => {
                    setBusquedaError("");
                    setPaciente(null);
                    if (!noafiliacion) {
                      setBusquedaError('Ingrese un número de afiliación.');
                      return;
                    }
                    try {
                      const response = await api.get(`/pacientes/${noafiliacion}`);
                      if (response.data && response.data.primernombre) {
                        if (response.data.idestado === 3) {
                          setBusquedaError('El paciente está egresado y no puede ser consultado.');
                          setPaciente(null);
                          return;
                        }
                        setPaciente([
                          response.data.primernombre,
                          response.data.segundonombre,
                          response.data.otrosnombres,
                          response.data.primerapellido,
                          response.data.segundoapellido,
                          response.data.apellidocasada
                        ].filter(Boolean).join(' '));
                      } else {
                        setBusquedaError('No se encontró el paciente con ese número de afiliación.');
                      }
                    } catch (e) {
                      setBusquedaError('No se encontró el paciente con ese número de afiliación.');
                    }
                  }}
                >
                  Buscar
                </Button>
                <Button
                  type="button"
                  className="w-full sm:min-w-[100px] bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded"
                  onClick={() => {
                    setNoAfiliacion("");
                    setValores({});
                    setPaciente(null);
                    setBusquedaError("");
                  }}
                >
                  Limpiar
                </Button>
                <div className="flex-grow" />
                {paciente && (
                  <>
                    <Form.Group className="w-full sm:min-w-[200px] mr-4">
                      <Form.Label className="block mb-1 dark:text-gray-300">Examen realizado</Form.Label>
                      <Form.Select
                        value={valores.examen_realizado || ''}
                        onChange={e => handleChange('examen_realizado', e.target.value)}
                        required
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded px-3 py-2 text-base"
                      >
                        <option value="">Seleccione</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="w-full sm:min-w-[200px]">
                      <Form.Label className="dark:text-gray-300">Fecha de laboratorio *</Form.Label>
                      <Form.Control
                        type="date"
                        value={valores.fecha_laboratorio || ''}
                        onChange={e => handleChange('fecha_laboratorio', e.target.value)}
                        required
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    </Form.Group>
                  </>
                )}
              </div>
              {busquedaError && (
                <div className="text-red-600 dark:text-red-400 font-medium mt-2">{busquedaError}</div>
              )}
            </>
          </Form.Group>
        </Col>
      </Row>



      {/* Renderizado condicional de campos */}
      {/* Si elige "No" solo mostrar causa de no realizado */}
      {paciente && valores.examen_realizado === 'No' && (
        <Row className="mb-3">
          <Col md={12} sm={12} xs={12}>
            <Form.Group>
              <Form.Label className="dark:text-gray-300">Causa de no realizado</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={valores.causa_no_realizado || ''}
                onChange={e => handleChange('causa_no_realizado', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                style={{ resize: 'vertical' }}
              />
            </Form.Group>
          </Col>
        </Row>
      )}

      {/* Si elige "Sí" mostrar todos los demás campos (excepto Fecha de laboratorio que ya está arriba) */}
      {paciente && valores.examen_realizado === 'Sí' && (
        <>
          {/* Periodicidad */}
          <Row className="mb-3">
            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Periodicidad *</Form.Label>
                <Form.Select
                  value={valores.idPerLaboratorio || ''}
                  onChange={e => handleChange('idPerLaboratorio', e.target.value)}
                  required
                  className="w-full sm:min-w-[240px] md:min-w-[260px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded px-3 py-2 text-base"
                >
                  <option value="">Seleccione</option>
                  <option value="1">Mensual</option>
                  <option value="2">Trimestral</option>
                  <option value="3">Semestral</option>
                  {/* Agrega más opciones según tus datos reales */}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Parámetros del laboratorio */}
          {/* Mostrar solo 2 parámetros por fila */}
          {Array.from({ length: Math.ceil((parametrosLab.length + 1) / 2) }).map((_, rowIdx) => {
            const isLastRow = rowIdx === Math.floor((parametrosLab.length) / 2);
            return (
              <Row className="mb-3" key={rowIdx}>
                {/* Parámetros normales (máx 2 por fila) */}
                {parametrosLab.slice(rowIdx * 2, rowIdx * 2 + 2).map(({ label, param }, idx) => {
                  const isParametroAgregado = !PARAMETROS_LAB_BASE.find(base => base.param === param);
                  return (
                    <Col md={6} sm={12} xs={12} key={param} className="mb-3">
                      <Form.Group>
                        <Form.Label className="dark:text-gray-300">{label}</Form.Label>
                        <div className="flex items-center gap-2">
                          <Form.Control
                            type="text"
                            value={valores[param] || ""}
                            onChange={e => handleChange(param, e.target.value)}
                            placeholder={`Ingrese ${label.toLowerCase()}`}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                          />
                          {PARAMETROS_LAB_BASE.find(base => base.param === param) ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-1 px-3 rounded"
                                style={{ fontSize: 13, fontWeight: 600 }}
                              >
                                Actualizar
                              </Button>
                              <div className="flex flex-col items-start ml-2">
                                <Form.Label className="mb-0 text-xs dark:text-gray-400">Última actualización</Form.Label>
                                <span className="font-medium text-sm text-gray-600 dark:text-gray-400">2025-05-22</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                className="flex items-center justify-center rounded-full bg-red-700 hover:bg-red-800 text-white font-semibold text-xs px-3 py-1 shadow-md"
                                onClick={() => setParametrosLab(parametrosLab.filter(p => p.param !== param))}
                                title="Eliminar este parámetro"
                                style={{ boxShadow: '0 2px 8px rgba(167,29,42,0.12)' }}
                              >
                                Eliminar
                                <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2">
                                  <i className="fas fa-times text-white text-xs font-bold" />
                                </span>
                              </Button>
                              {param === parametrosLab[parametrosLab.length - 1].param && (
                                <Button
                                  className="flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 text-white font-semibold text-xs px-3 py-1 shadow-md"
                                  onClick={() => setShowAddParam(true)}
                                  title="Agregar nuevo parámetro"
                                  style={{ boxShadow: '0 2px 8px rgba(56,142,60,0.13)' }}
                                >
                                  Agregar
                                  <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2">
                                    <i className="nc-icon nc-simple-add text-white text-xs" />
                                  </span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </Form.Group>
                    </Col>
                  );
                })}
                {/* Botones en la última columna de la última fila */}
                {isLastRow && parametrosLab.length === PARAMETROS_LAB_BASE.length && (
                  <Col md={6} sm={12} xs={12} className="mb-3">
                    <Form.Group>
                      <Form.Label className="dark:text-gray-700">&nbsp;</Form.Label>
                      <div>
                        <Button
                          className="flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 text-white font-semibold text-xs px-3 py-1 shadow-md"
                          onClick={() => setShowAddParam(true)}
                          title="Agregar nuevo parámetro"
                          style={{ boxShadow: '0 2px 8px rgba(56,142,60,0.13)' }}
                        >
                          Agregar
                          <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2">
                            <i className="nc-icon nc-simple-add text-white text-xs" />
                          </span>
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                )}
              </Row>

            );
          })}
          {/* Input para agregar nuevo parámetro */}
          {showAddParam && (
            <Row className="mb-3">
              <Col md={8} sm={12} xs={12} className="mb-3">
                <Form.Group>
                  <Form.Label className="dark:text-gray-300">Nuevo parámetro de laboratorio</Form.Label>
                  <div className="flex items-center gap-2">
                    <Form.Control
                      type="text"
                      value={nuevoParametro}
                      onChange={e => setNuevoParametro(e.target.value)}
                      placeholder="Ingrese el nombre del nuevo parámetro"
                      autoFocus
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    />
                    <div className="flex flex-col gap-2 ml-2 items-center">
                      <Button
                        className="flex items-center justify-center rounded-full bg-green-700 hover:bg-green-800 text-white font-semibold text-xs px-3 py-1 shadow-md"
                        onClick={handleAddParametro}
                        title="Agregar parámetro"
                        disabled={!nuevoParametro.trim()}
                        style={{ boxShadow: '0 2px 8px rgba(56,142,60,0.13)' }}
                      >
                        Agregar
                        <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2">
                          <i className="nc-icon nc-simple-add text-white text-xs" />
                        </span>
                      </Button>
                      <Button
                        className="flex items-center justify-center rounded-full bg-red-700 hover:bg-red-800 text-white font-semibold text-xs px-3 py-1 shadow-md"
                        onClick={() => { setShowAddParam(false); setNuevoParametro(""); }}
                        title="Cancelar"
                        style={{ boxShadow: '0 2px 8px rgba(167,29,42,0.12)' }}
                      >
                        Cancelar
                        <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2">
                          <i className="fas fa-times text-white text-xs font-bold" />
                        </span>
                      </Button>
                    </div>
                  </div>
                </Form.Group>
              </Col>
            </Row>

          )}
          {/* Infección de Acceso y Complicación de Acceso */}
          <Row className="mb-3">
            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Infección de acceso</Form.Label>
                <Form.Control
                  type="text"
                  value={valores.infeccion_acceso || ''}
                  onChange={e => handleChange('infeccion_acceso', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </Form.Group>
            </Col>
            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Complicación de acceso</Form.Label>
                <Form.Control
                  type="text"
                  value={valores.complicacion_acceso || ''}
                  onChange={e => handleChange('complicacion_acceso', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </Form.Group>
            </Col>
            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Virología</Form.Label>
                <Form.Control
                  type="text"
                  value={valores.virologia || ''}
                  onChange={e => handleChange('virologia', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Virología y antígenos */}
          <Row className="mb-3">
            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Antígeno Hepatitis C</Form.Label>
                <br />
                <Form.Select
                  value={valores.antigeno_hepatitis_c || ''}
                  onChange={e => handleChange('antigeno_hepatitis_c', e.target.value)}
                  required
                  className="w-full sm:min-w-[300px] md:min-w-[380px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded px-3 py-2 text-base"
                >
                  <option value="">Seleccione</option>
                  <option value="Positivo">Positivo</option>
                  <option value="Negativo">Negativo</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Antígeno de superficie</Form.Label>
                <br />
                <Form.Select
                  value={valores.antigeno_superficie || ''}
                  onChange={e => handleChange('antigeno_superficie', e.target.value)}
                  required
                  className="w-full sm:min-w-[300px] md:min-w-[360px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded px-3 py-2 text-base"                >
                  <option value="">Seleccione</option>
                  <option value="Positivo">Positivo</option>
                  <option value="Negativo">Negativo</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4} sm={6} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">HIV</Form.Label>
                <Form.Control
                  type="text"
                  value={valores.hiv || ''}
                  onChange={e => handleChange('hiv', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Observación */}
          <Row className="mb-3">
            <Col md={12} sm={12} xs={12}>
              <Form.Group>
                <Form.Label className="dark:text-gray-300">Observación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={valores.observacion || ''}
                  onChange={e => handleChange('observacion', e.target.value)}
                  placeholder="Ingrese aquí las observaciones del laboratorio"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 resize-none"
                />
              </Form.Group>
            </Col>
          </Row>

        </>
      )}




      <div className="flex mt-4">
        <Button
          type="submit"
          className="bg-green-800 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded shadow-md transition-colors duration-200"
        >
          Guardar resultados
        </Button>
      </div>

    </Form>
  );
}

export default LaboratorioParametros;
