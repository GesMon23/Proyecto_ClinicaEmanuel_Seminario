import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportarPacientesExcel(pacientes) {
  // Define los encabezados en el mismo orden que la tabla
  const headers = [
    'No. Afiliación', 'DPI', 'No. Interno Proveedor', 'Nombres y Apellidos', 'Fecha Nacimiento', 'Edad', 'Sexo', 'Dirección', 'Departamento', 'Fecha Ingreso', 'Estado Paciente', 'Jornada', 'Acceso Vascular', 'Número Formulario', 'Periodo', 'Sesiones Autorizadas Mes', 'Sesiones Realizadas Mes', 'Observaciones'
  ];

  // Mapea los datos de pacientes a un array de arrays, en el mismo orden que los headers
  const data = pacientes.map(p => [
    p.noafiliacion || '',
    p.dpi || '',
    p.nopacienteproveedor || '',
    p.nombrecompleto || '',
    p.fechanacimiento || '',
    p.edad || '',
    p.sexo || '',
    p.direccion || '',
    p.departamento || '',
    p.fechaingreso || '',
    p.estadopaciente || '',
    p.jornada || '',
    p.accesovascular || '',
    p.numeroformulario || '',
    p.periodo || '',
    p.numerosesionesautorizadasmes || '',
    p.numerosesionesrealizadasmes || '',
    p.observaciones || ''
  ]);

  // Crea la hoja de Excel
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...data
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');

  // Genera el archivo y lo descarga
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'reporte_pacientes.xlsx');
}
