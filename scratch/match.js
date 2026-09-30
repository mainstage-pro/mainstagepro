const fs = require('fs');

const dbText = fs.readFileSync('scratch/movimientos.txt', 'utf8');
const bankText = fs.readFileSync('scratch/bank_text.txt', 'utf8');

const dbMatches = [...dbText.matchAll(/\| (?:GASTO|INGRESO|RETIRO|TRANSFERENCIA|INVERSION) \| ([\d\.]+) \| (.*)/g)];
const dbMovs = dbMatches.map(m => ({ amount: parseFloat(m[1]), desc: m[2] }));

const bankMatches = [...bankText.matchAll(/(?:^|\n)\s*(\d{1,3}(?:,\d{3})*\.\d{2})\s+(\d{1,3}(?:,\d{3})*\.\d{2})/g)];
const bankAmounts = bankMatches.map(m => parseFloat(m[1].replace(/,/g, '')));

// Now let's try to match them
const unmatchedBank = [];
const matchedBank = [];
const usedDbIndices = new Set();

for (const ba of bankAmounts) {
  let matched = false;
  for (let i = 0; i < dbMovs.length; i++) {
    if (!usedDbIndices.has(i) && Math.abs(dbMovs[i].amount - ba) < 0.01) {
      matched = true;
      usedDbIndices.add(i);
      matchedBank.push({ amount: ba, dbDesc: dbMovs[i].desc });
      break;
    }
  }
  if (!matched) {
    unmatchedBank.push(ba);
  }
}

console.log("=== UNMATCHED BANK AMOUNTS ===");
for (const a of unmatchedBank) {
  console.log(a);
}
