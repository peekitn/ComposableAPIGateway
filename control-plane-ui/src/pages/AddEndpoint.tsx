import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export function AddEndpointForm({
  apiId,
  token,
  onEndpointCreated,
}: {
  apiId: string;
  token: string;
  onEndpointCreated: () => void;
}) {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!path.trim()) {
      setError("O caminho é obrigatório");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API_BASE_URL}/apis/${apiId}/endpoints`,
        { method, path, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Endpoint criado!");
      setPath("");
      setDescription("");
      onEndpointCreated();
    } catch (err) {
      console.error(err);
      setError("Erro ao criar endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mt-4">
      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="border p-2 rounded"
      >
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
      </select>

      <input
        className="border p-2 rounded w-full"
        placeholder="/users *"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        required
      />

      <input
        className="border p-2 rounded w-full"
        placeholder="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Adicionando..." : "Adicionar Endpoint"}
      </button>
    </form>
  );
}