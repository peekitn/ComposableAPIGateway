import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

type AuthConfigProps = {
  apiId: string;
  token: string;
  onConfigSaved?: () => void;
};

type AuthConfig = {
  type: "none" | "bearer" | "apikey";
  token?: string;
  key?: string;
  in?: "header" | "query";
  name?: string;
};

export function AuthConfig({ apiId, token, onConfigSaved }: AuthConfigProps) {
  const [authType, setAuthType] = useState<"none" | "bearer" | "apikey">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">("header");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Carregar configuração existente (opcional)
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const config = res.data.authConfig;
        if (config) {
          setAuthType(config.type);
          if (config.type === "bearer") setBearerToken(config.token || "");
          if (config.type === "apikey") {
            setApiKey(config.key || "");
            setApiKeyName(config.name || "X-API-Key");
            setApiKeyLocation(config.in || "header");
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configuração", err);
      }
    }
    loadConfig();
  }, [apiId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let authConfig: AuthConfig | null = null;
    if (authType === "bearer") {
      authConfig = { type: "bearer", token: bearerToken };
    } else if (authType === "apikey") {
      authConfig = { type: "apikey", key: apiKey, in: apiKeyLocation, name: apiKeyName };
    } else {
      authConfig = { type: "none" };
    }

    try {
      await axios.put(
        `${API_BASE_URL}/apis/${apiId}/auth`,
        { authConfig },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Configuração salva com sucesso!");
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setMessage("Erro ao salvar: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md mt-6">
      <h3 className="text-xl font-semibold text-blue-600 mb-4">
        Configuração de Autenticação
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Tipo de Autenticação</label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value as any)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="none">Nenhuma</option>
            <option value="bearer">Bearer Token</option>
            <option value="apikey">API Key</option>
          </select>
        </div>

        {authType === "bearer" && (
          <div>
            <label className="block font-medium mb-1">Token Bearer</label>
            <input
              type="text"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder="seu-token-jwt"
              required
            />
          </div>
        )}

        {authType === "apikey" && (
          <>
            <div>
              <label className="block font-medium mb-1">Nome do Header/Query</label>
              <input
                type="text"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="X-API-Key"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Local</label>
              <select
                value={apiKeyLocation}
                onChange={(e) => setApiKeyLocation(e.target.value as any)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="header">Header</option>
                <option value="query">Query Parameter</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Valor da Chave</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="sua-api-key"
                required
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Configuração"}
        </button>

        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}