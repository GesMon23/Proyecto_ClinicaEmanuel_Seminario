import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/contexts/theme-context"
import Layout from "@/routes/layout"
import DashboardPage from "@/routes/dashboard/page"
import ConsultaPacientesView from "@/views/ConsultaPacientesView.jsx";
import GestionPacientes from "@/views/GestionPacientes.jsx";
import Turnos from "@/views/Turnos.jsx";
import GestionReportes from "@/views/GestionReportes.jsx";
import GestionReferencias from "@/views/GestionReferencias.jsx";
import GestionLaboratorios from "@/views/GestionLaboratorios.jsx"; 
import LoginComponent from "@/Login.jsx"; 
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequirePermiso from "@/routes/RequirePermiso";
import GestionUsuarios from "@/views/GestionUsuarios.jsx";
import Nutricion from "@/views/Nutricion.jsx";
import Psicologia from "@/views/Psicologia.jsx";
import RestablecerPassword from "@/pages/RestablecerPassword.jsx";
import Estadisticas from "@/views/estadisticas/Estadisticas.jsx";
import TurnosTVPage from "@/routes/turnos-tv/page";
import CerrarSesion from "@/routes/CerrarSesion";
function App() {
    const router = createBrowserRouter([
        {
                path: "/",
                element: <LoginComponent />,
        },
        {
                // Enlace del correo de recuperación de contraseña (pública: el token es la autorización)
                path: "/restablecer-contrasena",
                element: <RestablecerPassword />,
        },
        {
            path: "layout/",
            element: (
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            ),
            children: [
                {
                    path: "dashboard",
                    element: <DashboardPage />,
                },
                {
                    path: "estadisticas",
                    element: (
                        <RequirePermiso modulo="estadisticas">
                            <Estadisticas/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "consulta-pacientes",
                    element: (
                        <RequirePermiso modulo="consultaPacientes">
                            <ConsultaPacientesView />
                        </RequirePermiso>
                    )
                },
                {
                    path: "gestion-pacientes",
                    element: (
                        <RequirePermiso modulo="gestionPacientes">
                            <GestionPacientes/>
                        </RequirePermiso>
                    )
                },
                {
                    path: "turnos",
                    element: (
                        <RequirePermiso modulo="turnos">
                            <Turnos/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "gestion-reportes",
                    element: (
                        <RequirePermiso modulo="reportes">
                            <GestionReportes/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "gestion-referencias",
                    element: (
                        <RequirePermiso modulo="referencias">
                            <GestionReferencias/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "gestion-laboratorios",
                    element: (
                        <RequirePermiso modulo="laboratorios">
                            <GestionLaboratorios/>
                        </RequirePermiso>
                    ),
                }, 
                {
                    path: "gestion-usuarios",
                    element: (
                        <RequirePermiso modulo="usuarios">
                            <GestionUsuarios/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "nutricion",
                    element: (
                        <RequirePermiso modulo="nutricion">
                            <Nutricion/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "psicologia",
                    element: (
                        <RequirePermiso modulo="psicologia">
                            <Psicologia/>
                        </RequirePermiso>
                    ),
                },
                {
                    path: "cerrarsesion",
                    element: <CerrarSesion />,
                }
            ],
        },
        {
            path: "/turnos-tv",
            element: <TurnosTVPage />,
        },
    ]);

    return (
        <ThemeProvider storageKey="theme">
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App

