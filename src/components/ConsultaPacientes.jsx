import Footer from "@/layouts/footer"
import logoClinica from "@/assets/logoClinica2.png"
import avatarDefault from "@/assets/default-avatar.png"
import React, { useState } from 'react';
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
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {message}
                    </p>
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
    const [fotoCargando, setFotoCargando] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [accesosVasculares, setAccesosVasculares] = useState([]);
    const [jornadas, setJornadas] = useState([]);
    const [selectedTab, setSelectedTab] = useState('Datos Personales');
    const [historial, setHistorial] = useState([]);
    const [referencias, setReferencias] = useState([]);
    const [nutricion, setNutricion] = useState([]);
    const [psicologia, setPsicologia] = useState([]);
    const [formularios, setFormularios] = useState([]);

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

    const buscarPacientes = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        setFotoCargando(true);

        try {
            let response;
            if (busqueda.noafiliacion.trim() !== '') {
                response = await api.get(`/pacientes/${busqueda.noafiliacion}`);
            } else if (busqueda.dpi.trim() !== '') {
                response = await api.get(`/pacientes/dpi/${busqueda.dpi}`);
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
        } finally {
            setLoading(false);
            setFotoCargando(false);
            setBusqueda({ noafiliacion: '', dpi: '' });
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
        // Reset filtros y paginación
        setSearchHistorial(''); setPageHistorial(1); setPageSizeHistorial(10);
        setSearchReferencias(''); setPageReferencias(1); setPageSizeReferencias(10);
        setSearchNutricion(''); setPageNutricion(1); setPageSizeNutricion(10);
        setSearchPsicologia(''); setPagePsicologia(1); setPageSizePsicologia(10);
        setSearchFormularios(''); setPageFormularios(1); setPageSizeFormularios(10);
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
        const res = await api.get(`/psicologia/${noAfiliacion}`);
        setPsicologia(Array.isArray(res.data) ? res.data : []);
    };

    const fetchFormularios = async (noAfiliacion) => {
        const res = await api.get(`/formularios/${noAfiliacion}`);
        setFormularios(Array.isArray(res.data) ? res.data : []);
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

    // Botón para generar reporte PDF
    const handleGenerarReporte = async () => {
        if (!paciente) return;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const verde = '#2d6a4f';
        const rojo = '#dc3545';

        // Encabezado con logo y título
        // Logo (asegúrate de tener el logo en base64 o usa una imagen pública accesible)
        const logoImg = await getLogoBase64(); // función auxiliar para obtener el logo en base64
        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 40, 30, 60, 60);
        }
        doc.setFontSize(26);
        doc.setTextColor(verde);
        doc.text('Reporte de Paciente', pageWidth / 2, 60, { align: 'center' });
        doc.setDrawColor(verde);
        doc.setLineWidth(2);
        doc.line(40, 100, pageWidth - 40, 100);

        // Foto del paciente
        let fotoY = 120;
        let fotoX = 40;
        let yStart = fotoY;
        let fotoPaciente = await getFotoPacienteBase64(paciente);
        if (fotoPaciente) {
            doc.addImage(fotoPaciente, 'JPEG', fotoX, fotoY, 110, 110, undefined, 'FAST');
        }
        // Datos personales
        doc.setFontSize(14);
        doc.setTextColor(verde);
        let y = fotoY;
        let x = fotoX + 130;
        doc.text(`Nombre:`, x, y);
        doc.setTextColor(0, 0, 0);
        doc.text(`${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim(), x + 80, y);
        y += 22;
        doc.setTextColor(verde); doc.text('No. Afiliación:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.no_afiliacion || ''}`, x + 110, y);
        y += 22;
        doc.setTextColor(verde); doc.text('DPI:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.dpi || ''}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Fecha Nacimiento:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${formatearFecha(paciente.fecha_nacimiento) || ''}`, x + 120, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Edad:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${calcularEdad(paciente.fecha_nacimiento)}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Sexo:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.sexo || ''}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Dirección:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.direccion || ''}`, x + 80, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Sesiones Autorizadas:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.sesiones_autorizadas_mes || ''}`, x + 140, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Fecha Ingreso:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${formatearFecha(paciente.fecha_ingreso) || ''}`, x + 110, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Estancia Programa:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${calcularEstanciaPrograma(paciente.fecha_ingreso)}`, x + 140, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Jornada:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.jornada_descripcion || ''}`, x + 70, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Observaciones:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.observaciones || ''}`, x + 110, y);

        // Pie de página
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(rojo);
        doc.setLineWidth(1);
        doc.line(40, pageHeight - 60, pageWidth - 40, pageHeight - 60);
        doc.setFontSize(10);
        doc.setTextColor(rojo);
        doc.text('Sistema de Gestión de Pacientes', pageWidth / 2, pageHeight - 40, { align: 'center' });
        doc.setTextColor(100);
        doc.text('Reporte generado automáticamente', pageWidth / 2, pageHeight - 25, { align: 'center' });

        doc.save(`reporte_paciente_${paciente.no_afiliacion}.pdf`);
    };

    // Botón para descargar carné
    const handleDescargarCarnet = async () => {
        if (!paciente || !paciente.no_afiliacion) return;
        try {
            // Llamar al endpoint especial para forzar la generación del carné desde cero
            const response = await fetch(`http://localhost:3001/carnet/forzar/${paciente.no_afiliacion}`);
            if (!response.ok) throw new Error('No se pudo generar ni descargar el carné');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `carnet_${paciente.no_afiliacion}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setShowModal(true);
            setModalMessage('No se pudo descargar o generar el carné.');
            setModalType('error');
        }
    };

    return (
        <Container fluid className="bg-white dark:bg-slate-900 min-h-screen">
            <CustomModal
                show={showModal}
                onClose={handleCloseModal}
                title={modalType === 'success' ? 'Éxito' : 'Error'}
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
                                                {['Datos Personales', 'Historial', 'Referencias', 'Nutrición', 'Psicologia', 'Formularios'].map((tab, idx, arr) => {
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
                                            <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Historial del Paciente</h3>
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
                                            <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Referencias</h3>
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
                                            <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Informes de Nutrición</h3>
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
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
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
                                            <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Informes de Psicología</h3>
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
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
                                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">ID Informe</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Motivo Consulta</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Tipo Consulta</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Observaciones</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Tipo Atención</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">Pronóstico</th>
                                                            <th className="p-3 border dark:border-gray-600 font-semibold">KDQOL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                        {psiPageItems && psiPageItems.length > 0 ? (
                                                            psiPageItems.map((p, idx) => (
                                                                <tr key={p.id_informe || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.id_informe || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.motivo_consulta || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.tipo_consulta || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.observaciones || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.tipo_atencion || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.pronostico || ''}</td>
                                                                    <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{p.kdqol ? 'Sí' : 'No'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
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
                                        </div>
                                    )}
                                    {selectedTab === 'Formularios' && (
                                        <div id="panel-Formularios" role="tabpanel" className="w-full mb-8">
                                            <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Historial de Formularios</h3>
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
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
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