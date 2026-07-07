# Busca de PI

Sistema web para consultar PIs a partir de uma base exportada em planilha. O
backend le o arquivo `backend/data/dados.json`, expõe os dados por API, e o
frontend permite pesquisar por numero do PI, CNPJ do anunciante e data de fim da
veiculacao.

## Estrutura do projeto

```text
Busca_de_PI/
  backend/
    app/
      main.py                 # API FastAPI
      routes/
        busca_pi.py           # endpoint de consulta dos PIs
        access.py             # endpoints de acesso/token
    data/
      base.xlsb               # planilha de origem
      dados.json              # base convertida usada pela API
      usuarios.json           # usuarios autorizados a acessar o sistema
    requirements.txt          # dependencias do backend

  vite-project/
    scripts/
      gerar_json.py           # script que gera backend/data/dados.json
    src/
      App.tsx                 # tela principal de busca
      services/api.ts         # configuracao da URL da API
    package.json              # scripts do frontend
```

## Como os dados funcionam

O arquivo principal consumido pelo sistema e:

```text
backend/data/dados.json
```

Ele e gerado a partir da planilha:

```text
backend/data/base.xlsb
```

O script de conversao fica no frontend:

```text
vite-project/scripts/gerar_json.py
```

Esse script procura a aba `Vendas a partir 2022`, localiza o cabecalho da
planilha e transforma cada linha em um registro JSON com campos como `pi`,
`anunciante`, `cnpjAnunciante`, `produto`, `dataVenda`, `fimVeiculacao`,
`valorBruto` e `valorLiquido`.

## Controle de acesso

O sistema usa login simples com usuarios cadastrados em:

```text
backend/data/usuarios.json
```

Formato do arquivo:

```json
[
  {
    "nome": "Administrador",
    "login": "admin",
    "senha": "admin123",
    "ativo": true
  }
]
```

Para liberar uma pessoa, adicione um novo objeto na lista com `nome`, `login`,
`senha` e `ativo: true`.

Troque o exemplo `admin/admin123` antes de publicar ou compartilhar o sistema.

Para bloquear alguem sem apagar o cadastro, altere:

```json
"ativo": false
```

Depois do login, o backend cria uma sessao em cookie HttpOnly. O frontend nao
precisa receber token manual nem link magico.

## Como atualizar o `dados.json`

1. Coloque a planilha atualizada em:

```powershell
backend\data\base.xlsb
```

2. Entre na pasta do frontend:

```powershell
cd vite-project
```

3. Rode o script antigo de geracao:

```powershell
python .\scripts\gerar_json.py
```

4. Ao final, o script deve mostrar uma mensagem parecida com:

```text
JSON gerado com sucesso: ...\backend\data\dados.json
Total de registros: ...
```

Depois disso, o backend ja passa a ler o novo `dados.json`.

## Dependencias para gerar o JSON

O script usa Python e a biblioteca `pyxlsb` para ler a planilha `.xlsb`.

Se o comando reclamar que `pyxlsb` nao existe, instale com:

```powershell
pip install pyxlsb
```

Se estiver usando ambiente virtual, ative o ambiente antes de instalar e rodar o
script.

## Rodando o backend localmente

1. Entre na pasta do backend:

```powershell
cd backend
```

2. Instale as dependencias:

```powershell
pip install -r requirements.txt
```

3. Rode a API na porta esperada pelo frontend:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8010
```

4. Teste a API:

```text
http://localhost:8010/
```

Endpoint principal:

```text
GET http://localhost:8010/api/busca-pi
```

Filtros aceitos:

```text
?pi=3591-1
?cnpj=24091590000173
?fimVeiculacao=2026-07-31
```

## Rodando o frontend localmente

1. Entre na pasta do frontend:

```powershell
cd vite-project
```

2. Instale as dependencias:

```powershell
npm install
```

3. Rode o Vite:

```powershell
npm run dev
```

4. Abra no navegador:

```text
http://localhost:5173
```

Em desenvolvimento, o frontend usa `http://localhost:8010` como API por padrao.
Se precisar apontar para outra API, configure a variavel:

```powershell
$env:VITE_API_URL="http://localhost:8010"
npm run dev
```

## Build do frontend

Para gerar a versao de producao:

```powershell
cd vite-project
npm run build
```

Os arquivos finais ficam em:

```text
vite-project/dist
```

## Fluxo recomendado para atualizar a base

1. Substituir `backend/data/base.xlsb` pela planilha nova.
2. Rodar:

```powershell
cd vite-project
python .\scripts\gerar_json.py
```

3. Conferir a quantidade de registros exibida no terminal.
4. Subir/reiniciar o backend, se necessario.
5. Abrir o sistema e validar uma busca por PI ou CNPJ conhecido.

## Observacoes importantes

- Nao edite `dados.json` manualmente se a informacao vem da planilha.
- A API sempre le `backend/data/dados.json`.
- A API de busca exige login valido em `backend/data/usuarios.json`.
- O script espera a planilha em `backend/data/base.xlsb`.
- O frontend pagina os resultados e tambem permite exportar a busca filtrada
  para XLSX.
- Em producao, `vite-project/vercel.json` redireciona chamadas `/api/*` para o
  backend configurado.
