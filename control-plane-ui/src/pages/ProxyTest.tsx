import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

type Endpoint = {
  id?: string;
  method: string;
  path: string;
  description?: string;
};

type Props = {
  api: Api;
};

export function ProxyTest({ api }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requestBody, setRequestBody] = useState("{}");
  const [response, setResponse] = useState<any>(null);
  const [loadingProxy, setLoadingProxy] = useState(false);
  const [bodyError, setBodyError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    async function loadEndpoints() {
      // 🔵 CASO 1: API TEM OPENAPI
      if (api.openapiSpec?.paths) {
        const swaggerEndpoints: Endpoint[] = [];

        Object.entries(api.openapiSpec.paths).forEach(
          ([path, methods]: any) => {
            Object.keys(methods).forEach((method) => {
              swaggerEndpoints.push({
                method: method.toUpperCase(),
                path,
              });
            });
          }
        );

        setEndpoints(swaggerEndpoints);
        return;
      }

      // 🟢 CASO 2: API MANUAL (buscar do banco)
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/apis/${api.id}/endpoints`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (Array.isArray(data)) {
          setEndpoints(data);
        } else if (Array.isArray(data.endpoints)) {
          setEndpoints(data.endpoints);
        } else {
          setEndpoints([]);
        }
      } catch (err) {
        console.error("Erro ao buscar endpoints", err);
        setEndpoints([]);
      }
    }

    loadEndpoints();
    setSelectedEndpoint(null);
    setResponse(null);
    setBodyError("");
  }, [api]);

  async function handleProxyCall() {
    if (!selectedEndpoint) return;

    // Validar JSON se não for GET
    if (selectedEndpoint.method !== "GET") {
      try {
        JSON.parse(requestBody);
        setBodyError("");
      } catch {
        setBodyError("JSON inválido");
        return;
      }
    }

    setLoadingProxy(true);
    setResponse(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/proxy/${api.slug}/${selectedEndpoint.path.replace(/^\//, "")}`,
        {
          method: selectedEndpoint.method,
          headers: { "Content-Type": "application/json" },
          body:
            selectedEndpoint.method !== "GET"
              ? requestBody
              : undefined,
        }
      );

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({ error: err.message });
    } finally {
      setLoadingProxy(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">
        Proxy Test - {api.name}
      </h2>

      {endpoints.length === 0 ? (
        <p className="text-gray-500">
          Nenhum endpoint encontrado para essa API
        </p>
      ) : (
        <>
          <select
            className="border rounded px-2 py-1 w-full mb-3"
            value={selectedEndpoint?.path || ""}
            onChange={(e) => {
              const ep = endpoints.find(ept => ept.path === e.target.value) || null;
              setSelectedEndpoint(ep);
              setResponse(null);
              setBodyError("");
            }}
          >
            <option value="">Selecione o endpoint</option>
            {endpoints.map((ep, index) => (
              <option key={index} value={ep.path}>
                {ep.method} {ep.path}
              </option>
            ))}
          </select>

          {selectedEndpoint && selectedEndpoint.method !== "GET" && (
            <>
              <textarea
                className="w-full border rounded px-3 py-2 mb-2 font-mono text-sm"
                rows={4}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
              />
              {bodyError && <p className="text-red-600 text-sm mb-2">{bodyError}</p>}
            </>
          )}

          <button
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            onClick={handleProxyCall}
            disabled={loadingProxy || !selectedEndpoint}
          >
            {loadingProxy ? "Enviando..." : "Enviar"}
          </button>
        </>
      )}

      {response && (
        <pre className="bg-gray-100 p-3 mt-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}