import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export function RegisterForm({ onRegister }: { onRegister: (token: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password });
      onRegister(res.data.token);
    } catch {
      setError("Erro ao criar conta");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Criar Conta</h2>
      {error && <p className="text-red-500">{error}</p>}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome"
        className="w-full p-2 mb-2 border rounded"
        required
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full p-2 mb-2 border rounded"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Senha"
        className="w-full p-2 mb-2 border rounded"
        required
      />
      <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
        Registrar
      </button>
    </form>
  );
}