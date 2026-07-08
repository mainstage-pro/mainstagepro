const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/crm/tratos/[id]/page.tsx', 'utf-8');

// I will extract the file line by line but that might be complex.
// Let's just create a basic version of DiscoveryForm that uses a fetch to /api/tratos/[id] internally
