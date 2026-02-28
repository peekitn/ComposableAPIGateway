import { useState } from "react";
import { createApi } from "../api/apis";

type Props = {
  onCreated?: () => void;
};

export function CreateApiForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [openapiUrl, setOpenapiUrl] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !slug.trim() || !baseUrl.trim()) {
      setError("Nome, Slug e Base URL são obrigatórios");
      return;
    }

    setLoadingCreate(true);

    try {
      let openapiSpec;

      if (openapiUrl) {
        console.log("📤 Fetching OpenAPI from URL:", openapiUrl);
        const res = await fetch(openapiUrl);
        if (!res.ok) {
          throw new Error(`Falha ao buscar OpenAPI: ${res.status} ${res.statusText}`);
        }
        openapiSpec = await res.json();
        console.log("📥 OpenAPI obtido da URL:", JSON.stringify(openapiSpec, null, 2));
      } else {
        // Se não forneceu URL, cria um spec vazio
        openapiSpec = { openapi: "3.0.0", info: { title: name, version: "1.0.0" }, paths: {} };
        console.log("📦 Usando OpenAPI padrão (vazio)");
      }

      await createApi({ name, slug, baseUrl, openapi: openapiSpec });
      setSuccess("API criada com sucesso!");
      if (onCreated) onCreated();
      setName(""); setSlug(""); setBaseUrl(""); setOpenapiUrl("");
    } catch (err: any) {
      console.error("Erro na criação da API:", err);
      setError("Erro ao criar API: " + err.message);
    } finally {
      setLoadingCreate(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-xl">
      <h2 className="text-2xl font-bold mb-4">Criar API</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-600 mb-2">{success}</p>}
      <form className="space-y-4" onSubmit={handleCreate}>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Nome *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Slug *"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Base URL *"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="OpenAPI URL (opcional)"
          value={openapiUrl}
          onChange={e => setOpenapiUrl(e.target.value)}
        />
        <button
          type="submit"
          disabled={loadingCreate}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingCreate ? "Criando..." : "Criar API"}
        </button>
      </form>
    </div>
  );
}