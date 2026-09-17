const fs = require('fs');
const file = 'src/app/api/pagos-personal/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Add notas to mapping
if (!code.includes('notas: pp.notas,')) {
  code = code.replace(
    'estadoPago: pp.estadoPago,',
    'estadoPago: pp.estadoPago,\n      notas: pp.notas,'
  );
}

// Add tecnicos query
if (!code.includes('const tecnicos = await prisma.tecnico.findMany')) {
  code = code.replace(
    'const cuentas = await prisma.cuentaBancaria.findMany',
    `const tecnicos = await prisma.tecnico.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });\n\n  const cuentas = await prisma.cuentaBancaria.findMany`
  );
  
  // Return tecnicos
  code = code.replace(
    'roles,\n  });',
    'roles,\n    tecnicos,\n  });'
  );
}

fs.writeFileSync(file, code);
