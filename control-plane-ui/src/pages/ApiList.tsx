import { useEffect, useState } from "react";
import { listApis } from "../api/apis";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
};

export function ApiList() {
  const [apis, setApis] = useState<Api[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listApis()
      .then(setApis)
      .catch(() => setError("Erro ao carregar APIs"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>{error}</p>;
  if (apis.length === 0) return <p>Nenhuma API cadastrada</p>;

  return (
    <ul>
      {apis.map((api) => (
        <li key={api.id}>
          <strong>{api.name}</strong> — {api.baseUrl}
        </li>
      ))}
    </ul>
  );
}