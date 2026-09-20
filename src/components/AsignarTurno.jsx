import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png";

const CustomModal = ({ show, onClose, title, message, children }) => {
    if (!show) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={onClose}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl z-50 max-w-md w-full mx-4">
                <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h4>
                {message && <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>}
                {children}
            </div>
        </>
    );
};

const normalizar = (v) =>
    String(v ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

const esHemodialisis = (clinica) => normalizar(clinica).includes('hemodialisis');

const AsignarTurno = () => {
    const [turnos, setTurnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [asignandoId, setAsignandoId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [showFaltanteModal, setShowFaltanteModal] = useState(false);
    const [motivoFalta, setMotivoFalta] = useState('');
    const [turnoFaltante, setTurnoFaltante] = useState(null);
    const [sendingFaltante, setSendingFaltante] = useState(false);

    const mostrarModal = (type, message) => {
        setModalType(type);
        setModalMessage(message);
        setShowModal(true);
    };

    const cargarTurnos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/GturnosCreadosT');
            setTurnos(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error cargando turnos creados:', error);
            mostrarModal('error', 'Error al cargar los turnos del día');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarTurnos();
    }, [cargarTurnos]);

    const turnosFiltrados = useMemo(() => {
        const q = normalizar(busqueda).trim();
        if (!q) return turnos;
        return turnos.filter((t) =>
            normalizar([t.id_turno_cod || t.id_turno, t.nombrepaciente, t.noafiliacion, t.nombre_clinica].join(' ')).includes(q)
        );
    }, [turnos, busqueda]);

    const handleAsignar = async (turno) => {
        setAsignandoId(turno.id_turno);
        try {
            await api.put(`/Gasignar-turnoT/${turno.id_turno}`);
            await cargarTurnos();
            mostrarModal('success', `Turno ${turno.id_turno_cod || turno.id_turno} asignado correctamente`);
        } catch (error) {
            console.error('Error asignando turno:', error);
            mostrarModal('error', 'Error al asignar el turno');
        } finally {
            setAsignandoId(null);
        }
    };

    const handleFaltante = (turno) => {
        setTurnoFaltante(turno);
        setMotivoFalta('');
        setShowFaltanteModal(true);
    };

    const handleEnviarFaltante = async () => {
        if (!motivoFalta.trim()) {
            mostrarModal('error', 'Debe ingresar un motivo.');
            return;
        }
        setSendingFaltante(true);
        try {
            const idTurno = turnoFaltante?.id_turno;
            if (!idTurno) {
                throw new Error('No se encontró el identificador del turno.');
            }

            const fechaMatch = String(turnoFaltante.fecha_turno || '').match(/^(\d{4}-\d{2}-\d{2})/);
            if (!fechaMatch) {
                throw new Error('No se pudo determinar la fecha del turno para registrar la falta.');
            }

            await api.put(`/Gfaltante-turnoT/${idTurno}`, { idturnoestado: 7 });
            await api.post('/Gregistrar-faltistaT', {
                noafiliacion: turnoFaltante.noafiliacion,
                fechaFalta: fechaMatch[1],
                motivoFalta: motivoFalta.trim(),
                nombreClinica: turnoFaltante.nombre_clinica
            });

            setShowFaltanteModal(false);
            await cargarTurnos();
            mostrarModal('success', `Falta registrada correctamente. Turno ${turnoFaltante.id_turno_cod || idTurno}`);
        } catch (error) {
            console.error('Error registrando falta:', error);
            mostrarModal('error', 'Error al registrar la falta.');
        } finally {
            setSendingFaltante(false);
        }
    };

    const thClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';

    return (
        <div className="w-full">
            <CustomModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={modalType === 'success' ? 'Éxito' : modalType === 'error' ? 'Error' : ''}
                message={modalMessage}
            >
                <button
                    onClick={() => setShowModal(false)}
                    className={`w-full ${modalType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-semibold py-2 px-4 rounded transition-colors`}
                >
                    Cerrar
                </button>
            </CustomModal>

            <CustomModal show={showFaltanteModal} onClose={() => setShowFaltanteModal(false)} title="Registrar falta">
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Motivo
                        </label>
                        <textarea
                            rows={3}
                            value={motivoFalta}
                            onChange={e => setMotivoFalta(e.target.value)}
                            placeholder="Ingrese el motivo de la falta"
                            disabled={sendingFaltante}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleEnviarFaltante}
                            disabled={sendingFaltante}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
                        >
                            {sendingFaltante ? 'Enviando...' : 'Enviar'}
                        </button>
                        <button
                            onClick={() => setShowFaltanteModal(false)}
                            disabled={sendingFaltante}
                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </CustomModal>

            <div className="flex flex-col items-center">
                <div className="w-full text-center mb-6">
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                        <img
                            src={logoClinica}
                            alt="Logo Clínica"
                            className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                        />
                        <h1 className="text-3xl font-bold text-green-800 dark:text-white">
                            Asignación
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap mb-6 w-full justify-center">
                    <input
                        type="text"
                        placeholder="Buscar en la tabla..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="text-lg px-4 py-2 w-full max-w-md rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        type="button"
                        onClick={cargarTurnos}
                        disabled={loading}
                        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors"
                    >
                        {loading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                <hr className="w-full border-gray-300 dark:border-gray-600 mb-6" />

                <div className="w-full bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th scope="col" className={thClass}>No. Turno</th>
                                    <th scope="col" className={thClass}>Nombre</th>
                                    <th scope="col" className={thClass}>No. Afiliación</th>
                                    <th scope="col" className={thClass}>Clínica</th>
                                    <th scope="col" className={thClass}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading && turnos.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Cargando...</td>
                                    </tr>
                                ) : turnosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            {turnos.length === 0 ? 'No hay turnos creados para el día de hoy' : 'No se encontraron turnos con esa búsqueda'}
                                        </td>
                                    </tr>
                                ) : (
                                    turnosFiltrados.map((t) => (
                                        <tr key={t.id_turno} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{t.id_turno_cod || t.id_turno}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{t.nombrepaciente}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{t.noafiliacion}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{t.nombre_clinica}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAsignar(t)}
                                                        disabled={asignandoId === t.id_turno}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-1 px-3 rounded transition-colors"
                                                    >
                                                        {asignandoId === t.id_turno ? 'Asignando...' : 'Asignar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleFaltante(t)}
                                                        disabled={!esHemodialisis(t.nombre_clinica)}
                                                        title={esHemodialisis(t.nombre_clinica) ? '' : 'Solo aplica a Hemodiálisis'}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 text-white text-base font-semibold py-1 px-3 rounded transition-colors"
                                                    >
                                                        Faltante
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarTurno;
