import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error: unknown) => {
    const err = error instanceof Error ? error : new Error(JSON.stringify(error));
    return Promise.reject(err);
  },
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    return response;
  },
  (error: unknown) => {
    const maybeAxios = error as { response?: { status?: number }; config?: { url?: string } };
    if (maybeAxios.response?.status === 401) {
      console.error("Unauthorized, redirecting...");
      const redirectUri = encodeURIComponent(globalThis.location.href);
      globalThis.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login?redirect_uri=${redirectUri}`;
    }
    if (maybeAxios.response?.status === 403 && maybeAxios.config?.url?.includes("/auth/me")) {
      console.error("403, redirecting...");
      globalThis.location.href = `${import.meta.env.VITE_API_BASE_URL}/v1/auth/logout`;
    } else if (maybeAxios.response?.status === 403) {
      console.error("Forbidden... You don't have permission to access this resource.");
    }
    const err = error instanceof Error ? error : new Error(JSON.stringify(error));
    return Promise.reject(err);
  },
);

export default axiosClient;
