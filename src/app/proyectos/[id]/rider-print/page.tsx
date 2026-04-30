import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function RiderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, empresa: true, telefono: true, correo: true } },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              modelo: true,
              categoria: { select: { nombre: true } },
            },
          },
          riderAccesorios: { orderBy: { orden: "asc" } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!proyecto) notFound();

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—";
    const str = typeof d === "string" ? d : d.toISOString();
    const [y, m, day] = str.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const fmtHora = (h: string | null) => h ?? "—";

  const grupos: Record<string, typeof proyecto.equipos> = {};
  for (const e of proyecto.equipos) {
    const cat = e.equipo.categoria.nombre;
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(e);
  }

  const labelCell: React.CSSProperties = { fontSize: 9, textTransform: "uppercase" as const, letterSpacing: 0.8, color: "#888", marginBottom: 2 };
  const valueCell: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#111" };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: white; }
        .page { max-width: 820px; margin: 0 auto; padding: 32px 40px; }
        @media print {
          body { font-size: 10px; }
          .page { padding: 20px 24px; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
        .section-title { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; color: #B3985B; margin-bottom: 8px; margin-top: 20px; }
        .divider { border: none; border-top: 1px solid #e0e0e0; margin: 16px 0; }
      `}</style>

      <div className="page" style={{ maxWidth: 820, margin: "0 auto", padding: "32px 40px" }}>

        {/* Print button */}
        <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          <button id="btn-print" style={{ background: "#111", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            🖨️ Imprimir / Guardar PDF
          </button>
          <a href={`/proyectos/${id}`} style={{ background: "#f0f0f0", color: "#333", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            ← Volver al proyecto
          </a>
        </div>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#B3985B", fontWeight: 700, marginBottom: 4 }}>MAINSTAGE · RIDER DE CARGA</div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{proyecto.nombre}</h1>
            <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{proyecto.cliente.nombre}{proyecto.cliente.empresa ? ` — ${proyecto.cliente.empresa}` : ""}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: "#999" }}>Fecha del evento</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(proyecto.fechaEvento)}</div>
          </div>
        </div>

        {/* ── Datos del evento ── */}
        <div className="section-title">Datos del evento</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "12px 16px", background: "#f8f8f8", borderRadius: 6, marginBottom: 8 }}>
          {[
            { label: "Cliente", value: proyecto.cliente.nombre },
            { label: "Venue", value: proyecto.lugarEvento ?? "—" },
            { label: "Hora inicio", value: fmtHora(proyecto.horaInicioEvento) },
            { label: "Hora fin", value: fmtHora(proyecto.horaFinEvento) },
            { label: "Teléfono cliente", value: proyecto.cliente.telefono ?? "—" },
            { label: "Correo cliente", value: proyecto.cliente.correo ?? "—" },
            { label: "Responsable cliente", value: proyecto.encargadoCliente ?? "—" },
            { label: "Contacto responsable", value: proyecto.encargadoClienteContacto ?? "—" },
          ].map(m => (
            <div key={m.label}>
              <div style={labelCell}>{m.label}</div>
              <div style={valueCell}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Rider de carga ── */}
        {proyecto.equipos.length > 0 && (
          <>
            <div className="section-title">Equipos</div>
            {Object.entries(grupos).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ background: "#111", color: "white", padding: "4px 10px", fontSize: 8, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, borderRadius: "3px 3px 0 0" }}>
                  {cat}
                </div>
                <div style={{ border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 3px 3px" }}>
                  {items.map((e, idx) => (
                    <div key={e.id} style={{ borderBottom: idx < items.length - 1 ? "1px solid #eee" : "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px" }}>
                        <div style={{ width: 14, height: 14, border: "1.5px solid #999", borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
                            {e.equipo.marca ?? "Sin marca"}
                            {e.equipo.modelo && <span style={{ fontWeight: 400, color: "#444", marginLeft: 4 }}>{e.equipo.modelo}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{e.equipo.descripcion}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#B3985B", background: "#FFF8EE", border: "1px solid #F0E0C0", padding: "1px 6px", borderRadius: 10, flexShrink: 0 }}>
                          ×{e.cantidad}
                        </span>
                      </div>
                      {e.riderAccesorios.length > 0 && (
                        <div style={{ background: "#fafafa", borderTop: "1px dashed #ddd", padding: "8px 12px 8px 38px" }}>
                          <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1, color: "#aaa", marginBottom: 6, fontWeight: 600 }}>
                            Accesorios y herramientas
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
                            {e.riderAccesorios.map(a => (
                              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 11, height: 11, border: "1px solid #bbb", borderRadius: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 10.5, color: "#333" }}>{a.nombre}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 9, color: "#aaa" }}>
            <div>Generado: {new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</div>
            <div style={{ marginTop: 2 }}>Mainstage — Rider de Carga</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 180, borderBottom: "1px solid #aaa", marginBottom: 4, height: 32 }} />
            <div style={{ fontSize: 9, color: "#888" }}>Responsable de producción</div>
          </div>
        </div>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `document.getElementById('btn-print')?.addEventListener('click', function() { window.print(); });` }} />
    </>
  );
}
