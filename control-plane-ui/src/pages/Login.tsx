import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      onLogin(res.data.token);
    } catch {
      setError("Email ou senha inválidos");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      {error && <p className="text-red-500">{error}</p>}
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
        Entrar
      </button>
    </form>
  );
}