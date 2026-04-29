import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

function accesoriosSugeridos(descripcion: string, categoria: string): string[] {
  const d = descripcion.toLowerCase();
  const c = categoria.toLowerCase();
  if (/(sub|8006|18p|18sp|subgrave)/.test(d))
    return ["Cable XLR 5m", "Cable de poder", "Clamp/gancho (si se cuelga)"];
  if (/(ekx|hdl|6a|12p|bafle|speaker|satélite|top\b)/.test(d))
    return ["Cable XLR 5m", "Cable de poder", "Soporte para bafle", "Espuma protectora"];
  if (/\bmonitor\b/.test(d))
    return ["Cable XLR 5m", "Cable de poder"];
  if (/(sq5|sq6|sq7|dlive|x32|x18|wing|mg10|mg16|konsola|consola|mixer)/.test(d))
    return ["Cables XLR (×6)", "Cables TRS 6.3mm", "Cable de poder", "Cable Ethernet"];
  if (/(cdj-?3000|cdj-?2000|cdj\b)/.test(d))
    return ["Cable RCA", "Cable USB", "Cable de poder", "Funda/case"];
  if (/(djm|v10|a9|900nxs|rotary.*mix)/.test(d))
    return ["Cables RCA (×2 pares)", "Cables XLR salida (×2)", "Cable de poder", "Funda/case"];
  if (/(inalámbric|inalambric|wireless.*mic|shure.*pg|shure.*sm|sennheiser|glxd|blxd|slx|ew[0-9])/.test(d))
    return ["Baterías AA (pack)", "Cable XLR backup", "Clip de micrófono", "Stand de micrófono"];
  if (/(iem|in.ear|g4\b|g10\b|ew300|ew400)/.test(d))
    return ["Baterías AA (pack)", "In-ears de respaldo", "Cable de poder"];
  if (/(diadema|headset|lavalier|solapa)/.test(d))
    return ["Baterías AA (pack)", "Repuesto de esponja/windscreen", "Clip extra"];
  if (/(par.led.inal|uplighting|wireless.*par)/.test(d))
    return ["Cargador / base de carga", "Cable DMX (backup)", "Clamp (si se monta)"];
  if (/(par.led|par64|par56)/.test(d))
    return ["Cable DMX 3m", "Cable de poder", "Clamp"];
  if (/\bbeam\b/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp/soporte"];
  if (/(spot|wash|moving.head|cabeza móvil)/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp/soporte"];
  if (/strobe|blinder/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp"];
  if (/(barra.led|batten|lineal.*led)/.test(d))
    return ["Cable DMX 3m", "Cable de poder", "Soporte/stand"];
  if (/(haze|hazer|neblina)/.test(d))
    return ["Líquido hazer 1L", "Cable DMX", "Cable de poder"];
  if (/(truss|torre.*luz|lighting.*tower)/.test(d))
    return ["Herrajes de unión", "Tornillería extra", "Llave de golpe", "Base de soporte"];
  if (/(pantalla.*led|led.*panel|ledwall|videowall)/.test(d))
    return ["Cables HDMI 5m", "Cable de poder (rack)", "Herramienta de ensamble"];
  if (/(novastar|atem|vmix|resolume|procesador.*video)/.test(d))
    return ["Cable HDMI ×2", "Cable de poder", "Laptop de respaldo"];
  if (/audio/.test(c)) return ["Cable XLR 5m", "Cable de poder"];
  if (/iluminaci/.test(c)) return ["Cable DMX 5m", "Cable de poder"];
  if (/video/.test(c)) return ["Cable HDMI 5m", "Cable de poder"];
  return ["Cable de poder"];
}

export default async function RiderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true } },
      equipos: {
        include: {
          equipo: {
            select: {
              descripcion: true,
              marca: true,
              categoria: { select: { nombre: true } },
              accesorios: { select: { id: true, nombre: true, categoria: true }, orderBy: { createdAt: "asc" } },
            },
          },
          riderAccesorios: { orderBy: { orden: "asc" } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!proyecto) notFound();

  const fmtDate = (d: Date | null) => {
    if (!d) return "—";
    const [y, m, day] = d.toISOString().substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const grupos: Record<string, typeof proyecto.equipos> = {};
  for (const e of proyecto.equipos) {
    const cat = e.equipo.categoria.nombre;
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(e);
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: white; }
        .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }
        @media print {
          body { font-size: 10px; }
          .page { padding: 20px 24px; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="page" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 40px" }}>

        {/* Print button */}
        <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          <button
            id="btn-print"
            style={{ background: "#111", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
          <a
            href={`/proyectos/${id}`}
            style={{ background: "#f0f0f0", color: "#333", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            ← Volver al proyecto
          </a>
        </div>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#B3985B", fontWeight: 700, marginBottom: 4 }}>MAINSTAGE · RIDER TÉCNICO DE CARGA</div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{proyecto.nombre}</h1>
            <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{proyecto.cliente.nombre}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: "#999" }}>Fecha del evento</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(proyecto.fechaEvento)}</div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24, padding: "12px 16px", background: "#f5f5f5", borderRadius: 6 }}>
          {[
            { label: "Cliente", value: proyecto.cliente.nombre },
            { label: "Venue", value: proyecto.lugarEvento ?? "—" },
            { label: "Total de equipos", value: `${proyecto.equipos.reduce((s, e) => s + e.cantidad, 0)} unidades` },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: "#888", marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Equipment by category */}
        {proyecto.equipos.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#999", fontSize: 13 }}>Sin equipos asignados</div>
        ) : (
          Object.entries(grupos).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ background: "#111", color: "white", padding: "5px 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, borderRadius: "3px 3px 0 0" }}>
                {cat}
              </div>
              <div style={{ border: "1px solid #ddd", borderTop: "none", borderRadius: "0 0 3px 3px" }}>
                {items.map((e, idx) => {
                  const riderNames = new Set(e.riderAccesorios.map(a => a.nombre.toLowerCase()));
                  const libraryNames = new Set(e.equipo.accesorios.map(a => a.nombre.toLowerCase()));
                  const sistemaSugs = accesoriosSugeridos(e.equipo.descripcion, e.equipo.categoria.nombre)
                    .filter(s => !riderNames.has(s.toLowerCase()) && !libraryNames.has(s.toLowerCase()));
                  const librarySugs = e.equipo.accesorios
                    .filter(a => !riderNames.has(a.nombre.toLowerCase()));
                  const totalAccesorios = e.riderAccesorios.length + librarySugs.length + sistemaSugs.length;

                  return (
                    <div key={e.id} style={{ borderBottom: idx < items.length - 1 ? "1px solid #eee" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
                        <div style={{ width: 14, height: 14, border: "1.5px solid #999", borderRadius: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{e.equipo.descripcion}</span>
                          {e.equipo.marca && <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>· {e.equipo.marca}</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#B3985B", background: "#FFF8EE", border: "1px solid #F0E0C0", padding: "1px 6px", borderRadius: 10 }}>
                          ×{e.cantidad}
                        </span>
                      </div>
                      {totalAccesorios > 0 && (
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
                            {librarySugs.map(a => (
                              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 11, height: 11, border: "1px dashed #ccc", borderRadius: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 10.5, color: "#555" }}>{a.nombre}</span>
                                <span style={{ fontSize: 8, color: "#bbb", fontStyle: "italic" }}>biblioteca</span>
                              </div>
                            ))}
                            {sistemaSugs.map((s, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 11, height: 11, border: "1px dashed #ddd", borderRadius: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 10.5, color: "#888" }}>{s}</span>
                                <span style={{ fontSize: 8, color: "#ccc", fontStyle: "italic" }}>sugerido</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 9, color: "#aaa" }}>
            <div>Generado: {new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</div>
            <div style={{ marginTop: 2 }}>Mainstage — Rider Técnico de Carga</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 180, borderBottom: "1px solid #aaa", marginBottom: 4, height: 32 }} />
            <div style={{ fontSize: 9, color: "#888" }}>Responsable de carga</div>
          </div>
        </div>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('btn-print')?.addEventListener('click', function() { window.print(); });
      ` }} />
    </>
  );
}
