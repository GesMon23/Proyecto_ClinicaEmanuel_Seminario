// Componente para ingresar resultados de laboratorio por paciente
import React, { useState, useRef } from "react";
import api from '../config/api';
import './LaboratorioParametros.css';
import { Row, Col, Form, Button, Card, Table } from "react-bootstrap";
import CustomModal from '@/components/CustomModal.jsx';

// Parámetros base y utilidades (restaurados)
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

// Mapa de periodicidad (por si se necesita mostrar)
const PERIODICIDAD_MAP = { '1': 'Mensual', '2': 'Trimestral', '3': 'Semestral' };

// Normalizador para comparar nombres de parámetros de forma robusta
const normalizar = (s = '') => {
  try {
    return String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  } catch (_) {
    return String(s || '').toLowerCase().trim();
  }
};

// Mapa canónico base
const CANON_MAP_BASE = PARAMETROS_LAB_BASE.reduce((acc, p) => {
  acc[normalizar(p.param)] = p.param;
  return acc;
}, {});

// Helper: formatea 'YYYY-MM-DD' a 'dd/mm/yyyy'
const formatearFechaDDMMYYYY = (s) => {
  if (!s) return '';
  const str = String(s);
  const base = str.includes('T') ? str.split('T')[0] : str;
  const m = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return str;
  const [, yy, mm, dd] = m;
  return `${dd}/${mm}/${yy}`;
};

// Alias frecuentes
const ALIAS_MAP = {
  [normalizar('Creatinina')]: 'Creatinina',
  [normalizar('Creatinina mg/dl')]: 'Creatinina',
  [normalizar('creatinina (mg/dl)')]: 'Creatinina',
  [normalizar('BUN Pre-Hemodialisis')]: 'BUN Pre-Hemodiálisis',
  [normalizar('bun pre hemodialisis')]: 'BUN Pre-Hemodiálisis',
  [normalizar('Bun Post-Hemodialisis')]: 'Bun Post-Hemodiálisis',
  [normalizar('bun post hemodialisis')]: 'Bun Post-Hemodiálisis',
  [normalizar('Hormona Paratiroidea')]: 'Hormona Paratiroidea (PTH)',
  [normalizar('PTH')]: 'Hormona Paratiroidea (PTH)',
  [normalizar('Albumina gr/dl')]: 'Albúmina gr/dl',
  [normalizar('Calcio')]: 'Calcio mg/dl',
  [normalizar('Fosforo mg/dl')]: 'Fósforo mg/dl'
};

