const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/proyectos/[id]/page.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 5060; i < 5900; i++) {
  if (lines[i].includes(')}')) {
    console.log(`Line ${i+1}: ${lines[i]}`);
  }
}
