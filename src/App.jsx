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
function App() {
    const router = createBrowserRouter([
        {
            
            
                path: "/",
                element: <LoginComponent />,
              },  
              {
            path: "layout",
            element: <Layout />,
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
                    element: <GestionLaboratorios/>,
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
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}

export default App
