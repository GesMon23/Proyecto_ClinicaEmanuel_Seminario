import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Footer from '@/layouts/footer';
import CustomModal from '@/components/CustomModal';
import logoClinica from '@/assets/logoClinica2.png';
import avatarDefault from '@/assets/default-avatar.png';
import api from '../config/api';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import NavegacionPestanas from './consultaPacientes/NavegacionPestanas';
import { descargarCarnet } from './consultaPacientes/carnet';
import { generarReportePaciente } from './consultaPacientes/reportePdf';
import {
    DatosPersonales, Faltistas, Formularios, Historial, Laboratorios, Nutricion, Psicologia, Referencias, Turnos,
} from './consultaPacientes/pestanas';

const CLASE_INPUT = `text-base md:text-lg px-4 py-2 w-56 rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm placeholder-slate-400
    focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
    dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 transition`;
const CLASE_ACCION = 'bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600';
const CLASE_BADGE = 'inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white';

// Listas de cada pestaña; se cargan por separado y una que falle no impide mostrar las demás
const SIN_DATOS = { historial: [], referencias: [], nutricion: [], psicologia: [], formularios: [], turnos: [], faltistas: [], laboratorios: [] };

const comoLista = (d) => (Array.isArray(d) ? d : []);

async function cargarPsicologia(noAfiliacion) {
    try {
        const { data } = await api.get(`/api/psicologia/historial/${noAfiliacion}`);
        return Array.isArray(data?.data) ? data.data : comoLista(data);
    } catch {
        try {
            return comoLista((await api.get(`/psicologia/${noAfiliacion}`)).data);
        } catch {
            return [];
        }
    }
}

const CARGADORES = {
    historial: async (n) => comoLista((await api.get(`/historial/${n}`)).data),
    referencias: async (n) => comoLista((await api.get(`/referencias/${n}`)).data),
    nutricion: async (n) => comoLista((await api.get(`/nutricion/${n}`)).data),
    psicologia: cargarPsicologia,
    formularios: async (n) => comoLista((await api.get(`/formularios/${n}`)).data),
    turnos: async (n) => comoLista((await api.get(`/turnos/${n}`)).data),
    faltistas: async (n) => comoLista((await api.get(`/faltistas/${n}`)).data),
    // Misma consulta que usan los módulos de Laboratorios
    laboratorios: async (n) => {
        const { data } = await api.get(`/api/laboratorios/historial/${n}`);
        return Array.isArray(data?.data) ? data.data : [];
    },
};

// Comprueba en el backend que exista la foto; devuelve { exists, filename }
async function verificarExistenciaFoto(filename) {
    try {
        const id = String(filename || '').trim().replace(/\.[^.]+$/, '');
        const { data } = await api.get(`/check-photo/${encodeURIComponent(id)}`);
        return data;
    } catch {
        return { exists: false };
    }
}

// Deja en `url_foto` el archivo real de la foto (o null): valida el guardado y, si no sirve, prueba por número de afiliación
async function resolverFoto(paciente) {
    try {
        if (paciente.url_foto) {
            const nombre = String(paciente.url_foto).replace(/^.*[\\/]/, '');
            const chk = await verificarExistenciaFoto(nombre);
            paciente.url_foto = chk?.exists ? (chk.filename || nombre) : null;
        }
        if (!paciente.url_foto) {
            const base = `${paciente.no_afiliacion}`;
            for (const ext of ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']) {
                const chk = await verificarExistenciaFoto(`${base}${ext}`);
                if (chk?.exists) { paciente.url_foto = chk.filename || `${base}${ext}`; break; }
            }
        }
    } catch {
        paciente.url_foto = paciente.url_foto || null;
    }
}

