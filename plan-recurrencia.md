# Plan: Recurrencia en CxC y CxP

## 1. Modificar Schema de Prisma (`prisma/schema.prisma`)

Crear el modelo de configuración de recurrencia y enlazarlo a CxC y CxP.

```prisma
model SerieRecurrente {
  id              String    @id @default(cuid())
  tipo            String    // "CXP" | "CXC"
  
  // Recurrence Config
  frecuencia      String    // SEMANAL | QUINCENAL | MENSUAL | TRIMESTRAL | SEMESTRAL | ANUAL | PERSONALIZADA
  intervalo       Int       @default(1)
  fechaInicio     DateTime
  fechaFin        DateTime? 
  diaVencimiento  Int?      // Día límite
  
  estado          String    @default("ACTIVO") // ACTIVO | PAUSADO | FINALIZADO
  
  // Template Data (Snapshot de lo que se genera)
  concepto        String
  monto           Float
  
  // Relaciones
  clienteId       String?
  proveedorId     String?
  empresaId       String?
  socioId         String?
  tecnicoId       String?
  proyectoId      String?
  categoriaId     String?

  ultimaGeneracion DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  cuentasCobrar   CuentaCobrar[]
  cuentasPagar    CuentaPagar[]

  @@map("series_recurrentes")
}
```

Modificar `CuentaCobrar` y `CuentaPagar`:
```prisma
  serieRecurrenteId String?
  serieRecurrente   SerieRecurrente? @relation(fields: [serieRecurrenteId], references: [id])
  numeroPeriodo     Int?
```

## 2. API / Backend Logic
- **Creación (`/api/cuentas-cobrar/route.ts` & `/api/cuentas-pagar/route.ts`)**:
  - Si el payload incluye `esRecurrente: true`, crear la `SerieRecurrente`.
  - Crear la cuenta actual conectada a la serie (`numeroPeriodo: 1`).
  - Generar automáticamente las cuentas futuras (ej. hasta 1 año o hasta `fechaFin`) conectadas a la serie con `numeroPeriodo` incrementales. Esto asegura que aparezcan en el flujo proyectado.
  
- **Edición (`/api/cuentas-cobrar/[id]/route.ts` & `/api/cuentas-pagar/[id]/route.ts`)**:
  - Si viene `editarSiguientes: true` y la cuenta es parte de una `SerieRecurrente`, actualizar la serie y actualizar **todas las cuentas futuras no pagadas** de esta serie.
  
- **Cron Job**: (Opcional por ahora, si generamos 1-2 años al inicio, pero recomendado a futuro). Para que sea simple y cumpla "no generar cientos de registros innecesariamente", podemos generar solo el año en curso (o 12 meses vista) y delegar a un cron (`src/app/api/cron/generar-recurrentes`) el mantener siempre un buffer de 12 meses. O generar todo hasta la `fechaFin` si la duración es < 2 años. 
  *Decisión:* Para mayor simplicidad y evitar cron setup complejo si no es 100% necesario, podemos generar un máximo de 24 ocurrencias futuras por adelantado, o hasta `fechaFin`.

## 3. Frontend (UI)
- En `src/app/(dashboard)/finanzas/cobros-pagos/page.tsx`:
  - En el form de "Nuevo", agregar un Toggle "¿Es recurrente?".
  - Si "Sí", mostrar opciones:
    - Frecuencia (Select: Semanal, Quincenal, Mensual, Trimestral, Semestral, Anual).
    - Fecha inicio (ya la tiene `fechaCompromiso`).
    - Fecha finalización (Input Date opcional, o Checkbox "Sin límite").
    - Día de vencimiento se puede calcular con `fechaCompromiso` o dejar elegir.
  - Al editar una cuenta que es recurrente, mostrar un Radio/Select: "Editar solo esta cuenta" o "Editar esta y las siguientes".

## 4. Generación de las Fechas
Necesitamos una utilidad sencilla (ej. en `src/lib/recurrencia.ts` o un archivo nuevo `src/lib/recurrencia-finanzas.ts`) para dado una fecha de inicio y una frecuencia, generar un array de fechas.
