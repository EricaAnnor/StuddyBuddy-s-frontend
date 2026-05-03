"use client";
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from "axios";
import { store } from "@/store";
import { setToken, logoutState } from "@/store/loginSlice";

export const BASE_URL = "https://studybuddy-ilmw.onrender.com/studybuddy/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const access_token =
      store.getState().loginUser.access_token ||
      localStorage.getItem("access_token");

    if (access_token && config.headers) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.config) return Promise.reject(error);

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    console.log("🔴 Response error:", error.response?.status, error.config.url);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log("🔄 Attempting refresh...");

      try {
        const { data } = await axios.post(
          `${BASE_URL}/refresh`,
          {},
          { withCredentials: true }
        );

        console.log("✅ Refresh success:", data);

        store.dispatch(setToken(data));

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization =
            `Bearer ${data.access_token}`;
        }

        return api(originalRequest);

      } catch (err: any) {
        console.log("❌ Refresh failed:", err.response?.status, err.response?.data);
        store.dispatch(logoutState());
        window.location.href = "/";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;