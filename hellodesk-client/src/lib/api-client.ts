import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 and redirect to /login immediately
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                const path = window.location.pathname;
                if (!path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/widget-demo') && !path.startsWith('/kb/public') && !path.startsWith('/kb/article')) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export function getErrorMessage(error: any, fallback = 'An unexpected error occurred'): string {
    if (!error) return fallback;
    const res = error.response?.data;
    if (res) {
        if (Array.isArray(res.details) && res.details.length > 0) {
            return res.details.join('\n');
        }
        if (res.message) {
            return res.message;
        }
        if (res.error) {
            return res.error;
        }
    }
    if (error.message) {
        return error.message;
    }
    return fallback;
}

export default apiClient;
