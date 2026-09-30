const fs = require('fs');
const dbText = fs.readFileSync('scratch/movimientos.txt', 'utf8');
const dbMatches = [...dbText.matchAll(/\| (?:GASTO|INGRESO|RETIRO|TRANSFERENCIA|INVERSION|EGRESO) \| ([\d\.]+) \| (.*?) \|/g)];
console.log("DB text starts with:", dbText.slice(0, 100));
console.log("dbMatches count:", dbMatches.length);
if (dbMatches.length > 0) {
  console.log("first match:", dbMatches[0][1]);
}
