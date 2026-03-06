import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

type RateLimitConfigProps = {
  apiId: string;
  token: string;
  onConfigSaved?: () => void;
};

type RateLimitConfig = {
  enabled: boolean;
  max: number;
  timeWindow: string;
};

export function RateLimitConfig({ apiId, token, onConfigSaved }: RateLimitConfigProps) {
  const [enabled, setEnabled] = useState(false);
  const [max, setMax] = useState(100);
  const [timeWindow, setTimeWindow] = useState("1 minute");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Carregar configuração existente
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const config = res.data.rateLimitConfig as RateLimitConfig;
        if (config) {
          setEnabled(config.enabled);
          setMax(config.max);
          setTimeWindow(config.timeWindow);
        }
      } catch (err) {
        console.error("Erro ao carregar configuração de rate limit", err);
      }
    }
    loadConfig();
  }, [apiId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const rateLimitConfig: RateLimitConfig = {
      enabled,
      max,
      timeWindow,
    };

    try {
      await axios.put(
        `${API_BASE_URL}/apis/${apiId}/rate-limit`,
        { rateLimitConfig },
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
        Limite de Requisições (Rate Limit)
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="enabled" className="font-medium">
            Habilitar limite específico para esta API
          </label>
        </div>

        {enabled && (
          <>
            <div>
              <label className="block font-medium mb-1">Máximo de requisições</label>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                className="border rounded px-3 py-2 w-full"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Janela de tempo</label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="10 seconds">10 segundos</option>
                <option value="1 minute">1 minuto</option>
                <option value="5 minutes">5 minutos</option>
                <option value="1 hour">1 hora</option>
                <option value="1 day">1 dia</option>
              </select>
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