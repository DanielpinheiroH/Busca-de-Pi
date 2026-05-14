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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120406] px-4 py-10">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-red-700/30 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-red-900/30 blur-3xl" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#7f1d1d_0%,#b91c1c_45%,#ef4444_100%)] px-6 py-7 text-white">
          <p className="mb-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            Acesso restrito
          </p>

          <h1 className="text-3xl font-black tracking-tight">
            Busca de PI
          </h1>

          <p className="mt-2 text-sm font-medium text-red-50">
            Validação de acesso temporário para consulta de informações internas.
          </p>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-sm font-bold text-neutral-900">{message}</p>
          </div>

          {canContinue ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
                    Usuário
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-neutral-950">
                    {user.nome}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
                    E-mail
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-neutral-950">
                    {user.email}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-700">
                    Expiração
                  </p>
                  <p className="mt-1 text-sm font-bold text-neutral-950">
                    {formatDate(user.expires_at)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-black text-red-800">
                  Aviso de segurança
                </h2>

                <div className="mt-4 space-y-3 text-sm font-medium leading-6 text-neutral-800">
                  <p>
                    Este acesso é pessoal, temporário e vinculado ao usuário
                    informado na solicitação.
                  </p>

                  <p>
                    O uso deste link é rastreado. Conseguiremos identificar
                    indícios de compartilhamento, uso indevido ou acesso fora do
                    padrão esperado.
                  </p>

                  <p>
                    Não compartilhe este link com terceiros. As informações
                    consultadas são internas, sensíveis e devem ser utilizadas
                    apenas para fins autorizados.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-neutral-500">
                  Termos rápidos
                </h3>

                <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                  <li>• O acesso ficará disponível por até 72 horas.</li>
                  <li>• O link não deve ser encaminhado ou reutilizado por terceiros.</li>
                  <li>• Consultas e acessos poderão ser auditados posteriormente.</li>
                  <li>• O uso indevido poderá resultar no bloqueio do acesso.</li>
                </ul>
              </div>

              <button
                onClick={handleContinue}
                className="mt-6 w-full rounded-2xl bg-red-700 px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-800"
              >
                Entendi e quero acessar
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center text-sm font-semibold text-neutral-600">
              Aguarde a validação do link ou solicite um novo acesso.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}