const fs = require('fs');

const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
/<<<<<<< HEAD\n  responsivaToken          String\?   @unique \/\/ Token público para responsivas del staff\n=======\n  docsToken                String\?   @unique \/\/ Token público para ver los PDF del proyecto en línea \(\/doc\/\{token\}\/\{documento\}\)\n>>>>>>> [a-f0-9]+\n/g,
`  responsivaToken          String?   @unique // Token público para responsivas del staff
  docsToken                String?   @unique // Token público para ver los PDF del proyecto en línea (/doc/{token}/{documento})\n`
);

content = content.replace(
/<<<<<<< HEAD\n  ResponsivaTecnico  ResponsivaTecnico\[\]\n=======\n  sitePlanes         SitePlan\[\]\n  giraShow           GiraShow\?\n>>>>>>> [a-f0-9]+\n/g,
`  ResponsivaTecnico  ResponsivaTecnico[]
  sitePlanes         SitePlan[]
  giraShow           GiraShow?\n`
);

content = content.replace(
/<<<<<<< HEAD\n  ResponsivaTecnico   ResponsivaTecnico\[\]\n=======\n  giraCrew            GiraCrew\[\]\n>>>>>>> [a-f0-9]+\n/g,
`  ResponsivaTecnico   ResponsivaTecnico[]
  giraCrew            GiraCrew[]\n`
);

content = content.replace(
/<<<<<<< HEAD\n\/\/ ── CARTAS RESPONSIVAS ────────────────────────────────────────────────────────\n\nmodel ResponsivaTecnico {[\s\S]*?@@map\("responsivas_tecnico"\)\n=======\n/g,
``
);

content = content.replace(
/>>>>>>> [a-f0-9]+\n/g,
``
);

content += `\n// ── CARTAS RESPONSIVAS ────────────────────────────────────────────────────────

model ResponsivaTecnico {
  id               String           @id @default(cuid())
  proyectoId       String
  proyecto         Proyecto         @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  tecnicoId        String
  tecnico          Tecnico          @relation(fields: [tecnicoId], references: [id], onDelete: Cascade)
  
  tipoResponsiva   String           // GENERAL | RIGGER
  templateVersion  String           @default("1.0")
  
  status           String           @default("PENDIENTE") // PENDIENTE | RECIBIDA | VALIDADA | REQUIERE_CORRECCION
  datosCapturados  Json?
  firmaUrl         String?
  pdfUrl           String?
  
  aceptadoEn       DateTime?
  enviadoEn        DateTime?
  validadoEn       DateTime?
  validadoPorId    String?
  validadoPor      User?            @relation(fields: [validadoPorId], references: [id])
  motivoCorreccion String?
  
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@unique([proyectoId, tecnicoId])
  @@map("responsivas_tecnico")
}\n`;

fs.writeFileSync(path, content);
