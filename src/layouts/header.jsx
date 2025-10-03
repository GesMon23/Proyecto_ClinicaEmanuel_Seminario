import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { ChevronsLeft, Moon, Search, Sun, User as UserIcon, Settings, SquareArrowOutUpRight } from "lucide-react";
import api from "@/config/api";
import { navbarLinks } from "@/constants";
import PropTypes from "prop-types";

export const Header = ({ collapsed, setCollapsed }) => {
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth() || {};
    const navigate = useNavigate();
    const [openSettings, setOpenSettings] = useState(false);
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [newPwd2, setNewPwd2] = useState("");
    const [changeLoading, setChangeLoading] = useState(false);
    const [changeError, setChangeError] = useState("");
    const [changeMsg, setChangeMsg] = useState("");

    // Buscador
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [openSearch, setOpenSearch] = useState(false);
    const roles = user?.roles || [];

    const canSee = (link) => {
        const req = link.allowedRoles;
        if (!Array.isArray(req) || req.length === 0) return true;
        return roles.some((r) => req.includes(r));
    };

    const onSearchChange = (e) => {
        const term = (e.target.value || "").trimStart();
        setQuery(term);
        if (!term) {
            setResults([]);
            setOpenSearch(false);
            return;
        }
        const lower = term.toLowerCase();
        const hits = [];
        for (const group of navbarLinks) {
            for (const link of group.links) {
                if (link.path === "/cerrarsesion") continue;
                if (!canSee(link)) continue;
                if (link.label.toLowerCase().includes(lower) || (group.title || "").toLowerCase().includes(lower)) {
                    hits.push({
                        label: link.label,
                        path: link.path,
                        group: group.title,
                        icon: link.icon,
                    });
                }
            }
        }
        setResults(hits.slice(0, 8));
        setOpenSearch(hits.length > 0);
    };

    const goTo = (path) => {
        if (!path) return;
        navigate(`/layout${path.startsWith('/') ? path : `/${path}`}`);
        setOpenSearch(false);
        setQuery("");
    };

    // Línea principal: usuario (en mayúsculas)
    const username = (() => {
        if (!user) return "";
        return (
            user.nombre_usuario ||
            user.usuario ||
            user.username ||
            "Usuario"
        );
    })();

    // Línea secundaria: nombre del empleado (letras pequeñas)
    const employeeName = (() => {
        if (!user) return "";
        const pn = user.primer_nombre || user.primerNombre || "";
        const pa = user.primer_apellido || user.primerApellido || "";
        const nombreComp = `${pn} ${pa}`.trim();
        return (
            user.nombre_completo ||
            user.nombreCompleto ||
            user.nombre ||
            nombreComp ||
            ""
        );
    })();

    return (
        <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between bg-green-800 px-4 shadow-md transition-colors dark:bg-slate-900">
            <div className="flex items-center gap-x-3">
                <button
                    className="btn-ghost size-10"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <ChevronsLeft className={collapsed && "rotate-180"} />
                </button>
                <div className="input relative">
                    <Search
                        size={20}
                        className="text-white/80"
                    />
                    <input
                        type="text"
                        name="search"
                        id="search"
                        placeholder="Buscar opciones..."
                        className="w-full bg-transparent text-white outline-0 placeholder:text-white/70"
                        value={query}
                        onChange={onSearchChange}
                        onFocus={() => { if (results.length) setOpenSearch(true); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && results.length > 0) {
                                e.preventDefault();
                                goTo(results[0].path);
                            }
                        }}
                    />
                    {openSearch && (
                        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-md border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            {results.map((r) => (
                                <button
                                    key={`${r.group}-${r.label}`}
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                    onClick={() => goTo(r.path)}
                                >
                                    {r.icon ? (<r.icon size={16} />) : null}
                                    <span className="flex-1 truncate">{r.label}</span>
                                    <span className="text-xs text-slate-400">{r.group}</span>
                                </button>
                            ))}
                            {results.length === 0 && (
                                <div className="px-3 py-2 text-slate-400">Sin resultados</div>
                            )}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    className="btn-ghost size-10 text-white"
                    title="Abrir nueva pestaña"
                    onClick={() => {
                        const url = `${window.location.origin}/layout/dashboard`;
                        window.open(url, '_blank', 'noopener');
                    }}
                >
                    <SquareArrowOutUpRight size={18} />
                </button>
            </div>
            <div className="flex items-center gap-x-3">
                {/* Bloque Usuario: ícono + nombre en dos líneas */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center rounded-full bg-white/10 text-white size-8">
                        <UserIcon size={18} />
                    </div>
                    <div className="max-w-[220px] text-right leading-tight">
                        <div className="truncate text-white font-semibold" title={username}>
                            {String(username || "").toUpperCase()}
                        </div>
                        {employeeName ? (
                            <div className="truncate text-slate-200 text-xs" title={employeeName}>
                                {employeeName}
                            </div>
                        ) : null}
                    </div>
                </div>
                {/* Divisor vertical */}
                <div className="h-6 w-px bg-white/30 mx-1" />
                {/* Botones de opciones */}
                <button
                    className="btn-ghost size-10"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                    <Sun
                        size={20}
                        className="dark:hidden"
                    />
                    <Moon
                        size={20}
                        className="hidden dark:block"
                    />
                </button>
                <div className="relative">
                    <button
                        className="btn-ghost size-10"
                        onClick={() => setOpenSettings((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={openSettings}
                        title="Ajustes"
                    >
                        <Settings size={20} />
                    </button>
                    {openSettings && (
                        <div
                            className="absolute right-0 mt-2 w-44 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
                            role="menu"
                        >
                            <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                onClick={() => {
                                    setOpenSettings(false);
                                    setChangeError("");
                                    setChangeMsg("");
                                    setCurrentPwd("");
                                    setNewPwd("");
                                    setNewPwd2("");
                                    setShowPwdModal(true);
                                }}
                                role="menuitem"
                            >
                                Cambiar Contraseña
                            </button>
                            <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-red-600 hover:bg-slate-100 dark:text-red-400 dark:hover:bg-slate-800"
                                onClick={() => {
                                    setOpenSettings(false);
                                    if (typeof logout === 'function') logout();
                                    navigate('/');
                                }}
                                role="menuitem"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Cambio de Contraseña */}
            {showPwdModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Cambiar contraseña</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-4">Ingresa tu contraseña actual y la nueva contraseña.</p>

                        {changeMsg && (
                            <div className="mb-3 p-2 rounded border border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                                {changeMsg}
                            </div>
                        )}
                        {changeError && (
                            <div className="mb-3 p-2 rounded border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                                {changeError}
                            </div>
                        )}

                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Contraseña actual</label>
                        <input
                            type="password"
                            value={currentPwd}
                            onChange={(e) => setCurrentPwd(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                        />

                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Nueva contraseña</label>
                        <input
                            type="password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3">Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={newPwd2}
                            onChange={(e) => setNewPwd2(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                disabled={changeLoading}
                                onClick={() => { setShowPwdModal(false); setCurrentPwd(""); setNewPwd(""); setNewPwd2(""); setChangeError(""); setChangeMsg(""); }}
                                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={changeLoading}
                                onClick={async () => {
                                    try {
                                        setChangeError("");
                                        setChangeMsg("");
                                        if (!currentPwd) {
                                            setChangeError("Debes ingresar tu contraseña actual");
                                            return;
                                        }
                                        if (!newPwd) {
                                            setChangeError("Debes ingresar la nueva contraseña");
                                            return;
                                        }
                                        if (newPwd === currentPwd) {
                                            setChangeError("La nueva contraseña no puede ser igual a la contraseña actual");
                                            return;
                                        }
                                        const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
                                        if (!complexity.test(newPwd)) {
                                            setChangeError("La nueva contraseña debe tener mínimo 8 caracteres, incluir al menos una minúscula, una mayúscula, un número y un caracter especial");
                                            return;
                                        }
                                        if (newPwd !== newPwd2) {
                                            setChangeError("Las contraseñas no coinciden");
                                            return;
                                        }
                                        setChangeLoading(true);
                                        const token = localStorage.getItem('token');
                                        await api.post('/auth/change-password', { actual: currentPwd, nueva: newPwd }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
                                        // Éxito: forzar re-login
                                        if (typeof logout === 'function') logout();
                                        navigate('/');
                                        return;
                                    } catch (e) {
                                        setChangeError(e?.response?.data?.error || e.message || 'No fue posible cambiar la contraseña');
                                    } finally {
                                        setChangeLoading(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                            >
                                {changeLoading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

Header.propTypes = {
    collapsed: PropTypes.bool,
    setCollapsed: PropTypes.func,
};