// Modal personalizado reutilizable (igual que en ConsultaPacientes)
import React from 'react';
import { Button } from 'react-bootstrap';

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

export default CustomModal;
