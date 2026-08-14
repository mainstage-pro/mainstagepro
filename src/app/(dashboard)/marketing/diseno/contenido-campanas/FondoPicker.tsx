"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Fondo = { id: string; label: string; bg: string };

const esUrl = (v: string) => /^https?:\/\//.test(v) || v.startsWith("data:");

// Control del campo "Fondo": elige un fondo curado O sube una imagen propia
// (client upload a Vercel Blob, sin pasar por la función serverless). Al subir,
// mete la URL en el input oculto `fondo` y reenvía el form para refrescar la
// vista previa. El resto del brief sigue viajando en el GET normal.
export default function FondoPicker({
  fondos,
  value,
  inputStyle,
  labelStyle,
  card,
  gold,
  borde,
}: {
  fondos: Fondo[];
  value: string; // id de un fondo curado O una URL/data URL subida
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  card: string;
  gold: string;
  borde: string;
}) {
  const [subida, setSubida] = useState<string | null>(esUrl(value) ? value : null);
  const [selId, setSelId] = useState<string>(esUrl(value) ? fondos[0].id : value);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const fondoValue = subida ?? selId;
  const submitForm = () => hiddenRef.current?.form?.requestSubmit();

  async function onFile(file: File) {
    setSubiendo(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `diseno/campanas/${Date.now()}.${ext}`;
      const blob = await upload(path, file, { access: "public", handleUploadUrl: "/api/upload/token" });
      setSubida(blob.url);
      if (hiddenRef.current) hiddenRef.current.value = blob.url;
      submitForm();
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
      setSubiendo(false);
    }
  }

  function quitar() {
    setSubida(null);
    if (hiddenRef.current) hiddenRef.current.value = selId;
    submitForm();
  }

  const btnGhost: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${borde}`,
    color: "#e8e2d6",
    fontSize: 13,
    fontWeight: 600,
    cursor: subiendo ? "default" : "pointer",
    opacity: subiendo ? 0.6 : 1,
  };

  return (
    <div>
      <label style={labelStyle}>Fondo</label>
      <input ref={hiddenRef} type="hidden" name="fondo" value={fondoValue} readOnly />

      {subida ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={subida}
            alt="Fondo subido"
            style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: `1px solid ${borde}`, display: "block" }}
          />
          <span style={{ flex: 1, color: "#cfc7b6", fontSize: 13, fontWeight: 500 }}>Imagen propia cargada</span>
          <button type="button" onClick={quitar} style={{ ...btnGhost, padding: "7px 12px" }}>
            Quitar
          </button>
        </div>
      ) : (
        <select value={selId} onChange={(e) => setSelId(e.target.value)} style={inputStyle}>
          {fondos.map((f) => (
            <option key={f.id} value={f.id} style={{ background: card }}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => !subiendo && fileRef.current?.click()} disabled={subiendo} style={btnGhost}>
          {subiendo ? "Subiendo…" : subida ? "Cambiar imagen" : "＋ Subir mi propia imagen"}
        </button>
        {error && <span style={{ color: "#ff8a8a", fontSize: 12 }}>{error}</span>}
        {!subida && !error && (
          <span style={{ color: gold, fontSize: 11.5, fontWeight: 500 }}>o usa una foto tuya</span>
        )}
      </div>
    </div>
  );
}
