import { useEffect, useMemo, useState, type ReactNode } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

type PI = {
  pi: string;
  anunciante: string;
  cnpjAnunciante: string;
  tipoPi: string;
  piMatriz: string;
  campanha: string;
  executivo: string;
  diretoria: string;
  canal: string;
  produto: string;
  agencia: string;
  razaoSocialAgencia: string;
  cnpjAgencia: string;
  ufCliente: string;
  ufAgencia: string;
  perfil: string;
  mesVenda: string;
  dataVenda: string;
  inicioVeiculacao: string;
  fimVeiculacao: string;
  vencimento: string;
  valorBruto: number;
  valorLiquido: number;
  observacoes: string;
};

const ITEMS_PER_PAGE = 50;

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatMoney(value: number) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCNPJ(value: string) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length !== 14) return value || "-";
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function normalize(value: string) {
  return (value || "").replace(/\D/g, "");
}

function isLongText(text: string) {
  return (text || "").trim().length > 140;
}

function MatrixBadge({ value }: { value: string }) {
  const isMatrix = (value || "").trim().toLowerCase() === "sim";

  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isMatrix
          ? "border border-yellow-300 bg-yellow-100 text-yellow-800"
          : "border border-white/30 bg-white/10 text-white",
      ].join(" ")}
    >
      {isMatrix ? "PI MATRIZ" : "PI NORMAL"}
    </span>
  );
}

type InfoItemProps = {
  label: string;
  value: string | number;
  strong?: boolean;
};

function InfoItem({ label, value, strong = false }: InfoItemProps) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </p>
      <p
        className={[
          "truncate text-[13px] leading-4 text-neutral-900",
          strong ? "font-bold text-red-700" : "font-medium",
        ].join(" ")}
        title={String(value || "-")}
      >
        {value || "-"}
      </p>
    </div>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-600" />
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

