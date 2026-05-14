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
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);

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

        setAccessToken(response.token);
        setUser(response.user);
        setMessage("Acesso validado com sucesso.");
      } catch {
        setMessage("Link inválido, expirado ou não aprovado.");
      }
    }

    loginByToken();
  }, []);

  function handleContinue() {
    if (!accessToken) return;

    setToken(accessToken);
    window.location.href = "/";
  }

  function formatDate(value?: string) {
    if (!value) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  const canContinue = !!accessToken && !!user;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_30%,#f5f5f5_100%)] px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="mb-3 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
            Busca de PI
          </p>

          <h1 className="text-2xl font-black text-neutral-950">
            Acesso temporário
          </h1>

          <p className="mt-3 text-sm font-medium text-neutral-600">{message}</p>
        </div>

        {canContinue && (
          <>
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-900">
                Antes de continuar, leia os avisos:
              </p>

              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                <li>• Este acesso é pessoal e temporário.</li>
                <li>• O link é válido por até 72 horas.</li>
                <li>• Não compartilhe este acesso com terceiros.</li>
                <li>• As informações consultadas são internas e sensíveis.</li>
                <li>• Use a ferramenta apenas para fins autorizados.</li>
              </ul>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm">
              <div>
                <p className="font-bold text-red-800">Usuário</p>
                <p className="text-red-700">{user.nome}</p>
              </div>

              <div>
                <p className="font-bold text-red-800">E-mail</p>
                <p className="break-all text-red-700">{user.email}</p>
              </div>

              <div>
                <p className="font-bold text-red-800">Expira em</p>
                <p className="text-red-700">{formatDate(user.expires_at)}</p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="mt-5 w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Entendi e quero acessar o Busca de PI
            </button>
          </>
        )}

        {!canContinue && (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
            Aguarde a validação do link ou solicite um novo acesso.
          </div>
        )}
      </div>
    </main>
  );
}