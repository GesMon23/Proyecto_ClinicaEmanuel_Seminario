import React from "react";
import { Redirect } from "react-router-dom";

import Dashboard from "views/Dashboard.js";
import ConsultaPacientesView from "views/ConsultaPacientesView.js";
import UserProfile from "views/UserProfile.js";
import TableList from "views/TableList.js";
import Typography from "views/Typography.js";
import Icons from "views/Icons.js";
import Maps from "views/Maps.js";
import Notifications from "views/Notifications.js";
import Upgrade from "views/Upgrade.js";
import Turnos from "views/Turnos.js";
import GestionPacientes from "views/GestionPacientes.js";
import LlamadoTurnos from "views/LlamadoPaciente.js";
import ActualizacionPacientes from "views/ActualizacionPacientes.js";
import GestionReportes from "views/GestionReportes.js";
import GestionReferencias from "views/GestionReferencias.js";
import GestionLaboratorios from "views/GestionLaboratorios.jsx";
import LoginComponent from "views/Login.js";
import DashboardsInteractivos from "views/DashboardsInteractivos.jsx";

var routes = [
  {
    path: "/estadisticas",
    name: "Estadísticas",
    icon: "nc-icon nc-chart-bar-32",
    component: DashboardsInteractivos,
    layout: "/admin",
    requiredRole: "RolEstadistica"
  },
  {
    path: "/consulta-pacientes",
    name: "Consulta Pacientes",
    icon: "nc-icon nc-badge",
    component: ConsultaPacientesView,
    layout: "/admin"
  },
  {
    path: "/gestion-pacientes",
    name: "Gestión Pacientes",
    icon: "nc-icon nc-single-02",
    component: GestionPacientes,
    layout: "/admin"
  },
  {
    path: "/llamadopacientes",
    name: "Llamado Pacientes",
    icon: "nc-icon nc-notification-70",
    component: LlamadoTurnos,
    layout: "/admin"
  },
  {
    path: "/turnos",
    name: "Turnos",
    icon: "nc-icon nc-bullet-list-67",
    component: Turnos,
    layout: "/admin"
  },
  {
    path: "/gestion-reportes",
    name: "Reportes",
    icon: "nc-icon nc-paper-2",
    component: GestionReportes,
    layout: "/admin"
  },
  {
    path: "/gestion-referencias",
    name: "Referencias",
    icon: "nc-icon nc-notes",
    component: GestionReferencias,
    layout: "/admin"
  },
  {
    path: "/gestion-laboratorios",
    name: "Laboratorios",
    icon: "nc-icon nc-atom",
    component: GestionLaboratorios,
    layout: "/admin"
  },
  {
    path: "/icons",
    name: "Icons",
    icon: "nc-icon nc-diamond",
    component: Icons,
    layout: "/admin"
  },
  {
    path: "/login",
    name: "Login",
    icon: "nc-icon nc-diamond",
    component: LoginComponent,
    layout: "/admin"
  }
];

export default routes;

