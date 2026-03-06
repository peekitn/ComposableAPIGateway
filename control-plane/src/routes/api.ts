import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import OpenAPISchemaValidator from "openapi-schema-validator";
import https from "https";
import axios from "axios";
import jwt from "jsonwebtoken";
import SwaggerParser from "@apidevtools/swagger-parser";
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const validator = new OpenAPISchemaValidator({ version: 3 });

// Cache simples para tokens OAuth2 (em memória)
const oauthTokenCache: Record<string, { token: string; expiresAt: number }> = {};

// Cliente Redis com tratamento de erro
let redisClient: Redis | null = null;
console.log("🔌 Inicializando cliente Redis...");
try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) {
        console.error('❌ Redis connection failed after 5 retries. Using memory fallback.');
        return null;
      }
      console.log(`🔄 Redis retry attempt ${times}`);
      return Math.min(times * 100, 3000);
    }
  });

  redisClient.on('error', (err) => {
    console.error('⚠️ Redis client error:', err.message);
    console.log('⚠️ Desabilitando Redis, usando fallback de memória');
    redisClient = null;
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  // Tenta conectar
  redisClient.connect().catch((err) => {
    console.error('❌ Could not connect to Redis:', err.message);
    console.log('❌ Usando fallback de memória');
    redisClient = null;
  });
} catch (err) {
  console.error('❌ Redis initialization failed:', err);
  redisClient = null;
}

// Mapa para armazenar os rate limiters por API
const memoryRateLimiters = new Map<string, RateLimiterMemory>();
const redisRateLimiters = new Map<string, RateLimiterRedis>();

function getRateLimiter(apiId: string, config: any): RateLimiterRedis | RateLimiterMemory {
  console.log(`🔍 getRateLimiter para API ${apiId}, redisClient disponível:`, !!redisClient);
  
  if (redisClient) {
    if (!redisRateLimiters.has(apiId)) {
      try {
        console.log(`🆕 Criando novo RateLimiterRedis para API ${apiId}`);
        const limiter = new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix: `rl:${apiId}:`,
          points: config.max,
          duration: parseTimeWindowToSeconds(config.timeWindow),
        });
        redisRateLimiters.set(apiId, limiter);
        console.log(`✅ Rate limiter Redis criado para API ${apiId}`);
      } catch (err) {
        console.error(`❌ Erro ao criar rate limiter Redis para API ${apiId}:`, err);
        return getMemoryRateLimiter(apiId, config);
      }
    } else {
      console.log(`♻️ Reutilizando RateLimiterRedis existente para API ${apiId}`);
    }
    return redisRateLimiters.get(apiId)!;
  } else {
    console.log(`💾 Redis indisponível, usando memória para API ${apiId}`);
    return getMemoryRateLimiter(apiId, config);
  }
}

function getMemoryRateLimiter(apiId: string, config: any): RateLimiterMemory {
  if (!memoryRateLimiters.has(apiId)) {
    console.log(`🆕 Criando novo RateLimiterMemory para API ${apiId}`);
    const limiter = new RateLimiterMemory({
      keyPrefix: `rl:${apiId}:`,
      points: config.max,
      duration: parseTimeWindowToSeconds(config.timeWindow),
    });
    memoryRateLimiters.set(apiId, limiter);
    console.log(`✅ Rate limiter Memory criado para API ${apiId}`);
  } else {
    console.log(`♻️ Reutilizando RateLimiterMemory existente para API ${apiId}`);
  }
  return memoryRateLimiters.get(apiId)!;
}

function parseTimeWindowToSeconds(timeWindow: string): number {
  const [value, unit] = timeWindow.split(' ');
  const num = parseInt(value, 10);
  switch (unit) {
    case 'seconds': return num;
    case 'minutes': return num * 60;
    case 'hours': return num * 60 * 60;
    case 'days': return num * 24 * 60 * 60;
    default: return 60;
  }
}

