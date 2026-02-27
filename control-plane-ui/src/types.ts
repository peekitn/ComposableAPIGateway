export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  // outros campos conforme necessário
}

export interface Api {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  openapiSpec?: OpenAPISpec;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Endpoint {
  id?: string;
  method: string;
  path: string;
  description?: string;
}