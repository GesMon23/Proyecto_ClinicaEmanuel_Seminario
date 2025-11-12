// Utilidades de fechas para cálculos de estancia
// Formatea la diferencia entre dos fechas en "X años, Y meses, Z días" o "Menos de un día"
export function calcularEstanciaRango(inicioStr, finStr) {
  if (!inicioStr) return '';
  const norm = (s) => String(s).trim();
  const parseFlexible = (s) => {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s) ? null : s;
    const raw = norm(s);
    // Si viene en ISO u otros con tiempo, tomar solo la parte de fecha
    const datePart = raw.includes('T') ? raw.split('T')[0] : (raw.includes(' ') ? raw.split(' ')[0] : raw);
    // Intentos: YYYY-MM-DD, YYYY/MM/DD
    let sep = null;
    if (datePart.includes('-')) sep = '-';
    else if (datePart.includes('/')) sep = '/';
    if (!sep) {
      const dt = new Date(raw);
      return isNaN(dt) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }
    const parts = datePart.split(sep).map((n) => parseInt(n, 10));
    if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null;
    let y, m, d;
    if (parts[0] > 31) {
      // Asumir YYYY-M-D
      [y, m, d] = parts; m -= 1;
    } else if (parts[2] > 31) {
      // Asumir D-M-YYYY
      [d, m, y] = parts; m -= 1;
    } else {
      // Ambiguo: si el primero tiene 4 dígitos, es YYYY-M-D, sino D-M-YYYY
      if (String(parts[0]).length === 4) { [y, m, d] = parts; m -= 1; }
      else { [d, m, y] = parts; m -= 1; }
    }
    const dt = new Date(y, m, d);
    return isNaN(dt) ? null : dt;
  };

  const inicio = parseFlexible(inicioStr);
  const fin = finStr ? parseFlexible(finStr) : new Date();
  if (!inicio || !fin) return '';
  if (inicio > fin) return '0 días';

  let años = fin.getFullYear() - inicio.getFullYear();
  let meses = fin.getMonth() - inicio.getMonth();
  let dias = fin.getDate() - inicio.getDate();

  if (dias < 0) {
    meses -= 1;
    dias += new Date(fin.getFullYear(), fin.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    años -= 1;
    meses += 12;
  }

  const partes = [];
  if (años > 0) partes.push(años + (años === 1 ? ' año' : ' años'));
  if (meses > 0) partes.push(meses + (meses === 1 ? ' mes' : ' meses'));
  if (dias > 0) partes.push(dias + (dias === 1 ? ' día' : ' días'));
  if (partes.length === 0) return 'Menos de un día';
  return partes.join(', ');
}

// diffDMA existente en reportes devuelve "D-M-A". Se mantiene separado por compatibilidad.
