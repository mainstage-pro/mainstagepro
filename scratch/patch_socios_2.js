const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/socios/page.tsx', 'utf8');

code = code.replace(/import { AlertTriangle, Mail, Phone } from "lucide-react";/, 'import { Mail, Phone } from "lucide-react";');

// Remove types
code = code.replace(/type RepartoHistorial = {[\s\S]*?};\n\n/, '');
code = code.replace(/type CxPItem = {[\s\S]*?};\n\n/, '');
code = code.replace(/const CXP_ESTADO: Record<string, { label: string; className: string }> = {[\s\S]*?};\n\n/, '');

// Fix indentation
code = code.replace(/      const \[loading, setLoading\]/g, '  const [loading, setLoading]');
code = code.replace(/      if \(loading\) {/g, '  if (loading) {');

fs.writeFileSync('src/app/(dashboard)/socios/page.tsx', code);
