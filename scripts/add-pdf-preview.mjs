/**
 * add-pdf-preview.mjs
 * Adds ?preview=1 support to all PDF API routes.
 * When preview=1, returns Content-Disposition: inline instead of attachment.
 * Run once: node scripts/add-pdf-preview.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, '..', 'src', 'app', 'api', 'proyectos', '[id]');

const files = [
  'brief-imagen/route.ts',
  'brief-tecnico/route.ts',
  'carta-responsiva/route.ts',
  'ficha-cliente/route.ts',
  'ficha-coordinador/route.ts',
  'ficha-tecnicos/route.ts',
  'fichas/cliente/route.ts',
  'fichas/coordinador/route.ts',
  'fichas/operativa/route.ts',
  'fichas/tecnicos/route.ts',
  'hoja-entrega/route.ts',
  'pdf/route.ts',
  'personal/[personalId]/carta/route.ts',
  'reporte-post-evento/pdf/route.ts',
  'rider-pdf/route.ts',
];

let changed = 0;

files.forEach(f => {
  const fullPath = path.join(base, f);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  SKIP (not found): ${f}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // 1. Rename _req → req in GET signatures (only the parameter, not the function body)
  //    Match: GET(_req: NextRequest or GET(\n  _req: NextRequest
  content = content.replace(
    /\bGET\s*\(\s*_req(\s*:)/g,
    'GET(req$1'
  );

  // 2. If there's already 'const isPreview' we skip adding it again
  if (!content.includes('isPreview')) {
    // Find the line with Content-Disposition and insert isPreview just before the return block
    // Strategy: insert after the buffer is assembled (look for "const buf = Buffer")
    // or after the stream reading loop, or just before the return new NextResponse
    content = content.replace(
      /(return new NextResponse\(buf)/,
      `const isPreview = req.nextUrl?.searchParams?.get('preview') === '1';\n  $1`
    );
  }

  // 3. Replace 'attachment' with isPreview check in Content-Disposition
  content = content.replace(
    /`attachment;\s*filename=/g,
    '`${isPreview ? \'inline\' : \'attachment\'}; filename='
  );
  // Also handle single-quote variant
  content = content.replace(
    /'attachment;\s*filename=/g,
    '`${isPreview ? \'inline\' : \'attachment\'}; filename='
  );

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  UPDATED: ${f}`);
    changed++;
  } else {
    console.log(`  NO CHANGE: ${f}`);
  }
});

console.log(`\nDone. ${changed}/${files.length} files updated.`);
