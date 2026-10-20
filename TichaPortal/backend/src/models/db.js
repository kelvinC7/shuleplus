const fs = require('fs');
const path = require('path');
const dbFile = process.env.DB_FILE || path.join(__dirname,'..','data','db.json');

function readDb(){
  const raw = fs.readFileSync(dbFile); 
  return JSON.parse(raw);
}
function writeDb(data){
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
