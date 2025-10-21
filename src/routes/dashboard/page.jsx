import logoClinica from "@/assets/logoClinica2.png"
import Background from "@/assets/backgroundLogin.png"
import { useAuth } from "@/contexts/auth-context"

const DashboardPage = () => {
    const { user } = useAuth() || {};
    const displayName = (
        user?.nombre_usuario ||
        user?.usuario ||
        (user?.nombres && user?.apellidos ? `${user.nombres} ${user.apellidos}` : null) ||
        user?.name ||
        user?.fullName ||
        "USUARIO"
    );

    return (
        <div
            className="relative min-h-screen flex items-center justify-center"
            style={{
                backgroundImage: `url(${Background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-white/75 dark:bg-slate-900/60" />
            <div className="relative z-0 flex flex-col items-center text-center p-6">
                <img src={logoClinica} alt="Clínica Renal Emanuel" className="w-[28rem] max-w-[85vw] h-auto mb-8 select-none" />
                <h1 className="text-3xl md:text-5xl font-extrabold uppercase text-green-800 dark:text-green-700 tracking-wide">
                    BIENVENIDO {displayName}
                </h1>
            </div>
        </div>
    )
}

export default DashboardPage