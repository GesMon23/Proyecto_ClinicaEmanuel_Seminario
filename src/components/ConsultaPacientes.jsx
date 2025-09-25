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
                setPaciente(response.data);
                // Verificar si la foto existe
                if (response.data.urlfoto) {
                    const filename = response.data.urlfoto.replace(/^.*[\\\/]/, '');
                    const fotoExists = await verificarExistenciaFoto(filename);
                    if (!fotoExists) {
                        response.data.urlfoto = null;
                    } else {
                        response.data.urlfoto = `/fotos/${filename}`;
                    }
                }
            } else {
                setShowModal(true);
                setModalMessage('Paciente no encontrado');
                setModalType('error');
                setPaciente(null);
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
    };

    const verificarExistenciaFoto = async (filename) => {
        try {
            const response = await api.get(`/check-photo/${filename}`);
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
        doc.text(`${paciente.primernombre || ''} ${paciente.segundonombre || ''} ${paciente.otrosnombres || ''} ${paciente.primerapellido || ''} ${paciente.segundoapellido || ''} ${paciente.apellidocasada || ''}`.replace(/ +/g, ' ').trim(), x + 80, y);
        y += 22;
        doc.setTextColor(verde); doc.text('No. Afiliación:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.noafiliacion || ''}`, x + 110, y);
        y += 22;
        doc.setTextColor(verde); doc.text('DPI:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.dpi || ''}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Fecha Nacimiento:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${formatearFecha(paciente.fechanacimiento) || ''}`, x + 120, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Edad:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${calcularEdad(paciente.fechanacimiento)}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Sexo:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.sexo || ''}`, x + 40, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Dirección:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.direccion || ''}`, x + 80, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Sesiones Autorizadas:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${paciente.sesionesautorizadas || ''}`, x + 140, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Fecha Ingreso:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${formatearFecha(paciente.fechaingreso) || ''}`, x + 110, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Estancia Programa:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${calcularEstanciaPrograma(paciente.fechaingreso)}`, x + 140, y);
        y += 22;
        doc.setTextColor(verde); doc.text('Jornada:', x, y); doc.setTextColor(0, 0, 0); doc.text(`${obtenerNombreJornada ? obtenerNombreJornada(paciente.idjornada) : ''}`, x + 70, y);
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

        doc.save(`reporte_paciente_${paciente.noafiliacion}.pdf`);
    };

    // Botón para descargar carné
    const handleDescargarCarnet = async () => {
        if (!paciente || !paciente.noafiliacion) return;
        try {
            // Llamar al endpoint especial para forzar la generación del carné desde cero
            const response = await fetch(`http://localhost:3001/carnet/forzar/${paciente.noafiliacion}`);
            if (!response.ok) throw new Error('No se pudo generar ni descargar el carné');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `carnet_${paciente.noafiliacion}.pdf`;
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
        <Container fluid>
            <CustomModal
                show={showModal}
                onClose={handleCloseModal}
                title={modalType === 'success' ? 'Éxito' : 'Error'}
                message={modalMessage}
                type={modalType}
            />
            <Row>
                <Col md="12">
                    <Card>
                        <Card.Body>
                            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
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
                            <hr className="border-t border-green-300 dark:border-white" />


                            {/* BLOQUE DE FOTO Y DATOS CLAVE */}
                            {paciente && (
                                <div style={{
                                    display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '2.5rem', margin: '2.5rem 0', border: '1px solid #eee', borderRadius: 20, padding: 32,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)', background: '#fff', width: '100%', maxWidth: 'none', minHeight: 300
                                }}>
                                    {/* Foto a la izquierda */}
                                    <div style={{
                                        width: '300px', height: '300px', borderRadius: '24px', overflow: 'hidden',
                                        border: '4px solid #2d6a4f', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                                        backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        {fotoCargando ? (
                                            <span>Cargando foto...</span>
                                        ) : (
                                            <img
                                                alt="Foto del paciente"
                                                src={paciente.urlfoto ? `http://localhost:3001/fotos/${paciente.urlfoto.split(/[\\\/]/).pop()}?${Date.now()}` : avatarDefault}//aqui2
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
                                        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '2.5rem', color: '#1b4332', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'left', lineHeight: 1.1 }}>
                                            {`${paciente.primernombre || ''} ${paciente.segundonombre || ''} ${paciente.otrosnombres || ''} ${paciente.primerapellido || ''} ${paciente.segundoapellido || ''} ${paciente.apellidocasada || ''}`.replace(/ +/g, ' ').trim()}
                                        </h2>
                                        {/* Datos clave debajo del nombre */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '1.35rem', marginTop: 12, width: '100%', maxWidth: 480 }}>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>No. Afiliación:</b> {paciente.noafiliacion}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>DPI:</b> {paciente.dpi}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>No. Paciente Proveedor:</b> {paciente.nopacienteproveedor || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Acceso:</b> {paciente.acceso_descripcion || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Número de Formulario:</b> {paciente.numeroformulario || ''}</div>
                                            <div><b style={{ color: '#2d6a4f', fontSize: '1.15em' }}>Sesiones Autorizadas Mes:</b> {paciente.sesionesautorizadasmes || ''}</div>
                                        </div>
                                        {/* Botones de reporte y carné */}
                                        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                                            <Button variant="primary" style={{ backgroundColor: '#007bff', borderColor: '#007bff', color: '#fff', fontWeight: 600, fontSize: 18 }} onClick={handleGenerarReporte}>
                                                Generar Reporte
                                            </Button>
                                            <Button variant="success" style={{ backgroundColor: '#2d6a4f', borderColor: '#2d6a4f', color: '#fff', fontWeight: 600, fontSize: 18 }} onClick={handleDescargarCarnet}>
                                                Descargar Carné
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BLOQUE DE INFORMACIÓN GENERAL */}
                            {paciente && (() => {
                                // Lista de campos a mostrar (etiqueta y valor)
                                const camposBase = [
                                    { label: 'Primer Nombre', value: paciente.primernombre || '' },
                                    { label: 'Segundo Nombre', value: paciente.segundonombre || '' },
                                    { label: 'Otros Nombres', value: paciente.otrosnombres || '' },
                                    { label: 'Primer Apellido', value: paciente.primerapellido || '' },
                                    { label: 'Segundo Apellido', value: paciente.segundoapellido || '' },
                                    { label: 'Apellido de Casada', value: paciente.apellidocasada || '' },
                                    { label: 'Fecha de Nacimiento', value: formatearFecha(paciente.fechanacimiento) || '' },
                                    { label: 'Edad', value: calcularEdad(paciente.fechanacimiento) },
                                    { label: 'Sexo', value: paciente.sexo || '' },
                                    { label: 'Dirección', value: paciente.direccion || '' },
                                    { label: 'Departamento', value: paciente.departamento_nombre || '' },
                                    { label: 'Estado', value: paciente.estado_descripcion || '' },
                                    { label: 'Acceso', value: paciente.acceso_descripcion || '' },
                                    { label: 'Número de Formulario', value: paciente.numeroformulario || '' },
                                    { label: 'Sesiones Autorizadas Mes', value: paciente.sesionesautorizadasmes || '' },
                                    { label: 'Periodo Prestación de Servicios', value: `Del ${formatearFecha(paciente.fechainicioperiodo)} al ${formatearFecha(paciente.fechafinperiodo)}` },
                                    { label: 'Sesiones Autorizadas', value: paciente.sesionesautorizadas || '' },
                                    { label: 'Fecha Ingreso', value: formatearFecha(paciente.fechaingreso) || '' },
                                    { label: 'Estancia Programa', value: calcularEstanciaPrograma(paciente.fechaingreso) },
                                    { label: 'Jornada', value: obtenerNombreJornada(paciente.idjornada) || '' },
                                    { label: 'Observaciones', value: paciente.observaciones || '' },
                                ];
                                let campos = [...camposBase];
                                // Si el estado es 'Egreso', agregar causa y fecha de egreso
                                let causaEgresoTexto = (paciente.causaegreso_descripcion || paciente.causaegreso || '').toString().toLowerCase();
                                if ((paciente.estado_descripcion || '').toLowerCase() === 'egreso') {
                                    campos.push({ label: 'Causa del Egreso', value: paciente.causaegreso_descripcion || paciente.causaegreso || '' });
                                    campos.push({ label: 'Fecha de Egreso', value: formatearFecha(paciente.fechaegreso) || '' });
                                    // Si la causa es fallecimiento, agregar los campos extra
                                    if (causaEgresoTexto.includes('fallecimiento') || causaEgresoTexto.includes('fallecido')) {
                                        campos.push({ label: 'Comorbilidades', value: paciente.comorbilidades || '' });
                                        campos.push({ label: 'Fecha de Fallecido', value: formatearFecha(paciente.fechafallecimiento) || '' });
                                        campos.push({ label: 'Lugar de Fallecimiento', value: paciente.lugarfallecimiento || '' });
                                        campos.push({ label: 'Causa de Fallecimiento', value: paciente.causafallecimiento || '' });
                                    }
                                }
                                const mitad = Math.ceil(campos.length / 2);
                                const izquierda = campos.slice(0, mitad);
                                const derecha = campos.slice(mitad);
                                return (
                                    <div style={{ display: 'flex', gap: 32, fontSize: 20, width: '100%', justifyContent: 'center', margin: '0 0 2.5rem 0', border: '1px solid #eee', borderRadius: 16, padding: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', background: '#fafbfc', maxWidth: 'none' }}>
                                        <div style={{ flex: 1 }}>
                                            {izquierda.map((campo, idx) => (
                                                <div key={idx} style={{ marginBottom: 10 }}>
                                                    <b style={{ color: '#2d6a4f' }}>{campo.label}:</b> {campo.value}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            {derecha.map((campo, idx) => (
                                                <div key={idx} style={{ marginBottom: 10 }}>
                                                    <b style={{ color: '#2d6a4f' }}>{campo.label}:</b> {campo.value}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}


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
    if (!paciente.urlfoto) return null;
    try {
        const url = `http://localhost:3001/fotos/${paciente.urlfoto.split(/[\\\/]/).pop()}`;
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