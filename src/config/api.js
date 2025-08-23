import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        if (!config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, error => {
    console.error('Error en request:', error);
    return Promise.reject(error);
});

// Interceptor para responses
api.interceptors.response.use(response => {
    console.log('Respuesta recibida:', response);
    return response;
}, error => {
    if (error.response) {
        console.error('Error de respuesta:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
        });
        
        // Mejorar el mensaje de error
        error.message = `Error ${error.response.status}: ${error.response.data?.error || error.response.statusText}`;
    } else if (error.request) {
        console.error('No se recibió respuesta:', error.request);
        error.message = 'No se recibió respuesta del servidor';
    }
    
    return Promise.reject(error);
});

export default api;