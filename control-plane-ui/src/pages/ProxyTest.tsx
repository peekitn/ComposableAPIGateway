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

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "options", "head"];

export function ProxyTest({ api }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requestBody, setRequestBody] = useState("{}");
  const [response, setResponse] = useState<any>(null);
  const [loadingProxy, setLoadingProxy] = useState(false);
  const [bodyError, setBodyError] = useState("");
  const [loadingEndpoints, setLoadingEndpoints] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    console.log("🟢 ProxyTest montado/atualizado para API:", api.name, api.id);
    console.log("🟢 openapiSpec existe?", !!api.openapiSpec);
    if (api.openapiSpec) {
      console.log("🟢 openapiSpec.paths:", api.openapiSpec.paths);
    }

    async function loadEndpoints() {
      setLoadingEndpoints(true);
      console.log("🔵 Carregando endpoints...");

      let hasValidOpenAPI = false;
      if (api.openapiSpec?.paths) {
        const paths = api.openapiSpec.paths;
        for (const path in paths) {
          const methods = paths[path];
          if (methods && typeof methods === "object") {
            const validMethods = Object.keys(methods).filter(m =>
              HTTP_METHODS.includes(m.toLowerCase())
            );
            if (validMethods.length > 0) {
              hasValidOpenAPI = true;
              break;
            }
          }
        }
      }

      if (hasValidOpenAPI) {
        console.log("🔵 OpenAPI válido encontrado, extraindo endpoints...");
        const swaggerEndpoints: Endpoint[] = [];

        Object.entries(api.openapiSpec.paths).forEach(([path, methods]: [string, any]) => {
          console.log(`🔵 Path: ${path}, methods object:`, methods);
          if (methods && typeof methods === "object") {
            const validMethods = Object.keys(methods).filter(m =>
              HTTP_METHODS.includes(m.toLowerCase())
            );
            console.log(`🔵 Métodos válidos para ${path}:`, validMethods);
            validMethods.forEach(method => {
              swaggerEndpoints.push({
                method: method.toUpperCase(),
                path,
              });
            });
          }
        });

        console.log("🔵 Endpoints extraídos do OpenAPI:", swaggerEndpoints);
        setEndpoints(swaggerEndpoints);
        setLoadingEndpoints(false);
        return;
      }

      console.log("🔵 Nenhum OpenAPI válido, buscando endpoints manuais...");
      if (!token) {
        console.log("🔵 Sem token, não pode buscar endpoints manuais");
        setEndpoints([]);
        setLoadingEndpoints(false);
        return;
      }

      try {
        const url = `${API_BASE_URL}/apis/${api.id}/endpoints`;
        console.log("🔵 Buscando endpoints manuais de:", url);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("🔵 Resposta do fetch:", res.status, res.statusText);

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("🔵 Endpoints manuais recebidos:", data);

        if (Array.isArray(data)) {
          setEndpoints(data);
        } else {
          console.warn("🔵 Formato inesperado:", data);
          setEndpoints([]);
        }
      } catch (err) {
        console.error("🔵 Erro ao buscar endpoints", err);
        setEndpoints([]);
      } finally {
        setLoadingEndpoints(false);
      }
    }

    loadEndpoints();
    setSelectedEndpoint(null);
    setResponse(null);
    setBodyError("");
  }, [api, token]);

  async function handleProxyCall() {
    if (!selectedEndpoint) return;

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
      const url = `${API_BASE_URL}/proxy/${api.slug}/${selectedEndpoint.path.replace(/^\//, "")}`;
      console.log("🟡 Chamando proxy:", url, "método:", selectedEndpoint.method);

      const res = await fetch(url, {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // 🔥 TOKEN DO USUÁRIO
        },
        body: selectedEndpoint.method !== "GET" ? requestBody : undefined,
      });

      const data = await res.json();
      console.log("🟡 Resposta do proxy:", data);
      setResponse(data);
    } catch (err: any) {
      console.error("🟡 Erro no proxy:", err);
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

      {loadingEndpoints ? (
        <p>Carregando endpoints...</p>
      ) : endpoints.length === 0 ? (
        <div>
          <p className="text-gray-500 mb-3">
            Nenhum endpoint encontrado para essa API.
          </p>
          {api.openapiSpec?.paths && (
            <p className="text-sm text-yellow-600">
              ⚠️ O OpenAPI foi encontrado, mas não contém métodos HTTP definidos. Você pode adicionar endpoints manualmente abaixo.
            </p>
          )}
          {api.openapiSpec && (
            <details className="mt-4">
              <summary className="text-sm text-blue-600 cursor-pointer">
                Ver OpenAPI bruto (para depuração)
              </summary>
              <pre className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-auto max-h-60">
                {JSON.stringify(api.openapiSpec, null, 2)}
              </pre>
            </details>
          )}
        </div>
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