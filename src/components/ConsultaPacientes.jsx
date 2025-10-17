import Footer from "@/layouts/footer"
import logoClinica from "@/assets/logoClinica2.png"
import avatarDefault from "@/assets/default-avatar.png"
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import {
    Container,
    Row,
    Col,
    Card
} from 'react-bootstrap';

const CustomModal = ({ show, onClose, title, message, type }) => {
    if (!show) return null;

    const modalStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                    <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        {title}
                    </h4>
                    <pre className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap text-sm">
                        {message}
                    </pre>
                    <button
                        onClick={onClose}
                        className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${type === 'success'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        Cerrar
                    </button>
                </div>
            </div>

        </>
    );
};

const formatearFecha = (fecha) => {
    if (!fecha) return '';
    // Elimina la hora si viene en formato ISO o con espacio
    let soloFecha = fecha.split('T')[0].split(' ')[0];
    const partes = soloFecha.split('-');
    if (partes.length < 3) return fecha;
    return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
};

const formatearFechaGuion = (fecha) => {
    if (!fecha) return '';
    let soloFecha = fecha.split('T')[0].split(' ')[0];
    const partes = soloFecha.split('-');
    if (partes.length < 3) return fecha;
    return `${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}-${partes[0]}`;
};

const calcularEstanciaPrograma = (fechaIngreso) => {
    if (!fechaIngreso) return '';
    // Fecha actual proporcionada
    const hoy = new Date(2025, 3, 18); // Mes 3 = abril, día 18, año 2025
    let soloFecha = fechaIngreso.split('T')[0].split(' ')[0];
    const partes = soloFecha.split('-');
    if (partes.length < 3) return '';
    let anio = parseInt(partes[0], 10);
    let mes = parseInt(partes[1], 10) - 1;
    let dia = parseInt(partes[2], 10);
    const ingreso = new Date(anio, mes, dia);
    if (ingreso > hoy) return '0 días';
    // Calcular diferencia
    let años = hoy.getFullYear() - ingreso.getFullYear();
    let meses = hoy.getMonth() - ingreso.getMonth();
    let dias = hoy.getDate() - ingreso.getDate();
    if (dias < 0) {
        meses--;
        // Obtener días del mes anterior
        const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        dias += mesAnterior.getDate();
    }
    if (meses < 0) {
        años--;
        meses += 12;
    }
    let resultado = [];
    if (años > 0) resultado.push(años + (años === 1 ? ' año' : ' años'));
    if (meses > 0) resultado.push(meses + (meses === 1 ? ' mes' : ' meses'));
    if (dias > 0) resultado.push(dias + (dias === 1 ? ' día' : ' días'));
    if (resultado.length === 0) return '0 días';
    return resultado.join(', ');
};

const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '';
    // Acepta formatos YYYY-MM-DD o similares
    const partes = fechaNacimiento.split('-');
    if (partes.length < 3) return '';
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Mes base 0
    const dia = parseInt(partes[2], 10);
    const hoy = new Date(2025, 3, 18); // Mes 3 = abril (0-index), día 18, año 2025 (fecha actual proporcionada)
    const nacimiento = new Date(anio, mes, dia);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

import jsPDF from 'jspdf';

