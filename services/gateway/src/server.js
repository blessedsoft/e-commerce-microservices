const http = require('http');

const port = Number(process.env.PORT || 3000);
const productsUrl = process.env.PRODUCTS_URL || 'http://products:3001';
const ordersUrl = process.env.ORDERS_URL || 'http://orders:3002';

async function proxy(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  return { status: response.status, type: response.headers.get('content-type') || 'application/json', body };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', service: 'gateway' }));
    }
    let target;
    if (req.url.startsWith('/products')) target = productsUrl + req.url;
    if (req.url === '/orders' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      target = ordersUrl + req.url;
      const result = await proxy(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: Buffer.concat(chunks) });
      res.writeHead(result.status, { 'content-type': result.type });
      return res.end(result.body);
    }
    if (!target) return send(res, 404, { error: 'route not found' });
    const result = await proxy(target, { method: req.method });
    res.writeHead(result.status, { 'content-type': result.type });
    res.end(result.body);
  } catch (error) {
    console.error(error.message);
    send(res, 502, { error: 'upstream service unavailable' });
  }
});

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

server.listen(port, '0.0.0.0', () => console.log(`gateway listening on ${port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
