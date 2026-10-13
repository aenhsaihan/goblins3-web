const GAME_ORIGIN = 'https://scummvm-data.kuendig.io';
const DEMO_DIRECTORY = 'gob3-dos-demo-en';

const ALLOWED_GAME_FILES = new Set([
  'index.json',
  '2.exe',
  '2.txt',
  'all.ask',
  'cat.inf',
  'cd.cfg',
  'gob3.exe',
  'imd.itk',
  'imd.ltk',
  'intro.stk',
  'mdo.cfg',
  'mdo.def',
  'setup.exe',
]);

export const runtime = 'edge';

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyGameFile(request, context, false);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyGameFile(request, context, true);
}

async function proxyGameFile(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  headOnly: boolean,
) {
  const { path } = await context.params;

  if (path.length !== 2 || path[0] !== DEMO_DIRECTORY || !ALLOWED_GAME_FILES.has(path[1])) {
    return new Response('Not found', { status: 404 });
  }

  const upstreamHeaders = new Headers({ 'User-Agent': 'Goblins3-Web/1.0' });
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);

  const upstream = await fetch(`${GAME_ORIGIN}/${DEMO_DIRECTORY}/${path[1]}`, {
    method: headOnly ? 'HEAD' : 'GET',
    headers: upstreamHeaders,
  });

  if (!upstream.ok) {
    return new Response('Demo asset unavailable', {
      status: upstream.status || 502,
    });
  }

  const headers = new Headers();
  for (const name of ['accept-ranges', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('x-content-type-options', 'nosniff');

  return new Response(headOnly ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