const ConsultaPacientes = () => {
    const [paciente, setPaciente] = useState(null);
    const [busqueda, setBusqueda] = useState({ noafiliacion: '', dpi: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [modalTitle, setModalTitle] = useState('');
    const [fotoCargando, setFotoCargando] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);

    // Autocompletar desde la URL (noafiliacion o dpi) y ejecutar la búsqueda al cargar
    useEffect(() => {
        try {
            const query = typeof window !== 'undefined' ? window.location.search : '';
            const params = new URLSearchParams(query);
            const n = (params.get('noafiliacion') || params.get('no_afiliacion') || '').trim();
            const d = (params.get('dpi') || '').trim();
            if (n) {
                setBusqueda(prev => ({ ...prev, noafiliacion: n, dpi: '' }));
                setTimeout(() => { if (typeof buscarPacientes === 'function') buscarPacientes(null, { noafiliacion: n, dpi: '' }); }, 0);
            } else if (d) {
                setBusqueda(prev => ({ ...prev, noafiliacion: '', dpi: d }));
                setTimeout(() => { if (typeof buscarPacientes === 'function') buscarPacientes(null, { noafiliacion: '', dpi: d }); }, 0);
            }
        } catch {}
    }, []);
    const [estados, setEstados] = useState([]);
    const [accesosVasculares, setAccesosVasculares] = useState([]);
    const [jornadas, setJornadas] = useState([]);
    const [selectedTab, setSelectedTab] = useState('Datos Personales');
    const [historial, setHistorial] = useState([]);
    const [referencias, setReferencias] = useState([]);
    const [nutricion, setNutricion] = useState([]);
    const [psicologia, setPsicologia] = useState([]);
    const [formularios, setFormularios] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [faltistas, setFaltistas] = useState([]);
    const [laboratorios, setLaboratorios] = useState([]);
    const [labDetalle, setLabDetalle] = useState({ isOpen: false, item: null });
    const [ultimosLab, setUltimosLab] = useState({ loading: false, error: '', data: [] });
    const [nutDetalle, setNutDetalle] = useState({ isOpen: false, item: null });
    const [psiDetalle, setPsiDetalle] = useState({ isOpen: false, item: null });
    const [formDetalle, setFormDetalle] = useState({ isOpen: false, item: null });
    const [turnoDetalle, setTurnoDetalle] = useState({ isOpen: false, item: null });
    const [faltaDetalle, setFaltaDetalle] = useState({ isOpen: false, item: null });

    // Estados de búsqueda y paginación por sección
    const [searchHistorial, setSearchHistorial] = useState('');
    const [pageHistorial, setPageHistorial] = useState(1);
    const [pageSizeHistorial, setPageSizeHistorial] = useState(10);

    const [searchReferencias, setSearchReferencias] = useState('');
    const [pageReferencias, setPageReferencias] = useState(1);
    const [pageSizeReferencias, setPageSizeReferencias] = useState(10);

    const [searchNutricion, setSearchNutricion] = useState('');
    const [pageNutricion, setPageNutricion] = useState(1);
    const [pageSizeNutricion, setPageSizeNutricion] = useState(10);

    const [searchPsicologia, setSearchPsicologia] = useState('');
    const [pagePsicologia, setPagePsicologia] = useState(1);
    const [pageSizePsicologia, setPageSizePsicologia] = useState(10);

    const [searchFormularios, setSearchFormularios] = useState('');
    const [pageFormularios, setPageFormularios] = useState(1);
    const [pageSizeFormularios, setPageSizeFormularios] = useState(10);

    const [searchTurnos, setSearchTurnos] = useState('');
    const [pageTurnos, setPageTurnos] = useState(1);
    const [pageSizeTurnos, setPageSizeTurnos] = useState(10);
    const [searchFaltistas, setSearchFaltistas] = useState('');
    const [pageFaltistas, setPageFaltistas] = useState(1);
    const [pageSizeFaltistas, setPageSizeFaltistas] = useState(10);
    const [searchLaboratorios, setSearchLaboratorios] = useState('');
    const [pageLaboratorios, setPageLaboratorios] = useState(1);
    const [pageSizeLaboratorios, setPageSizeLaboratorios] = useState(10);

    // Helpers de filtrado y paginación
    const normalize = (v) => (v ?? '').toString().toLowerCase();
    const filterItems = (items, search, keys) => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter((it) => keys.some((k) => normalize(it[k]).includes(q)));
    };

    // Resetear a página 1 cuando cambia el término de búsqueda
    React.useEffect(() => { setPageHistorial(1); }, [searchHistorial]);
    React.useEffect(() => { setPageReferencias(1); }, [searchReferencias]);
    React.useEffect(() => { setPageNutricion(1); }, [searchNutricion]);
    React.useEffect(() => { setPagePsicologia(1); }, [searchPsicologia]);
    React.useEffect(() => { setPageFormularios(1); }, [searchFormularios]);
    React.useEffect(() => { setPageTurnos(1); }, [searchTurnos]);
    React.useEffect(() => { setPageFaltistas(1); }, [searchFaltistas]);
    React.useEffect(() => { setPageLaboratorios(1); }, [searchLaboratorios]);

    // Derivados: filtrados, paginados y total de páginas por sección
    const histFiltered = React.useMemo(() => filterItems(historial, searchHistorial, ['estado','no_formulario','descripcion','observaciones','causa_egreso','periodo']), [historial, searchHistorial]);
    const histTotalPages = Math.max(1, Math.ceil(histFiltered.length / pageSizeHistorial));
    const histPageItems = React.useMemo(() => histFiltered.slice((pageHistorial - 1) * pageSizeHistorial, pageHistorial * pageSizeHistorial), [histFiltered, pageHistorial, pageSizeHistorial]);

    const refFiltered = React.useMemo(() => filterItems(referencias, searchReferencias, ['id_referencia','fecha_referencia','motivo_traslado','id_medico','especialidad_referencia']), [referencias, searchReferencias]);
    const refTotalPages = Math.max(1, Math.ceil(refFiltered.length / pageSizeReferencias));
    const refPageItems = React.useMemo(() => refFiltered.slice((pageReferencias - 1) * pageSizeReferencias, pageReferencias * pageSizeReferencias), [refFiltered, pageReferencias, pageSizeReferencias]);

    const nutFiltered = React.useMemo(() => filterItems(nutricion, searchNutricion, ['id_informe','motivo_consulta','estado_nutricional','observaciones','altura_cm','peso_kg','imc']), [nutricion, searchNutricion]);
    const nutTotalPages = Math.max(1, Math.ceil(nutFiltered.length / pageSizeNutricion));
    const nutPageItems = React.useMemo(() => nutFiltered.slice((pageNutricion - 1) * pageSizeNutricion, pageNutricion * pageSizeNutricion), [nutFiltered, pageNutricion, pageSizeNutricion]);

    const psiFiltered = React.useMemo(() => filterItems(psicologia, searchPsicologia, ['id_informe','motivo_consulta','tipo_consulta','observaciones','tipo_atencion','pronostico','kdqol']), [psicologia, searchPsicologia]);
    const psiTotalPages = Math.max(1, Math.ceil(psiFiltered.length / pageSizePsicologia));
    const psiPageItems = React.useMemo(() => psiFiltered.slice((pagePsicologia - 1) * pageSizePsicologia, pagePsicologia * pageSizePsicologia), [psiFiltered, pagePsicologia, pageSizePsicologia]);

    const formFiltered = React.useMemo(() => filterItems(formularios, searchFormularios, ['numero_formulario','sesiones_autorizadas_mes','sesiones_realizadas_mes','sesiones_no_realizadas_mes','inicio_prest_servicios','fin_prest_servicios','id_historial']), [formularios, searchFormularios]);
    const formTotalPages = Math.max(1, Math.ceil(formFiltered.length / pageSizeFormularios));
    const formPageItems = React.useMemo(() => formFiltered.slice((pageFormularios - 1) * pageSizeFormularios, pageFormularios * pageSizeFormularios), [formFiltered, pageFormularios, pageSizeFormularios]);

    const turnosFiltered = React.useMemo(() => filterItems(turnos, searchTurnos, ['noafiliacion','nombrepaciente','id_turno_cod','id_turno','nombre_clinica','fecha_turno']), [turnos, searchTurnos]);
    const turnosTotalPages = Math.max(1, Math.ceil(turnosFiltered.length / pageSizeTurnos));
    const turnosPageItems = React.useMemo(() => turnosFiltered.slice((pageTurnos - 1) * pageSizeTurnos, pageTurnos * pageSizeTurnos), [turnosFiltered, pageTurnos, pageSizeTurnos]);

    const faltistasFiltered = React.useMemo(() => filterItems(
        faltistas,
        searchFaltistas,
        ['noafiliacion','nombres','apellidos','sexo','jornada','accesovascular','departamento','clinica','fechafalta']
    ), [faltistas, searchFaltistas]);
    const faltistasTotalPages = Math.max(1, Math.ceil(faltistasFiltered.length / pageSizeFaltistas));
    const faltistasPageItems = React.useMemo(() => faltistasFiltered.slice((pageFaltistas - 1) * pageSizeFaltistas, pageFaltistas * pageSizeFaltistas), [faltistasFiltered, pageFaltistas, pageSizeFaltistas]);

    const laboratoriosFiltered = React.useMemo(() => filterItems(
        laboratorios,
        searchLaboratorios,
        ['no_afiliacion','id_laboratorio','periodicidad','virologia','hiv','sexo','primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','primernombre','segundonombre','primerapellido','segundoapellido']
    ), [laboratorios, searchLaboratorios]);
    const laboratoriosTotalPages = Math.max(1, Math.ceil(laboratoriosFiltered.length / pageSizeLaboratorios));
    const laboratoriosPageItems = React.useMemo(() => laboratoriosFiltered.slice((pageLaboratorios - 1) * pageSizeLaboratorios, pageLaboratorios * pageSizeLaboratorios), [laboratoriosFiltered, pageLaboratorios, pageSizeLaboratorios]);

    React.useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const [deptosRes, estadosRes, accesosRes, jornadasRes] = await Promise.all([
                    api.get('/departamentos'),
                    api.get('/estados-paciente'),
                    api.get('/accesos-vasculares'),
                    api.get('/jornadas')
                ]);
                setDepartamentos(deptosRes.data);
                setEstados(estadosRes.data);
                setAccesosVasculares(accesosRes.data);
                setJornadas(jornadasRes.data);
            } catch (e) {
                console.error('Error cargando catálogos:', e);
            }
        };
        cargarCatalogos();
    }, []);

    // Funciones para obtener el nombre
    const obtenerNombreDepartamento = (id) => {
        const dep = departamentos.find(d => d.iddepartamento === id);
        return dep ? dep.nombre : '';
    };
    const obtenerNombreEstado = (id) => {
        const est = estados.find(e => e.idestado === id);
        return est ? est.nombre : '';
    };
    const obtenerNombreAcceso = (id) => {
        const acc = accesosVasculares.find(a => a.idacceso === id);
        return acc ? acc.nombre : '';
    };
    const obtenerNombreJornada = (id) => {
        const jornada = jornadas.find(j => j.idjornada === id);
        return jornada ? jornada.descripcion : '';
    };

    const buscarPacientes = async (e, override) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        setFotoCargando(true);

        // Permitir override desde URL o llamadas directas
        const noaf = (override?.noafiliacion ?? busqueda.noafiliacion ?? '').trim();
        const dpiVal = (override?.dpi ?? busqueda.dpi ?? '').trim();

        try {
            let response;
            if (noaf !== '') {
                response = await api.get(`/pacientes/${noaf}`);
            } else if (dpiVal !== '') {
                response = await api.get(`/pacientes/dpi/${dpiVal}`);
            } else {
                setShowModal(true);
                setModalMessage('Debe ingresar el número de afiliación o el DPI');
                setModalType('error');
                setLoading(false);
                setFotoCargando(false);
                return;
            }

            if (response.data) {
                console.log('Datos del paciente recibidos:', response.data);
                console.log('URL foto original:', response.data.url_foto);
                setPaciente(response.data);
                setSelectedTab('Datos Personales');
                // Verificar si la foto existe
                if (response.data.url_foto) {
                    const filename = response.data.url_foto.replace(/^.*[\\\/]/, '');
                    console.log('Nombre de archivo extraído:', filename);
                    const fotoExists = await verificarExistenciaFoto(filename);
                    console.log('¿Foto existe?:', fotoExists);
                    if (!fotoExists) {
                        response.data.url_foto = null;
                    } else {
                        response.data.url_foto = filename; // Solo guardamos el nombre del archivo
                    }
                    console.log('URL foto final:', response.data.url_foto);
                } else {
                    // Fallback: intentar con nombre estandar basado en no_afiliacion
                    try {
                        const base = `${response.data.no_afiliacion}`;
                        const candidatos = [
                            `${base}.jpg`, `${base}.jpeg`, `${base}.png`,
                            `${base}.JPG`, `${base}.JPEG`, `${base}.PNG`
                        ];
                        console.log('Intentando fallback de foto con candidatos:', candidatos);
                        let elegido = null;
                        for (const cand of candidatos) {
                            const existe = await verificarExistenciaFoto(cand);
                            console.log(`¿Existe ${cand}?`, existe);
                            if (existe) { elegido = cand; break; }
                        }
                        response.data.url_foto = elegido;
                        console.log('Resultado fallback url_foto:', response.data.url_foto);
                    } catch (e) {
                        console.warn('Error en fallback de foto:', e);
                        response.data.url_foto = null;
                    }
                }
                // Cargar historial básico
                try {
                    await fetchHistorial(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar el historial:', e);
                }
                // Cargar referencias
                try {
                    await fetchReferencias(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar las referencias:', e);
                }
                // Cargar informes de nutrición
                try {
                    await fetchNutricion(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar los informes de nutrición:', e);
                }
                // Cargar informes de psicología
                try {
                    await fetchPsicologia(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar los informes de psicología:', e);
                }
                // Cargar historial de formularios
                try {
                    await fetchFormularios(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar el historial de formularios:', e);
                }
                // Cargar turnos del paciente
                try {
                    await fetchTurnos(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar los turnos del paciente:', e);
                }
                // Cargar faltistas del paciente
                try {
                    await fetchFaltistas(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar faltistas del paciente:', e);
                }
                // Cargar laboratorios del paciente
                try {
                    await fetchLaboratorios(response.data.no_afiliacion);
                } catch (e) {
                    console.warn('No se pudo cargar laboratorios del paciente:', e);
                }
            } else {
                setShowModal(true);
                setModalMessage('Paciente no encontrado');
                setModalType('error');
                setPaciente(null);
                setHistorial([]);
                setReferencias([]);
                setNutricion([]);
                setPsicologia([]);
                setFormularios([]);
                setTurnos([]);
                setFaltistas([]);
                setLaboratorios([]);
            }
        } catch (error) {
            let errorMessage;
            if (error.response?.status === 404) {
                errorMessage = 'Paciente no encontrado';
            } else if (error.response?.status === 400) {
                errorMessage = 'Debe proporcionar el número de afiliación';
            } else {
                errorMessage = 'Error al buscar pacientes';
            }

            setError(error);
            setShowModal(true);
            setModalMessage(errorMessage);
            setModalType('error');
            setPaciente(null);
            setHistorial([]);
            setReferencias([]);
            setNutricion([]);
            setPsicologia([]);
            setFormularios([]);
            setTurnos([]);
            setFaltistas([]);
            setLaboratorios([]);
        } finally {
            setLoading(false);
            setFotoCargando(false);
            // Solo limpiar si fue una búsqueda manual (sin override)
            if (!override) {
                setBusqueda({ noafiliacion: '', dpi: '' });
            }
        }
    };

    const handleBusquedaChange = (e) => {
        setBusqueda({ ...busqueda, [e.target.name]: e.target.value });
    };

    const handleLimpiarBusqueda = () => {
        setBusqueda({ noafiliacion: '', dpi: '' });
        setPaciente(null);
        setSelectedTab('Datos Personales');
        setHistorial([]);
        setReferencias([]);
        setNutricion([]);
        setPsicologia([]);
        setFormularios([]);
        setTurnos([]);
        setFaltistas([]);
        setLaboratorios([]);
        // Reset filtros y paginación
        setSearchHistorial(''); setPageHistorial(1); setPageSizeHistorial(10);
        setSearchReferencias(''); setPageReferencias(1); setPageSizeReferencias(10);
        setSearchNutricion(''); setPageNutricion(1); setPageSizeNutricion(10);
        setSearchPsicologia(''); setPagePsicologia(1); setPageSizePsicologia(10);
        setSearchFormularios(''); setPageFormularios(1); setPageSizeFormularios(10);
        setSearchTurnos(''); setPageTurnos(1); setPageSizeTurnos(10);
        setSearchFaltistas(''); setPageFaltistas(1); setPageSizeFaltistas(10);
        setSearchLaboratorios(''); setPageLaboratorios(1); setPageSizeLaboratorios(10);
    };

    const fetchHistorial = async (noAfiliacion) => {
        const res = await api.get(`/historial/${noAfiliacion}`);
        setHistorial(Array.isArray(res.data) ? res.data : []);
    };

    const fetchReferencias = async (noAfiliacion) => {
        const res = await api.get(`/referencias/${noAfiliacion}`);
        setReferencias(Array.isArray(res.data) ? res.data : []);
    };

    const fetchNutricion = async (noAfiliacion) => {
        const res = await api.get(`/nutricion/${noAfiliacion}`);
        setNutricion(Array.isArray(res.data) ? res.data : []);
    };

    const fetchPsicologia = async (noAfiliacion) => {
        try {
            const { data } = await api.get(`/api/psicologia/historial/${noAfiliacion}`);
            const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            setPsicologia(rows);
        } catch (e) {
            try {
                const res = await api.get(`/psicologia/${noAfiliacion}`);
                setPsicologia(Array.isArray(res.data) ? res.data : []);
            } catch (_) {
                setPsicologia([]);
            }
        }
    };

    const fetchFormularios = async (noAfiliacion) => {
        const res = await api.get(`/formularios/${noAfiliacion}`);
        setFormularios(Array.isArray(res.data) ? res.data : []);
    };

    const fetchTurnos = async (noAfiliacion) => {
        const res = await api.get(`/turnos/${noAfiliacion}`);
        setTurnos(Array.isArray(res.data) ? res.data : []);
    };

    const fetchFaltistas = async (noAfiliacion) => {
        const res = await api.get(`/faltistas/${noAfiliacion}`);
        setFaltistas(Array.isArray(res.data) ? res.data : []);
    };

    const fetchLaboratorios = async (noAfiliacion) => {
        // Replicar exactamente la consulta usada en módulos de Laboratorios
        const { data } = await api.get(`/api/laboratorios/historial/${noAfiliacion}`);
        setLaboratorios(Array.isArray(data?.data) ? data.data : []);
    };

    const verificarExistenciaFoto = async (filename) => {
        try {
            console.log('Verificando existencia de foto:', filename);
            const response = await api.get(`/check-photo/${filename}`);
            console.log('Respuesta del servidor:', response.data);
            return response.data.exists;
        } catch (error) {
            console.error('Error al verificar la foto:', error);
            return false;
        }
    };

    const handleCloseModal = () => setShowModal(false);

    // Mostrar detalle genérico en modal
    const openDetail = (titulo, item) => {
        setModalTitle(titulo || 'Detalle');
        try {
            setModalMessage(JSON.stringify(item || {}, null, 2));
        } catch (_) {
            setModalMessage(String(item || ''));
        }
        setModalType('info');
        setShowModal(true);
    };

    // Abrir detalle de laboratorio (modal específico)
    const openLabDetail = (item) => {
        setLabDetalle({ isOpen: true, item });
        const afiliacion = item?.no_afiliacion || item?.noafiliacion || '';
        if (!afiliacion) {
            setUltimosLab({ loading: false, error: '', data: [] });
            return;
        }
        setUltimosLab(prev => ({ ...prev, loading: true, error: '', data: [] }));
        api
            .get(`/laboratorios/${afiliacion}/parametros/ultimo`)
            .then(({ data }) => {
                const lista = Array.isArray(data?.data) ? data.data : [];
                setUltimosLab({ loading: false, error: '', data: lista });
            })
            .catch(() => {
                setUltimosLab({ loading: false, error: 'No se pudieron cargar los últimos parámetros.', data: [] });
            });
    };
    const closeLabDetail = () => {
        setLabDetalle({ isOpen: false, item: null });
        setUltimosLab({ loading: false, error: '', data: [] });
    };
    const openNutDetail = (item) => setNutDetalle({ isOpen: true, item });
    const closeNutDetail = () => setNutDetalle({ isOpen: false, item: null });
    const openPsiDetail = (item) => setPsiDetalle({ isOpen: true, item });
    const closePsiDetail = () => setPsiDetalle({ isOpen: false, item: null });
    const openFormDetail = (item) => setFormDetalle({ isOpen: true, item });
    const closeFormDetail = () => setFormDetalle({ isOpen: false, item: null });
    const openTurnoDetail = (item) => setTurnoDetalle({ isOpen: true, item });
    const closeTurnoDetail = () => setTurnoDetalle({ isOpen: false, item: null });
    const openFaltaDetail = (item) => setFaltaDetalle({ isOpen: true, item });
    const closeFaltaDetail = () => setFaltaDetalle({ isOpen: false, item: null });

    // Descargar PDF de laboratorio (mismo formato de ConsultaLaboratorios)
    const descargarPDFLaboratorio = (item) => {
        const it = item || {};
        const primerNombre = it.primer_nombre ?? it.primernombre ?? '';
        const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? '';
        const primerApellido = it.primer_apellido ?? it.primerapellido ?? '';
        const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? '';
        const sexo = it.sexo ?? '';
        const paciente = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ');
        const fecha = it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleDateString() : (it.fecha ? new Date(it.fecha).toLocaleDateString() : '');

        const excludeKeys = new Set([
          'id_laboratorio','idlaboratorio','no_afiliacion','noafiliacion','primer_nombre','primernombre','segundo_nombre','segundonombre','primer_apellido','primerapellido','segundo_apellido','segundoapellido','sexo','fecha_laboratorio','fecha','periodicidad','examen_realizado','causa_no_realizado','infeccion_acceso','complicacion_acceso','virologia','antigeno_hepatitis_c','antigeno_superficie','hiv','observacion','usuario_creacion','fecha_registro','idperlaboratorio','parametros'
        ]);
        const entries = Object.entries(it || {}).filter(([k,v]) => !excludeKeys.has(k) && v !== null && v !== undefined && v !== '');
        const pretty = (s) => String(s).replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase());
        let paramRows = '';
        if (Array.isArray(it.parametros) && it.parametros.length > 0) {
          paramRows = it.parametros.map((p) => `
            <tr>
              <td>${p.parametro ?? ''}</td>
              <td>${p.valor ?? ''}</td>
            </tr>
          `).join('');
        } else {
          paramRows = entries.map(([k,v]) => `
            <tr>
              <td>${pretty(k)}</td>
              <td>${typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v}</td>
            </tr>
          `).join('');
        }

        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Informe de Laboratorio ${it.id_laboratorio || it.idlaboratorio || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
              th { background: #f1f5f9; }
              hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
              @page { size: A4 landscape; margin: 16mm; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Laboratorio</h1>
            <div class="grid">
              <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
              <div class="row"><span class="label">ID Laboratorio:</span> ${it.id_laboratorio || it.idlaboratorio || ''}</div>
              <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${paciente}</div>
              <div class="row"><span class="label">Sexo:</span> ${sexo}</div>
              <div class="row"><span class="label">Fecha de Laboratorio:</span> ${fecha}</div>
              <div class="row"><span class="label">Periodicidad:</span> ${it.periodicidad || ''}</div>
            </div>
            <hr />
            <h2>Resultados/Estado</h2>
            <div class="grid">
              <div class="row"><span class="label">Examen Realizado:</span> ${it.examen_realizado ? 'Sí' : 'No'}</div>
              <div class="row"><span class="label">Causa No Realizado:</span> ${it.causa_no_realizado || '—'}</div>
              <div class="row"><span class="label">Infección de Acceso:</span> ${it.infeccion_acceso || '—'}</div>
              <div class="row"><span class="label">Complicación de Acceso:</span> ${it.complicacion_acceso || '—'}</div>
              <div class="row"><span class="label">Virología:</span> ${it.virologia || '—'}</div>
              <div class="row"><span class="label">Ag. Hepatitis C:</span> ${it.antigeno_hepatitis_c ? 'Positivo' : 'Negativo'}</div>
              <div class="row"><span class="label">Ag. Superficie:</span> ${it.antigeno_superficie ? 'Positivo' : 'Negativo'}</div>
              <div class="row"><span class="label">HIV:</span> ${it.hiv || '—'}</div>
            </div>
            <h2>Observaciones</h2>
            <div class="box">${(it.observacion || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>Parámetros</h2>
            <table>
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${paramRows || '<tr><td colspan="2">—</td></tr>'}
              </tbody>
            </table>
            <h2>Últimos parámetros previos</h2>
            <table>
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Valor</th>
                  <th>Fecha Lab.</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const data = Array.isArray(ultimosLab?.data) ? ultimosLab.data : [];
                  if (data.length === 0) return '<tr><td colspan="3">—</td></tr>';
                  return data.map(u => `
                    <tr>
                      <td>${u.parametro ?? ''}</td>
                      <td>${u.valor ?? ''}</td>
                      <td>${u.fecha_laboratorio ? new Date(u.fecha_laboratorio).toLocaleDateString() : ''}</td>
                    </tr>
                  `).join('');
                })()}
              </tbody>
            </table>
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Descargar PDF de Faltista
    const descargarPDFFaltista = (item) => {
        const it = item || {};
        const nombre = [it.nombres || '', it.apellidos || ''].filter(Boolean).join(' ');
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Detalle de Faltista ${it.noafiliacion || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              @page { size: A4 landscape; margin: 16mm; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Faltista</h1>
            <div class="grid">
              <div class="row"><span class="label">No. Afiliación:</span> ${it.noafiliacion ?? ''}</div>
              <div class="row" style="grid-column: 1 / -1"><span class="label">Nombre:</span> ${nombre}</div>
              <div class="row"><span class="label">Sexo:</span> ${it.sexo ?? ''}</div>
              <div class="row"><span class="label">Jornada:</span> ${it.jornada ?? ''}</div>
              <div class="row"><span class="label">Acceso Vascular:</span> ${it.accesovascular ?? ''}</div>
              <div class="row"><span class="label">Departamento:</span> ${it.departamento ?? ''}</div>
              <div class="row"><span class="label">Clínica:</span> ${it.clinica ?? ''}</div>
              <div class="row"><span class="label">Fecha Falta:</span> ${it.fechafalta ?? ''}</div>
            </div>
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Descargar PDF de Turno
    const descargarPDFTurno = (item) => {
        const it = item || {};
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Detalle de Turno ${it.id_turno || it.id_turno_cod || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              @page { size: A4 landscape; margin: 16mm; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Turno</h1>
            <div class="grid">
              <div class="row"><span class="label">No. Afiliación:</span> ${it.noafiliacion ?? ''}</div>
              <div class="row"><span class="label">Código Turno:</span> ${it.id_turno_cod || it.id_turno || ''}</div>
              <div class="row" style="grid-column: 1 / -1"><span class="label">Paciente:</span> ${it.nombrepaciente || ''}</div>
              <div class="row"><span class="label">Clínica:</span> ${it.nombre_clinica || ''}</div>
              <div class="row"><span class="label">Fecha:</span> ${it.fecha_turno ? new Date(it.fecha_turno).toLocaleString() : ''}</div>
            </div>
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Descargar PDF de Formulario
    const descargarPDFFormulario = (item) => {
        const it = item || {};
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Detalle de Formulario ${it.numero_formulario || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              @page { size: A4 landscape; margin: 16mm; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Formulario</h1>
            <div class="grid">
              <div class="row"><span class="label">Número Formulario:</span> ${it.numero_formulario ?? ''}</div>
              <div class="row"><span class="label">ID Historial:</span> ${it.id_historial ?? ''}</div>
              <div class="row"><span class="label">Sesiones Autorizadas:</span> ${it.sesiones_autorizadas_mes ?? ''}</div>
              <div class="row"><span class="label">Sesiones Realizadas:</span> ${it.sesiones_realizadas_mes ?? ''}</div>
              <div class="row"><span class="label">No Realizadas:</span> ${it.sesiones_no_realizadas_mes ?? ''}</div>
              <div class="row"><span class="label">Inicio Prestaciones:</span> ${it.inicio_prest_servicios ?? ''}</div>
              <div class="row"><span class="label">Fin Prestaciones:</span> ${it.fin_prest_servicios ?? ''}</div>
            </div>
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Descargar PDF de Psicología
    const descargarPDFPsicologia = (item) => {
        const it = item || {};
        // Construir nombre, sexo y fecha como en ConsultaPsicologia.jsx
        const pn = it.primer_nombre ?? it.primernombre ?? '';
        const sn = it.segundo_nombre ?? it.segundonombre ?? '';
        const pa = it.primer_apellido ?? it.primerapellido ?? '';
        const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
        const pacienteNombre = [pn, sn, pa, sa].filter(Boolean).join(' ');
        const sexoTxt = it.sexo ?? it.Sexo ?? '';
        const fechaTxt = it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : '';
        // Preparar sección KDQOL (dimensiones, promedio y metadatos)
        let kdqolObj = null;
        try { kdqolObj = typeof it.kdqol === 'string' ? JSON.parse(it.kdqol) : it.kdqol; } catch (_) { kdqolObj = null; }
        const dims = [
          { key: 'fisico_mental', label: 'Físico y Mental' },
          { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
          { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
          { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
          { key: 'vida_diaria', label: 'Vida Diaria' },
          // variantes posibles
          { key: 'puntaje_fisico', label: 'Puntaje Físico' },
          { key: 'puntaje_mental', label: 'Puntaje Mental' },
          { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
          { key: 'puntaje_carga', label: 'Puntaje Carga' },
          { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
        ];
        const getNum = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return isNaN(n) ? null : n; };
        const kdqolRows = [];
        let sum = 0, count = 0;
        if (kdqolObj && typeof kdqolObj === 'object') {
          dims.forEach(d => {
            const num = getNum(kdqolObj[d.key]);
            if (num != null) { kdqolRows.push({ label: d.label, value: num }); sum += num; count += 1; }
          });
        }
        const promedio = count > 0 ? Math.round((sum / count) * 100) / 100 : null;
        const kdqolMetaHtml = kdqolObj ? `<div class="meta" style="color:#64748b; font-size:12px; margin:4px 0 8px;">ID KDQOL: ${kdqolObj.id_kdqol ?? '—'} | Fecha aplicación: ${kdqolObj.fecha_aplicacion ? new Date(kdqolObj.fecha_aplicacion).toLocaleString() : '—'}</div>` : '';
        const kdqolTableHtml = kdqolRows.length > 0 ? `
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:left; border:1px solid #e5e7eb; padding:6px 8px; background:#f1f5f9;">Dimensión</th>
                <th style="text-align:left; border:1px solid #e5e7eb; padding:6px 8px; background:#f1f5f9;">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              ${kdqolRows.map(r => `<tr><td style='border:1px solid #e5e7eb; padding:6px 8px;'>${r.label}</td><td style='border:1px solid #e5e7eb; padding:6px 8px;'>${r.value}</td></tr>`).join('')}
            </tbody>
          </table>
          ${promedio != null ? `<div style="margin-top:8px;"><span class='label'>Promedio KDQOL:</span> ${promedio}</div>` : ''}
        ` : `<div class="box">—</div>`;
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Informe de Psicología ${it.id_informe || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
              @page { size: A4 landscape; margin: 16mm; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Psicología</h1>
            <div class="grid">
              <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
              <div class="row"><span class="label">ID Informe:</span> ${it.id_informe || ''}</div>
              <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${pacienteNombre}</div>
              <div class="row"><span class="label">Sexo:</span> ${sexoTxt}</div>
              <div class="row"><span class="label">Fecha:</span> ${fechaTxt}</div>
            </div>
            <h2>Motivo de Consulta</h2>
            <div class="box">${(it.motivo_consulta || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>Tipo de Consulta</h2>
            <div class="box">${(it.tipo_consulta || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>Pronóstico</h2>
            <div class="box">${(it.pronostico || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>Observaciones</h2>
            <div class="box">${(it.observaciones || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>KDQOL</h2>
            ${kdqolMetaHtml}
            ${kdqolTableHtml}
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Descargar PDF de Nutrición (formato similar al de Laboratorios)
    const descargarPDFNutricion = (item) => {
        const it = item || {};
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Informe de Nutrición ${it.id_informe || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
              h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
              h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .row { margin: 6px 0; }
              .label { font-weight: bold; }
              .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
              th { background: #f1f5f9; }
              hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
              .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
              .title { text-align: center; }
              @page { size: A4 landscape; margin: 16mm; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
            <h1 class="title">Detalle de Nutrición</h1>
            <div class="grid">
              <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
              <div class="row"><span class="label">ID Informe:</span> ${it.id_informe || ''}</div>
              <div class="row"><span class="label">Estado Nutricional:</span> ${it.estado_nutricional || ''}</div>
              <div class="row"><span class="label">IMC:</span> ${it.imc ?? ''}</div>
              <div class="row"><span class="label">Altura (cm):</span> ${it.altura_cm ?? ''}</div>
              <div class="row"><span class="label">Peso (kg):</span> ${it.peso_kg ?? ''}</div>
            </div>
            <h2>Motivo</h2>
            <div class="box">${(it.motivo_consulta || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <h2>Observaciones</h2>
            <div class="box">${(it.observaciones || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </body>
          </html>
        `;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 300);
    };

    // Botón para generar reporte PDF
    const handleGenerarReporte = async () => {
        if (!paciente) return;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const verde = '#2d6a4f';
        const rojo = '#dc3545';
        // Tipografía base más limpia
        doc.setFont('helvetica', 'normal');

        // Helper para obtener un PNG de QR en base64 (con múltiples fallbacks)
        const getQRBase64 = async (text) => {
            const toBase64 = async (resp) => {
                const blob = await resp.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            };
            const size = 180;
            // Primario: qrserver.com (menos restricciones CORS en general)
            try {
                const url1 = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
                const resp1 = await fetch(url1, { cache: 'no-store' });
                if (resp1.ok) return await toBase64(resp1);
            } catch {}
            // Fallback: Google Charts
            try {
                const url2 = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}`;
                const resp2 = await fetch(url2, { cache: 'no-store' });
                if (resp2.ok) return await toBase64(resp2);
            } catch {}
            // Fallback adicional: quickchart.io
            try {
                const url3 = `https://quickchart.io/qr?size=${size}&text=${encodeURIComponent(text)}`;
                const resp3 = await fetch(url3, { cache: 'no-store' });
                if (resp3.ok) return await toBase64(resp3);
            } catch {}
            return null;
        };

        // Encabezado con logo, título y QR
        // Logo (asegúrate de tener el logo en base64 o usa una imagen pública accesible)
        const logoImg = await getLogoBase64(); // función auxiliar para obtener el logo en base64
        // URL fija para abrir directamente la consulta del paciente por no_afiliacion
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
        const qp = [];
        if (paciente?.no_afiliacion) qp.push(`noafiliacion=${encodeURIComponent(paciente.no_afiliacion)}`);
        if (paciente?.dpi) qp.push(`dpi=${encodeURIComponent(paciente.dpi)}`);
        const qrTarget = `${origin}/layout/consulta-pacientes${qp.length ? `?${qp.join('&')}` : ''}`;
        const qrImgData = await getQRBase64(qrTarget);
        if (logoImg) {
            // Logo ligeramente más largo
            const logoW = 90, logoH = 60;
            const logoX = 40;
            const logoY = 30;
            doc.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
        }
        // Título principal centrado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(verde);
        doc.text('Reporte de Paciente', pageWidth / 2, 70, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setDrawColor(verde);
        doc.setLineWidth(1.6);
        doc.line(40, 95, pageWidth - 40, 95);
        // QR en la esquina superior derecha del encabezado (primera página)
        if (qrImgData) {
            const qrSize = 60;
            const qrX = pageWidth - 40 - qrSize; // margen derecho 40
            const qrY = 25; // cerca del borde superior
            doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
        }

        // Foto del paciente
        let fotoY = 120;
        let fotoX = 40;
        let yStart = fotoY;
        let fotoPaciente = await getFotoPacienteBase64(paciente);
        if (fotoPaciente) {
            // Foto menos alta para evitar apariencia estirada
            doc.addImage(fotoPaciente, 'JPEG', fotoX, fotoY, 100, 100, undefined, 'FAST');
        }
        // Datos personales en una sola columna (vertical), letra más pequeña y tabulado
        doc.setFontSize(8);
        doc.setTextColor(verde);
        let y = fotoY;
        const colX = fotoX + 120; // a la derecha de la foto
        const labelPad = 120; // separación etiqueta -> valor
        const lineH = 12; // altura de línea compacta

        const nombreCompleto = `${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim();

        const printPair = (label, value) => {
            doc.setTextColor(verde);
            doc.text(label, colX, y);
            doc.setTextColor(0,0,0);
            doc.text(String(value ?? ''), colX + labelPad, y);
            y += lineH;
        };

        printPair('Nombre:', nombreCompleto);
        printPair('No. Afiliación:', `${paciente.no_afiliacion || ''}`);
        printPair('DPI:', `${paciente.dpi || ''}`);
        printPair('Fecha Nacimiento:', `${formatearFecha(paciente.fecha_nacimiento) || ''}`);
        printPair('Edad:', `${calcularEdad(paciente.fecha_nacimiento)}`);
        printPair('Sexo:', `${paciente.sexo || ''}`);
        printPair('Fecha Ingreso:', `${formatearFecha(paciente.fecha_ingreso) || ''}`);
        printPair('Estancia Programa:', `${calcularEstanciaPrograma(paciente.fecha_ingreso)}`);
        printPair('Jornada:', `${paciente.jornada_descripcion || ''}`);
        printPair('Sesiones Autorizadas:', `${paciente.sesiones_autorizadas_mes || ''}`);
        printPair('Dirección:', `${paciente.direccion || ''}`);

        // Observaciones bajo la lista
        const afterColsY = y + 2;
        doc.setTextColor(verde); doc.text('Observaciones:', colX, afterColsY);
        doc.setTextColor(0,0,0);
        doc.text(`${paciente.observaciones || ''}`, colX + labelPad, afterColsY, { maxWidth: (pageWidth - 40) - (colX + labelPad) });

        // Secciones con soporte multi-página
        const pageHeight = doc.internal.pageSize.getHeight();
        const leftX = 40;
        const rightX = pageWidth - 40;
        let yCursor = Math.max(afterColsY + 30, 280);

        // Encabezado/pie para páginas adicionales
        const drawPageHeader = () => {
            if (logoImg) {
                const logoW = 90, logoH = 70; // respeta el ajuste actual
                const logoX = 40, logoY = 30;
                doc.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(verde);
            doc.text('Reporte de Paciente', pageWidth / 2, 70, { align: 'center' });
            // QR en la esquina superior derecha del encabezado (todas las páginas)
            if (qrImgData) {
                const qrSize = 60;
                const qrX = pageWidth - 40 - qrSize; // margen derecho 40
                const qrY = 25; // cerca del borde superior
                doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
            }
            doc.setFont('helvetica', 'normal');
            doc.setDrawColor(verde);
            doc.setLineWidth(1.6);
            doc.line(40, 95, pageWidth - 40, 95);
        };
        const drawPageFooter = () => {
            doc.setDrawColor(rojo);
            doc.setLineWidth(1);
            doc.line(40, pageHeight - 60, pageWidth - 40, pageHeight - 60);
            doc.setFontSize(10);
            doc.setTextColor(rojo);
            doc.text('Sistema de Gestión de Pacientes', pageWidth / 2, pageHeight - 40, { align: 'center' });
            doc.setTextColor(100);
        };
        const addPage = () => {
            // cerrar la página actual con pie
            drawPageFooter();
            doc.addPage();
            drawPageHeader();
            yCursor = 110;
        };

        // Utilidad para asegurar espacio, si no cabe, nueva página
        const ensureSpace = (needed) => {
            if (yCursor + needed <= pageHeight - 60) return true;
            addPage();
            return true;
        };

        const drawSectionTitle = (title) => {
            ensureSpace(30);
            // Barra verde del ancho de la tabla
            doc.setFontSize(11);
            const padX = 8;
            const th = 16;
            const tableWidth = rightX - leftX;
            doc.setFillColor(45, 106, 79); // verde
            doc.setDrawColor(45, 106, 79);
            doc.rect(leftX, yCursor - (th - 6), tableWidth, th, 'F');
            doc.setTextColor(255,255,255);
            doc.text(title, leftX + padX, yCursor + 2);
            // subrayado fino
            doc.setDrawColor(209, 250, 229);
            doc.setLineWidth(0.6);
            doc.line(leftX, yCursor + 8, rightX, yCursor + 8);
            yCursor += 12;
            doc.setFontSize(8.5);
            doc.setTextColor(0,0,0);
            return true;
        };

        const drawHeader = (cols) => {
            const headerText = cols.map(c => String(c ?? '')).join('  |  ');
            if (!hasSpace(13)) return false;
            doc.setFont(undefined, 'bold');
            doc.text(headerText, leftX, yCursor);
            doc.setFont(undefined, 'normal');
            yCursor += 11;
            return true;
        };

        const drawRow = (cols) => {
            const line = cols.map(c => String(c ?? '')).join('  |  ');
            if (!hasSpace(12)) return false;
            doc.text(line, leftX, yCursor);
            yCursor += 10;
            return true;
        };

        const endSection = () => { ensureSpace(44); yCursor += 44; };

        // Tabla con encabezado, cebra y bordes por celda
        const drawTable = (title, headers, rows, aligns = []) => {
            const tableWidth = rightX - leftX;
            const colCount = headers.length;
            const colWidth = tableWidth / colCount;
            const headerH = 14;
            const rowH = 12;
            const needed = 30 /*title*/ + headerH + 12;
            ensureSpace(needed);

            // Título
            if (!drawSectionTitle(title)) return false;

            // Encabezado
            doc.setFillColor(241, 245, 249); // bg header
            doc.setDrawColor(203, 213, 225);
            doc.rect(leftX, yCursor, tableWidth, headerH, 'F');
            doc.setFont(undefined, 'bold');
            headers.forEach((h, i) => {
                const cellX = leftX + (i * colWidth);
                const text = String(h);
                const tw = doc.getTextWidth(text);
                const textX = cellX + (colWidth - tw) / 2; // centrar encabezado
                const textY = yCursor + headerH - 4;
                doc.text(text, textX, textY);
            });
            // borde superior
            doc.rect(leftX, yCursor, tableWidth, headerH);
            doc.setFont(undefined, 'normal');
            yCursor += headerH;

            // Filas
            doc.setFontSize(8);
            rows.forEach((r, idx) => {
                // zebra
                if (yCursor + rowH > pageHeight - 60) {
                    addPage();
                    // repetir encabezado de sección como continuación
                    drawSectionTitle(`${title} (cont.)`);
                    // repetir encabezado de tabla (centrado)
                    doc.setFillColor(241, 245, 249);
                    doc.setDrawColor(203, 213, 225);
                    doc.rect(leftX, yCursor, tableWidth, headerH, 'F');
                    doc.setFont(undefined, 'bold');
                    headers.forEach((h, i) => {
                        const cellX = leftX + (i * colWidth);
                        const text = String(h);
                        const tw = doc.getTextWidth(text);
                        const textX = cellX + (colWidth - tw) / 2; // centrar encabezado
                        const textY = yCursor + headerH - 4;
                        doc.text(text, textX, textY);
                    });
                    doc.rect(leftX, yCursor, tableWidth, headerH);
                    doc.setFont(undefined, 'normal');
                    yCursor += headerH;
                    doc.setFontSize(8);
                }
                const rowY = yCursor;
                if (idx % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(leftX, rowY, tableWidth, rowH, 'F');
                }
                // celdas y textos
                r.forEach((cell, i) => {
                    const cellX = leftX + (i * colWidth);
                    const text = String(cell ?? '');
                    const pad = 4;
                    let textX = cellX + pad;
                    if (aligns[i] === 'center') {
                        const tw = doc.getTextWidth(text);
                        textX = cellX + (colWidth - tw) / 2;
                    } else if (aligns[i] === 'right') {
                        const tw = doc.getTextWidth(text);
                        textX = cellX + colWidth - tw - pad;
                    }
                    const textY = rowY + rowH - 4;
                    doc.text(text, textX, textY);
                    // borde de celda
                    doc.setDrawColor(226, 232, 240);
                    doc.rect(cellX, rowY, colWidth, rowH);
                });
                yCursor += rowH;
            });

            endSection();
            return true;
        };

        // Turnos: Afiliación, Paciente, Clínica, Fecha, Código Turno
        try {
            const turnosRows = (turnos || []).slice(0, 3).map(t => [
                t.noafiliacion || '',
                t.nombrepaciente || '',
                t.nombre_clinica || '',
                t.fecha_turno ? new Date(t.fecha_turno).toLocaleDateString('es-ES') : '',
                t.id_turno_cod || t.id_turno || ''
            ]);
            if (turnosRows.length) drawTable('Turnos', ['Afiliación','Paciente','Clínica','Fecha','Código'], turnosRows, ['center','center','center','center','center']);
        } catch {}

        // Faltistas: Afiliación, Nombre, Sexo, Fecha Falta, Clínica
        try {
            const faltasRows = (faltistas || []).slice(0, 3).map(f => [
                f.noafiliacion || '',
                [f.nombres||'', f.apellidos||''].filter(Boolean).join(' '),
                f.sexo || '',
                f.fechafalta || '',
                f.clinica || ''
            ]);
            if (faltasRows.length) drawTable('Faltistas', ['Afiliación','Nombre','Sexo','Fecha Falta','Clínica'], faltasRows, ['center','center','center','center','center']);
        } catch {}

        // Formularios: Número, Sesiones (A/R/NR), Periodo
        try {
            const formRows = (formularios || []).slice(0, 3).map(fm => [
                fm.numero_formulario || '',
                `${fm.sesiones_autorizadas_mes ?? ''}/${fm.sesiones_realizadas_mes ?? ''}/${fm.sesiones_no_realizadas_mes ?? ''}`,
                `${formatearFecha(fm.inicio_prest_servicios) || ''} - ${formatearFecha(fm.fin_prest_servicios) || ''}`
            ]);
            if (formRows.length) drawTable('Formularios', ['Número','A/R/NR','Periodo'], formRows, ['center','center','center']);
        } catch {}

        // Referencias: Últimos 3 por fecha
        try {
            const refSorted = (referencias || []).slice().sort((a, b) => {
                const da = a.fecha_referencia ? new Date(a.fecha_referencia).getTime() : (a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0);
                const db = b.fecha_referencia ? new Date(b.fecha_referencia).getTime() : (b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0);
                return db - da;
            });
            const refRows = refSorted.slice(0, 3).map(r => [
                r.id_referencia || '',
                r.fecha_referencia ? new Date(r.fecha_referencia).toLocaleDateString('es-ES') : '',
                r.especialidad_referencia || '',
                r.motivo_traslado || '',
                r.id_medico || ''
            ]);
            if (refRows.length) drawTable('Referencias', ['ID','Fecha','Especialidad','Motivo','Médico'], refRows, ['center','center','center','center','center']);
        } catch {}

        // (Eliminado resumen general de Laboratorios) – se mostrará únicamente el último laboratorio y sus parámetros

        // Nutrición: ID, Motivo, Estado, (sin fecha en tabla), mostrar IMC
        try {
            const nutRows = (nutricion || []).slice(0, 1).map(n => [
                n.id_informe || '',
                n.motivo_consulta || '',
                n.estado_nutricional || '',
                n.imc ?? ''
            ]);
            if (nutRows.length) drawTable('Nutrición', ['ID','Motivo','Estado','IMC'], nutRows, ['center','center','center','center']);

            // Comparativo Nutrición: valor actual vs último previo por campo
            const pickNutDate = (it) => it.fecha_creacion || it.fecha || it.fecha_informe || '';
            if (Array.isArray(nutricion) && nutricion.length > 0) {
                const latestNut = nutricion[0];
                const fieldsNut = [
                    { key: 'estado_nutricional', label: 'Estado Nutricional' },
                    { key: 'imc', label: 'IMC' },
                    { key: 'altura_cm', label: 'Altura (cm)' },
                    { key: 'peso_kg', label: 'Peso (kg)' },
                    { key: 'motivo_consulta', label: 'Motivo' },
                    { key: 'observaciones', label: 'Observaciones' },
                ];
                const prevMapNut = new Map(); // key -> { valor, fecha }
                // recorrer previos buscando el último valor registrado por campo
                for (let i = 1; i < nutricion.length; i++) {
                    const it = nutricion[i] || {};
                    const f = pickNutDate(it);
                    const fStr = f ? new Date(f).toLocaleDateString('es-ES') : '';
                    for (const fdef of fieldsNut) {
                        if (!prevMapNut.has(fdef.key) && it[fdef.key] != null) {
                            prevMapNut.set(fdef.key, { valor: String(it[fdef.key]), fecha: fStr });
                        }
                    }
                    if (prevMapNut.size === fieldsNut.length) break;
                }
                const compRowsNut = fieldsNut.map(({ key, label }) => {
                    const actual = latestNut[key] != null ? String(latestNut[key]) : '';
                    return [label, actual];
                });
                if (compRowsNut.some(r => String(r[1]) !== '')) {
                    drawTable('Campos de Nutrición', ['Campo','Valor actual'], compRowsNut, ['center','center']);
                }
                // (Eliminado) Compacto: últimos previos por campo (Nutrición)
            }
        } catch {}

        // Psicología: Últimos 3 (por fecha), con salto de página si es necesario
        try {
            const psiSorted = (psicologia || []).slice().sort((a, b) => {
                const fa = a.fecha_creacion || a.fecha || a.fecha_informe || '';
                const fb = b.fecha_creacion || b.fecha || b.fecha_informe || '';
                const da = fa ? new Date(fa).getTime() : 0;
                const db = fb ? new Date(fb).getTime() : 0;
                return db - da;
            });
            const psiRows = psiSorted.slice(0, 1).map(p => [
                p.id_informe || '',
                (p.fecha_creacion || p.fecha || p.fecha_informe) ? new Date(p.fecha_creacion || p.fecha || p.fecha_informe).toLocaleDateString('es-ES') : '',
                p.tipo_consulta || '',
                p.tipo_atencion || '',
                p.motivo_consulta || ''
            ]);
            if (psiRows.length) drawTable('Psicología', ['ID','Fecha','Tipo','Atención','Motivo'], psiRows, ['center','center','center','center','center']);

            // Comparativo Psicología: valor actual vs último previo por campo
            const pickPsiDate = (it) => it.fecha_creacion || it.fecha || it.fecha_informe || '';
            if (Array.isArray(psiSorted) && psiSorted.length > 0) {
                const latestPsi = psiSorted[0];
                const fieldsPsi = [
                    { key: 'tipo_consulta', label: 'Tipo' },
                    { key: 'tipo_atencion', label: 'Atención' },
                    { key: 'kdqol', label: 'KDQOL' },
                    { key: 'pronostico', label: 'Pronóstico' },
                    { key: 'motivo_consulta', label: 'Motivo' },
                    { key: 'observaciones', label: 'Observaciones' },
                ];
                const prevMapPsi = new Map(); // key -> { valor, fecha }
                for (let i = 1; i < psiSorted.length; i++) {
                    const it = psiSorted[i] || {};
                    const f = pickPsiDate(it);
                    const fStr = f ? new Date(f).toLocaleDateString('es-ES') : '';
                    for (const fdef of fieldsPsi) {
                        if (!prevMapPsi.has(fdef.key) && it[fdef.key] != null) {
                            prevMapPsi.set(fdef.key, { valor: String(it[fdef.key]), fecha: fStr });
                        }
                    }
                    if (prevMapPsi.size === fieldsPsi.length) break;
                }
                const compRowsPsi = fieldsPsi.map(({ key, label }) => {
                    const actual = latestPsi[key] != null ? String(latestPsi[key]) : '';
                    return [label, actual];
                });
                if (compRowsPsi.some(r => String(r[1]) !== '')) {
                    drawTable('Campos de Psicología', ['Campo','Valor actual'], compRowsPsi, ['center','center']);
                }
                // KDQOL: si el último informe tiene datos, mostrar tabla de dimensiones
                try {
                    let kdqolObj = null;
                    try {
                        kdqolObj = typeof latestPsi.kdqol === 'string' ? JSON.parse(latestPsi.kdqol) : latestPsi.kdqol;
                    } catch (_) { kdqolObj = null; }
                    const dims = [
                        { key: 'fisico_mental', label: 'Físico y Mental' },
                        { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
                        { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
                        { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
                        { key: 'vida_diaria', label: 'Vida Diaria' },
                        // claves alternativas posibles
                        { key: 'puntaje_fisico', label: 'Puntaje Físico' },
                        { key: 'puntaje_mental', label: 'Puntaje Mental' },
                        { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
                        { key: 'puntaje_carga', label: 'Puntaje Carga' },
                        { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
                    ];
                    const getNum = (v) => {
                        const n = typeof v === 'string' ? parseFloat(v) : v;
                        return isNaN(n) ? null : n;
                    };
                    const kdqolRows = [];
                    let sum = 0, count = 0;
                    const pushDim = (obj) => {
                        dims.forEach(d => {
                            const num = getNum(obj?.[d.key]);
                            if (num != null) { kdqolRows.push([d.label, String(num)]); sum += num; count += 1; }
                        });
                    };
                    // 1) Intentar desde objeto kdqol
                    if (kdqolObj && typeof kdqolObj === 'object') {
                        pushDim(kdqolObj);
                    }
                    // 2) Fallback: intentar desde campos directos en latestPsi si no se obtuvo nada
                    if (!kdqolRows.length) {
                        pushDim(latestPsi || {});
                    }
                    if (kdqolRows.length) {
                        drawTable('KDQOL', ['Dimensión','Puntaje'], kdqolRows, ['center','center']);
                        // Agregar promedio si fue posible calcularlo
                        const promedio = count > 0 ? Math.round((sum / count) * 100) / 100 : null;
                        if (promedio != null) {
                            drawTable('Promedio KDQOL', ['Promedio'], [[String(promedio)]], ['center']);
                        }
                    }
                } catch {}
                // (Eliminado) Tabla 'Últimos campos previos (Psicología)'
            }
        } catch {}

        // Laboratorio: Detalle del último registro con parámetros completos
        try {
            const pickDate = (it) => it.fecha_laboratorio || it.fecha || it.fecha_creacion || '';
            const latest = (laboratorios || []).slice().sort((a,b) => {
                const da = pickDate(a) ? new Date(pickDate(a)).getTime() : 0;
                const db = pickDate(b) ? new Date(pickDate(b)).getTime() : 0;
                return db - da;
            })[0];
            if (latest) {
                // Construir filas de parámetros: valor actual (de este laboratorio) + fecha del último previo
                let paramRows = [];
                let prevMap = new Map(); // parametro -> { valor, fecha }
                try {
                    const afili = latest.no_afiliacion || latest.noafiliacion || '';
                    if (afili) {
                        const { data } = await api.get(`/laboratorios/${afili}/parametros/ultimo`);
                        const lista = Array.isArray(data?.data) ? data.data : [];
                        for (const p of lista) {
                            const key = String(p.parametro ?? '').trim();
                            const f = p.fecha_laboratorio || p.fecha_registro || p.fecha_creacion || '';
                            const fechaPrev = f ? new Date(f).toLocaleDateString('es-ES') : '';
                            const valorPrev = p.valor != null ? String(p.valor) : '';
                            if (key) prevMap.set(key, { valor: valorPrev, fecha: fechaPrev });
                        }
                    }
                } catch {}
                if (Array.isArray(latest.parametros) && latest.parametros.length > 0) {
                    paramRows = latest.parametros.map(p => {
                        const nombre = String(p.parametro ?? '').trim();
                        const valorActual = String(p.valor ?? '');
                        const prev = prevMap.get(nombre) || { valor: '', fecha: '' };
                        return [nombre, valorActual, prev.valor, prev.fecha];
                    });
                } else {
                    // Fallback si no hay arreglo de parametros en el último laboratorio: construir desde entries
                    const exclude = new Set(['id_laboratorio','idlaboratorio','no_afiliacion','noafiliacion','primer_nombre','primernombre','segundo_nombre','segundonombre','primer_apellido','primerapellido','segundo_apellido','segundoapellido','sexo','fecha_laboratorio','fecha','periodicidad','examen_realizado','causa_no_realizado','infeccion_acceso','complicacion_acceso','virologia','antigeno_hepatitis_c','antigeno_superficie','hiv','observacion','usuario_creacion','fecha_registro','idperlaboratorio','parametros']);
                    const entries = Object.entries(latest).filter(([k,v]) => !exclude.has(k) && v !== null && v !== undefined && v !== '');
                    const pretty = (s) => String(s).replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase());
                    paramRows = entries.map(([k,v]) => {
                        const nombre = pretty(k);
                        const valorActual = typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v);
                        const fechaPrev = prevMap.get(nombre) || '';
                        return [nombre, valorActual, fechaPrev];
                    });
                }
                // Encabezado breve del laboratorio
                const miniRows = [[
                    latest.no_afiliacion || '',
                    (pickDate(latest) ? new Date(pickDate(latest)).toLocaleDateString('es-ES') : ''),
                    latest.periodicidad || '',
                    latest.examen_realizado ? 'Sí' : 'No'
                ]];
                drawTable('Último Laboratorio Registrado', ['Afiliación','Fecha','Periodicidad','Examen'], miniRows, ['center','center','center','center']);
                // Parámetros completos (Parámetro, Valor actual, Último valor previo, Fecha último previo)
                if (paramRows.length) {
                    drawTable('Parámetros de Laboratorio', ['Parámetro','Valor actual','Último valor previo','Fecha último previo'], paramRows, ['center','center','center','center']);
                }

                // Últimos parámetros previos por parámetro (vista compacta como en detalle)
                try {
                    const prevRows = Array.from(prevMap.entries())
                        .filter(([k, v]) => k && v && (v.valor !== undefined || v.fecha !== undefined))
                        .map(([k, v]) => [k, v.valor || '', v.fecha || ''])
                        .sort((a, b) => a[0].localeCompare(b[0], 'es'));
                    if (prevRows.length) {
                        drawTable('Últimos parámetros previos por parámetro', ['Parámetro','Último valor previo','Fecha'], prevRows, ['center','center','center']);
                    }
                } catch {}
            }
        } catch {}

        // QR ya se muestra en el encabezado de cada página

        // Pie de página
        doc.setDrawColor(rojo);
        doc.setLineWidth(1);
        doc.line(40, pageHeight - 60, pageWidth - 40, pageHeight - 60);
        doc.setFontSize(10);
        doc.setTextColor(rojo);
        doc.text('Sistema de Gestión de Pacientes', pageWidth / 2, pageHeight - 40, { align: 'center' });
        doc.setTextColor(100);

        doc.save(`reporte_paciente_${paciente.no_afiliacion}.pdf`);
    };

    // Botón para descargar carné
    const handleDescargarCarnet = async () => {
        if (!paciente || !paciente.no_afiliacion) return;
        const directUrl = `http://localhost:3001/carnet/forzar/${encodeURIComponent(paciente.no_afiliacion)}`;
        try {
            // Intento 1: descarga directa por enlace (más compatible y evita CORS/Blob issues)
            const a = document.createElement('a');
            a.href = directUrl;
            a.download = `carnet_${paciente.no_afiliacion}.pdf`;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err1) {
            // Fallback: fetch como blob con mejor diagnóstico
            try {
                const response = await fetch(directUrl, { method: 'GET' });
                if (!response.ok) {
                    const txt = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status} ${response.statusText} ${txt}`);
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a2 = document.createElement('a');
                a2.href = url;
                a2.download = `carnet_${paciente.no_afiliacion}.pdf`;
                document.body.appendChild(a2);
                a2.click();
                a2.remove();
                window.URL.revokeObjectURL(url);
            } catch (err2) {
                setShowModal(true);
                setModalMessage(`No se pudo descargar o generar el carné. Detalle: ${String(err2 && err2.message ? err2.message : err2)}`);
                setModalType('error');
            }
        }
    };

    return (
        <Container fluid className="bg-white dark:bg-slate-900 min-h-screen">
            <CustomModal
                show={showModal}
                onClose={handleCloseModal}
                title={modalTitle || (modalType === 'success' ? 'Éxito' : 'Error')}
                message={modalMessage}
                type={modalType}
            />
            <Row>
                <Col md="12">
                    <Card className="bg-white dark:bg-slate-800">
                        <Card.Body className="dark:bg-slate-800 dark:text-gray-200">
                            <div className="dark:bg-slate-800 dark:text-gray-200">
                                <div className="flex flex-col items-center">
                                    {/* Header al estilo AsignarTurno */}
                                    <div className="w-full text-center mb-6">
                                        <div className="flex items-center justify-center gap-6 flex-wrap">
                                            <img
                                                src={logoClinica}
                                                alt="Logo de la clínica"
                                                className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                                            />
                                            <h1 className="text-3xl font-bold text-green-800 dark:text-white">
                                                Consulta de Pacientes
                                            </h1>
                                        </div>
                                    </div>

                                    {/* Controles de búsqueda centrados */}
                                    <form onSubmit={buscarPacientes} className="flex items-center gap-4 flex-wrap mb-6 w-full justify-center">
                                    <input
                                        placeholder="Número de Afiliación"
                                        type="text"
                                        name="noafiliacion"
                                        value={busqueda.noafiliacion}
                                        onChange={handleBusquedaChange}
                                        disabled={Boolean(busqueda.dpi)}
                                        className="text-lg px-4 py-2 w-56 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />

                                    <input
                                        placeholder="DPI"
                                        type="text"
                                        name="dpi"
                                        value={busqueda.dpi}
                                        onChange={(e) => {
                                        const onlyDigits = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                                        setBusqueda(prev => ({ ...prev, dpi: onlyDigits }));
                                        }}
                                        disabled={Boolean(busqueda.noafiliacion)}
                                        inputMode="numeric"
                                        pattern="\d{13}"
                                        maxLength={13}
                                        onKeyDown={(e) => {
                                        if (["e", "E", "+", "-", ".", ",", " "].includes(e.key)) e.preventDefault();
                                        }}
                                        onPaste={(e) => {
                                        const t = (e.clipboardData.getData('text') || '').trim();
                                        if (/[^0-9]/.test(t)) e.preventDefault();
                                        }}
                                        className="text-lg px-4 py-2 w-56 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />

                                    <div className="flex gap-4">
                                        <button
                                        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
                                        type="submit"
                                        disabled={loading}
                                        >
                                        {loading ? 'Buscando...' : 'Buscar'}
                                        </button>
                                        <button
                                        className="bg-red-600 hover:bg-red-700 text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-red-600 dark:hover:bg-red-700"
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


                            {/* BLOQUE DE FOTO Y DATOS CLAVE */}
                            {paciente && (
                                <section className="w-full my-10">
                                    <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/60 dark:from-slate-800 dark:to-slate-800/60 shadow-lg p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                            {/* Foto */}
                                            <div className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border-4 border-green-700/70 shadow-xl flex items-center justify-center flex-shrink-0">
                                        {fotoCargando ? (
                                            <span>Cargando foto...</span>
                                        ) : (
                                            <img
                                                alt="Foto del paciente"
                                                src={paciente.url_foto ? `http://localhost:3001/fotos/${paciente.url_foto}?${Date.now()}` : avatarDefault}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = avatarDefault;
                                                }}
                                            />
                                        )}
                                            </div>
                                            {/* Modal Detalle Nutrición */}
                                            {nutDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle Nutrición</h3>
                                                                <button onClick={closeNutDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = nutDetalle.item || {};
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">ID Informe:</span> {it.id_informe ?? ''}</div>
                                                                            <div><span className="font-semibold">IMC:</span> {it.imc ?? ''}</div>
                                                                            <div className="md:col-span-2"><span className="font-semibold">Motivo:</span> {it.motivo_consulta ?? ''}</div>
                                                                            <div><span className="font-semibold">Estado Nutricional:</span> {it.estado_nutricional ?? ''}</div>
                                                                            <div><span className="font-semibold">Altura (cm):</span> {it.altura_cm ?? ''}</div>
                                                                            <div><span className="font-semibold">Peso (kg):</span> {it.peso_kg ?? ''}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">Observaciones:</span>
                                                                            <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{it.observaciones || '—'}</div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFNutricion(nutDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closeNutDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Datos a la derecha */}
                                            <div className="flex-1 flex flex-col gap-4 w-full">
                                                {/* Nombre completo */}
                                                <h2 className="m-0 font-extrabold text-2xl sm:text-3xl md:text-4xl text-green-800 dark:text-green-300 tracking-tight">
                                                    {`${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim()}
                                                </h2>
                                                {/* Datos clave como badges */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">No. Afiliación:</strong> {paciente.no_afiliacion}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">DPI:</strong> {paciente.dpi}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">No. Proveedor:</strong> {paciente.no_paciente_proveedor || '-' }
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">Acceso:</strong> {paciente.acceso_descripcion || '-' }
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">Formulario:</strong> {paciente.numero_formulario_activo || '-' }
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-green-200 dark:border-slate-700 text-green-700 dark:text-white">
                                                        <strong className="text-green-700 dark:text-white">Sesiones/mes:</strong> {paciente.sesiones_autorizadas_mes || '-' }
                                                    </span>
                                                </div>
                                                {/* Botones de acciones */}
                                                <div className="flex gap-3 flex-wrap pt-2">
                                                    <button
                                                        onClick={handleGenerarReporte}
                                                        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
                                                        type="button"
                                                    >
                                                        Generar Reporte
                                                    </button>
                                                    <button
                                                        onClick={handleDescargarCarnet}
                                                        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
                                                        type="button"
                                                    >
                                                        Descargar Carnet
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* PESTAÑAS / BOTONES HORIZONTALES (estilo tabs) */}
                            {paciente && (
                                <div className="w-full mt-4">
                                    <nav className="w-full mb-4" role="tablist" aria-label="Secciones de paciente">
                                        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-x-auto px-2">
                                            <div className="flex items-center justify-center gap-0 flex-wrap">
                                                {['Datos Personales', 'Historial', 'Referencias', 'Nutrición', 'Psicologia', 'Formularios', 'Turnos', 'Faltistas', 'Laboratorios'].map((tab, idx, arr) => {
                                                    const active = selectedTab === tab;
                                                    const panelId = `panel-${tab.replace(/\s+/g, '-')}`;
                                                    const isFirst = idx === 0;
                                                    const isLast = idx === arr.length - 1;
                                                    // Iconos inline por pestaña
                                                    const icon = (() => {
                                                        const cls = `h-5 w-5 ${active ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`;
                                                        switch (tab) {
                                                            case 'Datos Personales':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                                        <circle cx="12" cy="7" r="4"/>
                                                                    </svg>
                                                                );
                                                            case 'Historial':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M3 12a9 9 0 1 0 9-9"/>
                                                                        <path d="M3 3v6h6"/>
                                                                        <path d="M12 7v5l3 3"/>
                                                                    </svg>
                                                                );
                                                            case 'Referencias':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07L11 4"/>
                                                                        <path d="M14 11a5 5 0 0 0-7.07 0L3.39 14.54a5 5 0 0 0 7.07 7.07L13 20"/>
                                                                    </svg>
                                                                );
                                                            case 'Nutrición':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M12 2v20"/>
                                                                        <path d="M7 7h10"/>
                                                                        <path d="M5 12h14"/>
                                                                        <path d="M7 17h10"/>
                                                                    </svg>
                                                                );
                                                            case 'Psicologia':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M20 12a8 8 0 1 0-15.5 2H3v4h4v-2h3a8 8 0 0 0 10-4z"/>
                                                                    </svg>
                                                                );
                                                            case 'Formularios':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                                        <path d="M14 2v6h6"/>
                                                                        <path d="M16 13H8"/>
                                                                        <path d="M16 17H8"/>
                                                                        <path d="M10 9H8"/>
                                                                    </svg>
                                                                );
                                                            case 'Turnos':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <circle cx="12" cy="12" r="10"/>
                                                                        <path d="M12 6v6l4 2"/>
                                                                    </svg>
                                                                );
                                                            case 'Faltistas':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                                        <circle cx="9" cy="7" r="4"/>
                                                                        <path d="M22 11h-6"/>
                                                                    </svg>
                                                                );
                                                            case 'Laboratorios':
                                                                return (
                                                                    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M6 2v6l-3 7a4 4 0 0 0 4 5h10a4 4 0 0 0 4-5l-3-7V2"/>
                                                                        <path d="M6 6h12"/>
                                                                    </svg>
                                                                );
                                                            default:
                                                                return null;
                                                        }
                                                    })();
                                                    return (
                                                        <button
                                                            key={tab}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={active}
                                                            aria-controls={panelId}
                                                            onClick={() => setSelectedTab(tab)}
                                                            className={`${active
                                                                ? 'text-green-700 dark:text-green-400 border-b-2 border-green-600 bg-green-50/40 dark:bg-slate-700/40'
                                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border-b-2 border-transparent'} px-5 py-3 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl' : ''}`}
                                                        >
                                                            <span className="inline-flex items-center gap-2">
                                                                <span>{tab}</span>
                                                                {icon}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </nav>

                                    {/* Contenido de pestañas */}
                                    {selectedTab === 'Datos Personales' && (() => {
                                        // Lista de campos a mostrar (etiqueta y valor)
                                        const camposBase = [
                                            { label: 'No. Afiliación', value: paciente.no_afiliacion || '' },
                                            { label: 'DPI', value: paciente.dpi || '' },
                                            { label: 'No. Paciente Proveedor', value: paciente.no_paciente_proveedor || '' },
                                            { label: 'Primer Nombre', value: paciente.primer_nombre || '' },
                                            { label: 'Segundo Nombre', value: paciente.segundo_nombre || '' },
                                            { label: 'Otros Nombres', value: paciente.otros_nombres || '' },
                                            { label: 'Primer Apellido', value: paciente.primer_apellido || '' },
                                            { label: 'Segundo Apellido', value: paciente.segundo_apellido || '' },
                                            { label: 'Apellido de Casada', value: paciente.apellido_casada || '' },
                                            { label: 'Edad', value: paciente.edad || calcularEdad(paciente.fecha_nacimiento) },
                                            { label: 'Fecha de Nacimiento', value: formatearFecha(paciente.fecha_nacimiento) || '' },
                                            { label: 'Sexo', value: paciente.sexo || '' },
                                            { label: 'Dirección', value: paciente.direccion || '' },
                                            { label: 'Fecha Ingreso', value: formatearFecha(paciente.fecha_ingreso) || '' },
                                            { label: 'Departamento', value: paciente.departamento_nombre || '' },
                                            { label: 'Estado', value: paciente.estado_descripcion || '' },
                                            { label: 'Acceso Vascular', value: paciente.acceso_descripcion || '' },
                                            { label: 'Número de Formulario Activo', value: paciente.numero_formulario_activo || '' },
                                            { label: 'Jornada', value: paciente.jornada_descripcion || '' },
                                            { label: 'Sesiones Autorizadas Mes', value: paciente.sesiones_autorizadas_mes || '' },
                                            { label: 'Fecha Registro', value: formatearFecha(paciente.fecha_registro) || '' },
                                            { label: 'Usuario Creación', value: paciente.usuario_creacion || '' },
                                            { label: 'Fecha Creación', value: formatearFecha(paciente.fecha_creacion) || '' },
                                            { label: 'Inicio Prestación Servicios', value: formatearFecha(paciente.inicio_prest_servicios) || '' },
                                            { label: 'Fin Prestación Servicios', value: formatearFecha(paciente.fin_prest_servicios) || '' },
                                            { label: 'Estancia Programa', value: calcularEstanciaPrograma(paciente.fecha_ingreso) },
                                        ];
                                        let campos = [...camposBase];
                                        const mitad = Math.ceil(campos.length / 2);
                                        const izquierda = campos.slice(0, mitad);
                                        const derecha = campos.slice(mitad);
                                        return (
                                            <section id="panel-Datos-Personales" role="tabpanel" className="w-full mb-10">
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/60 dark:from-slate-800 dark:to-slate-800/60 shadow-sm p-6 md:p-8">
                                                    <h4 className="text-xl font-bold text-green-800 dark:text-green-300 mb-4">
                                                        Datos Personales
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {izquierda.map((campo, idx) => (
                                                            <div key={`izq-${idx}`} className="rounded-lg bg-white/70 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 p-3">
                                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{campo.label}</div>
                                                                <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{campo.value || '-'}</div>
                                                            </div>
                                                        ))}
                                                        {derecha.map((campo, idx) => (
                                                            <div key={`der-${idx}`} className="rounded-lg bg-white/70 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 p-3">
                                                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{campo.label}</div>
                                                                <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{campo.value || '-'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })()}

                                    {selectedTab === 'Historial' && (
                                        <div id="panel-Historial" role="tabpanel" className="w-full mb-8">
                                            {/* Controles de búsqueda y página */}
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en historial..."
                                                    value={searchHistorial}
                                                    onChange={(e) => setSearchHistorial(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeHistorial}
                                                        onChange={(e) => setPageSizeHistorial(parseInt(e.target.value) || 10)}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Numero de Gestión</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Estado</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">No. Formulario</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fecha</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Observaciones</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Periodo</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Causa Egreso</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Descripcion</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {histPageItems && histPageItems.length > 0 ? (
                                                            histPageItems.map((h, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{(pageHistorial - 1) * pageSizeHistorial + idx + 1}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.estado || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.no_formulario || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{formatearFecha(h.fecha) || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.observaciones || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.periodo || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.causa_egreso || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{h.descripcion || ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={8} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Paginación */}
                        	                <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageHistorial} de {histTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageHistorial(Math.max(1, pageHistorial - 1))} disabled={pageHistorial <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageHistorial(Math.min(histTotalPages, pageHistorial + 1))} disabled={pageHistorial >= histTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTab === 'Referencias' && (
                                        <div id="panel-Referencias" role="tabpanel" className="w-full mb-8">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en referencias..."
                                                    value={searchReferencias}
                                                    onChange={(e) => setSearchReferencias(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeReferencias}
                                                        onChange={(e) => setPageSizeReferencias(parseInt(e.target.value) || 10)}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">ID Referencia</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fecha Referencia</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Motivo Traslado</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">ID Médico</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Especialidad Referencia</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {refPageItems && refPageItems.length > 0 ? (
                                                            refPageItems.map((r, idx) => (
                                                                <tr key={r.id_referencia || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{r.id_referencia || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{formatearFecha(r.fecha_referencia) || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{r.motivo_traslado || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{r.id_medico || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{r.especialidad_referencia || ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageReferencias} de {refTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageReferencias(Math.max(1, pageReferencias - 1))} disabled={pageReferencias <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageReferencias(Math.min(refTotalPages, pageReferencias + 1))} disabled={pageReferencias >= refTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTab === 'Nutrición' && (
                                        <div id="panel-Nutrición" role="tabpanel" className="w-full mb-8">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en nutrición..."
                                                    value={searchNutricion}
                                                    onChange={(e) => setSearchNutricion(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeNutricion}
                                                        onChange={(e) => setPageSizeNutricion(parseInt(e.target.value) || 10)}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">ID Informe</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Motivo Consulta</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Estado Nutricional</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Observaciones</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Altura (Cm)</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Peso (kg)</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">IMC</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {nutPageItems && nutPageItems.length > 0 ? (
                                                            nutPageItems.map((n, idx) => (
                                                                <tr key={n.id_informe || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.id_informe || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.motivo_consulta || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.estado_nutricional || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.observaciones || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.altura_cm ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.peso_kg ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{n.imc ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600">
                                                                        <button className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openNutDetail(n)}>Ver detalle</button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={8} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageNutricion} de {nutTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageNutricion(Math.max(1, pageNutricion - 1))} disabled={pageNutricion <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageNutricion(Math.min(nutTotalPages, pageNutricion + 1))} disabled={pageNutricion >= nutTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTab === 'Psicologia' && (
                                        <div id="panel-Psicologia" role="tabpanel" className="w-full mb-8">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en psicología..."
                                                    value={searchPsicologia}
                                                    onChange={(e) => setSearchPsicologia(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizePsicologia}
                                                        onChange={(e) => setPageSizePsicologia(parseInt(e.target.value) || 10)}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm">
                                                <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
                                                    <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left">#</th>
                                                            <th className="px-4 py-2 text-left">No. Afiliación</th>
                                                            <th className="px-4 py-2 text-left">Paciente</th>
                                                            <th className="px-4 py-2 text-left">Sexo</th>
                                                            <th className="px-4 py-2 text-left">ID Informe</th>
                                                            <th className="px-4 py-2 text-left">Fecha</th>
                                                            <th className="px-4 py-2 text-left">Motivo</th>
                                                            <th className="px-4 py-2 text-left">Tipo Consulta</th>
                                                            <th className="px-4 py-2 text-left">Tipo Atención</th>
                                                            <th className="px-4 py-2 text-left">Pronóstico</th>
                                                            <th className="px-4 py-2 text-left">Usuario</th>
                                                            <th className="px-4 py-2 text-left">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(!psiPageItems || psiPageItems.length === 0) ? (
                                                            <tr>
                                                                <td colSpan={12} className="text-center py-4 text-gray-600 dark:text-gray-300">No hay informes para mostrar.</td>
                                                            </tr>
                                                        ) : (
                                                            psiPageItems.map((it, idx) => {
                                                                const pn = it.primer_nombre ?? it.primernombre ?? '';
                                                                const sn = it.segundo_nombre ?? it.segundonombre ?? '';
                                                                const pa = it.primer_apellido ?? it.primerapellido ?? '';
                                                                const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
                                                                const sexo = it.sexo ?? it.Sexo ?? '';
                                                                const nombre = [pn, sn, pa, sa].filter(Boolean).join(' ');
                                                                return (
                                                                    <tr key={it.id_informe || idx} className="border-t border-gray-200 dark:border-slate-700">
                                                                        <td className="px-3 py-2">{(pagePsicologia - 1) * pageSizePsicologia + idx + 1}</td>
                                                                        <td className="px-3 py-2">{it.no_afiliacion ?? ''}</td>
                                                                        <td className="px-3 py-2">{nombre}</td>
                                                                        <td className="px-3 py-2">{sexo}</td>
                                                                        <td className="px-3 py-2">{it.id_informe ?? ''}</td>
                                                                        <td className="px-3 py-2">{it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleDateString() : ''}</td>
                                                                        <td className="px-3 py-2">{it.motivo_consulta ?? ''}</td>
                                                                        <td className="px-3 py-2">{it.tipo_consulta ?? ''}</td>
                                                                        <td className="px-3 py-2">{it.tipo_atencion ?? ''}</td>
                                                                        <td className="px-3 py-2">{it.pronostico_paciente ?? it.pronostico ?? ''}</td>
                                                                        <td className="px-3 py-2">{it.usuario_creacion ?? ''}</td>
                                                                        <td className="px-3 py-2">
                                                                            <button type="button" onClick={() => openPsiDetail(it)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pagePsicologia} de {psiTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPagePsicologia(Math.max(1, pagePsicologia - 1))} disabled={pagePsicologia <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPagePsicologia(Math.min(psiTotalPages, pagePsicologia + 1))} disabled={pagePsicologia >= psiTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                            {/* Modal Detalle Psicología */}
                                            {psiDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle del Informe de Psicología</h3>
                                                                <button onClick={closePsiDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = psiDetalle.item || {};
                                                                const pn = it.primer_nombre ?? it.primernombre ?? '';
                                                                const sn = it.segundo_nombre ?? it.segundonombre ?? '';
                                                                const pa = it.primer_apellido ?? it.primerapellido ?? '';
                                                                const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
                                                                const sexo = it.sexo ?? it.Sexo ?? '';
                                                                // Parseo KDQOL
                                                                let kdqolObj = null;
                                                                try { kdqolObj = typeof it.kdqol === 'string' ? JSON.parse(it.kdqol) : it.kdqol; } catch (_) { kdqolObj = null; }
                                                                const dims = [
                                                                    { key: 'fisico_mental', label: 'Físico y Mental' },
                                                                    { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
                                                                    { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
                                                                    { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
                                                                    { key: 'vida_diaria', label: 'Vida Diaria' },
                                                                    { key: 'puntaje_fisico', label: 'Puntaje Físico' },
                                                                    { key: 'puntaje_mental', label: 'Puntaje Mental' },
                                                                    { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
                                                                    { key: 'puntaje_carga', label: 'Puntaje Carga' },
                                                                    { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
                                                                ];
                                                                const getNum = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return isNaN(n) ? null : n; };
                                                                const rows = [];
                                                                let s = 0, c = 0;
                                                                if (kdqolObj && typeof kdqolObj === 'object') {
                                                                    dims.forEach(d => {
                                                                        const num = getNum(kdqolObj[d.key]);
                                                                        if (num != null) { rows.push({ label: d.label, value: num }); s += num; c += 1; }
                                                                    });
                                                                }
                                                                const prom = c > 0 ? Math.round((s / c) * 100) / 100 : null;
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">No. Afiliación:</span> {it.no_afiliacion || ''}</div>
                                                                            <div><span className="font-semibold">ID Informe:</span> {it.id_informe || ''}</div>
                                                                            <div className="md:col-span-2"><span className="font-semibold">Paciente:</span> {[pn, sn, pa, sa].filter(Boolean).join(' ')}</div>
                                                                            <div><span className="font-semibold">Sexo:</span> {sexo}</div>
                                                                            <div><span className="font-semibold">Fecha:</span> {it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : ''}</div>
                                                                        </div>
                                                                        <hr className="border-slate-200 dark:border-slate-700" />
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">Motivo:</span> {it.motivo_consulta ?? ''}</div>
                                                                            <div><span className="font-semibold">Tipo de Consulta:</span> {it.tipo_consulta ?? ''}</div>
                                                                            <div><span className="font-semibold">Tipo de Atención:</span> {it.tipo_atencion ?? ''}</div>
                                                                            <div><span className="font-semibold">Pronóstico:</span> {it.pronostico_paciente ?? it.pronostico ?? ''}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">Observaciones:</span>
                                                                            <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{it.observaciones || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">KDQOL:</span>
                                                                            {kdqolObj && (
                                                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                                    <span className="mr-2">ID KDQOL: {kdqolObj.id_kdqol ?? '—'}</span>
                                                                                    <span>Fecha aplicación: {kdqolObj.fecha_aplicacion ? new Date(kdqolObj.fecha_aplicacion).toLocaleString() : '—'}</span>
                                                                                </div>
                                                                            )}
                                                                            {rows.length > 0 ? (
                                                                                <div className="mt-1 overflow-x-auto">
                                                                                    <table className="min-w-full text-sm">
                                                                                        <thead>
                                                                                            <tr>
                                                                                                <th className="text-left border border-slate-200 dark:border-slate-700 px-2 py-1">Dimensión</th>
                                                                                                <th className="text-left border border-slate-200 dark:border-slate-700 px-2 py-1">Puntaje</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {rows.map((r, i) => (
                                                                                                <tr key={i}>
                                                                                                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">{r.label}</td>
                                                                                                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">{r.value}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                    <div className="mt-2"><span className="font-semibold">Promedio KDQOL:</span> {prom != null ? prom : '—'}</div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">—</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFPsicologia(psiDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closePsiDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedTab === 'Formularios' && (
                                        <div id="panel-Formularios" role="tabpanel" className="w-full mb-8">
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en formularios..."
                                                    value={searchFormularios}
                                                    onChange={(e) => setSearchFormularios(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeFormularios}
                                                        onChange={(e) => setPageSizeFormularios(parseInt(e.target.value) || 10)}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Número Formulario</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Sesiones Autorizadas (Mensuales)</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Sesiones Realizadas (Mensuales)</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Sesiones No Realizadas (Mensuales)</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Inicio Prestaciones Servicios</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fin Prestaciones Servicios</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">ID Historial</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {formPageItems && formPageItems.length > 0 ? (
                                                            formPageItems.map((f, idx) => (
                                                                <tr key={f.id_historial || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.numero_formulario || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.sesiones_autorizadas_mes ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.sesiones_realizadas_mes ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.sesiones_no_realizadas_mes ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{formatearFecha(f.inicio_prest_servicios) || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{formatearFecha(f.fin_prest_servicios) || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.id_historial ?? ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600">
                                                                        <button className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openFormDetail(f)}>Ver detalle</button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={8} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageFormularios} de {formTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageFormularios(Math.max(1, pageFormularios - 1))} disabled={pageFormularios <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageFormularios(Math.min(formTotalPages, pageFormularios + 1))} disabled={pageFormularios >= formTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                            {/* Modal Detalle Formulario */}
                                            {formDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle Formulario</h3>
                                                                <button onClick={closeFormDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = formDetalle.item || {};
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">No. Formulario:</span> {it.numero_formulario ?? ''}</div>
                                                                            <div><span className="font-semibold">ID Historial:</span> {it.id_historial ?? ''}</div>
                                                                            <div><span className="font-semibold">Sesiones Autorizadas:</span> {it.sesiones_autorizadas_mes ?? ''}</div>
                                                                            <div><span className="font-semibold">Sesiones Realizadas:</span> {it.sesiones_realizadas_mes ?? ''}</div>
                                                                            <div><span className="font-semibold">No Realizadas:</span> {it.sesiones_no_realizadas_mes ?? ''}</div>
                                                                            <div><span className="font-semibold">Inicio Prest.:</span> {formatearFecha(it.inicio_prest_servicios) || ''}</div>
                                                                            <div><span className="font-semibold">Fin Prest.:</span> {formatearFecha(it.fin_prest_servicios) || ''}</div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFFormulario(formDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closeFormDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedTab === 'Turnos' && (
                                        <div id="panel-Turnos" role="tabpanel" className="w-full mb-8">
                                            {/* Controles de búsqueda y página */}
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en turnos..."
                                                    value={searchTurnos}
                                                    onChange={(e) => setSearchTurnos(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeTurnos}
                                                        onChange={(e) => { setPageSizeTurnos(parseInt(e.target.value) || 10); setPageTurnos(1); }}
                                                    >
                                                        <option value={3}>3</option>
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={15}>15</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden">
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">No. Afiliación</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Nombre</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Código Turno</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Clínica</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fecha</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {turnosPageItems && turnosPageItems.length > 0 ? (
                                                            turnosPageItems.map((t, idx) => (
                                                                <tr key={t.id_turno || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.noafiliacion}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.nombrepaciente}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.id_turno_cod || t.id_turno}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.nombre_clinica}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.fecha_turno ? new Date(t.fecha_turno).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600">
                                                                        <button className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openTurnoDetail(t)}>Ver detalle</button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={6} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Paginación */}
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageTurnos} de {turnosTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageTurnos(Math.max(1, pageTurnos - 1))} disabled={pageTurnos <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageTurnos(Math.min(turnosTotalPages, pageTurnos + 1))} disabled={pageTurnos >= turnosTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                            {/* Modal Detalle Turno */}
                                            {turnoDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle Turno</h3>
                                                                <button onClick={closeTurnoDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = turnoDetalle.item || {};
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">No. Afiliación:</span> {it.noafiliacion ?? ''}</div>
                                                                            <div><span className="font-semibold">Código Turno:</span> {it.id_turno_cod || it.id_turno || ''}</div>
                                                                            <div className="md:col-span-2"><span className="font-semibold">Paciente:</span> {it.nombrepaciente || ''}</div>
                                                                            <div><span className="font-semibold">Clínica:</span> {it.nombre_clinica || ''}</div>
                                                                            <div><span className="font-semibold">Fecha:</span> {it.fecha_turno ? new Date(it.fecha_turno).toLocaleString() : ''}</div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFTurno(turnoDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closeTurnoDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedTab === 'Faltistas' && (
                                        <div id="panel-Faltistas" role="tabpanel" className="w-full mb-8">
                                            {/* Controles de búsqueda y página */}
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en faltistas..."
                                                    value={searchFaltistas}
                                                    onChange={(e) => setSearchFaltistas(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeFaltistas}
                                                        onChange={(e) => { setPageSizeFaltistas(parseInt(e.target.value) || 10); setPageFaltistas(1); }}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden">
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">No. Afiliación</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Nombre</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Sexo</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Jornada</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acceso Vascular</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Departamento</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Clínica</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fecha Falta</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {faltistasPageItems && faltistasPageItems.length > 0 ? (
                                                            faltistasPageItems.map((f, idx) => (
                                                                <tr key={(f.noafiliacion || '') + (f.fechafalta || '') + idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.noafiliacion || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{[(f.nombres||''),(f.apellidos||'')].filter(Boolean).join(' ')}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.sexo || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.jornada || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.accesovascular || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.departamento || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.clinica || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{f.fechafalta || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600">
                                                                        <button className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openFaltaDetail(f)}>Ver detalle</button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={10} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Paginación */}
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageFaltistas} de {faltistasTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageFaltistas(Math.max(1, pageFaltistas - 1))} disabled={pageFaltistas <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageFaltistas(Math.min(faltistasTotalPages, pageFaltistas + 1))} disabled={pageFaltistas >= faltistasTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                            {/* Modal Detalle Faltista */}
                                            {faltaDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle Faltista</h3>
                                                                <button onClick={closeFaltaDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = faltaDetalle.item || {};
                                                                const nombre = [it.nombres || '', it.apellidos || ''].filter(Boolean).join(' ');
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">No. Afiliación:</span> {it.noafiliacion ?? ''}</div>
                                                                            <div><span className="font-semibold">Sexo:</span> {it.sexo ?? ''}</div>
                                                                            <div className="md:col-span-2"><span className="font-semibold">Nombre:</span> {nombre}</div>
                                                                            <div><span className="font-semibold">Jornada:</span> {it.jornada ?? ''}</div>
                                                                            <div><span className="font-semibold">Acceso Vascular:</span> {it.accesovascular ?? ''}</div>
                                                                            <div><span className="font-semibold">Departamento:</span> {it.departamento ?? ''}</div>
                                                                            <div><span className="font-semibold">Clínica:</span> {it.clinica ?? ''}</div>
                                                                            <div><span className="font-semibold">Fecha Falta:</span> {it.fechafalta ?? ''}</div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFFaltista(faltaDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closeFaltaDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedTab === 'Laboratorios' && (
                                        <div id="panel-Laboratorios" role="tabpanel" className="w-full mb-8">
                                            {/* Controles de búsqueda y página */}
                                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
                                                <input
                                                    className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                    placeholder="Buscar en laboratorios..."
                                                    value={searchLaboratorios}
                                                    onChange={(e) => setSearchLaboratorios(e.target.value)}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm dark:text-gray-300">Filas por página:</span>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
                                                        value={pageSizeLaboratorios}
                                                        onChange={(e) => { setPageSizeLaboratorios(parseInt(e.target.value) || 10); setPageLaboratorios(1); }}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden">
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">No. Afiliación</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Paciente</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Sexo</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">ID Lab</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Fecha</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Periodicidad</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Examen</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Virología</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">HIV</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold text-center">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {laboratoriosPageItems && laboratoriosPageItems.length > 0 ? (
                                                            laboratoriosPageItems.map((it, idx) => {
                                                                const pn = it.primer_nombre ?? it.primernombre ?? '';
                                                                const sn = it.segundo_nombre ?? it.segundonombre ?? '';
                                                                const pa = it.primer_apellido ?? it.primerapellido ?? '';
                                                                const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
                                                                const nombre = [pn,sn,pa,sa].filter(Boolean).join(' ');
                                                                const rawFecha = it.fecha_laboratorio ?? it.fecha ?? '';
                                                                const fecha = rawFecha ? new Date(rawFecha).toLocaleDateString() : '';
                                                                return (
                                                                    <tr key={(it.id_laboratorio || '') + '-' + idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.no_afiliacion || ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{nombre}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.sexo || ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.id_laboratorio ?? it.idlaboratorio ?? ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{fecha}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.periodicidad || ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.examen_realizado ? 'Sí' : 'No'}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.virologia || ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">{it.hiv || ''}</td>
                                                                        <td className="p-3 border dark:border-gray-600 text-center">
                                                                            <button type="button" className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openLabDetail(it)}>Ver detalle</button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={10} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Paginación */}
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm dark:text-gray-300">Página {pageLaboratorios} de {laboratoriosTotalPages}</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageLaboratorios(Math.max(1, pageLaboratorios - 1))} disabled={pageLaboratorios <= 1}>Anterior</button>
                                                    <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => setPageLaboratorios(Math.min(laboratoriosTotalPages, pageLaboratorios + 1))} disabled={pageLaboratorios >= laboratoriosTotalPages}>Siguiente</button>
                                                </div>
                                            </div>
                                            {/* Modal Detalle Laboratorio */}
                                            {labDetalle.isOpen && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                                                        <div className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle de Laboratorio</h3>
                                                                <button onClick={closeLabDetail} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                                                            </div>
                                                            {(() => {
                                                                const it = labDetalle.item || {};
                                                                const primerNombre = it.primer_nombre ?? it.primernombre ?? '';
                                                                const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? '';
                                                                const primerApellido = it.primer_apellido ?? it.primerapellido ?? '';
                                                                const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? '';
                                                                const sexo = it.sexo ?? '';
                                                                const entries = Object.entries(it || {}).filter(([k,v]) => v !== null && v !== undefined && v !== '');
                                                                const pretty = (s) => String(s).replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase());
                                                                const parametros = Array.isArray(it.parametros) ? it.parametros : [];
                                                                return (
                                                                    <div className="space-y-4 text-sm">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">No. Afiliación:</span> {it.no_afiliacion || ''}</div>
                                                                            <div><span className="font-semibold">ID Laboratorio:</span> {it.id_laboratorio || it.idlaboratorio || ''}</div>
                                                                            <div className="md:col-span-2"><span className="font-semibold">Paciente:</span> {[primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}</div>
                                                                            <div><span className="font-semibold">Sexo:</span> {sexo}</div>
                                                                            <div><span className="font-semibold">Fecha:</span> {it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleString() : (it.fecha ? new Date(it.fecha).toLocaleString() : '')}</div>
                                                                        </div>
                                                                        <hr className="border-slate-200 dark:border-slate-700" />
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><span className="font-semibold">Periodicidad:</span> {it.periodicidad}</div>
                                                                            <div><span className="font-semibold">Examen Realizado:</span> {it.examen_realizado ? 'Sí' : 'No'}</div>
                                                                            <div><span className="font-semibold">Causa No Realizado:</span> {it.causa_no_realizado || '—'}</div>
                                                                            <div><span className="font-semibold">Virología:</span> {it.virologia || '—'}</div>
                                                                            <div><span className="font-semibold">Ag. Hepatitis C:</span> {it.antigeno_hepatitis_c ? 'Positivo' : 'Negativo'}</div>
                                                                            <div><span className="font-semibold">Ag. Superficie:</span> {it.antigeno_superficie ? 'Positivo' : 'Negativo'}</div>
                                                                            <div><span className="font-semibold">HIV:</span> {it.hiv || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">Observaciones:</span>
                                                                            <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{it.observacion || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">Parámetros:</span>
                                                                            <div className="mt-2 overflow-x-auto">
                                                                                <table className="min-w-full border border-slate-200 dark:border-slate-700 text-xs">
                                                                                    <thead>
                                                                                        <tr className="bg-slate-100 dark:bg-slate-700">
                                                                                            <th className="px-2 py-1 text-left">Parámetro</th>
                                                                                            <th className="px-2 py-1 text-left">Valor</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {(parametros.length > 0) ? (
                                                                                            parametros.map((p, i) => (
                                                                                                <tr key={`${p.idparametro || i}-${p.parametro}`} className="border-t border-slate-200 dark:border-slate-700">
                                                                                                    <td className="px-2 py-1">{p.parametro ?? ''}</td>
                                                                                                    <td className="px-2 py-1">{p.valor ?? ''}</td>
                                                                                                </tr>
                                                                                            ))
                                                                                        ) : entries.length === 0 ? (
                                                                                            <tr>
                                                                                                <td className="px-2 py-1" colSpan={2}>—</td>
                                                                                            </tr>
                                                                                        ) : entries.map(([k,v]) => (
                                                                                            <tr key={k} className="border-t border-slate-200 dark:border-slate-700">
                                                                                                <td className="px-2 py-1">{pretty(k)}</td>
                                                                                                <td className="px-2 py-1">{typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold">Últimos parámetros previos:</span>
                                                                            <div className="mt-2">
                                                                                {ultimosLab.loading ? (
                                                                                    <div className="text-sm text-slate-600 dark:text-slate-300">Cargando últimos parámetros...</div>
                                                                                ) : ultimosLab.error ? (
                                                                                    <div className="text-sm text-red-600 dark:text-red-400">{ultimosLab.error}</div>
                                                                                ) : (ultimosLab.data && ultimosLab.data.length > 0) ? (
                                                                                    <div className="overflow-x-auto">
                                                                                        <table className="min-w-full border border-slate-200 dark:border-slate-700 text-xs">
                                                                                            <thead>
                                                                                                <tr className="bg-slate-100 dark:bg-slate-700">
                                                                                                    <th className="px-2 py-1 text-left">Parámetro</th>
                                                                                                    <th className="px-2 py-1 text-left">Valor</th>
                                                                                                    <th className="px-2 py-1 text-left">Fecha Lab.</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {ultimosLab.data.map((u, i) => (
                                                                                                    <tr key={`${u.idparametro || i}-${u.parametro}`} className="border-t border-slate-200 dark:border-slate-700">
                                                                                                        <td className="px-2 py-1">{u.parametro ?? ''}</td>
                                                                                                        <td className="px-2 py-1">{u.valor ?? ''}</td>
                                                                                                        <td className="px-2 py-1">{u.fecha_laboratorio ? new Date(u.fecha_laboratorio).toLocaleDateString() : ''}</td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-sm text-slate-600 dark:text-slate-300">No hay registros previos.</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-3">
                                                                            <button onClick={() => descargarPDFLaboratorio(labDetalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                                                            <button onClick={closeLabDetail} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}


                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Footer/>
        </Container>
    );
};

// Función auxiliar para obtener el logo en base64
async function getLogoBase64() {
    try {
        const response = await fetch(logoClinica);
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// Función auxiliar para obtener la foto del paciente en base64
async function getFotoPacienteBase64(paciente) {
    if (!paciente.url_foto) return null;
    try {
        const url = `http://localhost:3001/fotos/${paciente.url_foto.split(/[\\\/]/).pop()}`;
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export default ConsultaPacientes;