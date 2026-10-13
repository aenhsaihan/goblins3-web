const DATA_ORIGIN = 'https://scummvm.kuendig.io/data';

const ALLOWED_DATA_FILES = new Set([
  'index.json',
  'plugins/index.json',
  'plugins/libgob.so',
  'gui-icons/index.json',
  'shaders/index.json',
  'translations.dat',
  'shaders.dat',
  'vkeybd_default.zip',
  'vkeybd_small.zip',
  'residualvm.zip',
  'scummremastered.zip',
  'scummclassic.zip',
  'scummmodern.zip',
  'wintermute.zip',
  'helpdialog.zip',
  'fonts.dat',
]);

export const runtime = 'edge';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const file = path.join('/');

  if (!ALLOWED_DATA_FILES.has(file)) {
    return new Response('Not found', { status: 404 });
  }

  const upstream = await fetch(`${DATA_ORIGIN}/${file}`, {
    headers: { 'User-Agent': 'Goblins3-Web/1.0' },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('ScummVM data asset unavailable', {
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
