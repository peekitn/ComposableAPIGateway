import Fastify from "fastify";
import cors from "@fastify/cors";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { authPlugin } from "./plugins/auth";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // CORS configurado para permitir DELETE e outros métodos
  await app.register(cors, {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Plugin de autenticação
  await app.register(authPlugin);

  // Rotas
  await app.register(authRoutes);
  await app.register(apiRoutes);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  await app.listen({ port: 3001 });
  console.log("Control Plane running on :3001");
}

bootstrap();