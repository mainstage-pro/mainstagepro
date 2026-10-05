"use client";

import { upload } from "@vercel/blob/client";
import {
  Check, Circle, ExternalLink, FileDown, Hexagon, ImageOff, ImageUp, Loader2, Maximize, MapPin, MousePointer2,
  Pencil, Route, Ruler, Square, Type, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Capa, type ContenidoPlano, type ContextoSitePlan, type ObjetoPlano, type Punto,
  GROSOR_DEFAULT, LIENZO_SIN_FONDO, PALETA_COLORES, RELLENO_DEFAULT, TAMANO_PIN_DEFAULT,
  TAMANO_TEXTO_DEFAULT, asignarClaves, calcularEscala, esVisible, golpea, mover, nuevoIdCapa,
  nuevoIdObjeto, parsearContenido, radioDe,
} from "@/lib/site-plan";
import { BarraDeEscala, CapaDeObjetos } from "./dibujo";
import PanelCapas from "./PanelCapas";
import PanelPropiedades from "./PanelPropiedades";
import SelectorIcono from "./SelectorIcono";

export type PlanInicial = {
  id: string;
  nombre: string;
  fondoUrl: string | null;
  fondoAncho: number | null;
  fondoAlto: number | null;
  escalaMPorPx: number | null;
  contenido: string | null;
};

type Herramienta = "SELECCION" | "ZONA" | "RECT" | "CIRCULO" | "LIBRE" | "RUTA" | "PIN" | "TEXTO" | "ESCALA";

type Borrador =
  | { modo: "POLI"; ruta: boolean; puntos: Punto[]; cursor: Punto }
  | { modo: "CAJA"; circulo: boolean; a: Punto; b: Punto }
  | { modo: "LIBRE"; puntos: Punto[] }
  | { modo: "ESCALA"; a: Punto; b: Punto | null }
  | null;

type Arrastre =
  | { tipo: "PAN"; sx: number; sy: number; vx: number; vy: number }
  | { tipo: "MOVER"; id: string; prev: Punto }
  | { tipo: "VERTICE"; id: string; i: number }
  | null;

const HERRAMIENTAS: { clave: Herramienta; Icono: typeof MousePointer2; titulo: string; tecla: string }[] = [
  { clave: "SELECCION", Icono: MousePointer2, titulo: "Seleccionar y mover", tecla: "V" },
  { clave: "ZONA", Icono: Hexagon, titulo: "Área libre: clic por vértice, doble clic para cerrar", tecla: "A" },
  { clave: "RECT", Icono: Square, titulo: "Área rectangular", tecla: "R" },
  { clave: "CIRCULO", Icono: Circle, titulo: "Área circular", tecla: "C" },
  { clave: "LIBRE", Icono: Pencil, titulo: "Trazo a mano alzada", tecla: "D" },
  { clave: "RUTA", Icono: Route, titulo: "Ruta recta: clic por punto, doble clic para terminar", tecla: "L" },
  { clave: "PIN", Icono: MapPin, titulo: "Punto con icono", tecla: "P" },
  { clave: "TEXTO", Icono: Type, titulo: "Texto suelto", tecla: "T" },
  { clave: "ESCALA", Icono: Ruler, titulo: "Calibrar la escala del plano", tecla: "E" },
];

/** Shift fuerza el segmento a horizontal, vertical o 45°. */
function alinear(desde: Punto, hasta: Punto): Punto {
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  const paso = Math.PI / 4;
  const ang = Math.round(Math.atan2(dy, dx) / paso) * paso;
  const largo = Math.hypot(dx, dy);
  return { x: desde.x + largo * Math.cos(ang), y: desde.y + largo * Math.sin(ang) };
}