async function getOAuthToken(config: any): Promise<string> {
  const cacheKey = `${config.clientId}:${config.tokenUrl}`;
  const cached = oauthTokenCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    console.log("✅ Usando token OAuth2 em cache");
    return cached.token;
  }

  console.log("📤 Solicitando token OAuth2 para:", config.tokenUrl);
  console.log("📤 Client ID:", config.clientId);
  console.log("📤 Config completa:", JSON.stringify(config, null, 2));
  console.log("📤 Audience recebida:", config.audience);

  const payload: any = {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  };
  if (config.audience) {
    payload.audience = config.audience;
  }
  if (config.scopes && config.scopes.length) {
    payload.scope = config.scopes.join(' ');
  }

  console.log("📤 Payload enviado (JSON):", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(config.tokenUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const token = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;
    oauthTokenCache[cacheKey] = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    console.log("✅ Token OAuth2 obtido com sucesso, expira em", expiresIn, "s");
    return token;
  } catch (err: any) {
    console.error('❌ Erro ao obter token OAuth2. Status:', err.response?.status);
    console.error('❌ Dados da resposta:', err.response?.data);
    throw new Error('Falha na autenticação OAuth2');
  }
}

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

  // CRIAR API
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

      if (!openapiSpec) {
        openapiSpec = { openapi: "3.0.0", info: { title: name, version: "1.0.0" }, paths: {} };
      }

      try {
        const result = validator.validate(openapiSpec);
        if (result.errors.length > 0) {
          console.log("OpenAPI 3.0 inválido, tentando como Swagger 2.0");
          const swagger2Spec = await SwaggerParser.validate(openapiSpec);
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

  // PROXY COM RATE LIMIT
  app.register(async function (proxyRoutes) {
    // Hook para buscar a API
    proxyRoutes.addHook('preHandler', async (request: any, reply) => {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const fullPath = request.params["*"] || "";
      const parts = fullPath.split('/');
      const slug = parts[0];
      const remainingPath = parts.slice(1).join('/');

      if (!slug) return reply.status(404).send({ error: "Slug não fornecido" });

      console.log(`🔍 Buscando API com slug: ${slug} para usuário ${userId}`);
      const api = await prisma.api.findFirst({ where: { slug, userId } });
      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      console.log(`✅ API encontrada: ${api.name} (${api.id})`);
      request.api = api;
      request.remainingPath = remainingPath;
    });

    // Middleware de rate limit
    proxyRoutes.addHook('preHandler', async (request: any, reply) => {
      const api = request.api;
      if (!api) return;

      console.log(`🔍 Verificando rate limit para API ${api.id}, enabled:`, api.rateLimitConfig?.enabled);

      if (!api.rateLimitConfig?.enabled) {
        console.log("⏭️ Rate limit desabilitado, prosseguindo");
        return;
      }

      console.log(`📊 Configuração: max=${api.rateLimitConfig.max}, timeWindow=${api.rateLimitConfig.timeWindow}`);

      const limiter = getRateLimiter(api.id, api.rateLimitConfig);
      const key = request.ip;

      try {
        await limiter.consume(key);
        console.log(`✅ Requisição permitida para IP ${key}.`);
      } catch (rateLimiterRes) {
        console.log(`❌ Rate limit EXCEDIDO para IP ${key}`);
        const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        reply.header('Retry-After', String(secs));
        return reply.status(429).send({
          error: 'Rate limit exceeded',
          message: `Máximo de ${api.rateLimitConfig.max} requisições por ${api.rateLimitConfig.timeWindow}`,
          statusCode: 429
        });
      }
    });

    // Rota proxy principal
    proxyRoutes.all("/*", async (request: any, reply) => {
      const api = request.api;
      const path = request.remainingPath || "";
      const query = request.query;

      try {
        let finalHeaders: Record<string, string> = {};
        let finalQuery = new URLSearchParams(query);

        if (api.authConfig) {
          const config = api.authConfig as any;
          if (config.type === 'bearer' && config.token) {
            finalHeaders['Authorization'] = `Bearer ${config.token}`;
          } else if (config.type === 'apikey' && config.key && config.name) {
            if (config.in === 'header') {
              finalHeaders[config.name] = config.key;
            } else if (config.in === 'query') {
              finalQuery.append(config.name, config.key);
            }
          } else if (config.type === 'oauth2') {
            try {
              const oauthToken = await getOAuthToken(config);
              finalHeaders['Authorization'] = `Bearer ${oauthToken}`;
            } catch (err) {
              console.error('Erro OAuth2:', err);
              return reply.status(502).send({ error: 'Falha na autenticação OAuth2' });
            }
          }
        }

        const allowedHeaders = ["content-type", "accept", "user-agent"];
        for (const [key, value] of Object.entries(request.headers)) {
          if (allowedHeaders.includes(key.toLowerCase()) && typeof value === "string") {
            finalHeaders[key] = value;
          }
        }

        const queryString = finalQuery.toString();
        const finalUrl = `${api.baseUrl}/${path}${queryString ? '?' + queryString : ''}`;

        console.log("🔗 Proxy chamando:", finalUrl);

        const response = await axios({
          method: request.method,
          url: finalUrl,
          headers: finalHeaders,
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
            path: path + (queryString ? '?' + queryString : ''),
            body: request.body || null,
            headers: finalHeaders,
            status: response.status,
            response: truncatedResponse,
          },
        });

        reply.status(response.status).send(response.data);
      } catch (err: any) {
        console.error("❌ Erro no proxy:", err.message);
        const errorResponse = err.response?.data || { error: err.message };
        const errorStatus = err.response?.status || 500;

        if (api?.id) {
          try {
            await prisma.requestLog.create({
              data: {
                apiId: api.id,
                method: request.method,
                path: path,
                body: request.body || null,
                headers: request.headers,
                status: errorStatus,
                response: errorResponse,
              },
            });
          } catch (logErr) {
            console.error("Erro ao salvar log de erro:", logErr);
          }
        }

        reply.status(errorStatus).send(errorResponse);
      }
    });
  }, { prefix: "/proxy" });

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

      const api = await prisma.api.findFirst({
        where: { id, userId },
      });

      if (!api) {
        return reply.status(404).send({ error: "API não encontrada" });
      }

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

  // CONFIGURAR AUTENTICAÇÃO DA API
  app.put("/apis/:id/auth", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { id } = request.params;
      const { authConfig } = request.body;

      const api = await prisma.api.findFirst({
        where: { id, userId },
      });

      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      const updatedApi = await prisma.api.update({
        where: { id },
        data: { authConfig },
      });

      return reply.send(updatedApi);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Erro ao salvar configuração de autenticação" });
    }
  });

  // CONFIGURAR RATE LIMIT DA API
  app.put("/apis/:id/rate-limit", async (request: any, reply) => {
    try {
      const auth = request.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { id } = request.params;
      const { rateLimitConfig } = request.body;

      const api = await prisma.api.findFirst({
        where: { id, userId },
      });

      if (!api) return reply.status(404).send({ error: "API não encontrada" });

      const updatedApi = await prisma.api.update({
        where: { id },
        data: { rateLimitConfig },
      });

      redisRateLimiters.delete(id);
      memoryRateLimiters.delete(id);

      return reply.send(updatedApi);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Erro ao salvar configuração de rate limit" });
    }
  });
}