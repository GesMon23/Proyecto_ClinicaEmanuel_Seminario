import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import CustomModal from '@/components/CustomModal';
import ConsultaNutricion from '../components/ConsultaNutricion';
import { useAviso } from '@/hooks/useAviso';
import { buscarPacienteParaRegistro } from '@/utils/pacientes';
import PantallaRegistro from './registro/PantallaRegistro';
import BuscadorPacienteRegistro from './registro/BuscadorPacienteRegistro';
import FormularioNutricion from './nutricion/FormularioNutricion';
import { FORM_VACIO, guardarInforme, normalizarMedida, problemaDelFormulario } from './nutricion/nutricion';

const Nutricion = () => {
  const [paciente, setPaciente] = useState(null);
  const [noafiliacion, setNoAfiliacion] = useState('');
  const [form, setForm] = useState(FORM_VACIO);
  const { modal, mostrar } = useAviso();

  const limpiarFormulario = () => {
    setNoAfiliacion('');
    setPaciente(null);
    setForm(FORM_VACIO);
  };

  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));
  const cambiarMedida = (campo, valor) => cambiar(campo, normalizarMedida(valor));

  const buscar = async () => {
    setPaciente(null);
    if (!noafiliacion) {
      mostrar('error', 'Campo requerido', 'Ingrese un número de afiliación.');
      return;
    }
    const { paciente: encontrado, titulo, mensaje } = await buscarPacienteParaRegistro(noafiliacion, 'nutrición');
    if (encontrado) setPaciente(encontrado);
    else mostrar('error', titulo, mensaje);
  };

  const guardar = async () => {
    const problema = problemaDelFormulario(form, Boolean(paciente));
    if (problema) {
      mostrar('error', 'Campos requeridos', problema);
      return;
    }
    try {
      const { guardado, idInforme } = await guardarInforme(noafiliacion, form);
      if (!guardado) {
        mostrar('info', 'Información', 'Se recibió una respuesta sin detalles del informe.');
        return;
      }
      mostrar('success', 'Éxito', idInforme
        ? `Informe de nutrición guardado exitosamente. ID: ${idInforme}`
        : 'Informe de nutrición guardado exitosamente.');
      limpiarFormulario();
    } catch (error) {
      console.error('Error al guardar nutrición:', error);
      mostrar('error', 'Error', error?.response?.data?.error || 'Error al guardar el informe de nutrición.');
    }
  };

  const registro = (
    <Form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <BuscadorPacienteRegistro
        paciente={paciente}
        noAfiliacion={noafiliacion}
        onCambio={setNoAfiliacion}
        onBuscar={buscar}
        onLimpiar={limpiarFormulario}
      />
      {paciente && <FormularioNutricion form={form} onCambio={cambiar} onMedida={cambiarMedida} onGuardar={guardar} />}
    </Form>
  );

  return (
    <>
      <PantallaRegistro titulo="Nutrición" registro={registro} consulta={<ConsultaNutricion />} />
      <CustomModal {...modal} />
    </>
  );
};

export default Nutricion;
