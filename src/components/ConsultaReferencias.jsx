import React, { useEffect, useState } from 'react';
import { Table, Form, Row, Col, Card, Spinner, Button } from 'react-bootstrap';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png"

const ConsultaReferencias = () => {
  const [referencias, setReferencias] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idMedico, setIdMedico] = useState('');
  const [medicos, setMedicos] = useState([]);

  useEffect(() => {
    fetchMedicos();
    fetchReferencias();
    // eslint-disable-next-line
  }, []);

  const fetchMedicos = async () => {
    try {
      const res = await api.get('/medicos');
      setMedicos(res.data);
    } catch (err) {
      setMedicos([]);
    }
  };

  const fetchReferencias = async () => {
    setLoading(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (idMedico) params.idmedico = idMedico;
      const res = await api.get('/api/referencias', { params });
      setReferencias(res.data);
    } catch (err) {
      setReferencias([]);
    }
    setLoading(false);
  };

  const referenciasFiltradas = referencias.filter(ref => {
    if (!filtro) return true;
    const nombrePaciente = [ref.primernombre, ref.segundonombre, ref.primerapellido, ref.segundoapellido].filter(Boolean).join(' ').toLowerCase();
    return (
      String(ref.noafiliacion).includes(filtro.toLowerCase()) ||
      nombrePaciente.includes(filtro.toLowerCase()) ||
      (ref.nombremedico || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (ref.especialidadreferencia || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (ref.motivotraslado || '').toLowerCase().includes(filtro.toLowerCase())
    );
  });

  return (
    <div className="w-full px-4 md:px-8 mt-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md w-full">
        <div className="p-6">
          {/* Encabezado */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <img
              src={logoClinica}
              alt="Logo Clínica"
              className="h-[160px] max-w-[260px] object-contain rounded-xl shadow-md p-2"
            />
            <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">
              Consulta de Referencias
            </span>
          </div>

          {/* Filtros */}
          <form className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  max={hasta || undefined}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">
                  ID Médico
                </label>
                <select
                  value={idMedico}
                  onChange={(e) => setIdMedico(e.target.value)}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                >
                  <option value="">Todos</option>
                  {medicos.map((med) => (
                    <option key={med.idmedico} value={med.idmedico}>
                      {med.nombrecompleto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">
                  Búsqueda rápida
                </label>
                <input
                  type="text"
                  placeholder="Afiliación, paciente, motivo..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={fetchReferencias}
                disabled={loading}
                className={`px-6 py-2 font-semibold rounded-md transition-colors ${loading
                    ? 'bg-green-700 cursor-not-allowed text-white'
                    : 'bg-green-800 hover:bg-green-900 text-white border border-green-900'
                  }`}
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={() => {
                  setDesde('');
                  setHasta('');
                  setIdMedico('');
                  setFiltro('');
                  setReferencias([]);
                }}
                disabled={loading}
                className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800"
              >
                Limpiar
              </button>
            </div>
          </form>
          <br />
          {/* Spinner o Tabla */}
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="success" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table striped bordered hover className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">

                <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">No. Afiliación</th>
                    <th className="px-4 py-2 text-left">Paciente</th>
                    <th className="px-4 py-2 text-left">Fecha Referencia</th>
                    <th className="px-4 py-2 text-left">Motivo Traslado</th>
                    <th className="px-4 py-2 text-left">Médico</th>
                    <th className="px-4 py-2 text-left">Especialidad</th>
                  </tr>
                </thead>
                <tbody>
                  {referenciasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-600 dark:text-gray-300">
                        No se encontraron referencias.
                      </td>
                    </tr>
                  ) : (
                    referenciasFiltradas.map((ref, idx) => (
                      <tr key={ref.idreferencia} className="border-t border-gray-200 dark:border-slate-700">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{ref.noafiliacion}</td>
                        <td className="px-3 py-2">
                          {[ref.primernombre, ref.segundonombre, ref.primerapellido, ref.segundoapellido]
                            .filter(Boolean)
                            .join(' ')}
                        </td>
                        <td className="px-3 py-2">
                          {ref.fechareferencia ? new Date(ref.fechareferencia).toLocaleDateString() : ''}
                        </td>
                        <td className="px-3 py-2">{ref.motivotraslado}</td>
                        <td className="px-3 py-2">{ref.nombremedico}</td>
                        <td className="px-3 py-2">{ref.especialidadreferencia}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>


  );
};

export default ConsultaReferencias;
