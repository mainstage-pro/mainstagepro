"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImagenPV {
  id: string;
  blobUrl: string;
  nombre: string;
  orden: number;
}

interface PresentacionVenta {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  htmlContent: string;
  imagenes: ImagenPV[];
  createdAt: string;
  updatedAt: string;
}

// ─── Estado config ────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  BORRADOR:  { label: "Borrador",  color: "#6b7280", bg: "#1a1a1a" },
  GENERADA:  { label: "Generada",  color: "#22c55e", bg: "#0a1f0a" },
  ENVIADA:   { label: "Enviada",   color: "#B3985B", bg: "#1a1200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; message: string; type: "success" | "error" | "info" }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = React.useCallback((message: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Presentacion Card ────────────────────────────────────────────────────────

function PresentacionCard({
  p,
  onDelete,
  onCopyLink,
}: {
  p: PresentacionVenta;
  onDelete: (id: string) => void;
  onCopyLink: (id: string) => void;
}) {
  const estado = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.BORRADOR;
  const hasHtml = p.htmlContent && p.htmlContent.length > 100;
  const preview = p.imagenes[0]?.blobUrl;

  return (
    <div
      className="relative rounded-xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#333]"
      style={{ background: "#111", borderColor: "#262626", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: "#B3985B", opacity: 0.8 }} />

      {/* Preview thumbnail */}
      {preview ? (
        <div className="w-full h-32 overflow-hidden bg-[#0a0a0a]">
          <img src={preview} alt={p.titulo} className="w-full h-full object-cover opacity-70" />
        </div>
      ) : (
        <div className="w-full h-32 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M8 10l3 3 5-5"/>
          </svg>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Estado */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: estado.bg, color: estado.color }}
          >
            {estado.label}
          </span>
          <span className="text-[10px]" style={{ color: "#4b5563" }}>
            {formatDate(p.createdAt)}
          </span>
        </div>

        {/* Título */}
        <div>
          <h3 className="text-sm font-semibold leading-snug text-white line-clamp-2">{p.titulo}</h3>
          <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "#6b7280" }}>
            {p.descripcion}
          </p>
        </div>

        {/* Fotos badge */}
        {p.imagenes.length > 0 && (
          <span className="text-[10px] font-medium" style={{ color: "#B3985B" }}>
            {p.imagenes.length} foto{p.imagenes.length !== 1 ? "s" : ""} adjunta{p.imagenes.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "#1e1e1e" }}>
          {hasHtml ? (
            <a
              href={`/api/presentaciones-venta/${p.id}/html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center transition-all duration-200"
              style={{ background: "#B3985B", color: "#000" }}
            >
              Ver presentación →
            </a>
          ) : (
            <Link
              href={`/ventas/presentaciones/nueva?edit=${p.id}`}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center transition-all duration-200"
              style={{ background: "#1a1a1a", color: "#6b7280" }}
            >
              Sin generar
            </Link>
          )}

          <button
            onClick={() => onCopyLink(p.id)}
            title="Copiar link"
            className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-[#B3985B] hover:text-[#B3985B]"
            style={{ borderColor: "#262626", color: "#4b5563" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>

          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${p.titulo}"?`)) onDelete(p.id);
            }}
            title="Eliminar"
            className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-red-800 hover:text-red-400"
            style={{ borderColor: "#262626", color: "#4b5563" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(179,152,91,0.08)", border: "1px solid rgba(179,152,91,0.15)" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
          <path d="M12 17v-2"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Sin presentaciones aún</h3>
      <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "#6b7280" }}>
        Crea tu primera presentación de venta. Sube fotos, describe el paquete y Claude genera la presentación en segundos.
      </p>
      <Link
        href="/ventas/presentaciones/nueva"
        id="btn-nueva-pv-empty"
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{ background: "#B3985B", color: "#000" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Crear primera presentación
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PresentacionesVentaPage() {
  const [presentaciones, setPresentaciones] = useState<PresentacionVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, show: showToast } = useToast();

  useEffect(() => {
    fetch("/api/presentaciones-venta")
      .then((r) => r.json())
      .then((data) => { setPresentaciones(data.presentaciones || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/presentaciones-venta/${id}`, { method: "DELETE" });
    setPresentaciones((prev) => prev.filter((p) => p.id !== id));
    showToast("Presentación eliminada", "success");
  }

  async function handleCopyLink(id: string) {
    const url = `${window.location.origin}/api/presentaciones-venta/${id}/html`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copiado al portapapeles", "success");
    } catch {
      showToast("No se pudo copiar el link", "error");
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Presentaciones de Venta</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Genera presentaciones profesionales con IA para tus paquetes y ofertas
            </p>
          </div>
          <Link
            href="/ventas/presentaciones/nueva"
            id="btn-nueva-presentacion-venta"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: "#B3985B", color: "#000" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva presentación
          </Link>
        </div>

        {/* Stats bar */}
        {!loading && presentaciones.length > 0 && (
          <div className="flex items-center gap-6 mb-6 px-4 py-3 rounded-xl border" style={{ background: "#111", borderColor: "#262626" }}>
            <div>
              <span className="text-lg font-bold" style={{ color: "#B3985B" }}>{presentaciones.length}</span>
              <span className="text-xs ml-1.5" style={{ color: "#6b7280" }}>total</span>
            </div>
            <div className="w-px h-4" style={{ background: "#262626" }} />
            <div>
              <span className="text-lg font-bold text-white">
                {presentaciones.filter((p) => p.estado === "GENERADA").length}
              </span>
              <span className="text-xs ml-1.5" style={{ color: "#6b7280" }}>generadas</span>
            </div>
            <div className="w-px h-4" style={{ background: "#262626" }} />
            <div>
              <span className="text-lg font-bold" style={{ color: "#22c55e" }}>
                {presentaciones.filter((p) => p.htmlContent && p.htmlContent.length > 100).length}
              </span>
              <span className="text-xs ml-1.5" style={{ color: "#6b7280" }}>listas</span>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: "#111" }} />
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && presentaciones.length === 0 && <EmptyState />}

        {!loading && presentaciones.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentaciones.map((p) => (
              <PresentacionCard
                key={p.id}
                p={p}
                onDelete={handleDelete}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
