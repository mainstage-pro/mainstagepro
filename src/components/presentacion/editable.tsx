"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export const GOLD = "#B3985B";

// ─── Hook central de edición de la presentación ───────────────────────────────
// Detecta sesión interna (admin) y carga el mapa de overrides { key: value }.
// `get(key, fallback)` devuelve el valor sobrescrito o el default del código.
// `save(key, value)` persiste (o borra si value vacío) y actualiza local.
export type EditCtx = {
  isAdmin: boolean;
  loaded: boolean;
  get: (key: string, fallback: string) => string;
  save: (key: string, value: string | null) => Promise<void>;
};

export function usePresentacionEdit(): EditCtx {
  const [isAdmin, setIsAdmin] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setIsAdmin(true); })
      .catch(() => {});
    fetch("/api/presentacion/overrides")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.overrides) setOverrides(d.overrides); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const get = useCallback(
    (key: string, fallback: string) => overrides[key] ?? fallback,
    [overrides]
  );

  const save = useCallback(async (key: string, value: string | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === null || value === "") delete next[key];
      else next[key] = value;
      return next;
    });
    try {
      await fetch("/api/presentacion/overrides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    } catch {
      /* best-effort: el estado local ya se actualizó */
    }
  }, []);

  return { isAdmin, loaded, get, save };
}

// ─── Imagen editable ──────────────────────────────────────────────────────────
// Renderiza un <img> (con la URL sobrescrita si existe) y, para admins, un botón
// flotante "Cambiar" que sube a Vercel Blob y guarda la nueva URL en el override.
export function EditableImage({
  edit, okey, fallback, alt,
  wrapClassName = "", wrapStyle, imgClassName = "", imgStyle,
  draggable = false, loading, showEditButton = true, prominent = false,
}: {
  edit: EditCtx;
  okey: string;
  fallback: string;
  alt: string;
  wrapClassName?: string;
  wrapStyle?: React.CSSProperties;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  draggable?: boolean;
  loading?: "lazy" | "eager";
  showEditButton?: boolean;
  prominent?: boolean;
}) {
  const src = edit.get(okey, fallback);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const blob = await upload(files[0].name, files[0], {
        access: "public",
        handleUploadUrl: "/api/tipos-evento/imagenes",
      });
      await edit.save(okey, blob.url);
    } catch (err) {
      alert("No se pudo subir la imagen: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // El caller controla el posicionamiento (absolute inset-0 / relative w-full…).
  // No forzamos `relative` aquí porque sobrescribiría un `absolute` entrante en
  // Tailwind y rompería el apilado (imágenes a tamaño natural → gigantes).
  return (
    <div className={wrapClassName} style={wrapStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={draggable} loading={loading} className={imgClassName} style={imgStyle} />
      {edit.isAdmin && showEditButton && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
          {prominent ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              disabled={busy}
              className="absolute top-4 right-4 z-30 inline-flex items-center gap-2 text-[13px] font-bold tracking-wide px-5 py-3 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-60"
              style={{ background: GOLD, color: "#000", boxShadow: `0 6px 24px ${GOLD}66` }}
            >
              <span className="text-base leading-none">⤢</span>
              {busy ? "Subiendo…" : "Cambiar imagen principal"}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              disabled={busy}
              className="absolute top-3 right-3 z-30 text-[11px] font-semibold tracking-wide px-3.5 py-2 rounded-full transition-all disabled:opacity-60 backdrop-blur"
              style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD}66`, color: GOLD }}
            >
              {busy ? "Subiendo…" : "⤢ Cambiar imagen"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Figura editable (imagen opcional sobre un placeholder) ───────────────────
// Si hay override, muestra la imagen; si no, muestra `placeholder` (p.ej. un
// icono). Los admins siempre ven un botón para subir/cambiar (y quitar si hay).
export function EditableFigure({
  edit, okey, alt, placeholder, className = "", imgClassName = "",
}: {
  edit: EditCtx;
  okey: string;
  alt: string;
  placeholder: React.ReactNode;
  className?: string;
  imgClassName?: string;
}) {
  const src = edit.get(okey, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const blob = await upload(files[0].name, files[0], {
        access: "public",
        handleUploadUrl: "/api/tipos-evento/imagenes",
      });
      await edit.save(okey, blob.url);
    } catch (err) {
      alert("No se pudo subir la imagen: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={alt} draggable={false} className={imgClassName} />
      ) : (
        placeholder
      )}
      {edit.isAdmin && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
            disabled={busy}
            aria-label="Subir imagen"
            className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold px-2 py-1 rounded-full transition-all disabled:opacity-60"
            style={{ background: "rgba(179,152,91,0.14)", border: `1px solid ${GOLD}55`, color: GOLD }}
          >
            {busy ? "…" : src ? "⤢" : "＋ img"}
          </button>
          {src && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); edit.save(okey, null); }}
              aria-label="Quitar imagen"
              className="ml-1 inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full text-white/40"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              ✕
            </button>
          )}
        </>
      )}
    </span>
  );
}

// ─── Texto editable ───────────────────────────────────────────────────────────
// Renderiza texto; para admins muestra un lápiz que abre un editor inline
// (textarea) con guardar/cancelar. `as` define la etiqueta contenedora.
export function EditableText({
  edit, okey, fallback, as = "span", className = "", style, multiline = false,
}: {
  edit: EditCtx;
  okey: string;
  fallback: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const value = edit.get(okey, fallback);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  const Tag = as as React.ElementType;

  async function commit() {
    setBusy(true);
    await edit.save(okey, draft.trim() === fallback.trim() ? null : draft);
    setBusy(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="relative inline-block w-full">
        {multiline ? (
          <textarea
            autoFocus rows={4} value={draft} onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-black/60 border border-[#B3985B]/50 rounded-lg px-3 py-2 text-white text-sm outline-none"
          />
        ) : (
          <input
            autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-black/60 border border-[#B3985B]/50 rounded-lg px-3 py-2 text-white text-sm outline-none"
          />
        )}
        <span className="flex gap-2 mt-2">
          <button type="button" onClick={commit} disabled={busy}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: GOLD, color: "#000" }}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => { setDraft(value); setEditing(false); }}
            className="text-[11px] px-3 py-1.5 rounded-full text-white/50"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            Cancelar
          </button>
          <button type="button" onClick={() => { setDraft(fallback); }}
            className="text-[11px] px-3 py-1.5 rounded-full text-white/30"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            Restablecer
          </button>
        </span>
      </span>
    );
  }

  return (
    <Tag className={className} style={style}>
      {value}
      {edit.isAdmin && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDraft(value); setEditing(true); }}
          aria-label="Editar texto"
          className="inline-flex items-center justify-center ml-2 align-middle w-6 h-6 rounded-full transition-all"
          style={{ background: "rgba(179,152,91,0.14)", border: `1px solid ${GOLD}55`, color: GOLD, fontSize: "0.7rem" }}
        >
          ✎
        </button>
      )}
    </Tag>
  );
}
