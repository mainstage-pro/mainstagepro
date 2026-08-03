"use client";

import { useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { DesignOverrides, EditableField } from "@/lib/diseno/overrides";

const GOLD = "#B3985B";
const CARD = "#141210";
const BORDER = "rgba(179,152,91,0.28)";

type Slide = { id: string; label: string };

type Props = {
  template: string;
  disenoId: string;
  titulo: string;
  slides: Slide[];
  fields: EditableField[];
  original: Record<string, string>;
  initialOverrides: DesignOverrides;
};

export default function DesignEditor({ template, disenoId, titulo: tituloInicial, slides, fields, original, initialOverrides }: Props) {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = { ...original };
    for (const [k, val] of Object.entries(initialOverrides.texto ?? {})) v[k] = val;
    return v;
  });
  const [fotos, setFotos] = useState<Record<string, string>>(() => ({ ...(initialOverrides.fotos ?? {}) }));
  const [active, setActive] = useState<string>(slides[0]?.id ?? "portada");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [calFecha, setCalFecha] = useState("");
  const [calFormato, setCalFormato] = useState("STORIE");
  const [calMsg, setCalMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { slideId: string; slideLabel: string; fields: EditableField[] }>();
    for (const f of fields) {
      if (!map.has(f.slideId)) map.set(f.slideId, { slideId: f.slideId, slideLabel: f.slideLabel, fields: [] });
      map.get(f.slideId)!.fields.push(f);
    }
    return Array.from(map.values());
  }, [fields]);

  function buildOverrides(v: Record<string, string>, ph: Record<string, string>): DesignOverrides {
    const texto: Record<string, string> = {};
    for (const f of fields) {
      if (v[f.path] !== undefined && v[f.path] !== original[f.path]) texto[f.path] = v[f.path];
    }
    return { texto, fotos: ph };
  }

  async function persist(v: Record<string, string>, ph: Record<string, string>, t: string) {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(`/api/diseno/guardados/${disenoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: buildOverrides(v, ph), titulo: t }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setVersion((n) => n + 1);
      setSavedMsg("Guardado ✓");
    } catch {
      setSavedMsg("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(v: Record<string, string>, ph: Record<string, string>, t: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(v, ph, t), 700);
  }

  function onField(path: string, val: string) {
    const v = { ...values, [path]: val };
    setValues(v);
    scheduleSave(v, fotos, titulo);
  }

  function onTitulo(val: string) {
    setTitulo(val);
    scheduleSave(values, fotos, val);
  }

  async function onUpload(file: File) {
    setSubiendo(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `diseno/${disenoId}/${active}-${Date.now()}.${ext}`;
      const blob = await upload(path, file, { access: "public", handleUploadUrl: "/api/upload/token" });
      const ph = { ...fotos, [active]: blob.url };
      setFotos(ph);
      await persist(values, ph, titulo);
    } catch {
      setSavedMsg("Error al subir foto");
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto() {
    const ph = { ...fotos };
    delete ph[active];
    setFotos(ph);
    persist(values, ph, titulo);
  }

  async function calendarizar() {
    if (!calFecha) {
      setCalMsg("Elige una fecha");
      return;
    }
    setCalMsg("Programando…");
    try {
      const res = await fetch(`/api/diseno/guardados/${disenoId}/calendarizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: calFecha, formato: calFormato, slide: active }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCalMsg("Agregado al calendario ✓");
    } catch {
      setCalMsg("Error al calendarizar");
    }
  }

  const previewSrc = `/api/diseno/render?disenoId=${disenoId}&slide=${active}&v=${version}`;
  const activeLabel = slides.find((s) => s.id === active)?.label ?? active;

  const inputStyle: React.CSSProperties = {
    background: "#0f0d0b",
    color: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    width: "100%",
    fontFamily: "inherit",
  };
  const btn: React.CSSProperties = {
    color: "#0a0a0a",
    background: GOLD,
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
  };
  const btnGhost: React.CSSProperties = {
    color: "#cfc7b6",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "28px 28px 60px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href={`/marketing/diseno/${template}`} style={{ color: "#8a8578", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              ← Volver
            </a>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: -0.4, margin: 0 }}>
              Editor · <span style={{ color: GOLD }}>{titulo || "Diseño"}</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: saving ? GOLD : "#8a8578", fontSize: 12 }}>{saving ? "Guardando…" : savedMsg}</span>
            <button onClick={() => persist(values, fotos, titulo)} style={btn}>Guardar</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 28, marginTop: 24, alignItems: "start" }}>
          {/* ── Columna izquierda: preview grande + thumbs ── */}
          <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  style={{
                    ...btnGhost,
                    borderColor: active === s.id ? GOLD : BORDER,
                    color: active === s.id ? GOLD : "#cfc7b6",
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={previewSrc}
                src={previewSrc}
                alt={activeLabel}
                style={{ maxHeight: "72vh", width: "auto", borderRadius: 10, display: "block" }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ ...btnGhost, cursor: subiendo ? "wait" : "pointer" }}>
                {subiendo ? "Subiendo…" : `Subir foto · ${activeLabel}`}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
              </label>
              {fotos[active] && (
                <button onClick={quitarFoto} style={{ ...btnGhost, color: "#e08a8a", borderColor: "rgba(224,138,138,0.4)" }}>
                  Quitar foto
                </button>
              )}
              <a href={previewSrc} download={`${template}-${active}.png`} style={btn}>Descargar slide</a>
            </div>
          </div>

          {/* ── Columna derecha: campos + calendarizar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Nombre del diseño
              </div>
              <input value={titulo} onChange={(e) => onTitulo(e.target.value)} style={inputStyle} />
            </div>

            {groups.map((g) => (
              <div key={g.slideId} style={{ background: CARD, borderRadius: 14, border: `1px solid ${active === g.slideId ? GOLD : BORDER}`, padding: 16 }}>
                <button
                  onClick={() => setActive(g.slideId)}
                  style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}
                >
                  {g.slideLabel}
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {g.fields.map((f) => (
                    <label key={f.path} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ color: "#8a8578", fontSize: 11 }}>{f.label}</span>
                      {f.kind === "textarea" || f.kind === "lines" ? (
                        <textarea
                          value={values[f.path] ?? ""}
                          onChange={(e) => onField(f.path, e.target.value)}
                          rows={f.kind === "lines" ? 2 : 3}
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      ) : (
                        <input value={values[f.path] ?? ""} onChange={(e) => onField(f.path, e.target.value)} style={inputStyle} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Calendarizar */}
            <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Calendarizar en contenido
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="date" value={calFecha} onChange={(e) => setCalFecha(e.target.value)} style={inputStyle} />
                <select value={calFormato} onChange={(e) => setCalFormato(e.target.value)} style={inputStyle}>
                  <option value="STORIE">Story</option>
                  <option value="POST">Post</option>
                  <option value="REEL">Reel</option>
                  <option value="TIK_TOK">TikTok</option>
                </select>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={calendarizar} style={btn}>Programar</button>
                  <a href="/marketing/calendario" style={btnGhost}>Ver calendario</a>
                  <span style={{ color: "#8a8578", fontSize: 12 }}>{calMsg}</span>
                </div>
                <span style={{ color: "#6b665c", fontSize: 11 }}>
                  Usa el slide en pantalla ({activeLabel}) como portada del slot.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
