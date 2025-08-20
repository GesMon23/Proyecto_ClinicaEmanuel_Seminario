import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import logoClinica from "@/assets/logoClinica2.png"

// Modal personalizado igual que en AsignarTurno
const CustomModal = ({ show, onClose, title, children }) => {
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
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                        {title}
                    </h4>
                    {children}
                </div>
            </div>
        </>
    );
};
import api from '../config/api';
import WebcamFoto from '@/components/WebcamFoto.jsx';

const RegistroPacientes = () => {
    const [formData, setFormData] = useState({
        noAfiliacion: '',
        dpi: '',
        noPacienteProveedor: '',
        primerNombre: '',
        segundoNombre: '',
        otrosNombres: '',
        primerApellido: '',
        segundoApellido: '',
        apellidoCasada: '',
        fechaNacimiento: '',
        sexo: '',
        direccion: '',
        fechaIngreso: '',
        idDepartamento: '',
        idAcceso: '',
        numeroFormulario: '',
        periodoPrestServicios: '',
        periodoInicio: '',
        periodoFin: '',
        observaciones: '',
        idjornada: '', // idestado no es necesario en el formulario
        sesionesAutorizadasMes: ''
    });

    const [loading, setLoading] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);
    const [accesosVasculares, setAccesosVasculares] = useState([]);
    const [jornadas, setJornadas] = useState([]);
    const [imgSrc, setImgSrc] = useState(null);
    const [showCamModal, setShowCamModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [deptosResponse, accesosResponse, jornadasResponse] = await Promise.all([
                    api.get('/departamentos'),
                    api.get('/accesos-vasculares'),
                    api.get('/jornadas')
                ]);
                setDepartamentos(deptosResponse.data);
                setAccesosVasculares(accesosResponse.data);
                setJornadas(jornadasResponse.data);
            } catch (error) {
                console.error('Error al cargar datos:', error);
                setModalMessage('Error al cargar datos');
                setShowErrorModal(true);
            }
        };

        cargarDatos();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => {
            // Si el campo sexo cambia y no es Femenino, limpiamos apellidoCasada
            if (name === 'sexo' && value !== 'Femenino') {
                return { ...prevState, sexo: value, apellidoCasada: '' };
            }
            return { ...prevState, [name]: value };
        });
    };



    const openCamModal = () => setShowCamModal(true);
    const closeCamModal = () => setShowCamModal(false);

    // Usar WebcamFoto para capturar la imagen
    const handleCapturePhoto = (imageSrc) => {
        setImgSrc(imageSrc);
        setShowCamModal(false);
    };

    const handleLimpiarForm = () => {
        setFormData({
            noAfiliacion: '',
            dpi: '',
            noPacienteProveedor: '',
            primerNombre: '',
            segundoNombre: '',
            otrosNombres: '',
            primerApellido: '',
            segundoApellido: '',
            apellidoCasada: '',
            fechaNacimiento: '',
            sexo: '',
            direccion: '',
            fechaIngreso: '',
            idDepartamento: '',
            idAcceso: '',
            numeroFormulario: '',
            periodoPrestServicios: '',
            periodoInicio: '',
            periodoFin: '',
            observaciones: '',
            idjornada: '',
            sesionesAutorizadasMes: ''
        });
        setImgSrc(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validación básica en el frontend (sin idcausa)
            const requiredFields = [
                'noAfiliacion', 'dpi', 'primerNombre', 'primerApellido',
                'sexo', 'direccion', 'fechaIngreso',
                'idDepartamento', 'idAcceso', 'numeroFormulario', 'periodoInicio', 'periodoFin', 'idjornada'
            ];

            const missingFields = requiredFields.filter(field => !formData[field]);
            if (missingFields.length > 0) {
                throw new Error('Todos los campos marcados con * son obligatorios');
            }

            if (formData.dpi && formData.dpi.length !== 13) {
                throw new Error('El DPI debe tener exactamente 13 caracteres');
            }

            // Formatear periodo de prestación de servicios
            const formatFecha = (fecha) => {
                if (!fecha) return '';
                const d = new Date(fecha);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const periodoPrestServicios = `Del ${formatFecha(formData.periodoInicio)} al ${formatFecha(formData.periodoFin)}`;

            // Preparar datos para el servidor (idcausa es opcional)
            const pacienteData = {
                noafiliacion: Number(formData.noAfiliacion),
                dpi: String(formData.dpi),
                nopacienteproveedor: Number(formData.noPacienteProveedor),
                primernombre: String(formData.primerNombre),
                segundonombre: formData.segundoNombre ? String(formData.segundoNombre) : null,
                otrosnombres: formData.otrosNombres ? String(formData.otrosNombres) : null,
                primerapellido: String(formData.primerApellido),
                segundoapellido: formData.segundoApellido ? String(formData.segundoApellido) : null,
                apellidocasada: formData.apellidoCasada ? String(formData.apellidoCasada) : null,
                fechanacimiento: formData.fechaNacimiento, // YYYY-MM-DD
                sexo: String(formData.sexo),
                direccion: String(formData.direccion),
                fechaingreso: formData.fechaIngreso, // YYYY-MM-DD
                iddepartamento: Number(formData.idDepartamento),
                idestado: 1, // Siempre NuevoIngreso
                idacceso: Number(formData.idAcceso),
                numeroformulario: formData.numeroFormulario ? String(formData.numeroFormulario) : null,
                periodoprestservicios: periodoPrestServicios ? String(periodoPrestServicios) : null,
                fechainicioperiodo: formData.periodoInicio ? formData.periodoInicio : null,
                fechafinperiodo: formData.periodoFin ? formData.periodoFin : null,
                observaciones: formData.observaciones ? String(formData.observaciones) : null,
                idjornada: formData.idjornada ? Number(formData.idjornada) : null,
                sesionesautorizadasmes: formData.sesionesAutorizadasMes ? Number(formData.sesionesAutorizadasMes) : null
            };

            // 1. Registrar paciente
            const response = await api.post('/pacientes', { ...pacienteData, photo: imgSrc });

            // Esperar a que el backend termine de guardar la foto y actualizar los datos
            await new Promise(resolve => setTimeout(resolve, 600));

            // 2. Generar carné PDF usando el endpoint que siempre toma los datos actualizados
            const carnetResponse = await api.get(`/carnet/forzar/${pacienteData.noafiliacion}`, { responseType: 'blob' });

            // 3. Descargar el PDF
            const blob = new Blob([carnetResponse.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${formData.noAfiliacion}_carnet.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setSuccessMessage('Paciente registrado y carné descargado correctamente.');
            setShowSuccessModal(true);

            // 4. Limpiar formulario y estados relacionados
            setFormData({
                noAfiliacion: '',
                dpi: '',
                noPacienteProveedor: '',
                primerNombre: '',
                segundoNombre: '',
                otrosNombres: '',
                primerApellido: '',
                segundoApellido: '',
                apellidoCasada: '',
                fechaNacimiento: '',
                sexo: '',
                direccion: '',
                fechaIngreso: '',
                idDepartamento: '',
                idAcceso: '',
                numeroFormulario: '',
                periodoPrestServicios: '',
                periodoInicio: '',
                periodoFin: '',
                observaciones: '',
                idjornada: '',
                sesionesAutorizadasMes: ''
            });
            setImgSrc(null);
        } catch (error) {
            console.error('Error al registrar paciente:', error);
            let errorMessage = error.message;
            if (error.response && error.response.data) {
                if (Array.isArray(error.response.data.errors)) {
                    errorMessage = error.response.data.errors.join('\n');
                } else if (typeof error.response.data.error === 'string') {
                    errorMessage = error.response.data.error;
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            }
            setSuccessMessage('');
            setModalType('error');
            setModalMessage(`Error al registrar paciente:\n${errorMessage}`);
            setShowSuccessModal(false);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <CustomModal show={showCamModal} onClose={closeCamModal} title="Captura de Fotografía">
                <WebcamFoto onCapture={handleCapturePhoto} onCancel={closeCamModal} />
            </CustomModal>

            <CustomModal
                show={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={modalType === 'error' ? 'Error' : 'Alerta'}
            >
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {modalMessage}
                </p>
                <button
                    onClick={() => setShowErrorModal(false)}
                    className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${modalType === 'success'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                >
                    Cerrar
                </button>
            </CustomModal>



            <CustomModal show={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Registro Exitoso">
                <div style={{ textAlign: 'center', padding: 10 }}>
                    <p style={{ fontSize: 18, color: '#2ecc71', margin: 0 }}>{successMessage}</p>
                    <Button variant="success" style={{ marginTop: 12 }} onClick={() => setShowSuccessModal(false)}>
                        Cerrar
                    </Button>
                </div>
            </CustomModal>

            <div className="w-full px-4 md:px-8 py-6">
                <div className="w-full">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
                        <div className="p-6">
                            <form onSubmit={handleSubmit}>
                                <div className="w-full text-center mb-6">
                                    <div className="flex items-center justify-center gap-6 flex-wrap">
                                        <img
                                            alt="Logo Clínica"
                                            src={logoClinica}
                                            className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                                        />

                                        <h2 className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                                            Registro de Pacientes
                                        </h2>
                                    </div>
                                    <hr className="mt-4 border-gray-300 dark:border-gray-600" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="noAfiliacion" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            No. Afiliación *
                                        </label>
                                        <input
                                            type="text"
                                            id="noAfiliacion"
                                            name="noAfiliacion"
                                            value={formData.noAfiliacion}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el número de afiliación"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dpi" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            DPI *
                                        </label>
                                        <input
                                            type="text"
                                            id="dpi"
                                            name="dpi"
                                            value={formData.dpi}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el DPI"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="noPacienteProveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            No. Paciente Proveedor *
                                        </label>
                                        <input
                                            type="text"
                                            id="noPacienteProveedor"
                                            name="noPacienteProveedor"
                                            value={formData.noPacienteProveedor}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el número de paciente proveedor"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="primerNombre" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Primer Nombre *
                                        </label>
                                        <input
                                            type="text"
                                            id="primerNombre"
                                            name="primerNombre"
                                            value={formData.primerNombre}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el primer nombre"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="segundoNombre" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Segundo Nombre
                                        </label>
                                        <input
                                            type="text"
                                            id="segundoNombre"
                                            name="segundoNombre"
                                            value={formData.segundoNombre}
                                            onChange={handleInputChange}
                                            placeholder="Ingrese el segundo nombre"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="otrosNombres" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Otros Nombres
                                        </label>
                                        <input
                                            type="text"
                                            id="otrosNombres"
                                            name="otrosNombres"
                                            value={formData.otrosNombres}
                                            onChange={handleInputChange}
                                            placeholder="Ingrese otros nombres"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="primerApellido" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Primer Apellido *
                                        </label>
                                        <input
                                            type="text"
                                            id="primerApellido"
                                            name="primerApellido"
                                            value={formData.primerApellido}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el primer apellido"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="segundoApellido" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Segundo Apellido
                                        </label>
                                        <input
                                            type="text"
                                            id="segundoApellido"
                                            name="segundoApellido"
                                            value={formData.segundoApellido}
                                            onChange={handleInputChange}
                                            placeholder="Ingrese el segundo apellido"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="apellidoCasada" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Apellido Casada
                                        </label>
                                        <input
                                            type="text"
                                            id="apellidoCasada"
                                            name="apellidoCasada"
                                            value={formData.sexo === 'Femenino' ? formData.apellidoCasada : ''}
                                            onChange={handleInputChange}
                                            placeholder="Ingrese el apellido casada"
                                            disabled={formData.sexo !== 'Femenino'}
                                            className={`w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${formData.sexo === 'Femenino'
                                                ? 'border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-slate-800 dark:text-white'
                                                : 'bg-gray-200 cursor-not-allowed text-gray-500'}`}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fechaNacimiento" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Fecha de Nacimiento
                                        </label>
                                        <input
                                            type="date"
                                            id="fechaNacimiento"
                                            name="fechaNacimiento"
                                            value={formData.fechaNacimiento}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="sexo" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Género *
                                        </label>
                                        <select
                                            id="sexo"
                                            name="sexo"
                                            value={formData.sexo}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Seleccione el género</option>
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Dirección *
                                        </label>
                                        <input
                                            type="text"
                                            id="direccion"
                                            name="direccion"
                                            value={formData.direccion}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese la dirección"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fechaIngreso" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Fecha de Ingreso *
                                        </label>
                                        <input
                                            type="date"
                                            id="fechaIngreso"
                                            name="fechaIngreso"
                                            value={formData.fechaIngreso}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="idDepartamento" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Departamento *
                                        </label>
                                        <select
                                            id="idDepartamento"
                                            name="idDepartamento"
                                            value={formData.idDepartamento}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Seleccione el departamento</option>
                                            {departamentos.map((depto) => (
                                                <option key={depto.iddepartamento} value={depto.iddepartamento}>
                                                    {depto.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="idAcceso" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Acceso Vascular *
                                        </label>
                                        <select
                                            id="idAcceso"
                                            name="idAcceso"
                                            value={formData.idAcceso}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Seleccione el acceso vascular</option>
                                            {accesosVasculares.map((acceso) => (
                                                <option key={acceso.idacceso} value={acceso.idacceso}>
                                                    {acceso.descripcion}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="numeroFormulario" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Número de Formulario *
                                        </label>
                                        <input
                                            type="text"
                                            id="numeroFormulario"
                                            name="numeroFormulario"
                                            value={formData.numeroFormulario}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Ingrese el número de formulario"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Periodo Prestación Servicios *
                                        </label>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">Del</span>
                                            <input
                                                type="date"
                                                name="periodoInicio"
                                                value={formData.periodoInicio}
                                                onChange={handleInputChange}
                                                required
                                                className="flex-1 min-w-[140px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                            />
                                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">Hasta</span>
                                            <input
                                                type="date"
                                                name="periodoFin"
                                                value={formData.periodoFin}
                                                onChange={handleInputChange}
                                                required
                                                disabled={!formData.periodoInicio}
                                                min={formData.periodoInicio || undefined}
                                                className={`flex-1 min-w-[140px] px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${!formData.periodoInicio
                                                    ? 'bg-gray-200 cursor-not-allowed text-gray-500'
                                                    : 'border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-slate-800 dark:text-white'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Observaciones
                                        </label>
                                        <textarea
                                            id="observaciones"
                                            name="observaciones"
                                            value={formData.observaciones}
                                            onChange={handleInputChange}
                                            placeholder="Ingrese observaciones"
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="sesionesAutorizadasMes" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Sesiones Autorizadas por Mes *
                                        </label>
                                        <input
                                            type="number"
                                            id="sesionesAutorizadasMes"
                                            name="sesionesAutorizadasMes"
                                            value={formData.sesionesAutorizadasMes}
                                            onChange={handleInputChange}
                                            min={1}
                                            required
                                            placeholder="Ingrese el número de sesiones autorizadas"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="idjornada" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Jornada *
                                        </label>
                                        <select
                                            id="idjornada"
                                            name="idjornada"
                                            value={formData.idjornada}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Seleccione la jornada</option>
                                            {jornadas.map((jornada) => (
                                                <option key={jornada.idjornada} value={jornada.idjornada}>
                                                    {jornada.descripcion}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                            Fotografía del Paciente
                                        </label>

                                        <div className="text-center">
                                            {!imgSrc ? (
                                                <button
                                                    type="button"
                                                    onClick={openCamModal}
                                                    className="mt-2 px-6 py-2 bg-blue-400 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200 dark:text-black"
                                                >
                                                    Capturar Foto
                                                </button>
                                            ) : (
                                                <>
                                                    <img
                                                        src={imgSrc}
                                                        alt="Foto del paciente"
                                                        className="mx-auto mb-3 w-52 h-52 object-cover rounded-xl border-4 border-green-800 shadow"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={openCamModal}
                                                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-md transition duration-200"
                                                    >
                                                        Tomar otra foto
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex justify-center items-center gap-5 mt-6">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2 bg-green-500 hover:bg-green-800 text-white font-semibold rounded shadow-sm transition disabled:opacity-70 dark:text-black"
                                        >
                                            {loading ? 'Registrando...' : 'Registrar Paciente'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLimpiarForm}
                                            disabled={loading}
                                            className="px-6 py-2 bg-red-500 hover:bg-red-700 text-white font-semibold rounded shadow-sm transition disabled:opacity-70 dark:text-black"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

export default RegistroPacientes;