const ConsultaPacientes = () => {
    const [paciente, setPaciente] = useState(null);
    const [busqueda, setBusqueda] = useState({ noafiliacion: '', dpi: '' });
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'info' });
    const [fotoCargando, setFotoCargando] = useState(false);
    const [fotoVersion, setFotoVersion] = useState(0);
    const [fotoSrc, setFotoSrc] = useState(avatarDefault);
    const [selectedTab, setSelectedTab] = useState('Datos Personales');
    const [datos, setDatos] = useState(SIN_DATOS);

    const mostrarModal = (message, type = 'error', title = '') => setModal({ show: true, title, message, type });

    const limpiarPaciente = () => {
        setPaciente(null);
        setDatos(SIN_DATOS);
    };

    // Autocompletar desde la URL (noafiliacion o dpi) y ejecutar la búsqueda al cargar
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const noafiliacion = (params.get('noafiliacion') || params.get('no_afiliacion') || '').trim();
        const dpi = noafiliacion ? '' : (params.get('dpi') || '').trim();
        if (!noafiliacion && !dpi) return;
        setBusqueda({ noafiliacion, dpi });
        buscarPacientes(null, { noafiliacion, dpi });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fuente de la foto: por id, luego por nombre de archivo, luego avatar
    useEffect(() => {
        const ts = String(fotoVersion);
        const porId = paciente?.no_afiliacion ? `/api/foto/${encodeURIComponent(paciente.no_afiliacion)}?v=${ts}` : null;
        const porArchivo = paciente?.url_foto ? `/api/fotos/${paciente.url_foto}?v=${ts}` : null;
        setFotoSrc(porId || porArchivo || avatarDefault);
    }, [paciente, fotoVersion]);

    const cargarSecciones = async (noAfiliacion) => {
        const claves = Object.keys(CARGADORES);
        const resultados = await Promise.allSettled(claves.map((k) => CARGADORES[k](noAfiliacion)));
        const cargados = { ...SIN_DATOS };
        resultados.forEach((r, i) => {
            if (r.status === 'fulfilled') cargados[claves[i]] = r.value;
            else console.warn(`No se pudo cargar ${claves[i]} del paciente:`, r.reason);
        });
        setDatos(cargados);
    };

    const buscarPacientes = async (e, override) => {
        if (e) e.preventDefault();
        setLoading(true);
        setFotoCargando(true);

        // El override viene de la URL o de llamadas directas
        const noaf = (override?.noafiliacion ?? busqueda.noafiliacion ?? '').trim();
        const dpi = (override?.dpi ?? busqueda.dpi ?? '').trim();

        try {
            if (noaf === '' && dpi === '') {
                mostrarModal('Debe ingresar el número de afiliación o el DPI');
                return;
            }
            const { data } = await api.get(noaf !== '' ? `/pacientes/${noaf}` : `/pacientes/dpi/${dpi}`);
            if (!data) {
                mostrarModal('Paciente no encontrado');
                limpiarPaciente();
                return;
            }
            await resolverFoto(data);
            setPaciente(data);
            setFotoVersion((v) => v + 1);
            setSelectedTab('Datos Personales');
            await cargarSecciones(data.no_afiliacion);
        } catch (error) {
            const estado = error.response?.status;
            mostrarModal(estado === 404 ? 'Paciente no encontrado'
                : estado === 400 ? 'Debe proporcionar el número de afiliación'
                    : 'Error al buscar pacientes');
            limpiarPaciente();
        } finally {
            setLoading(false);
            setFotoCargando(false);
            // Solo se limpia el formulario en una búsqueda manual
            if (!override) setBusqueda({ noafiliacion: '', dpi: '' });
        }
    };

    const handleLimpiarBusqueda = () => {
        setBusqueda({ noafiliacion: '', dpi: '' });
        setSelectedTab('Datos Personales');
        limpiarPaciente();
    };

    const handleDescargarCarnet = async () => {
        if (!paciente?.no_afiliacion) return;
        try {
            await descargarCarnet(paciente.no_afiliacion);
        } catch (err) {
            mostrarModal(String(err?.message || err || 'Error desconocido'), 'error', 'Error al descargar carné');
        }
    };

    const alFallarFoto = () => {
        // Si falló la ruta por ID, probar el nombre de archivo; si no, avatar
        const porArchivo = paciente?.url_foto ? `/api/fotos/${paciente.url_foto}?v=${fotoVersion}` : null;
        setFotoSrc(fotoSrc.includes('/api/foto/') && porArchivo ? porArchivo : avatarDefault);
    };

    const nombreCompleto = paciente
        ? `${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim()
        : '';

    const datosClave = paciente && [
        ['No. Afiliación', paciente.no_afiliacion],
        ['DPI', paciente.dpi],
        ['No. Proveedor', paciente.no_paciente_proveedor || '-'],
        ['Acceso', paciente.acceso_descripcion || '-'],
        ['Formulario', paciente.numero_formulario_activo || '-'],
        ['Sesiones/mes', paciente.sesiones_autorizadas_mes || '-'],
    ];

    return (
        <Container fluid className="bg-white dark:bg-slate-900 min-h-screen">
            <CustomModal
                show={modal.show}
                onClose={() => setModal((m) => ({ ...m, show: false }))}
                title={modal.title || (modal.type === 'success' ? 'Éxito' : 'Error')}
                message={modal.message}
                type={modal.type}
            />
            <Row>
                <Col md="12">
                    <Card className="bg-white dark:bg-slate-800">
                        <Card.Body className="dark:bg-slate-800 dark:text-gray-200">
                            <div className="dark:bg-slate-800 dark:text-gray-200">
                                <div className="flex flex-col items-center">
                                    <div className="w-full text-center mb-6">
                                        <div className="flex items-center justify-center gap-6 flex-wrap">
                                            <img
                                                src={logoClinica}
                                                alt="Logo de la clínica"
                                                className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                                            />
                                            <h1 className="text-3xl font-bold text-green-800 dark:text-white">Consulta de Pacientes</h1>
                                        </div>
                                    </div>

                                    <form onSubmit={buscarPacientes} className="flex items-center gap-3 md:gap-4 flex-wrap mb-6 w-full justify-center">
                                        <input
                                            placeholder="Número de Afiliación"
                                            type="text"
                                            name="noafiliacion"
                                            value={busqueda.noafiliacion}
                                            onChange={(e) => setBusqueda({ ...busqueda, noafiliacion: e.target.value })}
                                            disabled={Boolean(busqueda.dpi)}
                                            className={CLASE_INPUT}
                                        />
                                        <input
                                            placeholder="DPI"
                                            type="text"
                                            name="dpi"
                                            value={busqueda.dpi}
                                            onChange={(e) => {
                                                const soloDigitos = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                                                setBusqueda((prev) => ({ ...prev, dpi: soloDigitos }));
                                            }}
                                            disabled={Boolean(busqueda.noafiliacion)}
                                            inputMode="numeric"
                                            pattern="\d{13}"
                                            maxLength={13}
                                            onKeyDown={(e) => {
                                                if (['e', 'E', '+', '-', '.', ',', ' '].includes(e.key)) e.preventDefault();
                                            }}
                                            onPaste={(e) => {
                                                const t = (e.clipboardData.getData('text') || '').trim();
                                                if (/[^0-9]/.test(t)) e.preventDefault();
                                            }}
                                            className={CLASE_INPUT}
                                        />
                                        <div className="flex gap-4">
                                            <button
                                                className={BOTON_PRINCIPAL}
                                                type="submit"
                                                disabled={loading}
                                            >
                                                {loading ? 'Buscando...' : 'Buscar'}
                                            </button>
                                            <button
                                                className={BOTON_LIMPIAR}
                                                type="button"
                                                onClick={handleLimpiarBusqueda}
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <hr className="w-full border-gray-300 dark:border-gray-600 mb-6" />

                            {paciente && (
                                <section className="w-full my-10">
                                    <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/60 dark:from-slate-800 dark:to-slate-800/60 shadow-lg p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                            <div className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-4 border-green-700/70 shadow-xl flex items-center justify-center flex-shrink-0">
                                                {fotoCargando ? (
                                                    <span>Cargando foto...</span>
                                                ) : (
                                                    <img alt="Foto del paciente" src={fotoSrc} className="w-full h-full object-cover" onError={alFallarFoto} />
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-4 w-full">
                                                <h2 className="m-0 font-extrabold text-2xl sm:text-3xl md:text-4xl text-green-800 dark:text-green-300 tracking-tight">
                                                    {nombreCompleto}
                                                </h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {datosClave.map(([etiqueta, valor]) => (
                                                        <span key={etiqueta} className={CLASE_BADGE}>
                                                            <strong className="text-green-700 dark:text-white">{etiqueta}:</strong> {valor}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-3 flex-wrap pt-2">
                                                    <button onClick={() => generarReportePaciente(paciente, datos)} className={CLASE_ACCION} type="button">
                                                        Generar Reporte
                                                    </button>
                                                    <button onClick={handleDescargarCarnet} className={CLASE_ACCION} type="button">
                                                        Descargar Carnet
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {paciente && (
                                <div className="w-full mt-4">
                                    <NavegacionPestanas activa={selectedTab} onCambiar={setSelectedTab} />
                                    {selectedTab === 'Datos Personales' && <DatosPersonales paciente={paciente} />}
                                    {selectedTab === 'Historial' && <Historial items={datos.historial} />}
                                    {selectedTab === 'Referencias' && <Referencias items={datos.referencias} />}
                                    {selectedTab === 'Nutrición' && <Nutricion items={datos.nutricion} />}
                                    {selectedTab === 'Psicologia' && <Psicologia items={datos.psicologia} />}
                                    {selectedTab === 'Formularios' && <Formularios items={datos.formularios} />}
                                    {selectedTab === 'Turnos' && <Turnos items={datos.turnos} />}
                                    {selectedTab === 'Faltistas' && <Faltistas items={datos.faltistas} />}
                                    {selectedTab === 'Laboratorios' && <Laboratorios items={datos.laboratorios} />}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Footer />
        </Container>
    );
};

export default ConsultaPacientes;
