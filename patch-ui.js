const fs = require('fs');
const file = 'src/app/(dashboard)/finanzas/pagos-personal/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update PersonalSlot interface
if (!code.includes('rolTecnicoId: string | null;')) {
  code = code.replace(
    'rolNombre: string | null;',
    'rolTecnicoId: string | null;\n  rolNombre: string | null;'
  );
}

// Update CicloData interface
if (!code.includes('roles: { id: string; nombre: string }[];')) {
  code = code.replace(
    'cuentas: CuentaBancaria[];',
    'cuentas: CuentaBancaria[];\n  roles: { id: string; nombre: string }[];'
  );
}

fs.writeFileSync(file, code);
