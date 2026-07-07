import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const usersPath = path.join(dataDir, "usuarios.json");
const dataPath = path.join(dataDir, "dados.json");
const port = 8010;
const secret = process.env.SECRET_KEY || "dev_secret_key";

function normalize(value = "") {
  return String(value).replace(/\D/g, "");
}

function sign(payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createSession(user) {
  const payload = Buffer.from(
    JSON.stringify({ nome: user.nome, login: user.login }),
    "utf8"
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function readSession(cookieHeader = "") {
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );

  const value = cookies.busca_pi_session;
  if (!value || !value.includes(".")) return null;

  const [payload, signature] = value.split(".");
  if (signature !== sign(payload)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

async function currentUser(request) {
  const session = readSession(request.headers.cookie);
  if (!session) return null;

  const users = await readJson(usersPath);
  const user = users.find(
    (item) => item.login === session.login && item.ativo !== false
  );

  return user ? { nome: user.nome, login: user.login } : null;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "OPTIONS") {
      return send(response, 204, {});
    }

    if (request.method === "GET" && url.pathname === "/") {
      return send(response, 200, {
        status: "ok",
        message: "API Busca de PI rodando.",
      });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const payload = await readBody(request);
      const users = await readJson(usersPath);
      const user = users.find(
        (item) =>
          item.login === String(payload.login || "").trim() &&
          item.senha === payload.senha &&
          item.ativo !== false
      );

      if (!user) {
        return send(response, 401, { detail: "Login ou senha invalidos." });
      }

      return send(
        response,
        200,
        { user: { nome: user.nome, login: user.login } },
        {
          "Set-Cookie": `busca_pi_session=${createSession(
            user
          )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`,
        }
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      return send(response, 200, { message: "Logout realizado." }, {
        "Set-Cookie": "busca_pi_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const user = await currentUser(request);
      if (!user) return send(response, 401, { detail: "Login necessario." });
      return send(response, 200, { user });
    }

    if (request.method === "GET" && url.pathname === "/api/busca-pi") {
      const user = await currentUser(request);
      if (!user) return send(response, 401, { detail: "Login necessario." });

      const pi = normalize(url.searchParams.get("pi") || "");
      const cnpj = normalize(url.searchParams.get("cnpj") || "");
      const fimVeiculacao = url.searchParams.get("fimVeiculacao") || "";
      let result = await readJson(dataPath);

      if (pi) {
        result = result.filter((item) => normalize(item.pi) === pi);
      }

      if (cnpj) {
        result = result.filter((item) =>
          normalize(item.cnpjAnunciante).includes(cnpj)
        );
      }

      if (fimVeiculacao) {
        result = result.filter((item) => item.fimVeiculacao === fimVeiculacao);
      }

      result.sort((a, b) => String(b.dataVenda || "").localeCompare(a.dataVenda || ""));

      return send(response, 200, {
        total: result.length,
        items: result,
      });
    }

    return send(response, 404, { detail: "Rota nao encontrada." });
  } catch (error) {
    console.error(error);
    return send(response, 500, { detail: "Erro interno." });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`API Busca de PI rodando em http://localhost:${port}`);
});
