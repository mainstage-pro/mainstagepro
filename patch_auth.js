const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/import { getServerSession } from "next-auth";\nimport { authOptions } from "@\/lib\/auth";/g, 'import { getSession } from "@/lib/auth";');
  content = content.replace(/const session = await getServerSession\(authOptions\);/g, 'const session = await getSession();');
  content = content.replace(/!session\.user/g, '!session');
  content = content.replace(/session\.user/g, 'session');
  fs.writeFileSync(path, content);
}

fix('src/app/api/proyectos/[id]/responsivas/route.ts');
fix('src/app/api/responsivas/[id]/status/route.ts');
