// Modal reutilizable de toda la aplicación. Tres usos:
//   · aviso:        <CustomModal title message type="success|error|info" onClose />   -> botón "Cerrar"
//   · confirmación: type="confirm" con onConfirm                                      -> "Confirmar" / "Cancelar"
//   · contenido:    <CustomModal title onClose>{...}</CustomModal>                    -> sin botones propios
import React from 'react';

const COLOR_TITULO = {
    success: 'text-green-700 dark:text-green-400',
    error: 'text-red-700 dark:text-red-400',
    confirm: 'text-red-700 dark:text-red-400',
};
const COLOR_BOTON = {
    success: 'bg-green-600 hover:bg-green-700',
    error: 'bg-red-600 hover:bg-red-700',
};

const CustomModal = ({
    show, onClose, title, message, type = 'info', onConfirm,
    confirmText = 'Confirmar', cancelText = 'Cancelar', children,
}) => {
    if (!show) return null;
    const conContenido = children !== undefined && children !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h4 className={`text-xl font-semibold mb-3 ${conContenido ? 'text-gray-800 dark:text-white' : (COLOR_TITULO[type] || 'text-gray-800 dark:text-white')}`}>
                    {title}
                </h4>
                {message && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">{message}</p>
                )}
                {conContenido && children}
                {!conContenido && type === 'confirm' && (
                    <div className="flex justify-end gap-3 mt-5">
                        <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>
                            {confirmText}
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500" onClick={onClose}>
                            {cancelText}
                        </button>
                    </div>
                )}
                {!conContenido && type !== 'confirm' && (
                    <button
                        onClick={onClose}
                        className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${COLOR_BOTON[type] || 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        Cerrar
                    </button>
                )}
            </div>
        </div>
    );
};

export default CustomModal;
