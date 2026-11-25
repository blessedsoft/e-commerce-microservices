const http = require('http');
const { Pool } = require('pg');
const Redis = require('ioredis');

const port = Number(process.env.PORT || 3001);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

async function init() {
  await pool.query('CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, price NUMERIC(10,2) NOT NULL, stock INTEGER NOT NULL DEFAULT 0)');
  await pool.query("INSERT INTO products (name, price, stock) SELECT 'Coffee mug', 12.50, 25 WHERE NOT EXISTS (SELECT 1 FROM products)");
}
async function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(value));
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'products' });
    if (req.method === 'GET' && req.url === '/products') {
      const cached = await redis.get('products:list');
      if (cached) return json(res, 200, JSON.parse(cached));
      const { rows } = await pool.query('SELECT id, name, price::float, stock FROM products ORDER BY id');
      await redis.set('products:list', JSON.stringify(rows), 'EX', 30);
      return json(res, 200, rows);
    }
    return json(res, 404, { error: 'route not found' });
  } catch (error) {
    console.error(error.message);
    return json(res, 503, { error: 'product service unavailable' });
  }
});

init().then(() => server.listen(port, '0.0.0.0', () => console.log(`products listening on ${port}`))).catch(error => { console.error(error); process.exit(1); });
function shutdown() { server.close(() => Promise.all([pool.end(), redis.quit()]).then(() => process.exit(0))); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
