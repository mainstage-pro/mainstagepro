const fs = require('fs');
const file = 'src/app/api/pagos-personal/route.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add rolTecnicoId to mapping
code = code.replace(
  'rolNombre: pp.rolTecnico?.nombre ?? null,',
  'rolTecnicoId: pp.rolTecnicoId,\n      rolNombre: pp.rolTecnico?.nombre ?? null,'
);

// 2. Query roles
if (!code.includes('const roles = await prisma.rolTecnico.findMany')) {
  code = code.replace(
    'const cuentas = await prisma.cuentaBancaria.findMany',
    `const roles = await prisma.rolTecnico.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });\n\n  const cuentas = await prisma.cuentaBancaria.findMany`
  );
  
  // 3. Return roles
  code = code.replace(
    'cuentas,\n  });',
    'cuentas,\n    roles,\n  });'
  );
}

fs.writeFileSync(file, code);
