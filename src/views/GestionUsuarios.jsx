import React, { useState } from 'react';
import RegistroEmpleados from '@/views/RegistroEmpleados.jsx';
import CreacionUsuarios from '@/views/CreacionUsuarios.jsx';
import RolesUsuarios from '@/views/RolesUsuarios.jsx';
import GestionEmpleados from '@/views/GestionEmpleados.jsx';

const GestionUsuarios = () => {
  const [tab, setTab] = useState('registro');

  return (
    <div className="w-full px-4 py-6">
      <div className="pt-6 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${
              tab === 'registro'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
            }`}
            onClick={() => setTab('registro')}
          >
            Registrar Empleados
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${
              tab === 'creacion'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
            }`}
            onClick={() => setTab('creacion')}
          >
            Creación Usuarios
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${
              tab === 'empleados'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
            }`}
            onClick={() => setTab('empleados')}
          >
            Gestión de Empleados
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${
              tab === 'roles'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
            }`}
            onClick={() => setTab('roles')}
          >
            Roles
          </button>
        </div>

        <div>
          {tab === 'registro' && <RegistroEmpleados />}
          {tab === 'creacion' && <CreacionUsuarios />}
          {tab === 'empleados' && <GestionEmpleados />}
          {tab === 'roles' && <RolesUsuarios />}
        </div>
      </div>
    </div>
  );
};

export default GestionUsuarios;

