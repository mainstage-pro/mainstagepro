import * as fs from 'fs';

const lines = fs.readFileSync('scratch/bank_text.txt', 'utf8').split('\n');

const bankMovs = [];

let currentDate = null;
let currentDesc = "";

for (const line of lines) {
  const match = line.match(/^(\d{2}-[A-Z]{3}-\d{2})(.*)/);
  if (match) {
    if (currentDate && currentDesc) {
      // Find the last number in the line or next line
    }
    currentDate = match[1];
    currentDesc = match[2];
  }
}

const amounts = [];
for (const line of lines) {
  // match amounts like 20,000.00 or 84.54
  const nums = line.match(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g);
  if (nums) {
    // some lines just have the amounts at the end.
    // typically: "2,000.00 408.23" (Deposit/Withdrawal and Balance)
    // we can find lines that start with numbers
    if (/^\s*\d{1,3}(?:,\d{3})*\.\d{2}/.test(line)) {
      amounts.push(nums[0]);
    }
  }
}
console.log(amounts);
