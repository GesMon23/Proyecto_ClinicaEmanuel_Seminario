// Bootstrap y Tailwind definen utilidades con el mismo nombre. Las de Bootstrap llevan !important y le ganan
// a las variantes de Tailwind: con `bg-white dark:bg-slate-900` el fondo seguía blanco en modo oscuro mientras
// el texto pasaba a claro (menú, paneles y opciones de los select ilegibles). Se quitan de Bootstrap las que
// chocan para que mande Tailwind; los componentes de React-Bootstrap no usan estas clases.
const DUPLICADAS_EN_BOOTSTRAP = new Set(['.bg-white', '.border']);

const quitarUtilidadesDeBootstrap = {
  postcssPlugin: 'quitar-utilidades-duplicadas-de-bootstrap',
  Once(root) {
    const archivo = root.source?.input?.file || '';
    if (!/[\\/]bootstrap[\\/]dist[\\/]css[\\/]/.test(archivo)) return;
    root.walkRules((regla) => {
      if (DUPLICADAS_EN_BOOTSTRAP.has(regla.selector)) regla.remove();
    });
  },
};

module.exports = {
  plugins: [quitarUtilidadesDeBootstrap, require('tailwindcss'), require('autoprefixer')],
};
