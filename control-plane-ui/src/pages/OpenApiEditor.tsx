import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import JsonView from '@uiw/react-json-view';

type OpenAPIEditorProps = {
  apiId: string;
  token: string;
  onSaved?: () => void;
};

export function OpenAPIEditor({ apiId, token, onSaved }: OpenAPIEditorProps) {
  const [openapiSpec, setOpenapiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedSpec, setEditedSpec] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  useEffect(() => {
    async function loadOpenAPI() {
      try {
        const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const spec = res.data.openapiSpec || { paths: {} };
        setOpenapiSpec(spec);
        setEditedSpec(spec);
      } catch (err) {
        console.error("Erro ao carregar OpenAPI", err);
        setError("Não foi possível carregar a especificação");
      } finally {
        setLoading(false);
      }
    }
    loadOpenAPI();
  }, [apiId, token]);

  const validateSpec = (spec: any) => {
    const errors = [];
    if (!spec.openapi && !spec.swagger) {
      errors.push("Campo 'openapi' ou 'swagger' obrigatório");
    }
    if (!spec.info?.title) {
      errors.push("Campo 'info.title' obrigatório");
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateSpec(editedSpec)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await axios.put(
        `${API_BASE_URL}/apis/${apiId}/openapi`,
        { openapiSpec: editedSpec },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Especificação salva com sucesso!");
      setOpenapiSpec(editedSpec);
      setEditMode(false);
      if (onSaved) onSaved();
    } catch (err: any) {
      setError("Erro ao salvar: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const countEndpoints = (spec: any) => {
    if (!spec?.paths) return 0;
    return Object.keys(spec.paths).length;
  };

  if (loading) return <p className="text-gray-500">Carregando especificação...</p>;

  return (
    <div className="bg-white p-6 rounded shadow-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-blue-600">
          Editor OpenAPI
        </h3>
        <div className="space-x-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditedSpec(openapiSpec);
                  setEditMode(false);
                  setValidationErrors([]);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-gray-600">Total Endpoints</p>
          <p className="text-2xl font-bold">{countEndpoints(openapiSpec)}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-sm text-gray-600">Versão OpenAPI</p>
          <p className="text-2xl font-bold">{openapiSpec?.openapi || openapiSpec?.swagger || "N/A"}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <p className="text-sm text-gray-600">Título</p>
          <p className="text-lg font-bold truncate">{openapiSpec?.info?.title || "Sem título"}</p>
        </div>
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-600 mb-2">{success}</p>}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 p-3 rounded mb-4">
          <p className="text-red-700 font-semibold">Erros de validação:</p>
          <ul className="list-disc list-inside text-red-600">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {editMode ? (
        <div className="border rounded p-4 max-h-96 overflow-auto bg-gray-900 text-white">
          <JsonView
            value={editedSpec}
            onUpdate={(e: any) => {
              setEditedSpec(e.value);
              validateSpec(e.value);
            }}
            onAdd={(e: any) => {
              setEditedSpec(e.value);
              validateSpec(e.value);
            }}
            onDelete={(e: any) => {
              setEditedSpec(e.value);
              validateSpec(e.value);
            }}
            collapsed={2}
            displayObjectSize={false}
            displayDataTypes={false}
            enableClipboard={true}
          />
        </div>
      ) : (
        <div className="border rounded p-4 max-h-96 overflow-auto bg-gray-50">
          <pre className="text-sm">
            {JSON.stringify(openapiSpec, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(openapiSpec, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `openapi-${apiId}.json`;
            a.click();
          }}
          className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-800"
        >
          📥 Exportar JSON
        </button>
        
        {openapiSpec?.info?.description && (
          <p className="text-sm text-gray-500 italic max-w-md truncate">
            {openapiSpec.info.description}
          </p>
        )}
      </div>
    </div>
  );
}