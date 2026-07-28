"use client";

import React, { useEffect, useRef, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, Pause } from "lucide-react";

const IDLE_MS = 2 * 60 * 1000; // 2 minutos de inactividad → pausa

interface SesionData {
  id: string;
  titulo: string;
  categoria: { slug: string; nombre: string; color: string } | null;
  evaluacion: { id: string } | null;
  versiones: { id: string; version: number }[];
}

function fmt(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TomarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const segRef = useRef(0);
  const pausadoRef = useRef(false);
  const ultimaActividad = useRef(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Cargar sesión ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/capacitacion/${id}`)
      .then((r) => r.json())
      .then((d: SesionData) => {
        setSesion(d);
        setLoading(false);
        // Registra el inicio (crea progreso en-progreso)
        fetch(`/api/capacitacion/${id}/progreso`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segundos: 0 }),
        });
      })
      .catch(() => setLoading(false));
  }, [id]);

  const registrarActividad = useCallback(() => {
    ultimaActividad.current = Date.now();
    if (pausadoRef.current) {
      // Reanuda automáticamente al detectar actividad
      pausadoRef.current = false;
      setPausado(false);
    }
  }, []);

  // ── Cronómetro + detección de inactividad ────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const inactivoMs = Date.now() - ultimaActividad.current;
      if (inactivoMs >= IDLE_MS && !pausadoRef.current) {
        pausadoRef.current = true;
        setPausado(true);
      }
      if (!pausadoRef.current) {
        segRef.current += 1;
        setSegundos(segRef.current);
      }
    }, 1000);

    // Latido: persiste el tiempo activo cada 30s
    const heartbeat = setInterval(() => {
      fetch(`/api/capacitacion/${id}/progreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segundos: segRef.current }),
      }).catch(() => {});
    }, 30000);

    const eventos = ["mousemove", "keydown", "mousedown", "scroll", "touchstart", "wheel"];
    eventos.forEach((e) => window.addEventListener(e, registrarActividad, { passive: true }));

    return () => {
      clearInterval(tick);
      clearInterval(heartbeat);
      eventos.forEach((e) => window.removeEventListener(e, registrarActividad));
    };
  }, [id, registrarActividad]);

  // Escucha actividad DENTRO del iframe (mismo origen).
  function engancharIframe() {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      ["mousemove", "keydown", "mousedown", "scroll", "touchstart"].forEach((e) =>
        doc.addEventListener(e, registrarActividad, { passive: true })
      );
    } catch { /* cross-origin: ignorar */ }
  }

  // ── Finalizar ────────────────────────────────────────────────────────────────
  async function finalizar() {
    if (finalizando) return;
    setFinalizando(true);
    const tieneEval = !!sesion?.evaluacion;
    await fetch(`/api/capacitacion/${id}/progreso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segundos: segRef.current, finalizar: true, completado: !tieneEval }),
    }).catch(() => {});

    if (tieneEval) router.push(`/capacitacion/${id}/evaluacion`);
    else router.push(sesion?.categoria ? `/capacitacion/area/${sesion.categoria.slug}` : "/capacitacion");
  }

  const vid = sesion?.versiones?.[0]?.id;
  const backHref = sesion?.categoria ? `/capacitacion/area/${sesion.categoria.slug}` : "/capacitacion";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#040404" }}>
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-4 px-4 h-14 shrink-0 border-b" style={{ background: "#0a0a0a", borderColor: "#1e1e1e" }}>
        <Link href={backHref} className="flex items-center gap-1.5 text-xs transition-colors hover:text-white" style={{ color: "#6b7280" }}>
          <ArrowLeft size={15} /> Salir
        </Link>
        <p className="text-sm font-medium text-white truncate flex-1 text-center px-2">{sesion?.titulo ?? "Cargando…"}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg" style={{ background: pausado ? "#1c1500" : "#111", color: pausado ? "#F59E0B" : "#c9a96a" }}>
            {pausado ? <Pause size={12} /> : <Clock size={12} />} {fmt(segundos)}
          </span>
          <button onClick={finalizar} disabled={finalizando || loading || !vid}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg disabled:opacity-40" style={{ background: "#c9a96a", color: "#000" }}>
            <CheckCircle2 size={14} /> {finalizando ? "Guardando…" : "Finalizar"}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm" style={{ color: "#6b7280" }}>Cargando capacitación…</p></div>
        ) : !vid ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p className="text-sm" style={{ color: "#9ca3af" }}>Esta capacitación todavía no tiene contenido publicado.</p>
            <Link href={backHref} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "#262626", color: "#c9a96a" }}>Volver</Link>
          </div>
        ) : (
          <iframe ref={iframeRef} onLoad={engancharIframe} src={`/api/capacitacion/${id}/versiones/${vid}/html`}
            className="w-full h-full border-0" title={sesion?.titulo} />
        )}
      </div>

      {/* Modal de inactividad */}
      {pausado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-sm rounded-2xl border p-7 text-center" style={{ background: "#111", borderColor: "#262626" }}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "#1c1500" }}>
              <Pause size={22} style={{ color: "#F59E0B" }} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Pausamos el tiempo</h2>
            <p className="text-sm mb-1" style={{ color: "#9ca3af" }}>Llevas más de 2 minutos sin actividad.</p>
            <p className="text-xs mb-6" style={{ color: "#6b7280" }}>El cronómetro está detenido en {fmt(segundos)}. ¿Sigues ahí?</p>
            <button onClick={registrarActividad} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#c9a96a", color: "#000" }}>
              Sí, sigo aquí — continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
