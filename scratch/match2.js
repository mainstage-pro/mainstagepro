const fs = require('fs');
const bankText = fs.readFileSync('scratch/bank_text.txt', 'utf8');
const bankMatches = [...bankText.matchAll(/(?:^|\n)\s*(\d{1,3}(?:,\d{3})*\.\d{2})\s+(\d{1,3}(?:,\d{3})*\.\d{2})/g)];
console.log(bankMatches.map(m => parseFloat(m[1].replace(/,/g, ''))));
