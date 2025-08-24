import { forwardRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { navbarLinks } from "@/constants";
import logoLight from "@/assets/logoClinicaMin.png"
import logoDark from "@/assets/logo64.png"
import { cn } from "@/utils/cn";
import PropTypes from "prop-types";
import { useAuth } from "@/contexts/auth-context";



export const Sidebar = forwardRef (({collapsed}, ref) => {
    const navigate = useNavigate();
    const { logout, user } = useAuth() || {};
    const roles = user?.roles || [];

    const canSee = (link) => {
        const req = link.allowedRoles;
        // Si no hay restricción o arreglo vacío, mostrar para todos
        if (!Array.isArray(req) || req.length === 0) return true;
        // Mostrar si el usuario tiene al menos uno de los roles requeridos
        return roles.some((r) => req.includes(r));
    };
    return (<aside 
                ref={ref} 
                className={
                    cn("fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-slate-300 bg-white [transition: _width_300ms_cubic-bezier(0.4,_0,_0.2,_1),_left_300ms_cubic-bezier(0.4,_0,_0.2,_1),_background-color_150ms_cubic-bezier(0.4,_0,_0.2,_1),_border_150ms_cubic-bezier(0.4,_0,_0.2,_1)] dark:border-slate-700 dark:bg-slate-900",
                        collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]", 
                        collapsed ? "max-md:-left-full" : "max-md:left-0"
                    )
                }
                >
                <div className="flex gap-x-3 p-3">
                    <img width="32" height="32" src={logoLight} alt="Logo" className="dark:hidden"/>
                    <img width="32" height="32" src={logoDark} alt="Logo" className="hidden dark:block"/>
                {!collapsed && <p className="text-lg font-medium text-slate-900 transition-colors dark:text-slate-50">Clinica Emanuel</p>}
                </div>
                <div className="flex w-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:_thin]">
                    {navbarLinks.map((navbarLink) =>(
                        <nav 
                            key={navbarLink.title} 
                            className={cn("sidebar-group", collapsed && "md:items-center")}
                        >
                            <p className={cn("sidebar-group-tittle", collapsed && "md:w-[45px]")}>
                                {navbarLink.title}
                            </p>
                            {navbarLink.links.filter(canSee).map((link) =>(
                                link.path === "/cerrarsesion" ? (
                                    <button
                                        key={link.label}
                                        type="button"
                                        onClick={() => {
                                            if (typeof logout === 'function') logout();
                                            navigate('/');
                                        }}
                                        className={cn("sidebar-item", collapsed && "md:w-[45px]")}
                                        style={{ textAlign: 'left' }}
                                    >
                                        <link.icon size={22} className="flex-shrink-0" />
                                        {!collapsed && <p className="whitespace-nowrap">{link.label}</p>}
                                    </button>
                                ) : (
                                    <NavLink 
                                        key={link.label} 
                                        to={`/layout${link.path.startsWith('/') ? link.path : `/${link.path}`}`} 
                                        className={cn("sidebar-item", collapsed && "md:w-[45px]")}>   
                                        <link.icon size={22} className="flex-shrink-0"></link.icon> 
                                        {!collapsed && <p className="whitespace-nowrap">{link.label}</p>}
                                    </NavLink>
                                )
                            ))}
                        </nav>
                    ))}
                </div>
            </aside>);
});

Sidebar.displayName = "Sidebar";
Sidebar.propTypes = {
    collapsed: PropTypes.bool, 
}