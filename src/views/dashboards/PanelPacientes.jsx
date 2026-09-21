import React, { useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, Tooltip as RTooltip, Treemap, XAxis, YAxis } from 'recharts';
import { BotonAlternarFiltros, BotonAplicar, CabeceraPanel, CampoFiltro, EstilosOscuros, MarcoGrafico, TarjetaCifra, TooltipPorcentaje } from './componentes';
import { sumar } from './calculos';
import { useDatosPacientes } from './useDatosPacientes';

const margenBarras = { top: 10, right: 20, left: 10, bottom: 10 };
const unicos = (lista) => Array.from(new Set(lista.map((d) => d.name)));

export default function PanelPacientes({ tema }) {
  const { theme, isDark, colorPalette } = tema;
  const p = useDatosPacientes();
  const [verFiltros, setVerFiltros] = useState(false);
  const { estado, acceso, sexo, jornada, departamento } = p.datos;
  const color = (i) => colorPalette[i % colorPalette.length];
  const tooltip = (lista, clave = 'total') => (props) => <TooltipPorcentaje total={sumar(lista, clave)} {...props} />;
  const cifra = (cargando, valor) => (cargando ? '…' : Number(valor || 0).toLocaleString());

  return (
    <Card className="mb-4">
      <CabeceraPanel titulo="PACIENTES" color={theme.primary} />
      <Card.Body>
        <Row>
          <Col md="12">
            <TarjetaCifra etiqueta="TOTAL PACIENTES REGISTRADOS" valor={cifra(p.cargandoTotal, p.total)} tono={theme.primary} isDark={isDark} />
          </Col>
        </Row>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <TarjetaCifra
            etiqueta="PACIENTES DENTRO DEL PROGRAMA" valor={cifra(p.cargandoPrograma, p.programa.dentro)} tono={theme.success}
            isDark={isDark} tamano="2.8rem" nota="Reingreso, Activo, Nuevo ingreso"
          />
          <TarjetaCifra
            etiqueta="PACIENTES FUERA DEL PROGRAMA" valor={cifra(p.cargandoPrograma, p.programa.fuera)} tono={theme.danger}
            isDark={isDark} tamano="2.8rem" nota="Egresado, Fallecido" alfaFondo={0.08}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <MarcoGrafico titulo="Pacientes por estado" clase="h-72 md:h-80 legend-hide-sm" hayDatos={estado.length > 0}>
            <PieChart>
              <Pie data={estado} dataKey="total" nameKey="name" outerRadius={110} paddingAngle={2} minAngle={1}>
                {estado.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
              </Pie>
              <Legend layout="vertical" verticalAlign="middle" align="right" />
              <RTooltip content={tooltip(estado)} />
            </PieChart>
          </MarcoGrafico>
          <MarcoGrafico titulo="Pacientes por jornada" clase="h-72 md:h-80" hayDatos={jornada.length > 0}>
            <BarChart data={jornada} margin={margenBarras}>
              <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis />
              <Legend />
              <RTooltip content={tooltip(jornada)} />
              <Bar dataKey="total" name="Total">
                {jornada.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
              </Bar>
            </BarChart>
          </MarcoGrafico>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MarcoGrafico titulo="Pacientes por acceso vascular" clase="h-96 lg:col-span-2 legend-hide-sm" hayDatos={acceso.length > 0}>
            <BarChart data={acceso} layout="vertical" margin={{ ...margenBarras, left: 20 }}>
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={140} />
              <Legend />
              <RTooltip content={tooltip(acceso)} />
              <Bar dataKey="total" name="Total">
                {acceso.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
              </Bar>
            </BarChart>
          </MarcoGrafico>
          <MarcoGrafico titulo="Pacientes por sexo" clase="h-80 legend-hide-sm" hayDatos={sexo.length > 0}>
            <PieChart>
              <Pie data={sexo} dataKey="total" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {sexo.map((e, i) => <Cell key={e.name} fill={color(i)} />)}
              </Pie>
              <Legend />
              <RTooltip content={tooltip(sexo)} />
            </PieChart>
          </MarcoGrafico>
        </div>

        {isDark && <EstilosOscuros theme={theme} />}
        <MarcoGrafico titulo="Pacientes por departamento" clase="mt-3 h-80 md:h-96 mb-6 overflow-hidden legend-hide-sm" hayDatos={departamento.length > 0}>
          <Treemap data={departamento.map((d) => ({ name: d.name, size: d.size }))} dataKey="size" nameKey="name" stroke="#fff" fill={theme.primary} aspectRatio={4 / 3}>
            <RTooltip content={tooltip(departamento, 'size')} />
          </Treemap>
        </MarcoGrafico>

        <div className="d-flex justify-content-end" style={{ marginTop: 12, position: 'relative', zIndex: 3 }}>
          <BotonAlternarFiltros abierto={verFiltros} onClick={() => setVerFiltros((v) => !v)} theme={theme} isDark={isDark} />
        </div>
        {verFiltros && (
          <div className="mt-2 pac-filtros" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <CampoFiltro etiqueta="Acceso vascular:" valor={p.filtros.acceso} onCambio={(v) => p.cambiarFiltro('acceso', v)} opciones={unicos(acceso)} theme={theme} isDark={isDark} />
            <CampoFiltro etiqueta="Estado:" valor={p.filtros.estado} onCambio={(v) => p.cambiarFiltro('estado', v)} opciones={unicos(estado)} theme={theme} isDark={isDark} />
            <CampoFiltro etiqueta="Jornada:" valor={p.filtros.jornada} onCambio={(v) => p.cambiarFiltro('jornada', v)} opciones={unicos(jornada)} todos="Todas" theme={theme} isDark={isDark} />
            <CampoFiltro etiqueta="Sexo:" valor={p.filtros.sexo} onCambio={(v) => p.cambiarFiltro('sexo', v)} opciones={unicos(sexo)} theme={theme} isDark={isDark} />
            <div><BotonAplicar onClick={p.aplicarFiltros} theme={theme} isDark={isDark}>Aplicar filtros</BotonAplicar></div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
