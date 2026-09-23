"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, Share2, X } from "lucide-react";
import {
  abrirArchivo,
  compartirArchivo,
  esMovil,
  guardarArchivo,
  obtenerArchivo,
  puedeCompartirArchivo,
} from "@/lib/descargas";

export interface DescargaOpts {
  url: string;
  filename?: string;
  titulo?: string;
  init?: RequestInit;
}

interface DescargaCtx {
  descargar: (opts: DescargaOpts) => void;
  /** Para PDFs ya generados en el cliente (@react-pdf/renderer, canvas, etc.). */
  entregar: (blob: Blob, filename: string, titulo?: string) => void;
  ocupado: string | null;
}

const Ctx = createContext<DescargaCtx | null>(null);

type Estado =
  | { fase: "cargando"; titulo: string }
  | { fase: "listo"; titulo: string; file: File }
  | { fase: "error"; titulo: string; mensaje: string };

export function DescargaProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);
  const pendiente = useRef<DescargaOpts | null>(null);

  useEffect(() => setMontado(true), []);

  const traer = useCallback(async (opts: DescargaOpts, conHoja: boolean) => {
    const titulo = opts.titulo || opts.filename || "Documento";
    setOcupado(opts.filename ?? opts.url);
    if (conHoja) setEstado({ fase: "cargando", titulo });
    try {
      const file = await obtenerArchivo(opts.url, opts.filename, opts.init);
      if (conHoja) setEstado({ fase: "listo", titulo, file });
      else guardarArchivo(file);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido";
      if (conHoja) setEstado({ fase: "error", titulo, mensaje });
      else alert(`No se pudo descargar: ${mensaje}`);
    } finally {
      setOcupado(null);
    }
  }, []);

  // En móvil la hoja se abre de inmediato (mismo gesto del tap) y el archivo se
  // trae en segundo plano: así el tap de "Compartir" conserva la activación que
  // iOS exige para navigator.share, en vez de perderla durante el fetch.
  const descargar = useCallback((opts: DescargaOpts) => {
    const conHoja = esMovil();
    pendiente.current = opts;
    void traer(opts, conHoja);
  }, [traer]);

  const entregar = useCallback((blob: Blob, filename: string, titulo?: string) => {
    const file = new File([blob], filename, { type: blob.type || "application/pdf" });
    if (esMovil()) setEstado({ fase: "listo", titulo: titulo || filename, file });
    else guardarArchivo(file);
  }, []);

  const cerrar = useCallback(() => setEstado(null), []);

  const onCompartir = useCallback(async () => {
    if (estado?.fase !== "listo") return;
    try {
      const ok = await compartirArchivo(estado.file, estado.titulo);
      if (ok) cerrar();
    } catch {
      guardarArchivo(estado.file);
      cerrar();
    }
  }, [estado, cerrar]);

  const hoja =
    montado && estado
      ? createPortal(
          <div
            className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/70 backdrop-blur-sm p-3"
            onClick={cerrar}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] shadow-2xl"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#1a1a1a]">
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-base truncate">{estado.titulo}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {estado.fase === "cargando"
                      ? "Preparando documento…"
                      : estado.fase === "error"
                      ? estado.mensaje
                      : "Elige qué hacer con el documento"}
                  </p>
                </div>
                <button onClick={cerrar} className="text-gray-600 hover:text-white transition-colors shrink-0">
                  <X strokeWidth={2} className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-2">
                {estado.fase === "cargando" && (
                  <div className="flex items-center gap-3 px-3 py-6 text-sm text-gray-500">
                    <span className="w-4 h-4 rounded-full border-2 border-[#B3985B]/30 border-t-[#B3985B] animate-spin" />
                    Generando el archivo…
                  </div>
                )}

                {estado.fase === "error" && (
                  <button
                    onClick={() => pendiente.current && void traer(pendiente.current, true)}
                    className="w-full py-3 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B] text-sm font-semibold"
                  >
                    Reintentar
                  </button>
                )}

                {estado.fase === "listo" && (
                  <>
                    {puedeCompartirArchivo(estado.file) && (
                      <AccionHoja
                        icon={Share2}
                        label="Compartir"
                        desc="WhatsApp, correo, Archivos…"
                        destacado
                        onClick={onCompartir}
                      />
                    )}
                    <AccionHoja
                      icon={Download}
                      label="Descargar"
                      desc="Guardar en este dispositivo"
                      onClick={() => {
                        guardarArchivo(estado.file);
                        cerrar();
                      }}
                    />
                    <AccionHoja
                      icon={ExternalLink}
                      label="Abrir"
                      desc="Ver el documento ahora"
                      onClick={() => {
                        abrirArchivo(estado.file);
                        cerrar();
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <Ctx.Provider value={{ descargar, entregar, ocupado }}>
      {children}
      {hoja}
    </Ctx.Provider>
  );
}

function AccionHoja({
  icon: Icon,
  label,
  desc,
  destacado,
  onClick,
}: {
  icon: typeof Share2;
  label: string;
  desc: string;
  destacado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl border transition-colors ${
        destacado
          ? "bg-[#B3985B]/10 border-[#B3985B]/40 hover:bg-[#B3985B]/15"
          : "bg-[#141414] border-[#242424] hover:border-[#B3985B]/40 hover:bg-[#181818]"
      }`}
    >
      <Icon strokeWidth={1.75} className={`w-4 h-4 shrink-0 ${destacado ? "text-[#B3985B]" : "text-gray-500"}`} />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${destacado ? "text-[#B3985B]" : "text-white"}`}>{label}</span>
        <span className="block text-[11px] text-gray-500 truncate">{desc}</span>
      </span>
    </button>
  );
}

export function useDescarga() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDescarga requiere <DescargaProvider>");
  return ctx;
}
