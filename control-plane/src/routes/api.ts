import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import OpenAPISchemaValidator from "openapi-schema-validator";
import https from "https";
import axios from "axios";
import jwt from "jsonwebtoken";
import SwaggerParser from "@apidevtools/swagger-parser"; // 🔥 Import adicionado

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const validator = new OpenAPISchemaValidator({ version: 3 });

export async function apiRoutes(app: FastifyInstance) {
  // LISTAR APIs
  app.get("/apis", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const apis = await prisma.api.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return apis;
    } catch (err) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });

  // CRIAR API (agora com suporte a Swagger 2.0)
  app.post("/apis", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { name, slug, baseUrl, openapi, openapiUrl } = request.body;

      if (!name || !slug || !baseUrl) {
        return reply.status(400).send({ error: "Missing fields" });
      }

      let openapiSpec: any = openapi || null;

      if (openapiUrl) {
        try {
          const response = await axios.get(openapiUrl);
          openapiSpec = response.data;
          console.log("📥 OpenAPI obtido da URL:", JSON.stringify(openapiSpec, null, 2));
        } catch (err: any) {
          console.error("Erro ao buscar OpenAPI:", err.message);
          return reply.status(400).send({ error: "Não foi possível buscar OpenAPI da URL" });
        }
      }

      // Se não veio spec, cria um vazio
      if (!openapiSpec) {
        openapiSpec = { openapi: "3.0.0", info: { title: name, version: "1.0.0" }, paths: {} };
      }

      // 🔥 Validação com fallback para Swagger 2.0
      try {
        // Tenta validar como OpenAPI 3.0
        const result = validator.validate(openapiSpec);
        if (result.errors.length > 0) {
          // Se falhou, tenta como Swagger 2.0
          console.log("OpenAPI 3.0 inválido, tentando como Swagger 2.0");
          const swagger2Spec = await SwaggerParser.validate(openapiSpec);
          // Substitui pela spec validada (pode ser Swagger 2.0)
          openapiSpec = swagger2Spec;
        }
      } catch (err) {
        console.error("Erro ao validar especificação:", err);
        return reply.status(400).send({
          error: "Especificação inválida (não é OpenAPI 3.0 nem Swagger 2.0 válido)",
        });
      }

      const api = await prisma.api.create({
        data: { name, slug, baseUrl, openapiSpec, userId },
      });

      console.log("💾 API salva com openapiSpec:", JSON.stringify(api.openapiSpec, null, 2));

      return reply.status(201).send(api);
    } catch (err: any) {
      console.error(err);
      return reply.status(500).send({ error: "Erro ao criar API" });
    }
  });

  // BUSCAR API POR ID
  app.get("/apis/:id", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { id } = request.params;

      const api = await prisma.api.findFirst({
        where: { id, userId },
      });

      if (!api) {
        return reply.status(404).send({ error: "API não encontrada" });
      }

      return api;
    } catch (err) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });

  // PROXY
  app.all("/proxy/:slug/*", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { slug } = request.params;
      const path = request.params["*"] || "";
      const query = request.query;

      const queryString = Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";

      const api = await prisma.api.findFirst({
        where: { slug, userId },
      });
      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      const allowedHeaders = ["content-type", "accept", "authorization", "user-agent"];
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (allowedHeaders.includes(key.toLowerCase()) && typeof value === "string") {
          headers[key] = value;
        }
      }

      const response = await axios({
        method: request.method,
        url: `${api.baseUrl}/${path}${queryString}`,
        headers,
        data: request.body,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });

      const responseData = JSON.stringify(response.data);
      const truncatedResponse = responseData.length > 10000
        ? { truncated: true, data: responseData.slice(0, 10000) + "..." }
        : response.data;

      await prisma.requestLog.create({
        data: {
          apiId: api.id,
          method: request.method,
          path: path + queryString,
          body: request.body || null,
          headers,
          status: response.status,
          response: truncatedResponse,
        },
      });

      reply.status(response.status).send(response.data);
    } catch (err: any) {
      const errorResponse = err.response?.data || { error: err.message };
      const errorStatus = err.response?.status || 500;

      try {
        await prisma.requestLog.create({
          data: {
            apiId: err.config?.apiId || "unknown",
            method: err.config?.method || "UNKNOWN",
            path: err.config?.url || "",
            body: err.config?.data || null,
            headers: err.config?.headers || {},
            status: errorStatus,
            response: errorResponse,
          },
        });
      } catch (logErr) {
        console.error("Erro ao salvar log de erro:", logErr);
      }

      reply.status(errorStatus).send(errorResponse);
    }
  });

  // ADICIONAR ENDPOINT MANUAL
  app.post("/apis/:apiId/endpoints", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { apiId } = request.params;
      const { method, path, description } = request.body;

      const api = await prisma.api.findFirst({
        where: { id: apiId, userId }
      });

      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      const endpoint = await prisma.endpoint.create({
        data: { method, path, description, apiId }
      });

      return endpoint;
    } catch (err) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });

  // LISTAR ENDPOINTS MANUAIS
  app.get("/apis/:apiId/endpoints", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { apiId } = request.params;

      const api = await prisma.api.findFirst({
        where: { id: apiId, userId },
      });

      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      const endpoints = await prisma.endpoint.findMany({
        where: { apiId },
        orderBy: { createdAt: "asc" },
      });

      return endpoints;
    } catch (err) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });

  // DELETAR API
app.delete("/apis/:id", async (request: any, reply) => {
  try {
    const auth = request.headers.authorization;
    if (!auth) return reply.status(401).send({ error: "Token ausente" });

    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id;

    const { id } = request.params;

    // Verifica se a API pertence ao usuário
    const api = await prisma.api.findFirst({
      where: { id, userId },
    });

    if (!api) {
      return reply.status(404).send({ error: "API não encontrada" });
    }

    // Opcional: deletar também os endpoints e logs relacionados?
    // Como temos onDelete: Cascade? No schema, não definimos cascade.
    // Para evitar órfãos, vamos deletar manualmente os endpoints e logs.
    await prisma.$transaction([
      prisma.endpoint.deleteMany({ where: { apiId: id } }),
      prisma.requestLog.deleteMany({ where: { apiId: id } }),
      prisma.api.delete({ where: { id } }),
    ]);

    return reply.status(204).send();
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: "Erro ao deletar API" });
  }
});

}