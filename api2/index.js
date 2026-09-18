// Updated beon-live2.vercel.app/api function: same request-forwarding logic as
// before, plus Client Hints + Sec-Fetch-* headers so the outgoing request looks
// like a real Chrome navigation (their absence is itself a bot signal to some
// WAFs, on top of the User-Agent string).
//
// Note: Vercel's own IP ranges are broadly recognized as "datacenter/hosting" by
// many anti-bot systems, so this header change alone may not be enough to make
// CimaNow accept requests from Vercel specifically — worth testing, but the
// Cloudflare Workers remain the more reliable proxy for this target.

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter. Usage: ?url=https://example.com');
  }

  try {
    let targetOrigin = '';
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch (e) {}

    let referer = req.headers['x-referer'] || req.headers['referer'] || '';
    if (!referer || referer.includes('vercel.app') || referer.includes('localhost') || targetUrl.includes('Server.php')) {
      referer = targetOrigin ? (targetOrigin + '/') : 'https://topcinema.io/';
    }

    const fetchOptions = {
      method: req.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Referer': referer,
        'Sec-Ch-Ua': '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      }
    };

    if (req.method === 'POST') {
      let bodyData = '';
      if (typeof req.body === 'string') {
        bodyData = req.body;
      } else if (req.body && typeof req.body === 'object') {
        bodyData = new URLSearchParams(req.body).toString();
      }
      if (bodyData) {
        fetchOptions.body = bodyData;
        fetchOptions.headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded; charset=UTF-8';
        fetchOptions.headers['X-Requested-With'] = 'XMLHttpRequest';
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html; charset=UTF-8');
    return res.status(response.status).send(data);
  } catch (err) {
    return res.status(500).send('Proxy error: ' + err.message);
  }
}
