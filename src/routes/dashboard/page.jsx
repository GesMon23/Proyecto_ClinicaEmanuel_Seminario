import Footer from "@/layouts/footer"
import { AreaChart, CreditCard, DollarSign, Package, PencilLine, Trash, TrendingUp, Users } from "lucide-react"
import { ResponsiveContainer } from "recharts"

const DashboardPage = () => {
    return (
        <div className="flex flex-col gap-y-4 ">
            <h1 className="title">Dashboard</h1>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-col-4">
                <div className="card">
                    <div className="card-header">
                        <div className="w-fit rounded-lg bg-blue-500/20 p-2 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                            <Package size={26}/>
                        </div>
                        <p className="card-title">Total Productos</p>
                    </div>
                    <div className="card-body bg-slate-100 transition-colors dark:bg-slate-950">
                        <p className="text-3xl font-bold text-slate-900 transition-colors dark:text-slate-50">25,154</p>
                        <span className="flex w-fit items-center gap-x-2 rounded-full border border-blue-500 px-2 py-1 font-medum text-blue-500 dark:text-blue-600 dark:border-blue-600">
                            <TrendingUp size={18}/>
                            25%
                        </span>
                    </div>    
                </div>
                <div className="card">
                    <div className="card-header">
                        <div className="rounded-lg bg-blue-500/20 p-2 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                            <DollarSign size={26} />
                        </div>
                        <p className="card-title">Total Paid Orders</p>
                    </div>
                    <div className="card-body bg-slate-100 transition-colors dark:bg-slate-950">
                        <p className="text-3xl font-bold text-slate-900 transition-colors dark:text-slate-50">$16,000</p>
                        <span className="flex w-fit items-center gap-x-2 rounded-full border border-blue-500 px-2 py-1 font-medium text-blue-500 dark:border-blue-600 dark:text-blue-600">
                            <TrendingUp size={18} />
                            12%
                        </span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">
                        <div className="rounded-lg bg-blue-500/20 p-2 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                            <Users size={26} />
                        </div>
                        <p className="card-title">Total Customers</p>
                    </div>
                    <div className="card-body bg-slate-100 transition-colors dark:bg-slate-950">
                        <p className="text-3xl font-bold text-slate-900 transition-colors dark:text-slate-50">15,400k</p>
                        <span className="flex w-fit items-center gap-x-2 rounded-full border border-blue-500 px-2 py-1 font-medium text-blue-500 dark:border-blue-600 dark:text-blue-600">
                            <TrendingUp size={18} />
                            15%
                        </span>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header">
                        <div className="rounded-lg bg-blue-500/20 p-2 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                            <CreditCard size={26} />
                        </div>
                        <p className="card-title">Sales</p>
                    </div>
                    <div className="card-body bg-slate-100 transition-colors dark:bg-slate-950">
                        <p className="text-3xl font-bold text-slate-900 transition-colors dark:text-slate-50">12,340</p>
                        <span className="flex w-fit items-center gap-x-2 rounded-full border border-blue-500 px-2 py-1 font-medium text-blue-500 dark:border-blue-600 dark:text-blue-600">
                            <TrendingUp size={18} />
                            19%
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="card col-sapn-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header">
                        <p className="card-title">General</p>
                    </div>
                        <div className="card-body p-0">
                            <ResponsiveContainer width="100%" height={300}>
                                
                            </ResponsiveContainer>
                        </div>
                </div>
                <div className="card col-sapn-1 md:col-span-2 lg:col-span-3"></div>
            </div>
            <div className="card">
                <div className="card-header">
                    <p className="card-title">Ordenes</p>
                </div>
                <div className="card-body p-0">
                    <div className="relative h-[500px] w-full flex-shrink-0 overflow-auto rounded-none [scrollbar-width:_thin]">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head">Id</th>
                                    <th className="table-head">Producto</th>
                                    <th className="table-head">Precio</th>
                                    <th className="table-head">Estado</th>
                                    <th className="table-head">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                <tr className="table-row">
                                    <td className="table-cell">1</td>
                                    <td className="table-cell">Manzana</td>
                                    <td className="table-cell">2</td>
                                    <td className="table-cell">Activos</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-x-4">
                                            <button className="text-blue-500 dark:text-blue-600">
                                                <PencilLine size={20}/>
                                            </button>
                                            <button className="text-red-500">
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                 <tr className="table-row">
                                    <td className="table-cell">1</td>
                                    <td className="table-cell">Manzana</td>
                                    <td className="table-cell">2</td>
                                    <td className="table-cell">Activos</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-x-4">
                                            <button className="text-blue-500 dark:text-blue-600">
                                                <PencilLine size={20}/>
                                            </button>
                                            <button className="text-red-500">
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                 <tr className="table-row">
                                    <td className="table-cell">1</td>
                                    <td className="table-cell">Manzana</td>
                                    <td className="table-cell">2</td>
                                    <td className="table-cell">Activos</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-x-4">
                                            <button className="text-blue-500 dark:text-blue-600">
                                                <PencilLine size={20}/>
                                            </button>
                                            <button className="text-red-500">
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                 <tr className="table-row">
                                    <td className="table-cell">1</td>
                                    <td className="table-cell">Manzana</td>
                                    <td className="table-cell">2</td>
                                    <td className="table-cell">Activos</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-x-4">
                                            <button className="text-blue-500 dark:text-blue-600">
                                                <PencilLine size={20}/>
                                            </button>
                                            <button className="text-red-500">
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                 <tr className="table-row">
                                    <td className="table-cell">1</td>
                                    <td className="table-cell">Manzana</td>
                                    <td className="table-cell">2</td>
                                    <td className="table-cell">Activos</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-x-4">
                                            <button className="text-blue-500 dark:text-blue-600">
                                                <PencilLine size={20}/>
                                            </button>
                                            <button className="text-red-500">
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <Footer/>
        </div>
    )
}

export default DashboardPage