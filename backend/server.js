require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security headers (basic) ──────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── CORS — restrict to your domain in production ──────────────
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin) || process.env.NODE_ENV === 'development') return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// ── Global rate limiter ───────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Static uploads ───────────────────────────────────────────
const uploadBase = path.resolve(__dirname, '../frontend/assets/uploads');
if (!fs.existsSync(uploadBase)) fs.mkdirSync(uploadBase, { recursive: true });
app.use('/uploads', express.static(uploadBase));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/items',         require('./routes/items'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/buybacks',      require('./routes/buybacks'));
app.use('/api/returns',       require('./routes/returns'));
app.use('/api/purchases',     require('./routes/purchases'));
app.use('/api/installments',  require('./routes/installments'));
app.use('/api/suppliers',     require('./routes/suppliers'));
app.use('/api',               require('./routes/misc'));

// ── Serve Frontend ────────────────────────────────────────────
const frontendDist = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⚜  Zahab Gold v2 API  →  http://localhost:${PORT}/api`);
  console.log(`   Frontend           →  http://localhost:${PORT}\n`);
});