export default function SitePlanEditor({ plan, pdfHref, publicoHref }: {
  plan: PlanInicial;
  pdfHref: string;
  publicoHref: string;
}) {
  const inicial = useMemo(() => parsearContenido(plan.contenido), [plan.contenido]);

  const [capas, setCapas] = useState<Capa[]>(inicial.capas);
  const [objetos, setObjetos] = useState<ObjetoPlano[]>(inicial.objetos);
  const [capaActiva, setCapaActiva] = useState(inicial.capas[0]?.id ?? "cp_areas");
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const [herramienta, setHerramienta] = useState<Herramienta>("SELECCION");
  const [iconoActivo, setIconoActivo] = useState("BANOS");
  const [borrador, setBorrador] = useState<Borrador>(null);
  const [arrastre, setArrastre] = useState<Arrastre>(null);

  const [fondo, setFondo] = useState({
    url: plan.fondoUrl,
    ancho: plan.fondoAncho ?? LIENZO_SIN_FONDO.ancho,
    alto: plan.fondoAlto ?? LIENZO_SIN_FONDO.alto,
  });
  const [escala, setEscala] = useState<number | null>(plan.escalaMPorPx);
  const [nombre, setNombre] = useState(plan.nombre);
  const [subiendo, setSubiendo] = useState(false);
  const [pidiendoMetros, setPidiendoMetros] = useState(false);
  const [metrosTexto, setMetrosTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Lo que el show ya sabe, para que la ficha de un elemento no lo vuelva a
  // preguntar. Si falla, la ficha se llena a mano y el editor no se entera.
  const [contexto, setContexto] = useState<ContextoSitePlan | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/site-planes/${plan.id}/contexto`)
      .then(r => (r.ok ? (r.json() as Promise<ContextoSitePlan>) : null))
      .then(d => {
        if (vivo) setContexto(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [plan.id]);

  const [vista, setVista] = useState({ x: 0, y: 0, k: 1 });
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const cajaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const historial = useRef<ContenidoPlano[]>([]);
  const estadoRef = useRef<ContenidoPlano>({ capas, objetos });
  const primerGuardado = useRef(true);

  estadoRef.current = { capas, objetos };
  const unidad = 1 / vista.k;

  // ─── Encuadre ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const ro = new ResizeObserver(([entrada]) => {
      setTam({ w: entrada.contentRect.width, h: entrada.contentRect.height });
    });
    ro.observe(caja);
    return () => ro.disconnect();
  }, []);

  const encuadrar = useCallback(() => {
    if (!tam.w || !tam.h) return;
    const k = Math.min(tam.w / fondo.ancho, tam.h / fondo.alto) * 0.94;
    setVista({ k, x: (tam.w - fondo.ancho * k) / 2, y: (tam.h - fondo.alto * k) / 2 });
  }, [fondo.ancho, fondo.alto, tam.w, tam.h]);

  // Reencuadra cuando cambia la imagen de fondo, no cuando cambia el tamaño de la
  // ventana: ahí el usuario ya eligió a dónde estaba mirando.
  useEffect(() => {
    if (tam.w && tam.h) encuadrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondo.url, fondo.ancho, fondo.alto, tam.w > 0, tam.h > 0]);

  // Wheel va por addEventListener porque React lo registra pasivo y no dejaría
  // cancelar el scroll de la página al hacer zoom sobre el plano.
  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const r = caja!.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      setVista(v => {
        const k = Math.min(40, Math.max(0.02, v.k * Math.exp(-e.deltaY * 0.0014)));
        return { k, x: sx - ((sx - v.x) / v.k) * k, y: sy - ((sy - v.y) / v.k) * k };
      });
    }
    caja.addEventListener("wheel", onWheel, { passive: false });
    return () => caja.removeEventListener("wheel", onWheel);
  }, []);

  function zoomPorBoton(factor: number) {
    setVista(v => {
      const k = Math.min(40, Math.max(0.02, v.k * factor));
      return { k, x: tam.w / 2 - ((tam.w / 2 - v.x) / v.k) * k, y: tam.h / 2 - ((tam.h / 2 - v.y) / v.k) * k };
    });
  }

  const aImagen = useCallback(
    (e: { clientX: number; clientY: number }): Punto => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: (e.clientX - r.left - vista.x) / vista.k, y: (e.clientY - r.top - vista.y) / vista.k };
    },
    [vista],
  );

  // ─── Edición ───────────────────────────────────────────────────────────────

  const marcar = useCallback(() => {
    historial.current.push({
      capas: estadoRef.current.capas.map(c => ({ ...c })),
      objetos: estadoRef.current.objetos.map(o => ({ ...o, puntos: o.puntos.map(p => ({ ...p })) })),
    });
    if (historial.current.length > 60) historial.current.shift();
  }, []);

  const deshacer = useCallback(() => {
    const previo = historial.current.pop();
    if (!previo) return;
    setCapas(previo.capas);
    setObjetos(previo.objetos);
    setSeleccion(null);
    setBorrador(null);
  }, []);

  const agregar = useCallback(
    (o: ObjetoPlano) => {
      marcar();
      setObjetos(prev => [...prev, o]);
      setSeleccion(o.id);
    },
    [marcar],
  );

  const cambiarObjeto = useCallback((id: string, parcial: Partial<ObjetoPlano>) => {
    setObjetos(prev => prev.map(o => (o.id === id ? { ...o, ...parcial } : o)));
  }, []);

  function nuevoObjeto(tipo: ObjetoPlano["tipo"], puntos: Punto[], extra: Partial<ObjetoPlano> = {}): ObjetoPlano {
    return { id: nuevoIdObjeto(), capaId: capaActiva, tipo, etiqueta: "", puntos, ...extra };
  }

  const numerarClaves = useCallback(() => {
    marcar();
    setObjetos(prev => asignarClaves(prev, estadoRef.current.capas));
  }, [marcar]);

  const borrarSeleccion = useCallback(() => {
    if (!seleccion) return;
    marcar();
    setObjetos(prev => prev.filter(o => o.id !== seleccion));
    setSeleccion(null);
  }, [seleccion, marcar]);

  // ─── Puntero ───────────────────────────────────────────────────────────────

  const objetosVisibles = useMemo(() => objetos.filter(o => esVisible(o, capas)), [objetos, capas]);
  const sel = objetos.find(o => o.id === seleccion) ?? null;

  function cerrarPoli(b: Extract<Borrador, { modo: "POLI" }>) {
    if (b.ruta) {
      if (b.puntos.length >= 2) agregar(nuevoObjeto("TRAZO", b.puntos, { grosor: GROSOR_DEFAULT }));
    } else if (b.puntos.length >= 3) {
      agregar(nuevoObjeto("ZONA", b.puntos, { relleno: RELLENO_DEFAULT }));
    }
    setBorrador(null);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 1 || e.button === 2) return;
    const p = aImagen(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);

    switch (herramienta) {
      case "SELECCION": {
        const tol = 6 * unidad;
        if (sel) {
          const i = sel.puntos.findIndex(v => Math.hypot(v.x - p.x, v.y - p.y) <= 7 * unidad);
          if (i >= 0) {
            marcar();
            setArrastre({ tipo: "VERTICE", id: sel.id, i });
            return;
          }
        }
        const bloqueadas = new Set(capas.filter(c => c.bloqueada).map(c => c.id));
        const encontrado = [...objetosVisibles].reverse().find(o => !bloqueadas.has(o.capaId) && golpea(o, p, tol));
        if (encontrado) {
          setSeleccion(encontrado.id);
          marcar();
          setArrastre({ tipo: "MOVER", id: encontrado.id, prev: p });
        } else {
          setSeleccion(null);
          setArrastre({ tipo: "PAN", sx: e.clientX, sy: e.clientY, vx: vista.x, vy: vista.y });
        }
        return;
      }
      case "ZONA":
      case "RUTA": {
        const ruta = herramienta === "RUTA";
        setBorrador(b => {
          if (b?.modo !== "POLI") return { modo: "POLI", ruta, puntos: [p], cursor: p };
          const primero = b.puntos[0];
          if (!ruta && b.puntos.length >= 3 && Math.hypot(primero.x - p.x, primero.y - p.y) <= 10 * unidad) {
            agregar(nuevoObjeto("ZONA", b.puntos, { relleno: RELLENO_DEFAULT }));
            return null;
          }
          const ultimo = b.puntos[b.puntos.length - 1];
          return { ...b, puntos: [...b.puntos, e.shiftKey ? alinear(ultimo, p) : p], cursor: p };
        });
        return;
      }
      case "RECT":
      case "CIRCULO":
        setBorrador({ modo: "CAJA", circulo: herramienta === "CIRCULO", a: p, b: p });
        return;
      case "LIBRE":
        setBorrador({ modo: "LIBRE", puntos: [p] });
        return;
      case "PIN":
        agregar(nuevoObjeto("PIN", [p], { icono: iconoActivo, tamano: TAMANO_PIN_DEFAULT }));
        setHerramienta("SELECCION");
        return;
      case "TEXTO":
        agregar(nuevoObjeto("TEXTO", [p], { etiqueta: "Texto", tamano: TAMANO_TEXTO_DEFAULT }));
        setHerramienta("SELECCION");
        return;
      case "ESCALA":
        setBorrador(b => {
          if (b?.modo !== "ESCALA" || b.b) return { modo: "ESCALA", a: p, b: null };
          setPidiendoMetros(true);
          return { ...b, b: e.shiftKey ? alinear(b.a, p) : p };
        });
        return;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = aImagen(e);

    if (arrastre?.tipo === "PAN") {
      setVista(v => ({ ...v, x: arrastre.vx + (e.clientX - arrastre.sx), y: arrastre.vy + (e.clientY - arrastre.sy) }));
      return;
    }
    if (arrastre?.tipo === "MOVER") {
      const dx = p.x - arrastre.prev.x;
      const dy = p.y - arrastre.prev.y;
      setObjetos(prev => prev.map(o => (o.id === arrastre.id ? mover(o, dx, dy) : o)));
      setArrastre({ ...arrastre, prev: p });
      return;
    }
    if (arrastre?.tipo === "VERTICE") {
      setObjetos(prev =>
        prev.map(o => (o.id === arrastre.id ? { ...o, puntos: o.puntos.map((v, i) => (i === arrastre.i ? p : v)) } : o)),
      );
      return;
    }

    if (!borrador) return;
    if (borrador.modo === "POLI") setBorrador({ ...borrador, cursor: e.shiftKey ? alinear(borrador.puntos[borrador.puntos.length - 1], p) : p });
    else if (borrador.modo === "CAJA") setBorrador({ ...borrador, b: p });
    else if (borrador.modo === "LIBRE") {
      const ultimo = borrador.puntos[borrador.puntos.length - 1];
      // Se descartan los puntos casi encimados: a mano alzada el pulso genera
      // cientos por segundo y el documento crece sin que el trazo se vea mejor.
      if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) > 3 * unidad) setBorrador({ ...borrador, puntos: [...borrador.puntos, p] });
    }
  }

  function onPointerUp() {
    setArrastre(null);
    if (borrador?.modo === "CAJA") {
      const { a, b, circulo } = borrador;
      if (circulo) {
        if (radioDe([a, b]) > 4 * unidad) agregar(nuevoObjeto("CIRCULO", [a, b], { relleno: RELLENO_DEFAULT }));
      } else if (Math.abs(b.x - a.x) > 4 * unidad && Math.abs(b.y - a.y) > 4 * unidad) {
        agregar(
          nuevoObjeto("ZONA", [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }], {
            relleno: RELLENO_DEFAULT,
          }),
        );
      }
      setBorrador(null);
      setHerramienta("SELECCION");
    } else if (borrador?.modo === "LIBRE") {
      if (borrador.puntos.length >= 2) agregar(nuevoObjeto("TRAZO", borrador.puntos, { grosor: GROSOR_DEFAULT }));
      setBorrador(null);
    }
  }

  function onDoubleClick() {
    if (borrador?.modo === "POLI") cerrarPoli(borrador);
  }

  // ─── Teclado ───────────────────────────────────────────────────────────────

  // El atajo se despacha por ref: el listener se registra una vez pero tiene que
  // cerrar el polígono con el estado de ahora, no con el del primer render.
  const terminarRef = useRef<() => void>(() => {});
  terminarRef.current = () => {
    if (borrador?.modo === "POLI") cerrarPoli(borrador);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const foco = document.activeElement?.tagName;
      if (foco === "INPUT" || foco === "TEXTAREA" || foco === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        deshacer();
        return;
      }
      if (e.key === "Escape") {
        setBorrador(null);
        setSeleccion(null);
        return;
      }
      if (e.key === "Enter") {
        terminarRef.current();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        borrarSeleccion();
        return;
      }
      const h = HERRAMIENTAS.find(t => t.tecla === e.key.toUpperCase());
      if (h) {
        setHerramienta(h.clave);
        setBorrador(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deshacer, borrarSeleccion]);

  // ─── Persistencia ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (primerGuardado.current) {
      primerGuardado.current = false;
      return;
    }
    setGuardando(true);
    const t = setTimeout(async () => {
      await fetch(`/api/site-planes/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: JSON.stringify({ capas, objetos }) }),
      });
      setGuardando(false);
    }, 900);
    return () => clearTimeout(t);
  }, [capas, objetos, plan.id]);

  async function guardarAjuste(parcial: Record<string, unknown>) {
    await fetch(`/api/site-planes/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parcial),
    });
  }

  async function subirFondo(file: File) {
    setSubiendo(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/site-planes/fondo" });
      const img = new window.Image();
      img.src = blob.url;
      await img.decode();
      setFondo({ url: blob.url, ancho: img.naturalWidth, alto: img.naturalHeight });
      // La escala vieja medía otra imagen: dejarla puesta mentiría en cada área.
      setEscala(null);
      await guardarAjuste({
        fondoUrl: blob.url,
        fondoAncho: img.naturalWidth,
        fondoAlto: img.naturalHeight,
        escalaMPorPx: null,
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarFondo() {
    if (!confirm("¿Quitar la imagen de fondo? Lo trazado se queda; solo desaparece la foto.")) return;
    setFondo({ url: null, ancho: LIENZO_SIN_FONDO.ancho, alto: LIENZO_SIN_FONDO.alto });
    // La escala se midió sobre esa imagen: sin ella, cada área sería un invento.
    setEscala(null);
    // El archivo en Blob se queda: una plantilla de venue y sus copias comparten
    // la misma URL, y borrarlo dejaría a los otros planos sin fondo.
    await guardarAjuste({ fondoUrl: null, fondoAncho: null, fondoAlto: null, escalaMPorPx: null });
  }

  function confirmarEscala() {
    const metros = Number(metrosTexto.replace(",", "."));
    if (borrador?.modo !== "ESCALA" || !borrador.b) return;
    const nueva = calcularEscala(borrador.a, borrador.b, metros);
    if (nueva) {
      setEscala(nueva);
      void guardarAjuste({ escalaMPorPx: nueva });
    }
    setPidiendoMetros(false);
    setMetrosTexto("");
    setBorrador(null);
    setHerramienta("SELECCION");
  }

  // ─── Capas ─────────────────────────────────────────────────────────────────

  function agregarCapa() {
    const id = nuevoIdCapa();
    marcar();
    setCapas(prev => [
      ...prev,
      { id, nombre: `Capa ${prev.length + 1}`, color: PALETA_COLORES[prev.length % PALETA_COLORES.length], visible: true, bloqueada: false },
    ]);
    setCapaActiva(id);
  }

  function borrarCapa(id: string) {
    if (capas.length <= 1) return;
    marcar();
    setCapas(prev => prev.filter(c => c.id !== id));
    setObjetos(prev => prev.filter(o => o.capaId !== id));
    if (capaActiva === id) setCapaActiva(capas.find(c => c.id !== id)!.id);
  }

  function ordenar(dir: "FRENTE" | "ATRAS") {
    if (!sel) return;
    marcar();
    setObjetos(prev => {
      const resto = prev.filter(o => o.id !== sel.id);
      return dir === "FRENTE" ? [...resto, sel] : [sel, ...resto];
    });
  }

  function duplicar() {
    if (!sel) return;
    const copia = { ...mover(sel, 20, 20), id: nuevoIdObjeto() };
    agregar(copia);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const previo = borrador;
  const cursorLienzo =
    herramienta === "SELECCION" ? (arrastre?.tipo === "PAN" ? "grabbing" : "default") : "crosshair";

  return (
    <div className="flex flex-col h-[calc(100dvh-230px)] min-h-[560px]">
      {/* Barra superior */}
      <div className="flex items-center gap-2 flex-wrap px-1 pb-2">
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => void guardarAjuste({ nombre: nombre.trim() || "Site plan" })}
          className="ms-input-inline w-40 text-[13px]"
          placeholder="Nombre del plano"
        />

        <div className="flex items-center gap-0.5 ms-card-inset p-0.5 rounded-lg">
          {HERRAMIENTAS.map(({ clave, Icono, titulo, tecla }) => (
            <button
              key={clave}
              type="button"
              title={`${titulo}  (${tecla})`}
              onClick={() => {
                setHerramienta(clave);
                setBorrador(null);
              }}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                herramienta === clave ? "bg-[#B3985B] text-black" : "text-[#888] hover:text-[#ddd] hover:bg-[#1a1a1a]"
              }`}
            >
              <Icono size={15} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => zoomPorBoton(1.25)} className="ms-btn-icon" title="Acercar">
            <ZoomIn size={15} />
          </button>
          <button type="button" onClick={() => zoomPorBoton(0.8)} className="ms-btn-icon" title="Alejar">
            <ZoomOut size={15} />
          </button>
          <button type="button" onClick={encuadrar} className="ms-btn-icon" title="Encuadrar">
            <Maximize size={15} />
          </button>
          <button type="button" onClick={deshacer} className="ms-btn-icon" title="Deshacer (⌘Z)">
            <Undo2 size={15} />
          </button>
        </div>

        <label className="ms-btn-secondary cursor-pointer flex items-center gap-1.5">
          {subiendo ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
          {fondo.url ? "Cambiar fondo" : "Subir fondo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void subirFondo(f);
              e.target.value = "";
            }}
          />
        </label>

        {fondo.url ? (
          <button type="button" onClick={() => void quitarFondo()} className="ms-btn-icon" title="Quitar fondo">
            <ImageOff size={15} />
          </button>
        ) : null}

        <span className={`ms-badge ${escala ? "ms-badge-green" : "ms-badge-gray"}`}>
          {escala ? `1 px = ${(escala * 100).toFixed(1)} cm` : "Sin escala"}
        </span>

        <div className="flex-1" />

        <span className="ms-micro text-[#555] flex items-center gap-1">
          {guardando ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {guardando ? "Guardando" : "Guardado"}
        </span>
        <a href={publicoHref} target="_blank" rel="noreferrer" className="ms-btn-secondary flex items-center gap-1.5">
          <ExternalLink size={14} /> Compartir
        </a>
        <a href={pdfHref} target="_blank" rel="noreferrer" className="ms-btn-secondary flex items-center gap-1.5">
          <FileDown size={14} /> PDF
        </a>
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        {/* Panel izquierdo */}
        <div className="w-60 shrink-0 ms-card flex flex-col gap-3 p-3 min-h-0">
          {herramienta === "PIN" ? (
            <div className="min-h-0 flex flex-col">
              <p className="ms-section-label mb-1.5">Punto a colocar</p>
              <SelectorIcono valor={iconoActivo} onElegir={setIconoActivo} />
              <div className="ms-divider my-3" />
            </div>
          ) : null}
          <PanelCapas
            capas={capas}
            objetos={objetos}
            seleccion={seleccion}
            capaActiva={capaActiva}
            onSeleccionar={setSeleccion}
            onCapaActiva={setCapaActiva}
            onCambiarCapa={(id, parcial) => setCapas(prev => prev.map(c => (c.id === id ? { ...c, ...parcial } : c)))}
            onAgregarCapa={agregarCapa}
            onBorrarCapa={borrarCapa}
            onCambiarObjeto={cambiarObjeto}
          />
        </div>

        {/* Lienzo */}
        <div
          ref={cajaRef}
          className="flex-1 min-w-0 rounded-xl overflow-hidden border border-[#1a1a1a] bg-[#0b0b0b] relative"
          style={{ cursor: cursorLienzo }}
        >
          <svg
            ref={svgRef}
            className="w-full h-full touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
            onContextMenu={e => e.preventDefault()}
          >
            <g transform={`translate(${vista.x},${vista.y}) scale(${vista.k})`}>
              {fondo.url ? (
                <image href={fondo.url} x={0} y={0} width={fondo.ancho} height={fondo.alto} preserveAspectRatio="none" />
              ) : (
                <rect x={0} y={0} width={fondo.ancho} height={fondo.alto} fill="#141414" stroke="#262626" strokeWidth={unidad} />
              )}

              <CapaDeObjetos objetos={objetosVisibles} capas={capas} unidad={unidad} escala={escala} conMedidas />

              {/* Selección */}
              {sel && esVisible(sel, capas) ? (
                <g style={{ pointerEvents: "none" }}>
                  {sel.tipo === "ZONA" ? (
                    <polygon points={sel.puntos.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#fff" strokeWidth={3 * unidad} strokeDasharray={`${6 * unidad} ${4 * unidad}`} />
                  ) : null}
                  {sel.tipo === "TRAZO" ? (
                    <polyline points={sel.puntos.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#fff" strokeWidth={2 * unidad} strokeDasharray={`${6 * unidad} ${4 * unidad}`} />
                  ) : null}
                  {sel.tipo === "CIRCULO" ? (
                    <circle cx={sel.puntos[0].x} cy={sel.puntos[0].y} r={radioDe(sel.puntos)} fill="none" stroke="#fff" strokeWidth={3 * unidad} strokeDasharray={`${6 * unidad} ${4 * unidad}`} />
                  ) : null}
                  {sel.puntos.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5 * unidad} fill="#fff" stroke="#B3985B" strokeWidth={2 * unidad} />
                  ))}
                </g>
              ) : null}

              {/* Lo que se está dibujando */}
              {previo?.modo === "POLI" ? (
                <g style={{ pointerEvents: "none" }}>
                  <polyline
                    points={[...previo.puntos, previo.cursor].map(p => `${p.x},${p.y}`).join(" ")}
                    fill={previo.ruta ? "none" : "#B3985B22"}
                    stroke="#B3985B"
                    strokeWidth={2 * unidad}
                    strokeDasharray={`${6 * unidad} ${4 * unidad}`}
                  />
                  {previo.puntos.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4 * unidad} fill="#B3985B" />
                  ))}
                </g>
              ) : null}

              {previo?.modo === "CAJA" ? (
                previo.circulo ? (
                  <circle cx={previo.a.x} cy={previo.a.y} r={radioDe([previo.a, previo.b])} fill="#B3985B22" stroke="#B3985B" strokeWidth={2 * unidad} />
                ) : (
                  <rect
                    x={Math.min(previo.a.x, previo.b.x)}
                    y={Math.min(previo.a.y, previo.b.y)}
                    width={Math.abs(previo.b.x - previo.a.x)}
                    height={Math.abs(previo.b.y - previo.a.y)}
                    fill="#B3985B22"
                    stroke="#B3985B"
                    strokeWidth={2 * unidad}
                  />
                )
              ) : null}

              {previo?.modo === "LIBRE" ? (
                <polyline points={previo.puntos.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#B3985B" strokeWidth={GROSOR_DEFAULT} strokeLinecap="round" />
              ) : null}

              {previo?.modo === "ESCALA" ? (
                <g style={{ pointerEvents: "none" }}>
                  <line
                    x1={previo.a.x}
                    y1={previo.a.y}
                    x2={(previo.b ?? previo.a).x}
                    y2={(previo.b ?? previo.a).y}
                    stroke="#2DD4BF"
                    strokeWidth={3 * unidad}
                  />
                  <circle cx={previo.a.x} cy={previo.a.y} r={5 * unidad} fill="#2DD4BF" />
                  {previo.b ? <circle cx={previo.b.x} cy={previo.b.y} r={5 * unidad} fill="#2DD4BF" /> : null}
                </g>
              ) : null}
            </g>

            {/* Barra de escala: anclada a la esquina, fuera del zoom. La escala se
                divide entre el acercamiento para que mida píxeles de pantalla. */}
            {tam.h ? (
              <g transform={`translate(16, ${tam.h - 14})`}>
                <BarraDeEscala escala={escala ? escala / vista.k : null} anchoPx={180} />
              </g>
            ) : null}
          </svg>

          {herramienta === "ESCALA" && !pidiendoMetros ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 ms-card px-3 py-1.5 text-[12px] text-[#ccc]">
              Marca dos puntos de los que sepas la distancia real (una cancha, una fachada, la calle).
            </div>
          ) : null}
          {borrador?.modo === "POLI" ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 ms-card px-3 py-1.5 text-[12px] text-[#ccc]">
              Doble clic o Enter para {borrador.ruta ? "terminar la ruta" : "cerrar el área"} · Esc cancela · Shift alinea
            </div>
          ) : null}
        </div>

        {/* Panel derecho */}
        <div className="w-72 shrink-0 ms-card p-3 min-h-0 flex flex-col">
          {sel ? (
            <PanelPropiedades
              objeto={sel}
              capas={capas}
              escala={escala}
              contexto={contexto}
              onCambiar={parcial => cambiarObjeto(sel.id, parcial)}
              onBorrar={borrarSeleccion}
              onDuplicar={duplicar}
              onOrden={ordenar}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="ms-section-label">Sin selección</p>
              <p className="ms-meta">
                Elige una herramienta y dibuja sobre el plano. Haz clic en cualquier elemento para editarlo.
              </p>
              {!fondo.url ? (
                <p className="ms-meta">Sube la vista aérea o el plano del venue para trazar encima.</p>
              ) : !escala ? (
                <p className="ms-meta">Calibra la escala con la regla para que las áreas den metros.</p>
              ) : null}
              {objetos.length ? (
                <>
                  <div className="ms-divider my-1" />
                  <button type="button" onClick={numerarClaves} className="ms-btn-secondary text-[11px]">
                    Numerar claves de plano
                  </button>
                  <p className="ms-micro text-[#555]">
                    Reparte A-01, B-02… por capa a lo que no tenga clave. Las puestas a mano se respetan.
                  </p>
                </>
              ) : null}
              <div className="ms-divider my-1" />
              <p className="ms-micro text-[#555] leading-relaxed">
                V seleccionar · A área · R rectángulo · C círculo · D trazo libre · L ruta · P punto · T texto · E escala
                <br />
                Rueda para zoom · arrastrar con V para mover el plano · ⌘Z deshace
              </p>
            </div>
          )}
        </div>
      </div>

      {pidiendoMetros ? (
        <div className="ms-modal-overlay" onClick={() => setPidiendoMetros(false)}>
          <div className="ms-modal max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="ms-h2 mb-1">Calibrar escala</p>
            <p className="ms-meta mb-3">
              ¿Cuántos metros mide en la realidad la línea que acabas de marcar?
            </p>
            <input
              autoFocus
              className="ms-input"
              inputMode="decimal"
              placeholder="Por ejemplo 25"
              value={metrosTexto}
              onChange={e => setMetrosTexto(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmarEscala();
                if (e.key === "Escape") setPidiendoMetros(false);
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="ms-btn-ghost" onClick={() => setPidiendoMetros(false)}>
                Cancelar
              </button>
              <button type="button" className="ms-btn-primary" onClick={confirmarEscala}>
                Calibrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
