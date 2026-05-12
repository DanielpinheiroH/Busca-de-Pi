import { useState } from "react";
import { apiPost } from "../services/api";

export function RequestAccess() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiPost("/api/access/request", {
        nome,
        email,
        setor,
      });

      setMessage("Solicitação enviada! Aguarde a aprovação por e-mail.");
      setNome("");
      setEmail("");
      setSetor("");
    } catch {
      setMessage("Não foi possível enviar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_30%,#f5f5f5_100%)] px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
            Acesso restrito
          </p>

          <h1 className="text-2xl font-black text-neutral-950">
            Solicitar acesso ao Busca de PI
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            O acesso será liberado somente após aprovação e ficará disponível
            por 72 horas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700">
              Nome
            </label>
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700">
              E-mail
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
              placeholder="seuemail@dominio.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700">
              Setor / motivo
            </label>
            <input
              value={setor}
              onChange={(event) => setSetor(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
              placeholder="Ex: Comercial, Financeiro, atendimento..."
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Solicitar acesso"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}