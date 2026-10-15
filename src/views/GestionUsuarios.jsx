import React from 'react';
import RegistroEmpleados from '@/views/RegistroEmpleados.jsx';
import CreacionUsuarios from '@/views/CreacionUsuarios.jsx';
import RolesUsuarios from '@/views/RolesUsuarios.jsx';
import GestionEmpleados from '@/views/GestionEmpleados.jsx';
import PermisosRoles from '@/views/PermisosRoles.jsx';
import BarraPestanas from '@/components/BarraPestanas';
import { usePestanas } from '@/hooks/usePestanas';

const CONTENIDO = {
  registro: RegistroEmpleados,
  creacion: CreacionUsuarios,
  empleados: GestionEmpleados,
  roles: RolesUsuarios,
  permisos: PermisosRoles,
};

const GestionUsuarios = () => {
  const { visibles, activa, setActiva } = usePestanas('usuarios');
  const Contenido = CONTENIDO[activa];

  return (
    <div className="w-full px-4 py-6">
      <div className="pt-6 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
        <BarraPestanas pestanas={visibles} activa={activa} onCambio={setActiva} />
        <div>{Contenido && <Contenido />}</div>
      </div>
    </div>
  );
};

export default GestionUsuarios;
