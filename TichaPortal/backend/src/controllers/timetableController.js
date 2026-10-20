const { readDb, writeDb } = require('../models/db');

function listTimetable(req,res){
  const db = readDb();
  res.json(db.timetable || []);
}

function createEntry(req,res){
  const { day, time, subject, teacherId } = req.body;
  if (!day || !time || !subject) return res.status(400).json({ error: 'day,time,subject required' });
  const db = readDb();
  const entry = { id: Date.now().toString(), day, time, subject, teacherId: teacherId||null };
  db.timetable.push(entry);
  writeDb(db);
  res.status(201).json(entry);
}

module.exports = { listTimetable, createEntry };
