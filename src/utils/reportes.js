// Cálculos de fechas de los reportes de pacientes (edad y estancia en el programa).
// Mismo criterio que el backend (backend/src/modules/reportes/calculos.js), para que la pantalla y el Excel coincidan.

// 'YYYY-MM-DD' (o con hora) como fecha local, sin el desfase de un día que produce new Date('YYYY-MM-DD')
function aFechaLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const fecha = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Edad cumplida a la fecha de corte (o a hoy); '' si no se puede calcular
export function calcularEdadHasta(nacimiento, corte) {
  const nac = aFechaLocal(nacimiento);
  const hasta = corte ? aFechaLocal(corte) : new Date();
  if (!nac || !hasta) return '';
  let anios = hasta.getFullYear() - nac.getFullYear();
  const meses = hasta.getMonth() - nac.getMonth();
  if (meses < 0 || (meses === 0 && hasta.getDate() < nac.getDate())) anios--;
  return anios >= 0 ? anios : '';
}

// Suma `meses` sin pasarse del último día del mes (31 de enero + 1 mes = 28/29 de febrero)
function sumarMeses(fecha, meses) {
  const total = fecha.getMonth() + meses;
  const anio = fecha.getFullYear() + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(fecha.getDate(), ultimoDia));
}

const aDiaUTC = (f) => Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());

// Tiempo transcurrido como "días-meses-años" (D-M-A): años y meses completos y los días que sobran
// (nunca negativos, aunque el mes anterior sea más corto). Sin `hasta` se usa hoy.
export function diferenciaDMA(desde, hasta) {
  if (!desde) return '';
  const inicio = aFechaLocal(desde);
  const fin = hasta ? aFechaLocal(hasta) : new Date();
  if (!inicio || !fin || fin < inicio) return '0-0-0';

  let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  let ancla = sumarMeses(inicio, meses);
  if (aDiaUTC(ancla) > aDiaUTC(fin)) {
    meses -= 1;
    ancla = sumarMeses(inicio, meses);
  }
  const dias = Math.round((aDiaUTC(fin) - aDiaUTC(ancla)) / 86400000);
  return `${dias}-${meses % 12}-${Math.floor(meses / 12)}`;
}

// Fecha hasta la que se cuenta la edad y la estancia de un paciente: la de fallecimiento o, si vive, hoy (null)
export function fechaCortePaciente(p) {
  const estado = (p.estadopaciente || p.estado || '').toString().toLowerCase();
  return estado === 'fallecido' && p.fechafallecido ? p.fechafallecido : null;
}
