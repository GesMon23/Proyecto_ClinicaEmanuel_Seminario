import React, { useEffect, useState } from "react";
import logoClinica from "@/assets/logoClinica2.png"
import Background from "@/assets/backgroundLogin.png";
import { useNavigate } from "react-router-dom";

const LoginComponent = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();
  // Consultar usuarios activos al montar el componente
  useEffect(() => {
    const obtenerUsuariosActivos = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/usuarios-activos');
        const data = await response.json();
        setUsuarios(data);
      } catch (error) {
        console.error('Error al obtener usuarios activos:', error);
      }
    };
    obtenerUsuariosActivos();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (/[A-Z]/.test(usuario)) {
      setMensaje("Todos los caracteres del usuario deben ir en minúsculas");
      return;
    }if (usuario.length < 8) {
      setMensaje("El usuario debe tener 8 caracteres");
      return;
    }
    if (password.length < 8) {
      setMensaje("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    const usuarioEncontrado = usuarios.find(
      (u) => u.nombre_usuario === usuario && u.contrasenia === password && u.estado
    );
    if (usuarioEncontrado) {
      navigate('/layout');
      // Aquí puedes redirigir o guardar info del usuario
    } else {
      setMensaje("Usuario o contraseña incorrectos o usuario inactivo.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="flex justify-center h-screen" style={{ background: "#edf2f7" }}>
        <div
          className="hidden bg-cover bg-black bg-opacity-50 lg:block lg:w-2/3"
          style={{
            backgroundImage:
              "url(" + Background + ")",
          }}
        >
          <div className="flex items-center h-full px-20 bg-gray-900 bg-opacity-40">
            <div>
              <h2 className="text-4xl font-bold text-white">Clínica Renal Emanuel</h2>
              <p className="max-w-xl mt-3 text-gray-300">
                Inserte frase motivadora o de identidad de la empresa
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-2/6">
          <div className="flex-1">
            <div className="text-center">
              <img src={logoClinica} alt="" className="text-4xl font-bold text-center text-gray-700 dark:text-white"></img>
            </div>
            <div className="mt-8">
              <form onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="usuario" className="block mb-2 text-sm text-gray-600 dark:text-gray-200">
                    Usuario
                  </label>
                  <input
                    type="text"
                    name="usuario"
                    id="usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    maxLength={8}
                    className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-md dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
                  />
                </div>
                <div className="mt-6">
                  <div className="flex justify-between mb-2">
                    <label htmlFor="password" className="text-sm text-gray-600 dark:text-gray-200">
                      Contraseña
                    </label>
                  </div>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-md dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
                  />
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-green-800 rounded-md hover:bg-green-700 focus:outline-none focus:bg-green-600 focus:ring focus:ring-green-500 focus:ring-opacity-50"
                  >
                    Iniciar Sesión
                  </button>
                </div>
                {mensaje && (
                  <div className="mt-4 text-center text-red-600 font-bold">{mensaje}</div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;
