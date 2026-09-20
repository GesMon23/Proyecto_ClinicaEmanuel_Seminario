// Cálculos de fechas usados por los reportes (edad y estancia en el programa).

// Fecha para Excel (Date real) o null si no es válida
const aFechaExcel = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Edad cumplida a la fecha de corte (o a hoy)
function calcularEdad(nacimiento, corte) {
  if (!nacimiento) return '';
  const nac = new Date(nacimiento);
  const hasta = corte ? new Date(corte) : new Date();
  if (Number.isNaN(nac.getTime()) || Number.isNaN(hasta.getTime())) return '';
  let anios = hasta.getFullYear() - nac.getFullYear();
  const meses = hasta.getMonth() - nac.getMonth();
  const dias = hasta.getDate() - nac.getDate();
  if (meses < 0 || (meses === 0 && dias < 0)) anios--;
  return anios >= 0 ? anios : '';
}

// Suma `meses` a una fecha sin pasarse del último día del mes (31 de enero + 1 mes = 29 de febrero)
function sumarMeses(fecha, meses) {
  const total = fecha.getMonth() + meses;
  const anio = fecha.getFullYear() + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(fecha.getDate(), ultimoDia));
}

const aDiaUTC = (f) => Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());

// Tiempo transcurrido entre dos fechas como "días-meses-años" (D-M-A): años y meses completos y los
// días que sobran (sin días negativos aunque el mes anterior sea más corto).
function diferenciaDMA(desdeStr, hastaStr) {
  if (!desdeStr) return '';
  const desde = new Date(desdeStr);
  const hasta = hastaStr ? new Date(hastaStr) : new Date();
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta < desde) return '0-0-0';

  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  let ancla = sumarMeses(desde, meses);
  if (aDiaUTC(ancla) > aDiaUTC(hasta)) {
    meses -= 1;
    ancla = sumarMeses(desde, meses);
  }
  const dias = Math.round((aDiaUTC(hasta) - aDiaUTC(ancla)) / 86400000);
  return `${dias}-${meses % 12}-${Math.floor(meses / 12)}`;
}

module.exports = { aFechaExcel, calcularEdad, diferenciaDMA };