type StatPillProps = {
  label: string;
  value: string;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-red-700">{value}</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<PI[]>([]);
  const [searchPI, setSearchPI] = useState("");
  const [searchCNPJ, setSearchCNPJ] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>(
    {}
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/data/dados.json")
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchPI, searchCNPJ, searchDate]);

  const filtered = useMemo(() => {
    const normalizedSearchPI = normalize(searchPI);

    return [...data]
      .filter((item) => {
        if (!normalizedSearchPI) return true;
        return normalize(item.pi) === normalizedSearchPI;
      })
      .filter((item) =>
        normalize(item.cnpjAnunciante).includes(normalize(searchCNPJ))
      )
      .filter((item) =>
        searchDate ? item.fimVeiculacao === searchDate : true
      )
      .sort(
        (a, b) =>
          new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
      );
  }, [data, searchPI, searchCNPJ, searchDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filtered.slice(start, end);
  }, [filtered, currentPage]);

  const clearFilters = () => {
    setSearchPI("");
    setSearchCNPJ("");
    setSearchDate("");
    setCurrentPage(1);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resultados");

    worksheet.columns = [
      { header: "PI", key: "pi", width: 14 },
      { header: "Anunciante", key: "anunciante", width: 28 },
      { header: "CNPJ Anunciante", key: "cnpjAnunciante", width: 22 },
      { header: "Tipo do PI", key: "tipoPi", width: 18 },
      { header: "PI Matriz", key: "piMatriz", width: 15 },
      { header: "Campanha", key: "campanha", width: 20 },
      { header: "Executivo", key: "executivo", width: 20 },
      { header: "Diretoria", key: "diretoria", width: 20 },
      { header: "Canal", key: "canal", width: 20 },
      { header: "Produto", key: "produto", width: 30 },
      { header: "Agência", key: "agencia", width: 18 },
      { header: "Razão Social Agência", key: "razaoSocialAgencia", width: 28 },
      { header: "CNPJ Agência", key: "cnpjAgencia", width: 22 },
      { header: "UF Cliente", key: "ufCliente", width: 12 },
      { header: "UF Agência", key: "ufAgencia", width: 12 },
      { header: "Perfil", key: "perfil", width: 16 },
      { header: "Mês da Venda", key: "mesVenda", width: 14 },
      { header: "Data da Venda", key: "dataVenda", width: 16 },
      { header: "Início Veiculação", key: "inicioVeiculacao", width: 18 },
      { header: "Fim Veiculação", key: "fimVeiculacao", width: 18 },
      { header: "Vencimento", key: "vencimento", width: 16 },
      { header: "Valor Bruto", key: "valorBruto", width: 16 },
      { header: "Valor Líquido", key: "valorLiquido", width: 16 },
      { header: "Observações", key: "observacoes", width: 42 },
    ];

    filtered.forEach((item) => {
      worksheet.addRow({
        ...item,
        cnpjAnunciante: formatCNPJ(item.cnpjAnunciante),
        cnpjAgencia: formatCNPJ(item.cnpjAgencia),
        dataVenda: formatDate(item.dataVenda),
        inicioVeiculacao: formatDate(item.inicioVeiculacao),
        fimVeiculacao: formatDate(item.fimVeiculacao),
        vencimento: formatDate(item.vencimento),
      });
    });

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "B91C1C" },
    };

    worksheet.getColumn("valorBruto").numFmt = '"R$"#,##0.00';
    worksheet.getColumn("valorLiquido").numFmt = '"R$"#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "resultado_filtrado.xlsx");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_18%,#f5f5f5_100%)]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {filtered.length} resultado(s) encontrado(s) · mostrando{" "}
                {paginatedData.length} nesta página
              </p>
              <p className="text-xs text-neutral-500">
                Ordenado por data da venda, da mais recente para a mais antiga.
              </p>
            </div>

            <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
              Consulta rápida
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-red-100/80 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">
                  Painel de consulta
                </p>
                <h1 className="text-2xl font-black tracking-tight text-neutral-950">
                  Busca de PI
                </h1>
                <p className="mt-1 text-sm text-neutral-600">
                  Consulte registros por PI, CNPJ do anunciante e fim da
                  veiculação.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
                >
                  Limpar filtros
                </button>

                <button
                  onClick={exportToExcel}
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
                >
                  Exportar XLSX
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                  Número do PI
                </label>
                <input
                  placeholder="Ex.: 3591-1"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  value={searchPI}
                  onChange={(e) => setSearchPI(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                  CNPJ do anunciante
                </label>
                <input
                  placeholder="Ex.: 24.091.590/0001-73"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  value={searchCNPJ}
                  onChange={(e) => setSearchCNPJ(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
                  Fim da veiculação
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-500 shadow-sm">
              Carregando dados...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-base font-bold text-neutral-900">
                Nenhum resultado encontrado
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Ajuste os filtros para localizar os registros desejados.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {paginatedData.map((item) => {
                  const itemKey = `${item.pi}-${item.dataVenda}-${item.cnpjAnunciante}`;
                  const expanded = !!expandedNotes[itemKey];
                  const longText = isLongText(item.observacoes || "");
                  const isMatrix =
                    (item.piMatriz || "").trim().toLowerCase() === "sim";

                  return (
                    <article
                      key={itemKey}
                      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="border-b border-red-100 bg-[linear-gradient(135deg,#b91c1c_0%,#dc2626_55%,#ef4444_100%)] px-4 py-3 text-white">
                        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-100">
                              PI
                            </p>
                            <h2 className="mt-1 text-lg font-bold tracking-tight">
                              {item.pi}
                            </h2>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <MatrixBadge value={item.piMatriz} />

                              <span className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                                {item.canal || "Canal não informado"}
                              </span>

                              <span className="max-w-full truncate rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                                {item.produto || "Produto não informado"}
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 lg:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-100">
                              Anunciante
                            </p>
                            <h3 className="mt-1 truncate text-base font-bold leading-tight">
                              {item.anunciante || "-"}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-red-50">
                              {formatCNPJ(item.cnpjAnunciante)}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 lg:min-w-[290px]">
                            <StatPill
                              label="Vencimento"
                              value={formatDate(item.vencimento)}
                            />
                            <StatPill
                              label="Valor bruto"
                              value={formatMoney(item.valorBruto)}
                            />
                            <StatPill
                              label="Valor líquido"
                              value={formatMoney(item.valorLiquido)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2.5 p-3">
                        <div className="grid gap-2.5 lg:grid-cols-3">
                          <Section title="Identificação do PI">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <InfoItem label="Tipo do PI" value={item.tipoPi || "-"} />

                              <div className="min-w-0">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                                  PI Matriz
                                </p>
                                <span
                                  className={[
                                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                                    isMatrix
                                      ? "border border-yellow-300 bg-yellow-100 text-yellow-800"
                                      : "border border-neutral-200 bg-neutral-100 text-neutral-600",
                                  ].join(" ")}
                                >
                                  {item.piMatriz || "-"}
                                </span>
                              </div>

                              <InfoItem label="Campanha" value={item.campanha || "-"} />
                              <InfoItem label="Executivo" value={item.executivo || "-"} />
                              <InfoItem label="Diretoria" value={item.diretoria || "-"} />
                              <InfoItem label="Canal" value={item.canal || "-"} />
                              <div className="sm:col-span-2">
                                <InfoItem label="Produto" value={item.produto || "-"} />
                              </div>
                            </div>
                          </Section>

                          <Section title="Agência e Cliente">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <InfoItem label="Agência" value={item.agencia || "-"} />
                              <InfoItem
                                label="Razão Social Agência"
                                value={item.razaoSocialAgencia || "-"}
                              />
                              <InfoItem
                                label="CNPJ Agência"
                                value={formatCNPJ(item.cnpjAgencia)}
                              />
                              <InfoItem label="Perfil" value={item.perfil || "-"} />
                              <InfoItem label="UF Cliente" value={item.ufCliente || "-"} />
                              <InfoItem label="UF Agência" value={item.ufAgencia || "-"} />
                              <InfoItem label="Anunciante" value={item.anunciante || "-"} />
                              <InfoItem
                                label="CNPJ Anunciante"
                                value={formatCNPJ(item.cnpjAnunciante)}
                              />
                            </div>
                          </Section>

                          <Section title="Datas e Valores">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <InfoItem label="Mês da Venda" value={item.mesVenda || "-"} />
                              <InfoItem
                                label="Venda"
                                value={formatDate(item.dataVenda)}
                              />
                              <InfoItem
                                label="Início Veiculação"
                                value={formatDate(item.inicioVeiculacao)}
                              />
                              <InfoItem
                                label="Fim Veiculação"
                                value={formatDate(item.fimVeiculacao)}
                              />
                              <InfoItem
                                label="Vencimento"
                                value={formatDate(item.vencimento)}
                                strong
                              />
                              <InfoItem
                                label="Valor Bruto"
                                value={formatMoney(item.valorBruto)}
                                strong
                              />
                              <InfoItem
                                label="Valor Líquido"
                                value={formatMoney(item.valorLiquido)}
                                strong
                              />
                            </div>
                          </Section>
                        </div>

                        <Section title="Observações">
                          <div className="rounded-xl bg-white px-0 py-0">
                            <p
                              className={[
                                "text-xs leading-5 text-neutral-700",
                                !expanded && longText ? "line-clamp-2" : "",
                              ].join(" ")}
                            >
                              {item.observacoes || "-"}
                            </p>

                            {longText && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedNotes((prev) => ({
                                    ...prev,
                                    [itemKey]: !prev[itemKey],
                                  }))
                                }
                                className="mt-2 text-xs font-semibold text-red-700 hover:text-red-800"
                              >
                                {expanded ? "Ver menos" : "Ver mais"}
                              </button>
                            )}
                          </div>
                        </Section>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600">
                    Página <span className="font-semibold">{currentPage}</span> de{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Primeira
                    </button>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Próxima
                    </button>

                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Última
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}