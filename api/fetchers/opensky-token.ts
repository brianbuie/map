const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

let cachedToken: string | null = null;
let expiresAt = 0;

export async function getOpenSkyToken(): Promise<string> {
  if (cachedToken && Date.now() < expiresAt - 60_000) return cachedToken;

  const clientId = process.env.OPENSKY_CLIENT;
  const clientSecret = process.env.OPENSKY_SECRET;
  if (!clientId || !clientSecret) throw new Error('OPENSKY_CLIENT / OPENSKY_SECRET not set');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`OpenSky auth failed: ${res.status}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = json.access_token;
  expiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken;
}
