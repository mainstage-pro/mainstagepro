const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Replace all conflict markers with nothing, EXCEPT keeping both contents!
c = c.replace(/<<<<<<< HEAD\n/g, '');
c = c.replace(/=======\n/g, '');
c = c.replace(/>>>>>>> [a-f0-9]+\n/g, '');

fs.writeFileSync('prisma/schema.prisma', c);
