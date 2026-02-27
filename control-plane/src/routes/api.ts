// control-plane/src/routes/api.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import OpenAPISchemaValidator from "openapi-schema-validator";
import https from "https";
import axios from "axios";

export async function apiRoutes(app: FastifyInstance) {
  // Criar o validador OpenAPI
  const validator = new OpenAPISchemaValidator({ version: 3 });

  // ✅ LISTAR APIs
  app.get("/apis", async () => {
    return prisma.api.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  // ✅ CRIAR API COM FETCH AUTOMÁTICO DO OPENAPI
  app.post("/apis", async (request, reply) => {
    const { name, slug, baseUrl, openapi, openapiUrl } = request.body as {
      name: string;
      slug: string;
      baseUrl: string;
      openapi?: object;
      openapiUrl?: string;
    };

    // Campos obrigatórios
    if (!name || !slug || !baseUrl) {
      return reply.status(400).send({ error: "Missing fields" });
    }

    let openapiSpec: any = openapi || null;

    // 1️⃣ Se fornecer URL do OpenAPI, buscar automaticamente
    if (openapiUrl) {
      try {
        const response = await axios.get(openapiUrl);
        openapiSpec = response.data;
      } catch (err: any) {
        console.error("Erro ao buscar OpenAPI:", err.message);
        return reply.status(400).send({ error: "Não foi possível buscar OpenAPI da URL" });
      }
    }

    // 2️⃣ Validar OpenAPI
    if (openapiSpec) {
      const result = validator.validate(openapiSpec);
      if (result.errors.length > 0) {
        return reply
          .status(400)
          .send({ error: "OpenAPI inválida", details: result.errors });
      }
    } else {
      // fallback vazio
      openapiSpec = { paths: {} };
    }

    // 3️⃣ Criar API no banco
    const api = await prisma.api.create({
      data: {
        name,
        slug,
        baseUrl,
        openapiSpec,
      },
    });

    return reply.status(201).send(api);
  });

  // ✅ PROXY DINÂMICO (Nível 2)
  app.all("/proxy/:slug/*", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const path = request.params["*"] || "";

    // Buscar API pelo slug
    const api = await prisma.api.findUnique({ where: { slug } });
    if (!api) return reply.status(404).send({ error: "API não encontrada" });

    // Log básico
    console.log(`[Proxy] ${request.method} /${slug}/${path} - Body:`, request.body);

    try {
      // Ignorar certificado SSL apenas em dev
      const agent = new https.Agent({ rejectUnauthorized: false });

      const response = await axios({
        method: request.method,
        url: `${api.baseUrl}/${path}`,
        headers: request.headers as any,
        data: request.body,
        httpsAgent: agent,
      });

      reply.status(response.status).send(response.data);
    } catch (err: any) {
      console.error(`[Proxy Error] ${err.message}`);
      reply
        .status(err.response?.status || 500)
        .send(err.response?.data || { error: err.message });
    }
  });
}