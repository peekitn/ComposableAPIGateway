// services/oauthManager.ts
import axios from 'axios';

const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

export async function getOAuthToken(config: any): Promise<string> {
  const cacheKey = `${config.clientId}:${config.tokenUrl}`;
  const cached = tokenCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Solicita novo token
  const response = await axios.post(config.tokenUrl, {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: config.scopes?.join(' ') || '',
  });

  const token = response.data.access_token;
  const expiresIn = response.data.expires_in || 3600; // padrão 1h
  tokenCache[cacheKey] = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}