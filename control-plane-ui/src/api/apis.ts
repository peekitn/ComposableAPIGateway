import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001",
});

// 🔥 Interceptor para enviar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 📌 Listar APIs
export async function listApis() {
  const response = await api.get("/apis");
  return response.data;
}

// 📌 Criar API
export async function createApi(data: any) {
  const response = await api.post("/apis", data);
  return response.data;
}

// 📌 Criar endpoint manual
export async function createEndpoint(apiId: string, data: any) {
  const response = await api.post(`/apis/${apiId}/endpoints`, data);
  return response.data;
}