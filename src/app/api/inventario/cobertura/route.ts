import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseArr } from "@/lib/clasificacion-sync";

// Radiografía de vacíos de clasificación comercial. Seis cubetas con drill-down;
// cada ítem trae un href para ir a arreglarlo. Los equipos noCotizable
// (cables/consumibles) se excluyen: no forman parte de la cobertura.
export type ItemCobertura = { id: string; nombre: string; sub?: string; href: string };
export type Cubeta = { clave: string; titulo: string; descripcion: string; items: ItemCobertura[] };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [equipos, productos, adicionales, nichos, prodEquipos, paqueteItems, paquetes] = await Promise.all([
    prisma.equipo.findMany({
      where: { activo: true, noCotizable: false },
      select: { id: true, descripcion: true, marca: true, modelo: true, tiposEvento: true, categoria: { select: { nombre: true } } },
      orderBy: [{ descripcion: "asc" }],
    }),
    prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, tiposEvento: true, categoria: true },
      orderBy: [{ nombre: "asc" }],
    }),
    prisma.adicional.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, composicion: true, productoId: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.nicho.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, slug: true, tipoEventoSlug: true },
      orderBy: [{ tipoEventoSlug: "asc" }, { orden: "asc" }],
    }),
    prisma.productoEquipo.findMany({ where: { producto: { activo: true } }, select: { equipoId: true, productoId: true } }),
    prisma.paqueteItem.findMany({ where: { productoId: { not: null } }, select: { productoId: true } }),
    prisma.paquete.findMany({ where: { activo: true }, select: { tipoEvento: true, subtiposEvento: true } }),
  ]);

  const equiposEnProducto = new Set(prodEquipos.map(pe => pe.equipoId));
  const productosEnPaquete = new Set(paqueteItems.map(pi => pi.productoId as string));

  // Tipos declarados por cada equipo (para detectar divergencias con sus productos).
  const equipoTipos = new Map(equipos.map(e => [e.id, parseArr(e.tiposEvento)]));
  const miembrosPorProducto = new Map<string, string[]>();
  for (const pe of prodEquipos) {
    const arr = miembrosPorProducto.get(pe.productoId) || [];
    arr.push(pe.equipoId);
    miembrosPorProducto.set(pe.productoId, arr);
  }

  // Un nicho está cubierto si algún paquete de su tipo lo referencia por slug/nombre
  // en subtiposEvento, o —a falta de esa granularidad— si existe cualquier paquete
  // de su mismo tipo de evento (señal mínima previa a Bloque 6).
  const paquetesPorTipo = new Map<string, string[][]>();
  for (const p of paquetes) {
    const tipo = (p.tipoEvento || "").toUpperCase();
    const arr = paquetesPorTipo.get(tipo) || [];
    arr.push(parseArr(p.subtiposEvento).map(s => s.toLowerCase()));
    paquetesPorTipo.set(tipo, arr);
  }
  function nichoCubierto(n: { slug: string; nombre: string; tipoEventoSlug: string }): boolean {
    const listas = paquetesPorTipo.get(n.tipoEventoSlug.toUpperCase());
    if (!listas || !listas.length) return false;
    const slug = n.slug.toLowerCase();
    const nombre = n.nombre.toLowerCase();
    // Si ningún paquete del tipo declara subtipos, el tipo entero cuenta como cubierto.
    const algunoConSubtipos = listas.some(l => l.length > 0);
    if (!algunoConSubtipos) return true;
    return listas.some(l => l.includes(slug) || l.includes(nombre));
  }

  const equiposSinTipo: ItemCobertura[] = equipos
    .filter(e => parseArr(e.tiposEvento).length === 0)
    .map(e => ({ id: e.id, nombre: e.descripcion, sub: [e.marca, e.modelo].filter(Boolean).join(" ") || e.categoria?.nombre || undefined, href: "/equipos/clasificacion" }));

  const equiposSinProducto: ItemCobertura[] = equipos
    .filter(e => !equiposEnProducto.has(e.id))
    .map(e => ({ id: e.id, nombre: e.descripcion, sub: e.categoria?.nombre || undefined, href: "/comercial/productos/lista" }));

  const productosSinTipo: ItemCobertura[] = productos
    .filter(p => parseArr(p.tiposEvento).length === 0)
    .map(p => ({ id: p.id, nombre: p.nombre, sub: p.categoria || undefined, href: "/comercial/productos/lista" }));

  const productosSinPaquete: ItemCobertura[] = productos
    .filter(p => !productosEnPaquete.has(p.id))
    .map(p => ({ id: p.id, nombre: p.nombre, sub: p.categoria || undefined, href: "/comercial/productos/paquetes" }));

  const adicionalesSinComposicion: ItemCobertura[] = adicionales
    .filter(a => parseArr(a.composicion).length === 0 && !a.productoId)
    .map(a => ({ id: a.id, nombre: a.nombre, href: "/comercial/productos/catalogo-eventos" }));

  const nichosSinPaquete: ItemCobertura[] = nichos
    .filter(n => !nichoCubierto(n))
    .map(n => ({ id: n.id, nombre: n.nombre, sub: n.tipoEventoSlug, href: "/comercial/productos/paquetes" }));

  // Inconsistencias equipo↔producto: un producto cuyos equipos componentes declaran
  // un tipo de evento que el producto no tiene. Señal aditiva (nunca resta): sugiere
  // correr el sync equipo→producto. No incluye la dirección inversa para no duplicar.
  const inconsistencias: ItemCobertura[] = productos
    .map(p => {
      const propios = parseArr(p.tiposEvento);
      const union = new Set<string>();
      for (const eid of miembrosPorProducto.get(p.id) || []) {
        for (const t of equipoTipos.get(eid) || []) union.add(t);
      }
      const faltan = [...union].filter(t => !propios.includes(t));
      return { p, faltan };
    })
    .filter(({ faltan }) => faltan.length > 0)
    .map(({ p, faltan }) => ({ id: p.id, nombre: p.nombre, sub: `Sus equipos sugieren: ${faltan.join(", ")}`, href: "/comercial/productos/lista" }));

  const cubetas: Cubeta[] = [
    { clave: "equipos-sin-tipo", titulo: "Equipos sin tipo de evento", descripcion: "No sabemos para qué eventos sirven; no aparecen en sugerencias.", items: equiposSinTipo },
    { clave: "equipos-sin-producto", titulo: "Equipos sin producto", descripcion: "No están armados en ningún producto cotizable.", items: equiposSinProducto },
    { clave: "productos-sin-tipo", titulo: "Productos sin tipo de evento", descripcion: "No se sugieren en el descubrimiento por nicho.", items: productosSinTipo },
    { clave: "productos-sin-paquete", titulo: "Productos sin paquete", descripcion: "No forman parte de ninguna propuesta base.", items: productosSinPaquete },
    { clave: "adicionales-sin-composicion", titulo: "Adicionales sin composición", descripcion: "No tienen qué cotizar cuando el cliente los pide.", items: adicionalesSinComposicion },
    { clave: "nichos-sin-paquete", titulo: "Nichos sin paquete", descripcion: "No hay propuesta base que ofrecer para ese nicho.", items: nichosSinPaquete },
    { clave: "clasif-inconsistente", titulo: "Clasificación inconsistente", descripcion: "Los equipos del producto declaran un tipo que el producto no tiene; conviene sincronizar.", items: inconsistencias },
  ];

  const totales = {
    equipos: equipos.length,
    productos: productos.length,
    adicionales: adicionales.length,
    nichos: nichos.length,
  };

  return NextResponse.json({ cubetas, totales });
}
