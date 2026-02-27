import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

export function ApiList({ token, onSelect }: { 
  token: string;
  onSelect: (api: Api) => void;
}) {

  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchApis() {
      try {
        const res = await axios.get(`${API_BASE_URL}/apis`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setApis(res.data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar APIs");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchApis();
  }, [token]);

  async function handleSelect(apiId: string) {
    try {
      const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSelect(res.data); // envia API COMPLETA
    } catch (err) {
      console.error("Erro ao carregar API completa", err);
    }
  }

  if (!token) return <p className="text-red-500">Faça login para ver suas APIs</p>;
  if (loading) return <p>Carregando APIs...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (apis.length === 0) return <p>Nenhuma API cadastrada</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {apis.map((api) => (
        <div
          key={api.id}
          onClick={() => handleSelect(api.id)}
          className="p-4 bg-white rounded shadow hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-blue-700">{api.name}</h3>
          <p className="text-gray-600">{api.baseUrl}</p>
        </div>
      ))}
    </div>
  );
}