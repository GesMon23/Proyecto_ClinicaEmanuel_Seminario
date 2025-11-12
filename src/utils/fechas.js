// Utilidades de fechas para cálculos de estancia
// Formatea la diferencia entre dos fechas en "X años, Y meses, Z días" o "Menos de un día"
export function calcularEstanciaRango(inicioStr, finStr) {
  if (!inicioStr) return '';
  const norm = (s) => String(s).split('T')[0].split(' ')[0];
  const safeDate = (s) => {
    if (!s) return null;
    const base = norm(s);
    const p = base.split('-');
    if (p.length < 3) return null;
    const y = parseInt(p[0], 10);
    const m = parseInt(p[1], 10) - 1;
    const d = parseInt(p[2], 10);
    const dt = new Date(y, m, d);
    return isNaN(dt) ? null : dt;
  };

  const inicio = safeDate(inicioStr);
  const fin = finStr ? safeDate(finStr) : new Date();
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
