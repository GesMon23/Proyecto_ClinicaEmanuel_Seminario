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
import RequireRole from "@/routes/RequireRole";
import GestionUsuarios from "@/views/GestionUsuarios.jsx";
import Nutricion from "@/views/Nutricion.jsx";
import Psicologia from "@/views/Psicologia.jsx";
function App() {
    const router = createBrowserRouter([
        {
            
            
                path: "/",
                element: <LoginComponent />,
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
                    path: "consulta-pacientes",
                    element: <ConsultaPacientesView />
                },
                {
                    path: "gestion-pacientes",
                    element: <GestionPacientes/>
                },
                {
                    path: "llamadopacientes",
                    element: <h1 className="title">Llamado Pacientes</h1>,
                },
                {
                    path: "turnos",
                    element: <Turnos/>,
                },
                {
                    path: "gestion-reportes",
                    element: <GestionReportes/>,
                },
                {
                    path: "gestion-referencias",
                    element: <GestionReferencias/>,
                },
                {
                    path: "gestion-laboratorios",
                    element: (
                        <RequireRole roles={["RolLaboratorio"]}>
                            <GestionLaboratorios/>
                        </RequireRole>
                    ),
                }, 
                {
                    path: "gestion-usuarios",
                    element: (
                        <RequireRole roles={["RolGestionUsuarios"]}>
                            <GestionUsuarios/>
                        </RequireRole>
                    ),
                },
                {
                    path: "nutricion",
                    element: (
                        <RequireRole roles={["RolNutricion"]}>
                            <Nutricion/>
                        </RequireRole>
                    ),
                },
                {
                    path: "psicologia",
                    element: (
                        <RequireRole roles={["RolPsicologia"]}>
                            <Psicologia/>
                        </RequireRole>
                    ),
                },
                {
                    path: "cerrarsesion",
                    element: <h1 className="title">Serrar Sesion</h1>,
                }
            ],
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

