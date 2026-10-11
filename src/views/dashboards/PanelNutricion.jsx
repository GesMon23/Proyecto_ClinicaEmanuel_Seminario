import React, { useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import {
  BotonAlternarFiltros, BotonAplicar, CabeceraPanel, CampoFiltro, MarcoGrafico, TarjetaCifra,
  TooltipEstadoNutricional, TooltipJornada, TooltipPorcentaje,
} from './componentes';
import { CATEGORIAS_IMC } from '@/utils/imc';
import { sumar } from './calculos';
import { useDatosNutricion } from './useDatosNutricion';

export default function PanelNutricion({ tema }) {
  const { theme, isDark, colorPalette } = tema;
  const n = useDatosNutricion();
  const [verFiltros, setVerFiltros] = useState(false);
  const color = (i) => colorPalette[i % colorPalette.length];
  // Las categorías de la OMS usan su color de la escala del IMC; otros estados ("Sin clasificar"), la paleta
  const colorOMS = Object.fromEntries(CATEGORIAS_IMC.map((c) => [c.nombre, c.color]));
  const colorDeEstado = Object.fromEntries(n.estados.filter((e) => e?.name).map((e, i) => [e.name, colorOMS[e.name] || color(i)]));

  return (
    <Row>
      <Col md="12">
        <Card>
          <CabeceraPanel titulo="Nutrición" color={theme.primary} />
          <Card.Body>
            <div className="mb-3">
              <TarjetaCifra etiqueta="TOTAL" valor={Number(n.total || 0).toLocaleString()} tono={theme.primary} isDark={isDark} tamano="3.6rem" />
            </div>
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TarjetaCifra etiqueta="IMC prom. global" valor={n.imcPromedio.toFixed(2)} tono={theme.primary} isDark={isDark} tamano="2.4rem" grande={false} />
              <TarjetaCifra etiqueta="Peso prom. (kg)" valor={n.pesoPromedio.toFixed(2)} tono={theme.primary} isDark={isDark} tamano="2.4rem" grande={false} />
              <TarjetaCifra etiqueta="Altura prom. (cm)" valor={n.alturaPromedio.toFixed(2)} tono={theme.primary} isDark={isDark} tamano="2.4rem" grande={false} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <MarcoGrafico clase="h-80 legend-hide-sm" hayDatos={n.estados.length > 0}>
                <PieChart>
                  <Pie data={n.estados} dataKey="total" nameKey="name" outerRadius={110} paddingAngle={2} onClick={(d) => n.alternarEstado(d?.name)}>
                    {n.estados.map((e, i) => (
                      <Cell
                        key={e.name} fill={colorDeEstado[e.name] || color(i)}
                        stroke={n.estadoSeleccionado === e.name ? '#111' : undefined} strokeWidth={n.estadoSeleccionado === e.name ? 2 : 1}
                      />
                    ))}
                  </Pie>
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                  <RTooltip content={<TooltipEstadoNutricional estados={n.estados} total={n.total} />} />
                </PieChart>
              </MarcoGrafico>
              <MarcoGrafico clase="h-80" hayDatos={n.jornadas.length > 0}>
                <BarChart data={n.jornadas} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis />
                  <RTooltip content={<TooltipJornada total={sumar(n.jornadas, 'total')} />} />
                  <Bar dataKey="total">
                    {n.jornadas.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
                  </Bar>
                </BarChart>
              </MarcoGrafico>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mt-3">
              <MarcoGrafico clase="h-80" hayDatos={n.motivos.length > 0}>
                <BarChart data={n.motivos} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Legend />
                  <RTooltip content={(props) => <TooltipPorcentaje total={sumar(n.motivos, 'total')} {...props} />} />
                  <Bar dataKey="total" name="Total">
                    {n.motivos.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
                  </Bar>
                </BarChart>
              </MarcoGrafico>
              <MarcoGrafico clase="h-80 legend-hide-sm" hayDatos={n.sexos.length > 0}>
                <PieChart>
                  <Pie data={n.sexos} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {n.sexos.map((e, i) => <Cell key={e.name} fill={i % 2 === 0 ? theme.primary : theme.danger} />)}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </MarcoGrafico>
            </div>

            <div className="d-flex justify-content-end mt-2">
              <BotonAlternarFiltros abierto={verFiltros} onClick={() => setVerFiltros((v) => !v)} theme={theme} isDark={isDark} />
            </div>
            {verFiltros && (
              <div className="mt-3 nutri-filtros" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                <CampoFiltro etiqueta="Desde:" tipo="date" valor={n.filtros.desde} onCambio={(v) => n.cambiarFiltro('desde', v)} theme={theme} isDark={isDark} />
                <CampoFiltro etiqueta="Hasta:" tipo="date" valor={n.filtros.hasta} onCambio={(v) => n.cambiarFiltro('hasta', v)} theme={theme} isDark={isDark} />
                <CampoFiltro etiqueta="Sexo:" valor={n.filtros.sexo} onCambio={(v) => n.cambiarFiltro('sexo', v)} opciones={[['M', 'Masculino'], ['F', 'Femenino']]} theme={theme} isDark={isDark} />
                <CampoFiltro etiqueta="Motivo:" valor={n.filtros.motivo} onCambio={(v) => n.cambiarFiltro('motivo', v)} opciones={['Nuevo', 'Reconsulta']} theme={theme} isDark={isDark} />
                <div><BotonAplicar onClick={n.aplicarFiltros} theme={theme} isDark={isDark}>Aplicar</BotonAplicar></div>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
