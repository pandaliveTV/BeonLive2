// Cloudflare Worker: generic fetch proxy for cmn_fetch() fallback chain.
// Deploy this same script under several DIFFERENT worker names (e.g. via
// dash.cloudflare.com > Workers & Pages > Create Worker) so requests spread
// across more edge PoPs / outbound IPs — free tier covers 100k requests/day
// per worker.
//
// Usage: https://<your-worker-name>.<your-subdomain>.workers.dev/?url=<url-encoded target>

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');

    if (!target) {
      return new Response('Missing url parameter', { status: 400 });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return new Response('Invalid url parameter', { status: 400 });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return new Response('Unsupported protocol', { status: 400 });
    }

    try {
      const upstream = await fetch(parsed.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Referer': `${parsed.protocol}//${parsed.host}/`,
          // Client Hints + Sec-Fetch-*: a real Chrome navigation always sends these: their
          // absence is itself a bot signal some WAFs check for, on top of the UA string.
          'Sec-Ch-Ua': '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin'
        },
        redirect: 'follow'
      });

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (err) {
      return new Response('Proxy fetch failed: ' + (err && err.message ? err.message : 'unknown error'), { status: 502 });
    }
  }
};
