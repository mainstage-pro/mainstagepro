const fs = require('fs');

const bankText = fs.readFileSync('scratch/bank_text.txt', 'utf8');
const bankMatches = [...bankText.matchAll(/(?:^|\n)(\d{2}-[A-Z]{3}-\d{2})(?:.*?)([\d,]+\.\d{2})/g)];
const allBankLines = bankText.split('\n');

const unmatchedAmounts = [20000, 20000, 4800, 13800, 15100, 3200, 11474, 11474, 18700, 12000, 5800, 519, 3597.2, 73, 92, 154.5, 799, 4900, 20000, 3500, 3250, 2750, 319, 94, 347.69, 50000, 42999, 4089, 1444.91, 12474, 12474, 1467.09, 8500, 4200, 8750, 5000, 369, 183];

// We just map unmatched amounts to the actual line from bankText to see the date and description
const unmatchedLines = [];

for (const line of allBankLines) {
  const match = line.match(/(^|\s)(\d{1,3}(?:,\d{3})*\.\d{2})\s+[\d,]+\.\d{2}$/);
  if (match) {
     // this line has an amount
     const amt = parseFloat(match[2].replace(/,/g, ''));
     const idx = unmatchedAmounts.indexOf(amt);
     if (idx !== -1) {
       unmatchedAmounts.splice(idx, 1);
       // we need the description which is usually the lines before this
       let desc = line;
       unmatchedLines.push(`${match[2]} - (Line matched)`);
     }
  }
}
console.log("Found matches in text:", unmatchedLines.length);
