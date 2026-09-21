import React, { useEffect, useState } from 'react';
import api from '../config/api';
import CustomModal from '@/components/CustomModal.jsx';
import { useAviso } from '@/hooks/useAviso';
import { useToast } from '@/hooks/useToast';
import BuscadorPacientes from './pacientes/BuscadorPacientes';
import CampoGestion from './pacientes/CampoGestion';
import TarjetaPaciente from './pacientes/TarjetaPaciente';
import Toast from './pacientes/Toast';
import {
  FORM_VACIO, armarEgreso, cargarCausasEgreso, causaEsFallecimiento, estaInactivo, fichaDePaciente, problemaDelFormulario,
} from './egresoPacientes/egreso';

const BUSQUEDA_VACIA = { dpi: '', noafiliacion: '' };

const EgresoPacientes = () => {
  const [busqueda, setBusqueda] = useState(BUSQUEDA_VACIA);
  const [resultados, setResultados] = useState([]); // fichas de tarjeta (con .no_afiliacion original en .noAfiliacion)
  const [formData, setFormData] = useState(FORM_VACIO);
  const [causasEgreso, setCausasEgreso] = useState([]);
  const [loading, setLoading] = useState(false);
  const { modal, mostrar } = useAviso();
  const { toast, avisar } = useToast();

  useEffect(() => { cargarCausasEgreso().then(setCausasEgreso); }, []);

  const esFallecimiento = causaEsFallecimiento(causasEgreso, formData.causaegreso);

  const sinResultados = (titulo, mensaje) => {
    setResultados([]);
    mostrar('error', titulo, mensaje);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultados([]);
    try {
      const params = {};
      if (busqueda.dpi) params.dpi = busqueda.dpi;
      if (busqueda.noafiliacion) params.noafiliacion = busqueda.noafiliacion;
      if (!params.dpi && !params.noafiliacion) {
        mostrar('error', 'Datos incompletos', 'Debe ingresar el número de afiliación o el DPI');
        return;
      }
      const { data } = await api.get('/pacientes/egreso', { params });
      if (!data || data.length === 0) {
        sinResultados('Sin resultados', 'Paciente no encontrado');
      } else if (data.some(estaInactivo)) {
        sinResultados('Paciente no activo', 'El paciente no está activo');
      } else {
        setResultados(await Promise.all(data.map(fichaDePaciente)));
      }
    } catch {
      sinResultados('Sin resultados', 'No se encontraron coincidencias');
    } finally {
      setLoading(false);
      setBusqueda(BUSQUEDA_VACIA);
    }
  };

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLimpiarEgreso = () => {
    setFormData(FORM_VACIO);
    setResultados([]);
  };

  const handleInsertEgreso = async (e) => {
    e.preventDefault();
    const problema = problemaDelFormulario(formData, esFallecimiento);
    if (problema) {
      avisar(problema);
      return;
    }
    try {
      const { data } = await api.post('/egresos', armarEgreso(resultados[0]?.noAfiliacion, formData));
      if (!data.success) throw new Error('No se pudo insertar el egreso.');
      mostrar('success', 'Éxito', 'Egreso insertado correctamente.');
      handleLimpiarEgreso();
    } catch (err) {
      console.log('==== ERROR AL INSERTAR EGRESO ====' + err);
      mostrar('error', 'Error', 'Error al insertar el egreso.');
    }
  };

  const campo = (name) => ({ name, value: formData[name], onChange: handleFormChange });

  return (
    <>
      <CustomModal {...modal} />
      <Toast {...toast} />

      <BuscadorPacientes
        titulo="Egreso Pacientes"
        busqueda={busqueda}
        onCambiar={setBusqueda}
        onBuscar={handleSubmit}
        onLimpiar={() => { setBusqueda(BUSQUEDA_VACIA); setResultados([]); }}
        loading={loading}
      />

      <div className="w-full px-4 md:px-8">
        {resultados.map((p) => <TarjetaPaciente key={p.noAfiliacion || p.dpi} paciente={p} />)}

        {resultados.length > 0 && (
          <div className="w-full mb-10">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">
                {/* noValidate: los campos faltantes se avisan con el toast, no con el globo del navegador */}
                <form onSubmit={handleInsertEgreso} className="space-y-6" noValidate>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-6">
                      <CampoGestion
                        etiqueta="Causa del Egreso" requerido tipo="select" vacio="Seleccione una causa..." {...campo('causaegreso')}
                        opciones={causasEgreso.map((c) => ({ value: c.id_causa, label: c.descripcion }))}
                      />
                      {!esFallecimiento && <CampoGestion etiqueta="Fecha del egreso" requerido tipo="date" {...campo('fechaegreso')} />}
                    </div>
                    {!esFallecimiento && (
                      <CampoGestion etiqueta="Descripción" requerido placeholder="Ingrese una descripción" {...campo('descripcion')} />
                    )}
                  </div>

                  {esFallecimiento && (
                    <div className="space-y-6 bg-red-50 dark:bg-red-900/20 p-4 sm:p-6 rounded-lg border-l-4 border-red-500">
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Información de Fallecimiento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CampoGestion acento="red" etiqueta="Fecha de Fallecimiento" requerido tipo="date" {...campo('fechafallecimiento')} />
                        <CampoGestion acento="red" etiqueta="Comorbilidades" placeholder="Ingrese comorbilidades (si aplica)" {...campo('comorbilidades')} />
                        <CampoGestion acento="red" etiqueta="Lugar de Fallecimiento" requerido placeholder="Ingrese el lugar de fallecimiento" {...campo('lugarfallecimiento')} />
                        <CampoGestion acento="red" etiqueta="Causa de Fallecimiento" requerido placeholder="Ingrese la causa de fallecimiento" {...campo('causafallecimiento')} />
                      </div>
                    </div>
                  )}

                  <CampoGestion etiqueta="Observaciones" tipo="textarea" rows={5} placeholder="Ingrese observaciones" {...campo('observaciones')} />

                  <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-end">
                      <button
                        type="submit"
                        className="w-full sm:w-56 px-8 py-3 bg-green-700 hover:bg-green-800 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        Guardar Egreso
                      </button>
                      <button
                        type="button"
                        onClick={handleLimpiarEgreso}
                        className="w-full sm:w-40 px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EgresoPacientes;
