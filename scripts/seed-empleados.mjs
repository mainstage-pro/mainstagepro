import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL not found");
const url = match[1].replace(/&channel_binding=require/, "");
const sql = neon(url);

// Crear empleados de prueba
const empleados = [
  { nombre: "Carlos Mendoza", puesto: "Técnico de Audio", departamento: "PRODUCCION", tipo: "EMPLEADO", salario: 18000, periodoPago: "QUINCENAL", telefono: "442 100 1001", correo: "carlos@mainstagepro.mx" },
  { nombre: "Diana Flores", puesto: "Coordinadora de Eventos", departamento: "COORDINACION", tipo: "EMPLEADO", salario: 22000, periodoPago: "MENSUAL", telefono: "442 100 1002", correo: "diana@mainstagepro.mx" },
  { nombre: "Roberto Sánchez", puesto: "Técnico de Iluminación", departamento: "PRODUCCION", tipo: "EMPLEADO", salario: 16000, periodoPago: "QUINCENAL", telefono: "442 100 1003", correo: "roberto@mainstagepro.mx" },
  { nombre: "Laura Vega", puesto: "Administradora", departamento: "ADMINISTRACION", tipo: "EMPLEADO", salario: 20000, periodoPago: "MENSUAL", telefono: "442 100 1004", correo: "laura@mainstagepro.mx" },
];

for (const e of empleados) {
  try {
    // Check if already exists
    const existing = await sql`SELECT id FROM personal_interno WHERE nombre = ${e.nombre} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`⚠ Ya existe: ${e.nombre}`);
      continue;
    }
    await sql`INSERT INTO personal_interno (id, nombre, puesto, departamento, tipo, salario, "periodoPago", telefono, correo, activo, "fechaIngreso", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), ${e.nombre}, ${e.puesto}, ${e.departamento}, ${e.tipo}, ${e.salario}, ${e.periodoPago}, ${e.telefono}, ${e.correo}, true, CURRENT_DATE, NOW(), NOW())`;
    console.log(`✓ Creado: ${e.nombre}`);
  } catch(err) {
    console.log(`✗ Error ${e.nombre}: ${err.message}`);
  }
}

console.log("Seed completado.");
