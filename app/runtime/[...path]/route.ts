const RUNTIME_ORIGIN = 'https://scummvm.kuendig.io';
const ALLOWED_RUNTIME_FILES = new Set(['scummvm.js', 'scummvm.wasm']);

export const runtime = 'edge';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const file = path.join('/');

  if (!ALLOWED_RUNTIME_FILES.has(file)) {
    return new Response('Not found', { status: 404 });
  }

  return proxyAsset(`${RUNTIME_ORIGIN}/${file}`);
}

async function proxyAsset(url: string) {
  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'Goblins3-Web/1.0' },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Runtime asset unavailable', {
      status: upstream.status || 502,
    });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('x-content-type-options', 'nosniff');

  return new Response(upstream.body, { status: 200, headers });
}
