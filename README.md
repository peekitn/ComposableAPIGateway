# Composable API Gateway

Um **API Gateway modular e composable** com interface web moderna, focado em **desenvolvedores e equipes SaaS**. Permite cadastrar APIs via OpenAPI, testar endpoints diretamente pelo dashboard e fazer proxy dinâmico para qualquer API registrada.

---

## Visão Geral

Muitos gateways de API são complexos ou rígidos, dificultando integrações rápidas.  
O **Composable API Gateway** oferece:

- Cadastro de APIs via UI ou importação OpenAPI
- Proxy dinâmico baseado em `slug` + path
- Teste de endpoints sem precisar de Postman ou Insomnia
- Dashboard intuitivo para gerenciar APIs e endpoints
- Base para evoluir com autenticação, logs e analytics

---
## Funcionalidades Principais

- **Cadastro de APIs**: Crie APIs com nome, slug, base URL e OpenAPI spec  
- **Validação de OpenAPI**: Garante que as specs estejam corretas antes de salvar  
- **Proxy Dinâmico**: Redireciona requisições para APIs registradas sem configuração adicional  
- **Teste de Endpoints**: Interface web para enviar requisições GET, POST, etc.  
- **Dashboard UI**: Visualização das APIs, endpoints e resultados dos testes  

---

## Tecnologias Usadas

**Backend:**
- Fastify – Servidor web rápido  
- Prisma – ORM para PostgreSQL  
- Axios – Requisições HTTP  
- OpenAPI Schema Validator – Validação de specs  

**Frontend:**
- React – Biblioteca de UI  
- TailwindCSS – Estilização moderna  
- Axios – Chamadas HTTP  

**Banco de Dados:**
- PostgreSQL  

---