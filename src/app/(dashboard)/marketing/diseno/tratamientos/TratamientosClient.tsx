"use client";

import { useEffect, useMemo, useState } from "react";

const GOLD = "#B3985B";

type Equipo = {
  id: string;
  marca: string | null;
  modelo: string | null;
  descripcion: string;
  imagenUrl: string | null;
  tratamiento: string | null;
};

type Filtro = "todos" | "png-transparente" | "foto-marco" | "sin";

export default function TratamientosClient() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/diseno/tratamientos")
      .then((r) => r.json())
      .then((d) => setEquipos(d.equipos ?? []))
      .finally(() => setCargando(false));
  }, []);

  const conteos = useMemo(() => {
    let png = 0, foto = 0, sin = 0;
    for (const e of equipos) {
      if (e.tratamiento === "png-transparente") png++;
      else if (e.tratamiento === "foto-marco") foto++;
      else sin++;
    }
    return { png, foto, sin };
  }, [equipos]);

  const visibles = useMemo(() => {
    if (filtro === "todos") return equipos;
    if (filtro === "sin") return equipos.filter((e) => !e.tratamiento);
    return equipos.filter((e) => e.tratamiento === filtro);
  }, [equipos, filtro]);

  async function set(id: string, tratamiento: string) {
    setGuardando(id);
    setEquipos((prev) => prev.map((e) => (e.id === id ? { ...e, tratamiento } : e)));
    await fetch("/api/diseno/tratamientos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, tratamiento }),
    }).catch(() => {});
    setGuardando(null);
  }

  const tabs: { key: Filtro; label: string }[] = [
    { key: "todos", label: `Todos (${equipos.length})` },
    { key: "png-transparente", label: `PNG sin fondo (${conteos.png})` },
    { key: "foto-marco", label: `Foto con marco (${conteos.foto})` },
    { key: "sin", label: `Sin clasificar (${conteos.sin})` },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 999,
              color: filtro === t.key ? "#0a0a0a" : "#b8b0a0",
              background: filtro === t.key ? GOLD : "rgba(255,255,255,0.04)",
              border: `1px solid ${filtro === t.key ? GOLD : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p style={{ color: "#8a8578" }}>Cargando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {visibles.map((e) => {
            const nombre = [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion;
            const esPng = e.tratamiento === "png-transparente";
            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${e.tratamiento ? "rgba(179,152,91,0.22)" : "rgba(255,80,80,0.35)"}`,
                  opacity: guardando === e.id ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    height: 150,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: esPng
                      ? "repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 50% / 20px 20px"
                      : "#0d0d0d",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.imagenUrl ?? ""} alt={nombre} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ color: "#e8e2d6", fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, minHeight: 32 }}>{nombre}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Toggle activo={esPng} onClick={() => set(e.id, "png-transparente")} label="PNG" />
                    <Toggle activo={e.tratamiento === "foto-marco"} onClick={() => set(e.id, "foto-marco")} label="Foto" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toggle({ activo, onClick, label }: { activo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        padding: "6px 0",
        borderRadius: 8,
        color: activo ? "#0a0a0a" : "#9E9686",
        background: activo ? GOLD : "rgba(255,255,255,0.04)",
        border: `1px solid ${activo ? GOLD : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {label}
    </button>
  );
}
