// control-plane-ui/src/App.tsx
import { useState, useEffect } from "react";
import { CreateApiForm } from "./pages/CreateApi";
import { ApiList } from "./pages/ApiList";
import { ProxyTest } from "./pages/ProxyTest";
import { listApis } from "./api/apis";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

export default function App() {
  const [apis, setApis] = useState<Api[]>([]);
  const [selectedApi, setSelectedApi] = useState<Api | null>(null);

  useEffect(() => {
    listApis()
      .then(setApis)
      .catch((err) => console.error("Erro ao carregar APIs", err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 font-sans">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <h1 className="text-4xl font-bold text-center">Composable API Gateway</h1>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Criação de API */}
        <section className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Criar nova API</h2>
          <CreateApiForm />
        </section>

        {/* APIs cadastradas */}
        <section className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">APIs Cadastradas</h2>
          <ApiList />

          {apis.length > 0 && (
            <div className="mt-4">
              <label className="block mb-2 font-medium text-gray-700">
                Selecione a API para testar:
              </label>
              <select
                className="border rounded p-2 w-full focus:ring-2 focus:ring-blue-400"
                value={selectedApi?.id || ""}
                onChange={(e) => {
                  const api = apis.find((a) => a.id === e.target.value) || null;
                  setSelectedApi(api);
                }}
              >
                <option value="">-- Selecione a API --</option>
                {apis.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name} ({api.slug})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Proxy Test */}
        <section className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Testar Proxy</h2>
          {selectedApi ? (
            <ProxyTest api={selectedApi} />
          ) : (
            <p className="text-gray-500">Selecione uma API acima para testar o proxy</p>
          )}
        </section>

        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-100 p-4 rounded-xl shadow-md text-center">
            <h3 className="font-semibold text-lg text-blue-800">Total de APIs</h3>
            <p className="text-2xl font-bold text-blue-900">{apis.length}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-xl shadow-md text-center">
            <h3 className="font-semibold text-lg text-green-800">APIs com Endpoints</h3>
            <p className="text-2xl font-bold text-green-900">
              {apis.filter((a) => a.openapiSpec?.paths && Object.keys(a.openapiSpec.paths).length > 0).length}
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-xl shadow-md text-center">
            <h3 className="font-semibold text-lg text-yellow-800">APIs sem Endpoints</h3>
            <p className="text-2xl font-bold text-yellow-900">
              {apis.filter((a) => !a.openapiSpec?.paths || Object.keys(a.openapiSpec.paths).length === 0).length}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}