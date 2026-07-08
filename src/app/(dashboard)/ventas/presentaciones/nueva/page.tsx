"use client";

import React, { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";


// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedImage {
  id: string;
  url: string;
  nombre: string;
  orden: number;
  uploading: boolean;
  error?: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; message: string; type: "success" | "error" | "info" }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = useCallback((message: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);
  return { toasts, show };
}

// ─── Image upload helper (client-side direct upload to Vercel Blob) ─────────

async function uploadImage(file: File): Promise<{ url: string; nombre: string }> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/presentaciones-venta/imagenes",
  });
  return { url: blob.url, nombre: file.name };
}

// ─── Image preview card ───────────────────────────────────────────────────────

function ImageCard({
  img,
  index,
  onRemove,
}: {
  img: UploadedImage;
  index: number;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden border group"
      style={{
        borderColor: img.error ? "#7f1d1d" : "#262626",
        background: "#0a0a0a",
        aspectRatio: "4/3",
      }}
    >
      {img.uploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px]" style={{ color: "#6b7280" }}>Subiendo...</span>
        </div>
      ) : img.error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
          <span className="text-red-400 text-xs text-center">{img.error}</span>
        </div>
      ) : (
        <img
          src={img.url}
          alt={img.nombre}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Order badge */}
      {!img.uploading && !img.error && (
        <div
          className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "rgba(0,0,0,0.7)", color: "#B3985B" }}
        >
          {index + 1}
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(img.id)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all opacity-0 group-hover:opacity-100 hover:bg-red-900"
        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
        title="Eliminar foto"
      >
        ×
      </button>

      {/* Nombre */}
      {!img.uploading && !img.error && (
        <div
          className="absolute bottom-0 left-0 right-0 px-2 py-1 truncate text-[10px]"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))", color: "#9ca3af" }}
        >
          {img.nombre}
        </div>
      )}
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)
    );
    if (files.length) onFiles(files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
      style={{
        borderColor: dragging ? "#B3985B" : "#333",
        background: dragging ? "rgba(179,152,91,0.05)" : "transparent",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(179,152,91,0.08)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white">
          Arrastra fotos aquí o <span style={{ color: "#B3985B" }}>haz clic para seleccionar</span>
        </p>
        <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
          JPG, PNG, WebP · Máximo 10MB por foto · Hasta 12 fotos
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function NuevaPresentacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, show: showToast } = useToast();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenes, setImagenes] = useState<UploadedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<"form" | "generating" | "done">("form");

  // Check for any pending uploads
  const hasUploading = imagenes.some((i) => i.uploading);
  const canGenerate = titulo.trim().length >= 3 && descripcion.trim().length >= 20 && !hasUploading;

  // Load existing if edit mode
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    fetch(`/api/presentaciones-venta/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.presentacion) {
          setTitulo(data.presentacion.titulo);
          setDescripcion(data.presentacion.descripcion);
          setImagenes(
            data.presentacion.imagenes.map((img: { id: string; blobUrl: string; nombre: string; orden: number }) => ({
              id: img.id,
              url: img.blobUrl,
              nombre: img.nombre,
              orden: img.orden,
              uploading: false,
            }))
          );
        }
      })
      .catch(() => {});
  }, [searchParams]);

  async function handleFiles(files: File[]) {
    const available = 12 - imagenes.filter((i) => !i.error).length;
    const toUpload = files.slice(0, available);
    if (toUpload.length === 0) {
      showToast("Máximo 12 fotos", "error");
      return;
    }

    const newImgs: UploadedImage[] = toUpload.map((f, i) => ({
      id: `temp-${Date.now()}-${i}`,
      url: "",
      nombre: f.name,
      orden: imagenes.length + i,
      uploading: true,
    }));

    setImagenes((prev) => [...prev, ...newImgs]);

    await Promise.all(
      toUpload.map(async (file, i) => {
        const tempId = newImgs[i].id;
        try {
          const { url, nombre } = await uploadImage(file);
          setImagenes((prev) =>
            prev.map((img) =>
              img.id === tempId ? { ...img, url, nombre, uploading: false } : img
            )
          );
        } catch (err) {
          setImagenes((prev) =>
            prev.map((img) =>
              img.id === tempId
                ? { ...img, uploading: false, error: err instanceof Error ? err.message : "Error" }
                : img
            )
          );
        }
      })
    );
  }

  function removeImage(id: string) {
    setImagenes((prev) => prev.filter((img) => img.id !== id));
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setStep("generating");

    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagenes: imagenes
          .filter((i) => !i.uploading && !i.error && i.url)
          .map((i, idx) => ({ url: i.url, nombre: i.nombre, orden: idx })),
      };

      const res = await fetch("/api/presentaciones-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar la presentación");
      }

      const data = await res.json();
      const id = data.presentacion.id;

      setStep("done");
      showToast("¡Presentación generada con éxito!", "success");

      // Open in new tab and redirect to list
      window.open(`/api/presentaciones-venta/${id}/html`, "_blank");
      setTimeout(() => router.push("/ventas/presentaciones"), 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al generar", "error");
      setGenerating(false);
      setStep("form");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-auto"
            style={{
              background: t.type === "error" ? "#1f0a0a" : t.type === "success" ? "#0a1f0a" : "#111",
              color: t.type === "error" ? "#f87171" : t.type === "success" ? "#4ade80" : "#d1d5db",
              border: `1px solid ${t.type === "error" ? "#7f1d1d" : t.type === "success" ? "#14532d" : "#262626"}`,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "#6b7280" }}>
          <a href="/ventas/presentaciones" className="hover:text-white transition-colors">Presentaciones de Venta</a>
          <span>/</span>
          <span className="text-white">Nueva presentación</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="ms-h1 tracking-tight mb-1">Nueva Presentación de Venta</h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Describe el paquete, sube fotos y Claude genera una presentación profesional
          </p>
        </div>

        {step === "generating" ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(179,152,91,0.08)", border: "1px solid rgba(179,152,91,0.2)" }}
              >
                <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white mb-2">Claude está creando tu presentación...</h2>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                Esto puede tomar unos 20-40 segundos. Por favor espera.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-center mt-4">
              {[
                "Analizando descripción del paquete...",
                "Diseñando estructura de slides...",
                "Generando contenido con IA...",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#4b5563" }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: "#B3985B" }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">¡Presentación generada!</h2>
            <p className="text-sm" style={{ color: "#6b7280" }}>Redirigiendo...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Sección 1: Información ─────────────────────────────── */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                    style={{ background: "#B3985B" }}
                  >1</span>
                  <span className="text-sm font-semibold text-white">Información del paquete</span>
                </div>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>
                    Título del paquete <span style={{ color: "#B3985B" }}>*</span>
                  </label>
                  <input
                    id="pv-titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="ej: Paquete Corporativo Premium, Boda Completa HD..."
                    className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none transition-colors"
                    style={{ background: "#0a0a0a", border: "1px solid #262626" }}
                    onFocus={(e) => (e.target.style.borderColor = "#B3985B")}
                    onBlur={(e) => (e.target.style.borderColor = "#262626")}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>
                    Descripción del paquete <span style={{ color: "#B3985B" }}>*</span>
                  </label>
                  <textarea
                    id="pv-descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={8}
                    placeholder={`Describe el paquete o servicio que quieres presentar:
• ¿Qué es? ¿Para qué tipo de evento?
• ¿Qué equipos, servicios o personal incluye?
• ¿Cuál es el precio o rango de inversión?
• ¿Cuáles son sus ventajas principales?
• ¿Hay algo especial o diferente en este paquete?`}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none transition-colors resize-none leading-relaxed"
                    style={{ background: "#0a0a0a", border: "1px solid #262626" }}
                    onFocus={(e) => (e.target.style.borderColor = "#B3985B")}
                    onBlur={(e) => (e.target.style.borderColor = "#262626")}
                  />
                  <p className="text-[10px] mt-1.5" style={{ color: "#374151" }}>
                    Entre más detallada la descripción, mejor será la presentación generada.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Sección 2: Fotos ───────────────────────────────────── */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                      style={{ background: "#B3985B" }}
                    >2</span>
                    <span className="text-sm font-semibold text-white">Fotos de tu trabajo</span>
                  </div>
                  {imagenes.filter((i) => !i.error).length > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(179,152,91,0.12)", color: "#B3985B" }}>
                      {imagenes.filter((i) => !i.error && !i.uploading).length} / 12
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 ml-9" style={{ color: "#4b5563" }}>
                  Opcional — las fotos se incluirán en la galería de la presentación
                </p>
              </div>

              <div className="px-5 py-5 space-y-4">
                <DropZone onFiles={handleFiles} />

                {imagenes.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {imagenes.map((img, i) => (
                      <ImageCard key={img.id} img={img} index={i} onRemove={removeImage} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Sección 3: Generar ─────────────────────────────────── */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#111", borderColor: "#262626" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                    style={{ background: canGenerate ? "#B3985B" : "#333", color: canGenerate ? "#000" : "#555" }}
                  >3</span>
                  <span className="text-sm font-semibold text-white">Generar presentación</span>
                </div>
              </div>

              <div className="px-5 py-6 flex flex-col items-center gap-4">
                {/* Requirements check */}
                <div className="w-full space-y-2">
                  {[
                    { ok: titulo.trim().length >= 3, label: "Título del paquete (mín. 3 caracteres)" },
                    { ok: descripcion.trim().length >= 20, label: "Descripción detallada (mín. 20 caracteres)" },
                    { ok: !hasUploading, label: "Fotos subidas correctamente" },
                  ].map(({ ok, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span style={{ color: ok ? "#22c55e" : "#374151" }}>
                        {ok ? "✓" : "○"}
                      </span>
                      <span style={{ color: ok ? "#9ca3af" : "#374151" }}>{label}</span>
                    </div>
                  ))}
                </div>

                <button
                  id="btn-generar-presentacion-venta"
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 flex items-center justify-center gap-3"
                  style={{
                    background: canGenerate ? "#B3985B" : "#1a1a1a",
                    color: canGenerate ? "#000" : "#555",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  Generar Presentación con Claude IA
                </button>

                <p className="text-[10px] text-center" style={{ color: "#374151" }}>
                  La generación toma aproximadamente 20-40 segundos. Claude creará 9 slides profesionales.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NuevaPresentacionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NuevaPresentacionForm />
    </Suspense>
  );
}
