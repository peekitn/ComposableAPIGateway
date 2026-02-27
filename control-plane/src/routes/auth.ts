// control-plane/src/routes/authRoutes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export async function authRoutes(app: FastifyInstance) {
  // Registrar usuário
  app.post("/auth/register", async (req, reply) => {
    const { name, email, password } = req.body as any;

    if (!name || !email || !password) {
      return reply.status(400).send({ error: "Missing fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword }
      });

      return reply.status(201).send({ id: user.id, email: user.email });
    } catch (err: any) {
      return reply.status(400).send({ error: "Email já cadastrado" });
    }
  });

  // Login
  app.post("/auth/login", async (req, reply) => {
    const { email, password } = req.body as any;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.status(401).send({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return reply.status(401).send({ error: "Credenciais inválidas" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "8h" });
    return reply.send({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  // Rota protegida exemplo
  app.get("/auth/me", async (req: any, reply) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) return reply.status(401).send({ error: "Token ausente" });

      const token = auth.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      return reply.send(user);
    } catch (err) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });
}