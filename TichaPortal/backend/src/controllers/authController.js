const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDb, writeDb } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function register(req,res){
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const db = readDb();
  if (db.users.find(u=>u.email===email)) return res.status(400).json({ error: 'user exists' });
  const hashed = bcrypt.hashSync(password, 10);
  const user = { id: Date.now().toString(), name: name||'', email, password: hashed, role: role || 'teacher' };
  db.users.push(user);
  writeDb(db);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
}

function login(req,res){
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const db = readDb();
  const user = db.users.find(u=>u.email===email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
}

module.exports = { register, login };
