import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/contexts/theme-context"
import Layout from "@/routes/layout"
import DashboardPage from "@/routes/dashboard/page"
import LoginComponent from "@/Login.jsx";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequirePermiso from "@/routes/RequirePermiso";
import CerrarSesion from "@/routes/CerrarSesion";
import Cargando from "@/components/Cargando";

// Los módulos se descargan al abrirlos (la primera carga del sistema es más liviana); mientras tanto el layout
// muestra la animación de carga (routes/layout.jsx)
const ConsultaPacientesView = lazy(() => import("@/views/ConsultaPacientesView.jsx"));
const GestionPacientes = lazy(() => import("@/views/GestionPacientes.jsx"));
const Turnos = lazy(() => import("@/views/Turnos.jsx"));
const GestionReportes = lazy(() => import("@/views/GestionReportes.jsx"));
const GestionReferencias = lazy(() => import("@/views/GestionReferencias.jsx"));
const GestionLaboratorios = lazy(() => import("@/views/GestionLaboratorios.jsx"));
const GestionUsuarios = lazy(() => import("@/views/GestionUsuarios.jsx"));
const Nutricion = lazy(() => import("@/views/Nutricion.jsx"));
const Psicologia = lazy(() => import("@/views/Psicologia.jsx"));
const Estadisticas = lazy(() => import("@/views/estadisticas/Estadisticas.jsx"));
const RestablecerPassword = lazy(() => import("@/pages/RestablecerPassword.jsx"));
const TurnosTVPage = lazy(() => import("@/routes/turnos-tv/page"));

// Páginas fuera del layout (restablecer contraseña, TV)
const conCarga = (elemento) => (
    <Suspense fallback={<Cargando variante="pantalla" className="min-h-screen" />}>{elemento}</Suspense>
);
function App() {
    const router = createBrowserRouter([
        {
                path: "/",
                element: <LoginComponent />,
        },
        {
                // Enlace del correo de recuperación de contraseña (pública: el token es la autorización)
                path: "/restablecer-contrasena",
                element: conCarga(<RestablecerPassword />),
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
            element: conCarga(<TurnosTVPage />),
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

