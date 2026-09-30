const fs = require('fs');

const bankAmounts = [
  // Page 2
  20000.00, 20000.00, 4800.00, 13800.00, 8000.00, 2300.00, 3500.00, 1500.00, 600.00, 2450.98, 15100.00, 3200.00, 3200.00, 2500.00, 2000.00, 1600.00, 2500.00,
  // Page 3
  4000.00, 5200.00, 2000.00, 1000.00, 300.00, 300.00, 2000.00, 70000.00, 10000.00, 300.00, 500.00, 21200.00, 2500.00, 42659.00, 4000.00, 2500.00, 2500.00, 2500.00,
  // Page 4
  1600.00, 2500.00, 6000.00, 4000.00, 5500.00, 7200.00, 348.69, 540.00, 12440.00, 632.00, 42351.00, 28479.00, 5000.00, 2000.00, 500.00, 1476.00, 3950.00, 400.00, 1000.00, 3950.00, 2000.00,
  // Page 5
  2000.00, 486.45, 16837.40, 24500.00, 2719.01, 4000.00, 2500.00, 2500.00, 2500.00, 2000.00, 6000.00, 4000.00, 17063.75, 5150.00, 1600.00, 2500.00, 5300.00, 4000.00, 3387.00, 87.50,
  // Page 6
  7525.00, 5000.00, 2000.00, 11474.00, 87000.00, 11474.00, 2000.00, 3500.00, 2250.00, 3265.00, 15000.00, 18700.00,
  // File 2, Page 2
  12000.00, 5800.00, 4200.00, 1000.00, 519.00, 3597.20, 73.00, 92.00, 154.50, 799.00, 4900.00, 20000.00, 3500.00, 500.00, 3000.00, 3250.00, 2750.00, 1800.00, 800.00, 2000.00, 2500.00, 319.00, 50.00, 94.00, 1000.00, 1000.00,
  // File 2, Page 3
  3000.00, 2000.00, 2000.00, 2000.00, 347.69, 30000.00, 18500.00, 750.00, 4250.00, 2000.00, 50000.00, 42999.00, 4089.00, 1444.91, 12474.00, 12474.00, 1467.09, 19800.00, 2820.00,
  // File 2, Page 4
  30000.00, 31718.00, 2150.00, 10000.00, 4000.00, 4000.00, 4000.00, 1500.00, 550.00, 1500.00, 23350.00, 4250.00, 8750.00, 4500.00, 179.00, 8500.00, 10700.00,
  // File 2, Page 5
  24560.00, 4200.00, 800.00, 7780.00, 5000.00, 12500.00, 5000.00, 46352.00, 12400.00, 2100.00, 9500.00, 5000.00, 600.00, 8750.00, 1500.00, 2000.00, 2400.00, 5000.00,
  // File 2, Page 6
  600.00, 2900.00, 536.00, 36.00, 369.00, 183.00, 400.00, 4000.00, 2500.00, 2000.00, 2500.00, 1600.00, 6000.00, 4000.00, 10333.00, 1500.00, 2500.00, 4500.00, 2500.00, 2000.00
];

const dbText = fs.readFileSync('scratch/movimientos.txt', 'utf8');
const dbMatches = [...dbText.matchAll(/\| (?:GASTO|INGRESO|RETIRO|TRANSFERENCIA|INVERSION|EGRESO) \| ([\d\.]+) \| (.*?) \|/g)];
const dbMovs = dbMatches.map(m => ({ amount: parseFloat(m[1]), desc: m[2].trim() }));

const usedDbIndices = new Set();
const matchedBank = [];
const unmatchedBank = [];

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

const unmatchedDb = [];
for (let i = 0; i < dbMovs.length; i++) {
  if (!usedDbIndices.has(i)) {
    unmatchedDb.push(dbMovs[i]);
  }
}

console.log(`Matched: ${matchedBank.length}, Unmatched Bank: ${unmatchedBank.length}, Unmatched DB: ${unmatchedDb.length}`);
console.log("=== UNMATCHED BANK AMOUNTS ===");
const map = new Map();
unmatchedBank.forEach(a => map.set(a, (map.get(a) || 0) + 1));
for (const [k, v] of map.entries()) {
  console.log(`$${k} (x${v})`);
}

console.log("\n=== UNMATCHED DB AMOUNTS (MAY/JUNE) ===");
for (const db of unmatchedDb) {
  console.log(`$${db.amount} - ${db.desc}`);
}