function LaboratorioParametros({ onSubmit }) {
  const [paciente, setPaciente] = useState(null);

  const [busquedaError, setBusquedaError] = useState("");
  const [noafiliacion, setNoAfiliacion] = useState("");
  const [valores, setValores] = useState({});
  const [parametrosLab, setParametrosLab] = useState(PARAMETROS_LAB_BASE);
  const [showAddParam, setShowAddParam] = useState(false);
  const [nuevoParametro, setNuevoParametro] = useState("");
  const [registros, setRegistros] = useState([]);
  const [saving, setSaving] = useState(false);
  const [bloqueados, setBloqueados] = useState({});
  const [fechasParametro, setFechasParametro] = useState({}); // mapa: nombre canónico -> fecha_laboratorio
  const [originalValores, setOriginalValores] = useState({}); // valores originales desde el último laboratorio
  const noAfiRef = useRef(null);
  // Modal de confirmación (similar a EgresoPacientes)
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info');

  // Helpers de mapeo a booleanos
  const mapSiNoToBoolean = (v) => {
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (s === 'sí' || s === 'si' || s === 'true' || s === '1') return true;
    if (s === 'no' || s === 'false' || s === '0') return false;
    return null;
  };

  const mapPosNegToBoolean = (v) => {
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (s === 'positivo' || s === 'reactivo' || s === 'true' || s === '1') return true;
    if (s === 'negativo' || s === 'no reactivo' || s === 'false' || s === '0') return false;
    return null;
  };

  // Cargar los parámetros del último laboratorio del paciente
  const cargarUltimosParametros = async (afiliacion) => {
    if (!afiliacion) return;
    try {
      const { data } = await api.get(`/laboratorios/${afiliacion}/parametros/ultimo`);
      const lista = data?.data || [];
      if (!Array.isArray(lista) || lista.length === 0) return;

      // 1) Construir mapa con parámetros existentes
      const mapNormToCanonExist = new Map();
      (parametrosLab || []).forEach(p => {
        mapNormToCanonExist.set(normalizar(p.param), p.param);
      });
      // Inyectar aliases sobre el mapa existente para preferir el nombre canónico
      Object.entries(ALIAS_MAP).forEach(([k, v]) => {
        mapNormToCanonExist.set(k, v);
      });
      // También incluir el mapa base canónico por si falta en runtime
      Object.entries(CANON_MAP_BASE).forEach(([k, v]) => {
        if (!mapNormToCanonExist.has(k)) mapNormToCanonExist.set(k, v);
      });

      // 2) Detectar cuáles serían nuevos y preparar lista combinada
      const nuevos = [];
      const mapNormToCanonCombined = new Map(mapNormToCanonExist);
      lista.forEach(item => {
        const nombre = item?.parametro;
        if (!nombre) return;
        const key = normalizar(nombre);
        const canonPreferido = mapNormToCanonExist.get(key) || CANON_MAP_BASE[key] || null;
        if (!mapNormToCanonCombined.has(key)) {
          const usado = canonPreferido || nombre;
          mapNormToCanonCombined.set(key, usado);
          // Solo agregar como nuevo si no existía y no hay canónico ya presente en prev
          if (!mapNormToCanonExist.has(key)) {
            nuevos.push({ label: usado, param: usado });
          }
        }
      });
      const listaCombinada = nuevos.length ? [...parametrosLab, ...nuevos] : parametrosLab;

      // 3) Actualizar parámetros (si hay nuevos)
      if (nuevos.length) setParametrosLab(listaCombinada);

      // 4) Rellenar valores usando el mapa combinado (evita depender del setState asíncrono)
      setValores(v => {
        const nv = { ...v };
        const nuevosBloqueados = {};
        const nuevasFechas = {};
        const nuevosOriginales = {};
        lista.forEach(item => {
          const nombre = item?.parametro;
          if (!nombre) return;
          const key = normalizar(nombre);
          const canonPreferido = mapNormToCanonCombined.get(key) || mapNormToCanonExist.get(key) || CANON_MAP_BASE[key] || nombre;
          const val = item?.valor || '';
          nv[canonPreferido] = val;
          nuevosOriginales[canonPreferido] = val;
          nuevosBloqueados[canonPreferido] = true; // bloquear edición de los que vienen del historial
          // guardar fecha de laboratorio de donde proviene el valor
          const flab = item?.fecha_laboratorio ? formatearFechaDDMMYYYY(item.fecha_laboratorio) : null;
          if (flab) nuevasFechas[canonPreferido] = flab;
        });
        // actualizar bloqueados en un solo setState
        setBloqueados(prev => ({ ...prev, ...nuevosBloqueados }));
        // actualizar fechas por parámetro
        if (Object.keys(nuevasFechas).length) {
          setFechasParametro(prev => ({ ...prev, ...nuevasFechas }));
        }
        // registrar valores originales para comparación al guardar
        if (Object.keys(nuevosOriginales).length) {
          setOriginalValores(prev => ({ ...prev, ...nuevosOriginales }));
        }
        return nv;
      });
    } catch (e) {
      console.error('No se pudieron cargar los parámetros del último laboratorio:', e);
    }
  };

  const handleChange = (param, value) => {
    setValores(v => ({ ...v, [param]: value }));
    // Si el usuario marca que el examen fue realizado, cargar los últimos parámetros guardados
    if (param === 'examen_realizado' && value === 'Sí' && noafiliacion) {
      cargarUltimosParametros(noafiliacion);
    }
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


  const handleSubmit = async e => {
    e.preventDefault();
    setBusquedaError("");
    if (!noafiliacion) {
      setBusquedaError('Ingrese un número de afiliación.');
      return;
    }
    if (!valores.fecha_laboratorio) {
      setBusquedaError('La fecha de laboratorio es requerida.');
      return;
    }
    // Validaciones adicionales de fecha (formato y rango)
    const fechaStr = String(valores.fecha_laboratorio).trim();
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaStr)) {
      setBusquedaError('La fecha de laboratorio no es válida.');
      return;
    }
    const [yy, mm, dd] = fechaStr.split('-').map(n => parseInt(n, 10));
    const fechaObj = new Date(yy, mm - 1, dd);
    const esFechaValida = fechaObj && (fechaObj.getMonth() + 1) === mm && fechaObj.getDate() === dd && fechaObj.getFullYear() === yy;
    if (!esFechaValida) {
      setBusquedaError('La fecha de laboratorio no es válida.');
      return;
    }
    const hoy = new Date();
    const minFecha = new Date(1900, 0, 1);
    if (fechaObj < minFecha) {
      setBusquedaError('La fecha de laboratorio no puede ser anterior a 01/01/1900.');
      return;
    }
    // Opcional: evitar fechas futuras
    const fechaObjSinHora = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaObjSinHora > hoySinHora) {
      setBusquedaError('La fecha de laboratorio no puede ser en el futuro.');
      return;
    }
    if (!valores.idPerLaboratorio) {
      setBusquedaError('La periodicidad es requerida.');
      return;
    }
    if (!valores.examen_realizado) {
      setBusquedaError('Debe indicar si el examen fue realizado.');
      return;
    }
    if (valores.examen_realizado === 'No' && !valores.causa_no_realizado) {
      setBusquedaError('Indique la causa de no realizado.');
      return;
    }

    // Construir arreglo de parámetros a insertar SOLO si cambió el valor respecto al original o es nuevo
    const parametrosPayload = (parametrosLab || [])
      .map(({ param }) => {
        const actual = (valores[param] ?? '').toString().trim();
        const original = (originalValores[param] ?? '').toString().trim();
        const esNuevo = !(param in originalValores);
        const cambio = esNuevo ? actual !== '' : actual !== original;
        return { parametro: param, valor: actual, incluir: cambio && actual !== '' };
      })
      .filter(p => p.incluir)
      .map(({ parametro, valor }) => ({ parametro, valor }));

    // Mapear al esquema esperado por el backend (normalizando tipos/espacios)
    const payload = {
      no_afiliacion: String(noafiliacion).trim(),
      idperlaboratorio: valores.idPerLaboratorio ? Number(valores.idPerLaboratorio) : null,
      fecha_laboratorio: (valores.fecha_laboratorio || '').trim(),
      infeccion_acceso: valores.infeccion_acceso ? String(valores.infeccion_acceso).trim() : null,
      complicacion_acceso: valores.complicacion_acceso ? String(valores.complicacion_acceso).trim() : null,
      observacion: valores.observacion ? String(valores.observacion).trim() : null,
      // Mapeo a boolean para evitar 500 por tipos en BD
      examen_realizado: mapSiNoToBoolean(valores.examen_realizado),
      causa_no_realizado: valores.causa_no_realizado ? String(valores.causa_no_realizado).trim() : null,
      virologia: valores.virologia ? String(valores.virologia).trim() : null,
      antigeno_hepatitis_c: mapPosNegToBoolean(valores.antigeno_hepatitis_c),
      antigeno_superficie: mapPosNegToBoolean(valores.antigeno_superficie),
      hiv: mapPosNegToBoolean(valores.hiv),
      parametros: parametrosPayload
    };

    try {
      setSaving(true);
      await api.post('/laboratorios', payload);
      // Refrescar historial
      const { data } = await api.get(`/laboratorios/${noafiliacion}`);
      setRegistros(data?.data || []);
      // Mostrar confirmación de guardado exitoso
      setModalTitle('Éxito');
      setModalMessage('Registro de laboratorio guardado correctamente.');
      setModalType('success');
      setShowModal(true);
      // Limpiar formulario y enfocar campo de No. Afiliación
      setNoAfiliacion("");
      setValores({});
      setPaciente(null);
      setBusquedaError("");
      setBloqueados({});
      setFechasParametro({});
      setOriginalValores({});
      setRegistros([]);
      // Después de guardar, volver a los parámetros base para el próximo paciente/registro
      setParametrosLab(PARAMETROS_LAB_BASE);
      setTimeout(() => noAfiRef.current?.focus(), 0);
    } catch (err) {
      // Mostrar información útil del backend si existe
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      console.error('Error guardando laboratorio:', err);
      setBusquedaError(`No se pudo guardar el registro de laboratorio${backendMsg ? `: ${backendMsg}` : '.'}`);
    } finally {
      setSaving(false);
    }
    // Callback externo opcional
    if (onSubmit) onSubmit(noafiliacion, valores);
  };

  return (
    <>
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
      />
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
              <Form.Label className="font-medium dark:text-gray-300">No. Afiliación <span className="text-rose-500">*</span></Form.Label>
              <>
                <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-stretch md:items-center gap-2">
                  <Form.Control
                    type="text"
                    value={noafiliacion}
                    onChange={e => setNoAfiliacion(e.target.value)}
                    required
                    placeholder="Ingrese número de afiliación"
                    className="flex-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    style={{ flex: 2 }}
                    ref={noAfiRef}
                  />
                  <Button
                    type="button"
                    className="w-full sm:min-w-[100px] sm:w-auto bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded"
                    onClick={async () => {
                      setBusquedaError("");
                      setPaciente(null);
                      if (!noafiliacion) {
                        setBusquedaError('Ingrese un número de afiliación.');
                        return;
                      }
                      try {
                        const response = await api.get(`/pacientes/${noafiliacion}`);
                        const p = response.data;
                        if (p && (p.primer_nombre || p.primer_apellido)) {
                          // Bloquear si es EGRESADO o FALLECIDO (por ids o descripciones)
                          const idEstado = Number(p.id_estado ?? p.idestado ?? 0);
                          const idCausa = Number(p.id_causa ?? p.idcausa ?? 0);
                          const causaDesc = String(p.causaegreso_descripcion ?? p.causa_egreso_descripcion ?? p.descripcion ?? '').toLowerCase();
                          const estadoDesc = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
                          const esEgresado = idEstado === 3 || estadoDesc.includes('egres');
                          const esFallecido = idCausa === 1 || causaDesc.includes('fallec') || estadoDesc.includes('fallec');
                          if (esEgresado || esFallecido) {
                            setModalTitle('Paciente no disponible');
                            setModalMessage('No se puede registrar laboratorios para pacientes egresados o fallecidos.');
                            setModalType('error');
                            setShowModal(true);
                            setPaciente(null);
                            return;
                          }
                          const nombreCompleto = [
                            p.primer_nombre,
                            p.segundo_nombre,
                            p.otros_nombres,
                            p.primer_apellido,
                            p.segundo_apellido,
                            p.apellido_casada
                          ].filter(Boolean).join(' ');
                          setPaciente(nombreCompleto || p.no_afiliacion);
                          // Al cambiar de paciente, restablecer parámetros al set base.
                          // Los parámetros extras agregados manualmente solo aplican al paciente actual.
                          setParametrosLab(PARAMETROS_LAB_BASE);
                          // Cargar historial de laboratorios
                          try {
                            const { data } = await api.get(`/laboratorios/${noafiliacion}`);
                            setRegistros(data?.data || []);
                            // Cargar últimos parámetros del último laboratorio del paciente
                            await cargarUltimosParametros(noafiliacion);
                          } catch {
                            setRegistros([]);
                          }
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
                    className="w-full sm:min-w-[100px] sm:w-auto bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded"
                    onClick={() => {
                      setNoAfiliacion("");
                      setValores({});
                      setPaciente(null);
                      setBusquedaError("");
                      setBloqueados({});
                      setFechasParametro({});
                      // Restablecer a los parámetros base al limpiar (los agregados solo son por paciente actual)
                      setParametrosLab(PARAMETROS_LAB_BASE);
                    }}
                  >
                    Limpiar
                  </Button>
                  <div className="hidden md:block flex-grow" />
                  {paciente && (
                    <>
                      <Form.Group className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[220px] md:mr-4">
                        <Form.Label className="block mb-1 dark:text-gray-300">Examen realizado <span className="text-rose-500">*</span></Form.Label>
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
                      <Form.Group className="w-full sm:w-auto sm:min-w-[220px]">
                        <Form.Label className="dark:text-gray-300">Fecha de laboratorio <span className="text-rose-500">*</span></Form.Label>
                        <div className="flex items-center gap-2">
                          <Form.Control
                            type="date"
                            value={valores.fecha_laboratorio || ''}
                            onChange={e => handleChange('fecha_laboratorio', e.target.value)}
                            required
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                          />
                        </div>
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
                <Form.Label className="dark:text-gray-300">Periodicidad <span className="text-rose-500">*</span></Form.Label>
                <Form.Select
                  value={valores.idPerLaboratorio || ''}
                  onChange={e => handleChange('idPerLaboratorio', e.target.value)}
                  className="w-full sm:min-w-[240px] md:min-w-[260px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded px-3 py-2 text-base"
                >
                  <option value="">Seleccione</option>
                  <option value="1">Mensual</option>
                  <option value="2">Trimestral</option>
                  <option value="3">Semestral</option>
                  {/* Agrega más opciones según tus datos reales */}
                </Form.Select>
                <Form.Label className="dark:text-gray-300">Causa de no realizado {valores.examen_realizado === 'No' && (<span className="text-rose-500">*</span>)}</Form.Label>
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
                  <Form.Label className="dark:text-gray-300">Periodicidad <span className="text-rose-500">*</span></Form.Label>
                  <Form.Select
                    value={valores.idPerLaboratorio || ''}
                    onChange={e => handleChange('idPerLaboratorio', e.target.value)}
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
                          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <Form.Control
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={valores[param] || ""}
                              onChange={(e) => {
                                const raw = (e.target.value ?? '').trim();
                                // Permitir vacío para borrar
                                if (raw === '') { handleChange(param, ''); return; }
                                // Acepta hasta 6 enteros y 2 decimales (ajusta si necesitas más precisión)
                                const regex = /^\d{1,6}(\.\d{0,2})?$/;
                                if (!regex.test(raw)) return; // ignora cambios inválidos
                                const num = parseFloat(raw);
                                if (Number.isNaN(num)) return;
                                handleChange(param, Math.max(0, num).toString());
                              }}
                              onKeyDown={(e) => {
                                // Bloquear negativos, signos y notación científica
                                if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') e.preventDefault();
                              }}
                              onPaste={(e) => {
                                const t = (e.clipboardData.getData('text') || '').trim();
                                // Evitar pegar negativos o con signo
                                if (/^[-+]/.test(t)) e.preventDefault();
                              }}
                              placeholder={`Ingrese ${label.toLowerCase()}`}
                              className={`w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 ${bloqueados[param] ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-90' : ''}`}
                              readOnly={!!bloqueados[param]}
                            />
                            {fechasParametro[param] && (
                              <div className="flex items-center sm:ml-2">
                                <span
                                  className="inline-flex items-center gap-2 py-1.5 px-3 rounded shadow-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-700/60 font-semibold"
                                  title="Fecha del laboratorio de origen"
                                >
                                  <span className="leading-none">📅</span>
                                  <span className="leading-none text-sm">{fechasParametro[param]}</span>
                                </span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:flex md:flex-row md:flex-wrap md:gap-2 md:w-auto md:ml-2">
                              {bloqueados[param] ? (
                                <Button
                                  className="w-full sm:w-auto flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded shadow-md"
                                  onClick={() => setBloqueados(prev => ({ ...prev, [param]: false }))}
                                  title="Actualizar este campo"
                                  style={{ boxShadow: '0 2px 8px rgba(25,118,210,0.15)' }}
                                >
                                  Actualizar
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    className="w-full sm:w-auto flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-4 rounded shadow-md"
                                    onClick={() => setBloqueados(prev => ({ ...prev, [param]: true }))}
                                    title="Finalizar edición de este campo"
                                    style={{ boxShadow: '0 2px 8px rgba(56,142,60,0.15)' }}
                                  >
                                    Listo
                                  </Button>
                                  <Button
                                    className="w-full sm:w-auto flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow-md"
                                    onClick={() => {
                                      const original = (originalValores[param] ?? '').toString();
                                      setValores(v => ({ ...v, [param]: original }));
                                      setBloqueados(prev => ({ ...prev, [param]: true }));
                                    }}
                                    title="Cancelar edición y restaurar valor anterior"
                                    style={{ boxShadow: '0 2px 8px rgba(100,116,139,0.15)' }}
                                  >
                                    Cancelar
                                  </Button>
                                </>
                              )}

                              {/* Controles extra solo para parámetros agregados por el usuario */}
                              {!PARAMETROS_LAB_BASE.find(base => base.param === param) && (
                                <>
                                  <Button
                                    className="w-full sm:w-auto flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded shadow-md"
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
                                      className="w-full sm:w-auto flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded shadow-md"
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
                                </>
                              )}
                            </div>
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
                            className="flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded shadow-md"
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
                          className="flex items-center justify-center bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded shadow-md"
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
                          className="flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded shadow-md"
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
                  <Form.Label className="dark:text-gray-300">Infección de acceso <span className="text-rose-500">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={valores.infeccion_acceso || ''}
                    onChange={e => handleChange('infeccion_acceso', e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </Form.Group>

              </Col>
              <Col md={4} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label className="dark:text-gray-300">Complicación de acceso <span className="text-rose-500">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={valores.complicacion_acceso || ''}
                    onChange={e => handleChange('complicacion_acceso', e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </Form.Group>

              </Col>
              <Col md={4} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label className="dark:text-gray-300">Virología <span className="text-rose-500">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={valores.virologia || ''}
                    onChange={e => handleChange('virologia', e.target.value)}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </Form.Group>

              </Col>
            </Row>

            {/* Virología y antígenos */}
            <Row className="mb-3">
              <Col md={4} sm={6} xs={12}>
                <Form.Group>
                  <Form.Label className="dark:text-gray-300">Antígeno Hepatitis C <span className="text-rose-500">*</span></Form.Label>
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
                  <Form.Label className="dark:text-gray-300">Antígeno de superficie <span className="text-rose-500">*</span></Form.Label>
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
                  <Form.Label className="dark:text-gray-300">HIV <span className="text-rose-500">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={valores.hiv || ''}
                    onChange={e => handleChange('hiv', e.target.value)}
                    required
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

        {paciente && (
          <div className="flex mt-4">
            <Button
              type="submit"
              className="bg-green-800 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded shadow-md transition-colors duration-200"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar resultados'}
            </Button>
          </div>
        )}
      </Form>

      {/* Sin cuadro emergente: se limpia y enfoca el campo de No. Afiliación */}
    </>
  );
}

export default LaboratorioParametros;
