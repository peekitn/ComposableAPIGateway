import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export interface AuthUser {
  id: string;
  email: string;
}

export async function authPlugin(app: FastifyInstance) {
  console.log("[authPlugin] Registrando plugin...");

  // Hook que executa para todas as requisições
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    console.log(`[authPlugin:onRequest] URL: ${request.url}`);

    // Ignorar rotas públicas (auth)
    if (request.url.startsWith("/auth")) {
      console.log(`[authPlugin] Rota pública, ignorando`);
      return;
    }

    const authHeader = request.headers.authorization;
    console.log(`[authPlugin] Auth header:`, authHeader);

    if (!authHeader) {
      console.log(`[authPlugin] Token ausente`);
      return reply.status(401).send({ error: "Token ausente" });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      console.log(`[authPlugin] Token válido para usuário:`, decoded.id);
      // Anexa ao request de forma simples
      (request as any).user = decoded;
    } catch (err: any) {
      console.log(`[authPlugin] Token inválido:`, err.message);
      return reply.status(401).send({ error: "Token inválido" });
    }
  });
}