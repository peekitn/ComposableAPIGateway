// control-plane/src/components/ProxyTest.tsx
import { useState } from "react";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

type Props = {
  api: Api;
};

export function ProxyTest({ api }: Props) {
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [method, setMethod] = useState("GET");
  const [requestBody, setRequestBody] = useState("{}");
  const [response, setResponse] = useState<any>(null);
  const [loadingProxy, setLoadingProxy] = useState(false);

  async function handleProxyCall() {
    if (!selectedEndpoint) return;
    setLoadingProxy(true);
    setResponse(null);

    try {
      const res = await fetch(`http://localhost:3001/proxy/${api.slug}/${selectedEndpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method !== "GET" ? requestBody : undefined,
      });
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
      <h2 className="text-2xl font-bold mb-4">Proxy Test - {api.name}</h2>
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <select className="border rounded px-2 py-1 flex-1" value={selectedEndpoint} onChange={e => setSelectedEndpoint(e.target.value)}>
          <option value="">Selecione o endpoint</option>
          {api.openapiSpec &&
            Object.keys(api.openapiSpec.paths || {}).map(p => (
              <option key={p} value={p.replace(/^\//, "")}>{p}</option>
            ))}
        </select>
        <select className="border rounded px-2 py-1 w-24" value={method} onChange={e => setMethod(e.target.value)}>
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
        </select>
      </div>
      {method !== "GET" && (
        <textarea className="w-full border rounded px-3 py-2 mb-2" rows={4} value={requestBody} onChange={e => setRequestBody(e.target.value)} />
      )}
      <button className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50" onClick={handleProxyCall} disabled={loadingProxy || !selectedEndpoint}>
        {loadingProxy ? "Enviando..." : "Enviar"}
      </button>
      {response && (
        <pre className="bg-gray-100 p-3 mt-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}