// Versión sin servidor de la regla de prestamos-capital.ts, para usarla en
// componentes cliente (ese módulo importa Prisma).

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** La categoría es la de préstamo recibido ("Préstamo"), no la de su pago. */
export function esCategoriaPrestamo(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  const n = normalizar(nombre);
  return n.includes("prestamo") && !n.includes("pago") && !n.includes("devolucion");
}
