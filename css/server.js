// server.js
// Demo rápido para el foro de "El Faro".
// NOTA: demo = NO listo para producción. Mejora auth, validación, HTTPS, rate-limit, etc.

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data.json');

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], comments: [] }, null, 2));
  }
}
function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH));
}
function writeDB(payload) {
  fs.writeFileSync(DB_PATH, JSON.stringify(payload, null, 2));
}

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  const db = readDB();
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'exists' });
  }
  const hash = await bcrypt.hash(password, 10);
  db.users.push({ username, pass: hash });
  writeDB(db);
  return res.json({ ok: true, username });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.pass);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  return res.json({ ok: true, username: user.username });
});

// Get comments
app.get('/api/comments', (req, res) => {
  const db = readDB();
  return res.json(db.comments);
});

// Post comment
app.post('/api/comments', (req, res) => {
  const { user, text } = req.body || {};
  if (!user || !text) return res.status(400).json({ error: 'missing' });
  const db = readDB();
  const id = 'c_' + Date.now() + '_' + Math.floor(Math.random()*9999);
  const item = { id, user, text, date: new Date().toISOString() };
  db.comments.push(item);
  writeDB(db);
  return res.json(item);
});

// Edit comment
app.put('/api/comments/:id', (req, res) => {
  const { id } = req.params;
  const { user, text } = req.body || {};
  if (!user || !text) return res.status(400).json({ error: 'missing' });
  const db = readDB();
  const idx = db.comments.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'notfound' });
  if (db.comments[idx].user !== user) return res.status(403).json({ error: 'forbidden' });
  db.comments[idx].text = text;
  db.comments[idx].edited = true;
  db.comments[idx].date = new Date().toISOString();
  writeDB(db);
  return res.json(db.comments[idx]);
});

// Delete comment
app.delete('/api/comments/:id', (req, res) => {
  const { id } = req.params;
  const { user } = req.body || {};
  if (!user) return res.status(400).json({ error: 'missing' });
  const db = readDB();
  const idx = db.comments.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'notfound' });
  if (db.comments[idx].user !== user) return res.status(403).json({ error: 'forbidden' });
  db.comments.splice(idx, 1);
  writeDB(db);
  return res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Foro demo API corriendo en http://localhost:${PORT}`));
