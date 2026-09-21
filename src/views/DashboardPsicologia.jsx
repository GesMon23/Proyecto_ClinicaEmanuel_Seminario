import React, { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import {
  BotonAlternarFiltros, BotonAplicar, CampoFiltro, MarcoGrafico, TarjetaCifra, TooltipJornada, TooltipPorcentaje,
} from "./dashboards/componentes.jsx";
import { sumar } from "./dashboards/calculos";
import { useDatosPsicologia } from "./dashboards/useDatosPsicologia";

const theme = { primary: "#0d6efd", success: "#198754" };
const VERDE_CLARO = "#43a047";
const colorPalette = [
  "#0d6efd", "#198754", "#dc3545",   // azul, verde y rojo base
  "#6ea8fe", "#52b788", "#ff6b6b",   // medios
  "#9ec5fe", "#74c69d", "#ff8787",   // claros
];
const color = (i) => colorPalette[i % colorPalette.length];
const verdeAlternado = (i) => (i % 2 === 0 ? theme.success : VERDE_CLARO);

const ESTILOS = `
  @media (max-width: 768px) {
    .legend-hide-sm .recharts-default-legend,
    .legend-hide-sm .recharts-legend-wrapper { display: none !important; }
    .tick-sm .recharts-cartesian-axis-tick-value { font-size: 12px; }
  }
`;

// Las cinco áreas del KDQOL. Los campos son los mismos del formulario de psicología y los que devuelve
// el backend (sp_psicologia_kdqol_promedios).
const AREAS_KDQOL = [
  { name: "Físico y mental", campo: "fisico_mental" },
  { name: "Enfermedad Renal", campo: "enfermedad_renal" },
  { name: "Síntomas y Problemas", campo: "sintomas_problemas" },
  { name: "Efectos de la Enfermedad", campo: "efectos_enfermedad" },
  { name: "Vida Diaria", campo: "vida_diaria" },
];

const decimales = (v) => (v != null ? v.toFixed(2) : "—");

function TooltipPromedio({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #ddd", padding: 8, borderRadius: 6 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div>Promedio: {Number(payload[0]?.value || 0).toFixed(2)}</div>
    </div>
  );
}

// Filtros de fecha y sexo (compartidos por las gráficas generales y por el KDQOL)
function FiltrosFechaSexo({ filtros, onCambio, onAplicar, textoBoton, colorBoton }) {
  const campo = { theme, isDark: false };
  return (
    <div className="mt-3 psico-filtros" style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
      <CampoFiltro etiqueta="Desde:" tipo="date" valor={filtros.desde} onCambio={(v) => onCambio("desde", v)} {...campo} />
      <CampoFiltro etiqueta="Hasta:" tipo="date" valor={filtros.hasta} onCambio={(v) => onCambio("hasta", v)} {...campo} />
      <CampoFiltro etiqueta="Sexo:" valor={filtros.sexo} onCambio={(v) => onCambio("sexo", v)} opciones={[["M", "Masculino"], ["F", "Femenino"]]} {...campo} />
      <div><BotonAplicar onClick={onAplicar} color={colorBoton} {...campo}>{textoBoton}</BotonAplicar></div>
    </div>
  );
}

function DashboardPsicologia() {
  const d = useDatosPsicologia();
  const [verFiltros, setVerFiltros] = useState(false);
  const [verFiltrosKdqol, setVerFiltrosKdqol] = useState(false);
  const { tipo, atencion, pronostico, sexo, jornada } = d.generales;
  const totalPsico = sumar(tipo, "total");
  const porcentajes = (lista) => (props) => <TooltipPorcentaje etiqueta="Total" total={sumar(lista, "total")} {...props} />;
  const promedios = d.kdqol.promedios;
  const kdqolPromData = useMemo(
    () => AREAS_KDQOL.map((a) => ({ name: a.name, promedio: promedios[a.campo] })).filter((a) => a.promedio != null),
    [promedios]
  );
  const tarjeta = (etiqueta, valor, extra = {}) => (
    <TarjetaCifra etiqueta={etiqueta} valor={valor} tono={theme.success} isDark={false} {...extra} />
  );

  return (
    <>
      <style>{ESTILOS}</style>
      <div className="mb-3">{tarjeta("TOTAL", Number(totalPsico || 0).toLocaleString())}</div>

      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <MarcoGrafico Titulo="h5" titulo="Tipo de consulta" clase="h-[300px] md:h-80 legend-hide-sm" hayDatos={tipo.length > 0}>
          <PieChart>
            <Pie data={tipo} dataKey="total" nameKey="name" outerRadius="75%" paddingAngle={2}>
              {tipo.map((e, i) => <Cell key={`${e.name}-${i}`} fill={color(i)} />)}
            </Pie>
            <Legend layout="vertical" verticalAlign="middle" align="right" />
            <RTooltip content={porcentajes(tipo)} />
          </PieChart>
        </MarcoGrafico>
        <MarcoGrafico Titulo="h5" titulo="Jornada" clase="h-[300px] md:h-80 tick-sm legend-hide-sm" hayDatos={jornada.length > 0}>
          <BarChart data={jornada} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis />
            <RTooltip content={<TooltipJornada total={sumar(jornada, "total")} />} />
            <Bar dataKey="total">
              {jornada.map((e, i) => <Cell key={`${e.name}-${i}`} fill={color(i)} />)}
            </Bar>
          </BarChart>
        </MarcoGrafico>
        <MarcoGrafico Titulo="h5" titulo="Pronóstico" clase="h-[300px] md:h-80 legend-hide-sm" hayDatos={pronostico.length > 0}>
          <PieChart>
            <Pie data={pronostico} dataKey="total" nameKey="name" innerRadius="45%" outerRadius="70%" paddingAngle={2}>
              {pronostico.map((e, i) => <Cell key={`${e.name}-${i}`} fill={color(i)} />)}
            </Pie>
            <RTooltip content={porcentajes(pronostico)} />
            <Legend />
          </PieChart>
        </MarcoGrafico>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <MarcoGrafico Titulo="h5" titulo="Tipo de atención" clase="h-80 tick-sm" hayDatos={atencion.length > 0}>
          <BarChart data={atencion} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={110} />
            <RTooltip content={<TooltipJornada total={sumar(atencion, "total")} />} />
            <Bar dataKey="total">
              {atencion.map((e, i) => <Cell key={`${e.name}-${i}`} fill={color(i)} />)}
            </Bar>
          </BarChart>
        </MarcoGrafico>
        <MarcoGrafico Titulo="h5" titulo="Sexo" clase="h-80 legend-hide-sm" hayDatos={sexo.length > 0}>
          <PieChart>
            <Pie data={sexo} dataKey="total" nameKey="name" innerRadius="45%" outerRadius="70%" paddingAngle={2}>
              {sexo.map((e, i) => <Cell key={`${e.name}-${i}`} fill={verdeAlternado(i)} />)}
            </Pie>
            <Legend />
            <RTooltip content={porcentajes(sexo)} />
          </PieChart>
        </MarcoGrafico>
      </div>

      <div className="d-flex justify-content-end mt-2">
        <BotonAlternarFiltros abierto={verFiltros} onClick={() => setVerFiltros((v) => !v)} theme={theme} isDark={false} color={theme.success} />
      </div>
      {verFiltros && (
        <FiltrosFechaSexo filtros={d.filtros} onCambio={d.cambiarFiltro} onAplicar={d.aplicarFiltros} textoBoton="Aplicar" />
      )}

      <div className="mt-4">
        <div style={{
          backgroundColor: theme.success, color: "#fff", borderRadius: 6, padding: "8px 12px",
          display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 2px 6px rgba(25,135,84,.3)",
        }}>
          <span style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>RESULTADOS KDQOL</span>
        </div>

        <div className="mb-2 mt-3">{tarjeta("TOTAL KDQOL", Number(d.kdqol.total || 0).toLocaleString(), { tamano: "2.8rem" })}</div>

        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AREAS_KDQOL.map((a) => (
            <div key={a.name}>{tarjeta(a.name, decimales(promedios[a.campo]), { tamano: "2.2rem", grande: false })}</div>
          ))}
          <div>{tarjeta("PROMEDIO GLOBAL", decimales(promedios.global), { tamano: "2.4rem", grande: false })}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <MarcoGrafico Titulo="h5" titulo="KDQOL por jornada" clase="h-[320px] tick-sm" hayDatos={d.kdqol.jornada.length > 0}>
          <BarChart data={d.kdqol.jornada} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={110} />
            <RTooltip content={<TooltipJornada total={sumar(d.kdqol.jornada, "total")} />} />
            <Bar dataKey="total">
              {d.kdqol.jornada.map((e, i) => <Cell key={`${e.name}-${i}`} fill={color(i)} />)}
            </Bar>
          </BarChart>
        </MarcoGrafico>
        <MarcoGrafico Titulo="h5" titulo="KDQOL por sexo" clase="h-80 legend-hide-sm" hayDatos={d.kdqol.sexo.length > 0}>
          <PieChart>
            <Pie data={d.kdqol.sexo} dataKey="total" nameKey="name" innerRadius="45%" outerRadius="70%" paddingAngle={2}>
              {d.kdqol.sexo.map((e, i) => <Cell key={`${e.name}-${i}`} fill={verdeAlternado(i)} />)}
            </Pie>
            <Legend />
            <RTooltip content={porcentajes(d.kdqol.sexo)} />
          </PieChart>
        </MarcoGrafico>
      </div>

      <div className="mt-4">
        <MarcoGrafico Titulo="h5" titulo="Promedios KDQOL por área" clase="h-[320px] tick-sm legend-hide-sm" hayDatos={kdqolPromData.length > 0}>
          <BarChart data={kdqolPromData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis />
            <RTooltip content={<TooltipPromedio />} />
            <Bar dataKey="promedio">
              {kdqolPromData.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
            </Bar>
          </BarChart>
        </MarcoGrafico>
      </div>

      <div className="d-flex justify-content-end mt-3">
        <BotonAlternarFiltros abierto={verFiltrosKdqol} onClick={() => setVerFiltrosKdqol((v) => !v)} theme={theme} isDark={false} color={VERDE_CLARO} />
      </div>
      {verFiltrosKdqol && (
        <FiltrosFechaSexo filtros={d.filtrosKdqol} onCambio={d.cambiarFiltroKdqol} onAplicar={d.aplicarFiltrosKdqol} textoBoton="Aplicar KDQOL" />
      )}
    </>
  );
}

export default DashboardPsicologia;
