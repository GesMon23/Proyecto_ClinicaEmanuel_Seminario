// Colores del dashboard: toma la paleta de Bootstrap (variables CSS) y detecta el modo oscuro.
import { useEffect, useMemo, useState } from 'react';

const TEMA_POR_DEFECTO = {
  primary: '#0d6efd',
  info: '#0dcaf0',
  success: '#198754',
  warning: '#ffc107',
  danger: '#dc3545',
  secondary: '#6c757d',
  purple: '#6f42c1',
};

function canales(hex) {
  const h = (hex || '').toString().replace('#', '');
  const base = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(base || '000000', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex, alpha = 1) {
  try {
    const [r, g, b] = canales(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

// Acepta '#rrggbb', '#rgb' o 'rgb(a)(...)'; devuelve '#rrggbb' (o el valor tal cual si no lo entiende)
export function parseCssColor(valor) {
  if (!valor) return '#ffffff';
  const v = valor.trim();
  if (v.startsWith('#')) return v;
  const m = v.match(/rgb[a]?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(',').slice(0, 3).map((x) => parseFloat(x));
    const aHex = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
    return `#${aHex(r)}${aHex(g)}${aHex(b)}`;
  }
  return v;
}

// Luminancia relativa (0 negro .. 1 blanco)
export function luminance(hex) {
  try {
    const [R, G, B] = canales(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  } catch {
    return 1;
  }
}

// { theme, isDark, colorPalette }
export function useTema() {
  const [theme, setTheme] = useState(TEMA_POR_DEFECTO);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const root = getComputedStyle(document.documentElement);
      const leer = (v) => (root.getPropertyValue(v) || '').trim();
      const siguiente = {};
      for (const k of Object.keys(TEMA_POR_DEFECTO)) siguiente[k] = leer(`--bs-${k}`) || TEMA_POR_DEFECTO[k];
      setTheme(siguiente);

      const fondo = parseCssColor(leer('--bs-body-bg') || leer('--body-bg') || '#ffffff');
      const porLuminancia = luminance(fondo) < 0.5;
      const porAtributo = (document.documentElement.getAttribute('data-bs-theme') || '').toLowerCase() === 'dark';
      const porClase = ['bg-dark', 'dark', 'theme-dark'].some((c) => document.body.classList.contains(c));
      setIsDark(porLuminancia || porAtributo || porClase);
    } catch { /* se queda con los colores por defecto */ }

    // Reaccionar a prefers-color-scheme
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && typeof mq.addEventListener === 'function') {
      const alCambiar = (e) => setIsDark(e.matches);
      mq.addEventListener('change', alCambiar);
      return () => mq.removeEventListener('change', alCambiar);
    }
    return undefined;
  }, []);

  const colorPalette = useMemo(() => [
    theme.primary,
    theme.success || '#28a745',
    theme.warning || '#f59f00',
    theme.info || '#0dcaf0',
    theme.danger || '#dc3545',
    withAlpha(theme.primary, 0.7),
    withAlpha(theme.success || '#28a745', 0.7),
    '#7950f2',   // violeta
    '#12b886',   // teal
    '#ffa94d',   // naranja suave
    '#2b8a3e',   // verde oscuro
    '#e8590c',   // naranja intenso
    '#868e96',   // gris neutro
  ], [theme]);

  return { theme, isDark, colorPalette };
}
