import axios from 'axios';

// Base API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // required to send/receive httpOnly cookies for refresh token
});

// A flag to prevent infinite loops if refresh fails
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (
  getToken: () => string | null,
  setToken: (token: string | null) => void,
  logout: () => void
) => {
  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          const newToken = data.accessToken;
          setToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          logout();
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};
