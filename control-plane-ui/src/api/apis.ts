import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001",
});

export async function listApis() {
  const response = await api.get("/apis");
  return response.data;
}

export async function createApi(data: any) {
  const response = await api.post("/apis", data);
  return response.data;
}