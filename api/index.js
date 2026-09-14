export default async function handler(req, res) {
  // Read target URL from query parameter
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter. Usage: ?url=https://example.com');
  }

  try {
    let targetOrigin = '';
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch (e) {}

    // Determine proper Referer:
    // TopCinema's Server.php rejects requests with Google referer ("Visit Shahid4u...")
    // It requires the referer to be from topcinema itself!
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
      }
    };

    // Forward POST body for server embed requests
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
