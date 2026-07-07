import { useState } from "react";
import { apiPost } from "../services/api";

type LoginResponse = {
  user: {
    nome: string;
    login: string;
  };
};

type LoginTokenProps = {
  onLogin: (user: LoginResponse["user"]) => void;
};

export function LoginToken({ onLogin }: LoginTokenProps) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await apiPost<LoginResponse>("/api/auth/login", {
        login,
        senha,
      });

      onLogin(response.user);
    } catch {
      setMessage("Login ou senha invalidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120406] px-4 py-10">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-red-700/30 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-red-900/30 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#7f1d1d_0%,#b91c1c_45%,#ef4444_100%)] px-6 py-7 text-white">
          <p className="mb-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            Acesso restrito
          </p>

          <h1 className="text-3xl font-black tracking-tight">Busca de PI</h1>

          <p className="mt-2 text-sm font-medium text-red-50">
            Entre com o login autorizado para consultar informacoes internas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              Login
            </label>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              placeholder="Digite seu login"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
              Senha
            </label>
            <input
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              type="password"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              placeholder="Digite sua senha"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
