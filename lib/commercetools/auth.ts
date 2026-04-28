interface CTConfig {
  projectKey: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiUrl: string;
  scope: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export function getCTConfig(): CTConfig {
  return {
    projectKey: process.env.CT_PROJECT_KEY ?? '',
    clientId: process.env.CT_CLIENT_ID ?? '',
    clientSecret: process.env.CT_CLIENT_SECRET ?? '',
    authUrl: process.env.CT_AUTH_URL ?? 'https://auth.us-central1.gcp.commercetools.com',
    apiUrl: process.env.CT_API_URL ?? 'https://api.us-central1.gcp.commercetools.com',
    scope: process.env.CT_SCOPE ?? '',
  };
}

export async function getCTAccessToken(): Promise<string> {
  const now = Date.now();
  const BUFFER_MS = 60_000;

  if (tokenCache && tokenCache.expiresAt - BUFFER_MS > now) {
    return tokenCache.token;
  }

  const { clientId, clientSecret, authUrl, scope, projectKey } = getCTConfig();

  if (!clientId || !clientSecret) {
    throw new Error('commercetools credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const scopeStr = scope || `manage_project:${projectKey}`;

  const res = await fetch(`${authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(scopeStr)}`,
  });

  if (!res.ok) {
    throw new Error(`CT auth failed ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.token;
}

export async function ctRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { apiUrl, projectKey } = getCTConfig();
  const token = await getCTAccessToken();
  const url = `${apiUrl}/${projectKey}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CT API error ${res.status} at ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}
