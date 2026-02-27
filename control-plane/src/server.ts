import Fastify from "fastify";
import cors from "@fastify/cors";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
//import { authPlugin } from "./plugins/auth"; // <-- import

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: "http://localhost:5173",
  });

  // Plugin de autenticação (deve vir antes das rotas protegidas)
  //await app.register(authPlugin);

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