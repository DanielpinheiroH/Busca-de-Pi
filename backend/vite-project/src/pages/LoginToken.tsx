import { useEffect, useState } from "react";
import { apiPost, setToken } from "../services/api";

type LoginResponse = {
  token: string;
  user: {
    nome: string;
    email: string;
    setor?: string;
    expires_at: string;
  };
};

export function LoginToken() {
  const [message, setMessage] = useState("Validando acesso...");

  useEffect(() => {
    async function loginByToken() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setMessage("Token de acesso não encontrado.");
        return;
      }

      try {
        const response = await apiPost<LoginResponse>("/api/access/magic-login", {
          token,
        });

        setToken(response.token);

        window.location.href = "/";
      } catch {
        setMessage("Link inválido, expirado ou não aprovado.");
      }
    }

    loginByToken();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_30%,#f5f5f5_100%)] px-4">
      <div className="max-w-md rounded-3xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <p className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
          Busca de PI
        </p>

        <h1 className="text-2xl font-black text-neutral-950">
          Acesso temporário
        </h1>

        <p className="mt-3 text-sm font-medium text-neutral-600">{message}</p>
      </div>
    </main>
  );
}