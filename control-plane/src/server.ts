import Fastify from "fastify";
import cors from "@fastify/cors";
import { apiRoutes } from "./routes/api";

async function bootstrap() {
  const app = Fastify({ logger: true });

  // CORS
  await app.register(cors, {
    origin: "http://localhost:5173",
  });

  // Rotas
  await app.register(apiRoutes);

  // Healthcheck
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Start
  await app.listen({ port: 3001 });
  console.log("Control Plane running on :3001");
}

bootstrap();