const { readDb, writeDb } = require('../models/db');

function listUsers(req,res){
  const db = readDb();
  const users = db.users.map(u=> ({ id:u.id, name:u.name, email:u.email, role:u.role }));
  res.json(users);
}

function createTeacher(req,res){
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const db = readDb();
  if (db.users.find(u=>u.email===email)) return res.status(400).json({ error: 'user exists' });
  const bcrypt = require('bcryptjs');
  const hashed = bcrypt.hashSync(password, 10);
  const user = { id: Date.now().toString(), name: name||'', email, password: hashed, role: 'teacher' };
  db.users.push(user);
  writeDb(db);
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
}

module.exports = { listUsers, createTeacher };
