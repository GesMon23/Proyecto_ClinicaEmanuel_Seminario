import Footer from "@/layouts/footer"
import logoClinica from "@/assets/logoClinica2.png"
import avatarDefault from "@/assets/default-avatar.png"
import React, { useState } from 'react';
import api from '../config/api';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Table
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
                            <div className="dark:bg-slate-800 dark:text-gray-200" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
                                <Row className="align-items-center" style={{ marginTop: 32, marginBottom: 24 }}>
                                    <div className="max-w-5xl mx-auto px-6 py-8">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

                                            {/* DERECHA: Logo + texto (ahora primero para que se muestre a la izquierda en pantallas grandes) */}
                                            <div className="flex flex-col items-center w-full md:w-1/2">
                                                <img
                                                    src={logoClinica}
                                                    alt="Logo de la clínica"
                                                    className="max-w-xs mb-2 max-w-md"
                                                />
                                                <h2 className="text-3xl font-bold text-center text-green-700 dark:text-white">
                                                    Consulta de Pacientes
                                                </h2>
                                            </div>

                                            {/* IZQUIERDA: Formulario (ahora segundo para que se muestre a la derecha en pantallas grandes) */}
                                            <form
                                                onSubmit={buscarPacientes}
                                                className="w-full md:w-1/2"
                                            >
                                                <input
                                                    placeholder="Número de Afiliación"
                                                    type="text"
                                                    name="noafiliacion"
                                                    value={busqueda.noafiliacion}
                                                    onChange={handleBusquedaChange}
                                                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                                                />

                                                <input
                                                    placeholder="DPI"
                                                    type="text"
                                                    name="dpi"
                                                    value={busqueda.dpi}
                                                    onChange={handleBusquedaChange}
                                                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                                                />

                                                <div className="flex gap-4">
                                                    <button
                                                        className="w-1/2 bg-green-700 hover:bg-green-900 text-white py-2 px-4 rounded"
                                                        type="submit"
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Buscando...' : 'Buscar'}
                                                    </button>
                                                    <button
                                                        className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                                                        type="button"
                                                        onClick={handleLimpiarBusqueda}
                                                    >
                                                        Limpiar
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>


                                </Row>
                            </div>
                            <hr className="border-t border-green-300 dark:border-gray-600 my-4" />


                            {/* BLOQUE DE FOTO Y DATOS CLAVE */}
                            {paciente && (
                                <div
                                    className="flex flex-col md:flex-row"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '2.5rem', margin: '2.5rem 0', border: '1px solid #eee', borderRadius: 20, padding: 32,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.14)', background: 'var(--bs-body-bg)', width: '100%', maxWidth: 'none', minHeight: 300, color: 'var(--bs-body-color)'
                                    }}
                                >
                                    {/* Foto a la izquierda */}
                                    <div
                                        className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72"
                                        style={{
                                            borderRadius: '24px', overflow: 'hidden',
                                            border: '4px solid #2d6a4f', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                                            backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}
                                    >
                                        {fotoCargando ? (
                                            <span>Cargando foto...</span>
                                        ) : (
                                            <img
                                                alt="Foto del paciente"
                                                src={paciente.url_foto ? `http://localhost:3001/fotos/${paciente.url_foto}?${Date.now()}` : avatarDefault}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = avatarDefault;
                                                }}
                                            />
                                        )}
                                    </div>
                                    {/* Columna de datos a la derecha */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 18, width: '100%' }}>
                                        {/* Nombre completo */}
                                        <h2 className="m-0 font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#1b4332] uppercase tracking-wider text-left leading-tight">
                                            {`${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim()}
                                        </h2>
                                        {/* Datos clave debajo del nombre */}
                                        <div className="flex flex-col gap-3 mt-3 w-full max-w-xs sm:max-w-md text-base sm:text-lg md:text-xl">
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>No. Afiliación:</b> {paciente.no_afiliacion}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>DPI:</b> {paciente.dpi}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>No. Paciente Proveedor:</b> {paciente.no_paciente_proveedor || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Acceso:</b> {paciente.acceso_descripcion || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Número de Formulario:</b> {paciente.numero_formulario_activo || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Sesiones Autorizadas Mes:</b> {paciente.sesiones_autorizadas_mes || ''}</div>
                                        </div>
                                        {/* Botones de reporte y carné */}
                                        <div className="flex gap-4 mt-6 flex-wrap">
                                            <Button
                                                onClick={handleGenerarReporte}
                                                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-green-700 hover:bg-green-800 border border-green-700 shadow-sm hover:shadow-md transition-all duration-200 text-lg"
                                            >
                                                Generar Reporte
                                            </Button>
                                            <Button
                                                onClick={handleDescargarCarnet}
                                                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-green-700 hover:bg-green-800 border border-green-700 shadow-sm hover:shadow-md transition-all duration-200 text-lg"
                                            >
                                                Descargar Carnet
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑAS / BOTONES HORIZONTALES */}
                            {paciente && (
                                <div className="w-full mt-4">
                                    <div className="w-full flex justify-center mb-4">
                                        <div className="flex flex-wrap gap-3">
                                            {['Datos Personales', 'Historial', 'Referencias', 'Nutrición', 'Psicologia', 'Formularios'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setSelectedTab(tab)}
                                                    className={`${selectedTab === tab
                                                        ? 'border-2 border-green-700 bg-green-50 text-green-800 ring-2 ring-green-100'
                                                        : 'border border-gray-300 bg-white text-green-900 hover:border-green-600 hover:bg-green-50 hover:shadow-md'} px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-sm`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

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
                                            <div style={{ display: 'flex', gap: 32, fontSize: 20, width: '100%', justifyContent: 'center', margin: '0 0 2.5rem 0', border: '1px solid var(--bs-border-color)', borderRadius: 16, padding: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', background: 'var(--bs-body-bg)', maxWidth: 'none', color: 'var(--bs-body-color)' }}>
                                                <div style={{ flex: 1 }}>
                                                    {izquierda.map((campo, idx) => (
                                                        <div key={idx} style={{ marginBottom: 10 }}>
                                                            <b style={{ color: 'var(--bs-green)' }}>{campo.label}:</b> <span className="dark:text-gray-300">{campo.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    {derecha.map((campo, idx) => (
                                                        <div key={idx} style={{ marginBottom: 10 }}>
                                                            <b style={{ color: 'var(--bs-green)' }}>{campo.label}:</b> <span className="dark:text-gray-300">{campo.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {selectedTab === 'Historial' && (
                                        <div className="w-full mb-8">
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
                                                <Table responsive bordered hover striped size="sm" className="mb-0">
                                                    <thead className="bg-green-50 dark:bg-slate-700" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Numero de Gestión</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Estado</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">No. Formulario</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Fecha</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Observaciones</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Periodo</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Causa Egreso</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Descripcion</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="dark:bg-slate-800 dark:text-gray-200">
                                                        {histPageItems && histPageItems.length > 0 ? (
                                                            histPageItems.map((h, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="text-center">{(pageHistorial - 1) * pageSizeHistorial + idx + 1}</td>
                                                                    <td className="text-center">{h.estado || ''}</td>
                                                                    <td className="text-center">{h.no_formulario || ''}</td>
                                                                    <td className="text-center">{formatearFecha(h.fecha) || ''}</td>
                                                                    <td className="text-center">{h.observaciones || ''}</td>
                                                                    <td className="text-center">{h.periodo || ''}</td>
                                                                    <td className="text-center">{h.causa_egreso || ''}</td>
                                                                    <td className="text-center">{h.descripcion || ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={8} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
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
                                        <div className="w-full mb-8">
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
                                                <Table responsive bordered hover striped size="sm" className="mb-0">
                                                    <thead className="bg-green-50 dark:bg-slate-700" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">ID Referencia</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Fecha Referencia</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Motivo Traslado</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">ID Médico</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Especialidad Referencia</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="dark:bg-slate-800 dark:text-gray-200">
                                                        {refPageItems && refPageItems.length > 0 ? (
                                                            refPageItems.map((r, idx) => (
                                                                <tr key={r.id_referencia || idx}>
                                                                    <td className="text-center">{r.id_referencia || ''}</td>
                                                                    <td className="text-center">{formatearFecha(r.fecha_referencia) || ''}</td>
                                                                    <td className="text-center">{r.motivo_traslado || ''}</td>
                                                                    <td className="text-center">{r.id_medico || ''}</td>
                                                                    <td className="text-center">{r.especialidad_referencia || ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
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
                                        <div className="w-full mb-8">
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
                                                <Table responsive bordered hover striped size="sm" className="mb-0">
                                                    <thead className="bg-green-50 dark:bg-slate-700" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">ID Informe</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Motivo Consulta</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Estado Nutricional</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Observaciones</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Altura (Cm)</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Peso (kg)</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">IMC</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="dark:bg-slate-800 dark:text-gray-200">
                                                        {nutPageItems && nutPageItems.length > 0 ? (
                                                            nutPageItems.map((n, idx) => (
                                                                <tr key={n.id_informe || idx}>
                                                                    <td className="text-center">{n.id_informe || ''}</td>
                                                                    <td className="text-center">{n.motivo_consulta || ''}</td>
                                                                    <td className="text-center">{n.estado_nutricional || ''}</td>
                                                                    <td className="text-center">{n.observaciones || ''}</td>
                                                                    <td className="text-center">{n.altura_cm ?? ''}</td>
                                                                    <td className="text-center">{n.peso_kg ?? ''}</td>
                                                                    <td className="text-center">{n.imc ?? ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
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
                                        <div className="w-full mb-8">
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
                                                <Table responsive bordered hover striped size="sm" className="mb-0">
                                                    <thead className="bg-green-50 dark:bg-slate-700" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">ID Informe</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Motivo Consulta</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Tipo Consulta</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Observaciones</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Tipo Atención</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Pronóstico</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">KDQOL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="dark:bg-slate-800 dark:text-gray-200">
                                                        {psiPageItems && psiPageItems.length > 0 ? (
                                                            psiPageItems.map((p, idx) => (
                                                                <tr key={p.id_informe || idx}>
                                                                    <td className="text-center">{p.id_informe || ''}</td>
                                                                    <td className="text-center">{p.motivo_consulta || ''}</td>
                                                                    <td className="text-center">{p.tipo_consulta || ''}</td>
                                                                    <td className="text-center">{p.observaciones || ''}</td>
                                                                    <td className="text-center">{p.tipo_atencion || ''}</td>
                                                                    <td className="text-center">{p.pronostico || ''}</td>
                                                                    <td className="text-center">{p.kdqol ? 'Sí' : 'No'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
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
                                        <div className="w-full mb-8">
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
                                                <Table responsive bordered hover striped size="sm" className="mb-0">
                                                    <thead className="bg-green-50 dark:bg-slate-700" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                        <tr>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Número Formulario</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Sesiones Autorizadas (Mensuales)</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Sesiones Realizadas (Mensuales)</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Sesiones No Realizadas (Mensuales)</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Inicio Prestaciones Servicios</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">Fin Prestaciones Servicios</th>
                                                            <th className="text-green-800 dark:text-white font-semibold uppercase text-sm tracking-wide text-center py-3">ID Historial</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="dark:bg-slate-800 dark:text-gray-200">
                                                        {formPageItems && formPageItems.length > 0 ? (
                                                            formPageItems.map((f, idx) => (
                                                                <tr key={f.id_historial || idx}>
                                                                    <td className="text-center">{f.numero_formulario || ''}</td>
                                                                    <td className="text-center">{f.sesiones_autorizadas_mes ?? ''}</td>
                                                                    <td className="text-center">{f.sesiones_realizadas_mes ?? ''}</td>
                                                                    <td className="text-center">{f.sesiones_no_realizadas_mes ?? ''}</td>
                                                                    <td className="text-center">{formatearFecha(f.inicio_prest_servicios) || ''}</td>
                                                                    <td className="text-center">{formatearFecha(f.fin_prest_servicios) || ''}</td>
                                                                    <td className="text-center">{f.id_historial ?? ''}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="text-center text-gray-500 py-4">Sin registros por el momento</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
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