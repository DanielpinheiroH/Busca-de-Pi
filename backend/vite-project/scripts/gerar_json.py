import json
from pathlib import Path
from datetime import datetime, timedelta
from pyxlsb import open_workbook

BASE_DIR = Path(__file__).resolve().parent.parent
ARQUIVO_PLANILHA = BASE_DIR / "base.xlsb"
ARQUIVO_SAIDA = BASE_DIR / "public" / "data" / "dados.json"

ABA_DADOS = "Vendas a partir 2022"


def normalizar_texto(valor):
    if valor is None:
        return ""
    return str(valor).strip()


def normalizar_data(valor):
    if valor in (None, ""):
        return ""

    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d")

    if isinstance(valor, (int, float)):
        try:
            base = datetime(1899, 12, 30)
            data = base + timedelta(days=float(valor))
            return data.strftime("%Y-%m-%d")
        except Exception:
            return str(valor)

    texto = str(valor).strip()

    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(texto, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return texto


def normalizar_mes(valor):
    if valor in (None, ""):
        return ""

    if isinstance(valor, datetime):
        return valor.strftime("%m/%Y")

    if isinstance(valor, (int, float)):
        try:
            base = datetime(1899, 12, 30)
            data = base + timedelta(days=float(valor))
            return data.strftime("%m/%Y")
        except Exception:
            return str(valor)

    texto = str(valor).strip()

    if "/" in texto:
        partes = texto.split("/")
        if len(partes) == 2:
            mes = partes[0].zfill(2)
            ano = partes[1]
            return f"{mes}/{ano}"

    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            data = datetime.strptime(texto, fmt)
            return data.strftime("%m/%Y")
        except ValueError:
            continue

    return texto


def normalizar_numero(valor):
    if valor in (None, ""):
        return 0

    if isinstance(valor, (int, float)):
        return float(valor)

    texto = str(valor).strip()
    texto = texto.replace("R$", "").replace(".", "").replace(",", ".").strip()

    try:
        return float(texto)
    except ValueError:
        return 0


def limpar_cabecalho(valor):
    return " ".join(normalizar_texto(valor).replace("\n", " ").split())


def encontrar_linha_cabecalho(rows):
    for idx, row in enumerate(rows[:20]):
        valores = [limpar_cabecalho(c) for c in row]

        if (
            "PI" in valores
            and "Nome do Anunciante" in valores
            and "Produto" in valores
            and "Valor bruto" in valores
        ):
            return idx

    return None


def main():
    if not ARQUIVO_PLANILHA.exists():
        raise FileNotFoundError(f"Planilha não encontrada: {ARQUIVO_PLANILHA}")

    with open_workbook(str(ARQUIVO_PLANILHA)) as wb:
        print("Abas disponíveis:", wb.sheets)

        if ABA_DADOS not in wb.sheets:
            raise ValueError(f"A aba '{ABA_DADOS}' não foi encontrada.")

        print("Lendo aba:", ABA_DADOS)

        with wb.get_sheet(ABA_DADOS) as sheet:
            rows = []
            for row in sheet.rows():
                values = [cell.v for cell in row]
                rows.append(values)

    if not rows:
        raise ValueError("A planilha está vazia.")

    idx_cabecalho = encontrar_linha_cabecalho(rows)
    if idx_cabecalho is None:
        print("\nNão encontrei o cabeçalho automaticamente.")
        print("Primeiras 10 linhas lidas:")
        for i, row in enumerate(rows[:10], start=1):
            print(f"Linha {i}: {[limpar_cabecalho(c) for c in row]}")
        raise ValueError("Não foi possível localizar a linha de cabeçalho.")

    print(f"\nLinha de cabeçalho encontrada: {idx_cabecalho + 1}")

    cabecalhos = [limpar_cabecalho(c) for c in rows[idx_cabecalho]]

    print("\nCABEÇALHOS ENCONTRADOS:")
    for i, c in enumerate(cabecalhos):
        print(f"{i}: {repr(c)}")

    dados = []

    for linha in rows[idx_cabecalho + 1:]:
        if not any(c is not None and str(c).strip() != "" for c in linha):
            continue

        registro = dict(zip(cabecalhos, linha))

        item = {
            "pi": normalizar_texto(registro.get("PI")),
            "anunciante": normalizar_texto(registro.get("Nome do Anunciante")),
            "cnpjAnunciante": normalizar_texto(registro.get("CNPJ do Anunciante")),
            "tipoPi": normalizar_texto(registro.get("Sub Perfil Anunciante")),
            "piMatriz": normalizar_texto(registro.get("PI Matriz")),
            "campanha": normalizar_texto(registro.get("Nome Campanha")),
            "executivo": normalizar_texto(registro.get("Executivo")),
            "diretoria": normalizar_texto(registro.get("Diretoria")),
            "canal": normalizar_texto(registro.get("Canal")),
            "produto": normalizar_texto(registro.get("Produto")),
            "agencia": normalizar_texto(registro.get("Nome da Agência")),
            "razaoSocialAgencia": normalizar_texto(registro.get("Razão Social Agência")),
            "cnpjAgencia": normalizar_texto(registro.get("CNPJ Agência")),
            "ufCliente": normalizar_texto(registro.get("UF Cliente")),
            "ufAgencia": normalizar_texto(registro.get("UF Agência")),
            "perfil": normalizar_texto(registro.get("Perfil Anunciante")),
            "mesVenda": normalizar_mes(registro.get("Mes da venda")),
            "dataVenda": normalizar_data(registro.get("Data da venda")),
            "inicioVeiculacao": normalizar_data(
                registro.get("Data inícial veiculação")
                or registro.get("Data inicial veiculação")
                or registro.get("Data  inícial veiculação")
            ),
            "fimVeiculacao": normalizar_data(registro.get("Data Final Veiculação")),
            "vencimento": normalizar_data(registro.get("Vencimento")),
            "valorBruto": normalizar_numero(registro.get("Valor bruto")),
            "valorLiquido": normalizar_numero(registro.get("Valor líquido")),
            "observacoes": normalizar_texto(registro.get("Observações")),
        }

        if item["pi"]:
            dados.append(item)

    ARQUIVO_SAIDA.parent.mkdir(parents=True, exist_ok=True)

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    print(f"\nJSON gerado com sucesso: {ARQUIVO_SAIDA}")
    print(f"Total de registros: {len(dados)}")


if __name__ == "__main__":
    main()