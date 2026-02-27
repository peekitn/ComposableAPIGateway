// control-plane/src/components/CreateApiForm.tsx
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoadingCreate(true);

    try {
      let openapiSpec = { openapi: "3.0.0", info: { title: name, version: "1.0.0" }, paths: {} };
      if (openapiUrl) {
        const res = await fetch(openapiUrl);
        openapiSpec = await res.json();
      }

      await createApi({ name, slug, baseUrl, openapi: openapiSpec });
      alert("API criada com sucesso!");
      if (onCreated) onCreated();
      setName(""); setSlug(""); setBaseUrl(""); setOpenapiUrl("");
    } catch (err: any) {
      alert("Erro ao criar API: " + err.message);
    } finally {
      setLoadingCreate(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow-md max-w-xl">
      <h2 className="text-2xl font-bold mb-4">Criar API</h2>
      <form className="space-y-4" onSubmit={handleCreate}>
        <input className="w-full border rounded px-3 py-2" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Slug" value={slug} onChange={e => setSlug(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Base URL" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="OpenAPI URL (opcional)" value={openapiUrl} onChange={e => setOpenapiUrl(e.target.value)} />
        <button type="submit" disabled={loadingCreate} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loadingCreate ? "Criando..." : "Criar API"}
        </button>
      </form>
    </div>
  );
}