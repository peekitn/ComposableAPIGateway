import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

type AuthConfigProps = {
  apiId: string;
  token: string;
  onConfigSaved?: () => void;
};

type AuthConfig = {
  type: "none" | "bearer" | "apikey" | "oauth2";
  token?: string;                // para bearer
  key?: string;                  // para apikey
  in?: "header" | "query";       // para apikey
  name?: string;                 // para apikey
  // campos para OAuth2
  grantType?: "client_credentials";
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  audience?: string;             // <-- NOVO CAMPO
  scopes?: string[];
};

export function AuthConfig({ apiId, token, onConfigSaved }: AuthConfigProps) {
  const [authType, setAuthType] = useState<"none" | "bearer" | "apikey" | "oauth2">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">("header");
  // Estados para OAuth2
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [audience, setAudience] = useState(""); // <-- NOVO ESTADO
  const [scopes, setScopes] = useState(""); // string separada por espaços

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Carregar configuração existente
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const config = res.data.authConfig as AuthConfig;
        if (config) {
          setAuthType(config.type);
          if (config.type === "bearer") {
            setBearerToken(config.token || "");
          }
          if (config.type === "apikey") {
            setApiKey(config.key || "");
            setApiKeyName(config.name || "X-API-Key");
            setApiKeyLocation(config.in || "header");
          }
          if (config.type === "oauth2") {
            setTokenUrl(config.tokenUrl || "");
            setClientId(config.clientId || "");
            setClientSecret(config.clientSecret || "");
            setAudience(config.audience || ""); // <-- CARREGA AUDIENCE
            setScopes(config.scopes?.join(" ") || "");
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

    let authConfig: AuthConfig = { type: authType };

    if (authType === "bearer") {
      authConfig.token = bearerToken;
    } else if (authType === "apikey") {
      authConfig.key = apiKey;
      authConfig.name = apiKeyName;
      authConfig.in = apiKeyLocation;
    } else if (authType === "oauth2") {
      authConfig.grantType = "client_credentials";
      authConfig.tokenUrl = tokenUrl;
      authConfig.clientId = clientId;
      authConfig.clientSecret = clientSecret;
      authConfig.audience = audience || undefined; // <-- INCLUI AUDIENCE
      authConfig.scopes = scopes.split(/\s+/).filter(s => s.trim() !== "");
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
            <option value="oauth2">OAuth2 (Client Credentials)</option>
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

        {authType === "oauth2" && (
          <>
            <div>
              <label className="block font-medium mb-1">Token URL</label>
              <input
                type="url"
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="https://exemplo.com/oauth/token"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="seu-client-id"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="seu-client-secret"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Audience (opcional para alguns provedores)</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="https://api.exemplo.com"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Scopes (opcional, separados por espaço)</label>
              <input
                type="text"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                placeholder="read write"
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