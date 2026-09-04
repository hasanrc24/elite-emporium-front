const origin = process.env.API_INTERNAL_ORIGIN || 'http://localhost:4000';

export async function serverGet(path, { locale = 'en', tags = [], revalidate = 60 } = {}) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${origin}/api/v1${path}${separator}locale=${locale}`, { next: { revalidate, tags }, headers: { 'accept-language': locale } });
  if (!response.ok) throw new Error(`Backend request failed with ${response.status}`);
  return (await response.json()).data;
}

export async function serverGetEnvelope(path, { locale = 'en', tags = [], revalidate = 60 } = {}) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${origin}/api/v1${path}${separator}locale=${locale}`, { next: { revalidate, tags }, headers: { 'accept-language': locale } });
  if (!response.ok) throw new Error(`Backend request failed with ${response.status}`);
  return response.json();
}
