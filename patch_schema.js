const fs = require('fs');

const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// 1. In Proyecto model, add responsivaToken
content = content.replace(
  /docsToken                String\?   @unique \/\/ Token público para ver los PDF del proyecto en línea \(\/doc\/\{token\}\/\{documento\}\)/,
  `docsToken                String?   @unique // Token público para ver los PDF del proyecto en línea (/doc/{token}/{documento})
  responsivaToken          String?   @unique // Token público para responsivas del staff`
);

// 2. In Proyecto model, add ResponsivaTecnico[]
content = content.replace(
  /sitePlanes         SitePlan\[\]\n  giraShow           GiraShow\?/,
  `sitePlanes         SitePlan[]
  giraShow           GiraShow?
  ResponsivaTecnico  ResponsivaTecnico[]`
);

// 3. In Tecnico model, add ResponsivaTecnico[]
content = content.replace(
  /giraCrew            GiraCrew\[\]/,
  `giraCrew            GiraCrew[]
  ResponsivaTecnico   ResponsivaTecnico[]`
);

// 4. At the end of the file, add model
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
