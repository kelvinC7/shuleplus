const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function authenticate(req,res,next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; next();
  }catch(e){
    return res.status(401).json({ error: 'invalid token' });
  }
}

function requireRole(role){
  return function(req,res,next){
    if (!req.user) return res.status(401).json({ error: 'not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  }
}

module.exports = { authenticate, requireRole };
