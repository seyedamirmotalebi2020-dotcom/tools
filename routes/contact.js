import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many messages. Try again later.' },
});

function hashIp(ip) {
  return crypto.createHash('sha256')
    .update(ip + (process.env.IP_SALT || 'tools-land'))
    .digest('hex')
    .slice(0, 16);
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Simple mutex so concurrent writes can't corrupt the file
let writeLock = Promise.resolve();
function withLock(fn) {
  const next = writeLock.then(fn, fn);
  writeLock = next.catch(() => {});
  return next;
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function appendMessage(msg) {
  return withLock(async () => {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    let arr;
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch {
      arr = [];
    }
    arr.push(msg);
    // Keep the file bounded — last 2000 messages only
    if (arr.length > 2000) arr = arr.slice(-2000);
    await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  });
}

async function sendEmail(msg) {
  if (process.env.CONTACT_EMAIL !== 'true') return;
  const { default: nodemailer } = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transport.sendMail({
    from: `"Tools Contact" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_TO || process.env.SMTP_USER,
    replyTo: msg.email,
    subject: `[tools.land] ${msg.subject || 'New message'}`,
    text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`,
  });
}

router.post('/contact', limiter, async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || name.length > 100) {
    return res.status(400).json({ ok: false, error: 'Name is required (max 100 chars).' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Valid email is required.' });
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return res.status(400).json({ ok: false, error: 'Message must be 10–5000 chars.' });
  }

  const entry = {
    id: crypto.randomUUID(),
    name: String(name).slice(0, 100),
    email: String(email).slice(0, 254),
    subject: String(subject || '').slice(0, 200),
    message: String(message).slice(0, 5000),
    ip_hash: hashIp(req.ip),
    user_agent: String(req.get('user-agent') || '').slice(0, 500),
    created_at: new Date().toISOString(),
  };

  const results = await Promise.allSettled([
    process.env.CONTACT_SAVE_FILE === 'true' ? appendMessage(entry) : Promise.resolve(),
    sendEmail(entry),
  ]);

  const anyOk = results.some((r) => r.status === 'fulfilled');
  if (!anyOk) {
    console.error('[contact] all delivery methods failed', results);
    return res.status(500).json({ ok: false, error: 'Could not deliver message.' });
  }

  res.json({ ok: true });
});

export default router;