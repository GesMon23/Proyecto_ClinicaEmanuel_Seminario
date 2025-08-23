import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/config/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ user: null, token: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuth(a => ({ ...a, loading: false }));
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => setAuth({ user: data, token, loading: false }))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth({ user: null, token: null, loading: false });
      });
  }, []);

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ user, token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ user: null, token: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
