const http = require('http');
const { Pool } = require('pg');
const Redis = require('ioredis');

const port = Number(process.env.PORT || 3002);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);
async function init() { await pool.query('CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())'); }
function json(res, status, value) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'orders' });
    if (req.method !== 'POST' || req.url !== '/orders') return json(res, 404, { error: 'route not found' });
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    if (!Number.isInteger(body.productId) || !Number.isInteger(body.quantity) || body.quantity < 1) return json(res, 400, { error: 'productId and positive quantity are required' });
    const { rows } = await pool.query('INSERT INTO orders (product_id, quantity) VALUES ($1, $2) RETURNING id, product_id AS "productId", quantity, created_at AS "createdAt"', [body.productId, body.quantity]);
    await redis.publish('orders.created', JSON.stringify(rows[0]));
    return json(res, 201, rows[0]);
  } catch (error) { console.error(error.message); return json(res, 503, { error: 'order service unavailable' }); }
});
init().then(() => server.listen(port, '0.0.0.0', () => console.log(`orders listening on ${port}`))).catch(error => { console.error(error); process.exit(1); });
function shutdown() { server.close(() => Promise.all([pool.end(), redis.quit()]).then(() => process.exit(0))); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
