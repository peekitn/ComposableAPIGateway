// control-plane-ui/src/App.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { CreateApiForm } from "./pages/CreateApi";
import { ProxyTest } from "./pages/ProxyTest";
import { AddEndpointForm } from "./pages/AddEndpoint";
import { API_BASE_URL } from "./config";

type Api = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: any;
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apis, setApis] = useState<Api[]>([]);
  const [selectedApi, setSelectedApi] = useState<Api | null>(null);

  const refreshApis = async () => {
    if (!token) {
      console.log("refreshApis: sem token");
      return;
    }

    console.log("refreshApis: token", token);
    try {
      const res = await axios.get(`${API_BASE_URL}/apis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("APIs carregadas:", res.data);
      setApis(res.data);
    } catch (err: any) {
      console.error("Erro ao atualizar APIs", err);
      if (err.response?.status === 401) {
        console.log("Token inválido, fazendo logout");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    }
  };

  // Carregar token salvo
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      console.log("Token carregado do storage:", savedToken);
      setToken(savedToken);
    }
  }, []);

  // Buscar usuário quando o token existir
  useEffect(() => {
    if (!token) return;

    console.log("Verificando token com /auth/me");
    axios
      .get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("Usuário autenticado:", res.data);
        setUser(res.data);
        // Só busca APIs após confirmar que o token é válido
        refreshApis();
      })
      .catch((err) => {
        console.error("Erro no /auth/me", err);
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
      });
  }, [token]);

  const handleSelectApi = async (apiId: string) => {
    if (!apiId) {
      setSelectedApi(null);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/apis/${apiId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedApi(res.data);
    } catch (err) {
      console.error("Erro ao buscar API completa", err);
    }
  };

  if (!user) {
    return (
      <AuthForms
        onLogin={(t, u) => {
          console.log("Login realizado, token:", t);
          setToken(t);
          setUser(u);
          localStorage.setItem("token", t);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50 font-sans">
      <header className="bg-blue-600 text-white p-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Composable API Gateway</h1>
          <p className="mt-2">Bem-vindo, {user.name}</p>
        </div>
        <button
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
          onClick={() => {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          }}
        >
          Sair
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">
            Criar nova API
          </h2>
          <CreateApiForm onCreated={refreshApis} />
        </section>

        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">
            APIs Cadastradas
          </h2>

          {apis.length > 0 ? (
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Selecione a API:
              </label>
              <select
                className="border rounded p-2 w-full"
                value={selectedApi?.id || ""}
                onChange={(e) => handleSelectApi(e.target.value)}
              >
                <option value="">-- Selecione a API --</option>
                {apis.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name} ({api.slug})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma API cadastrada</p>
          )}

          {selectedApi && token && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-blue-600 mb-3">
                Adicionar Endpoint Manualmente
              </h3>
              <AddEndpointForm
                apiId={selectedApi.id}
                token={token}
                onEndpointCreated={refreshApis}
              />
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">
            Testar Proxy
          </h2>
          {selectedApi ? (
            <ProxyTest api={selectedApi} />
          ) : (
            <p className="text-gray-500">
              Selecione uma API acima para testar o proxy
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

// AuthForms (igual ao anterior, só adicionei type="email" e required)
function AuthForms({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      const url = isRegister
        ? `${API_BASE_URL}/auth/register`
        : `${API_BASE_URL}/auth/login`;

      const body: any = isRegister
        ? { name, email, password }
        : { email, password };

      const res = await axios.post(url, body);

      if (isRegister) {
        setIsRegister(false);
        setError("");
      } else {
        onLogin(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro desconhecido");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-semibold mb-4">
          {isRegister ? "Criar Conta" : "Login"}
        </h2>

        {isRegister && (
          <input
            placeholder="Nome"
            className="w-full p-2 mb-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          placeholder="Email"
          type="email"
          className="w-full p-2 mb-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          placeholder="Senha"
          type="password"
          className="w-full p-2 mb-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <button
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          onClick={handleSubmit}
        >
          {isRegister ? "Criar Conta" : "Login"}
        </button>

        <p className="mt-2 text-sm text-gray-600 text-center">
          {isRegister ? "Já tem conta?" : "Não tem conta?"}{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Login" : "Criar Conta"}
          </span>
        </p>
      </div>
    </div>
  );
}