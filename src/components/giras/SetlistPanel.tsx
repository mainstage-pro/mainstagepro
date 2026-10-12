"use client";

/**
 * Setlist de la gira y el de cada fecha. El repertorio se teclea una vez en el
 * base, que es el único lugar donde está todo lo de la gira y donde se decide a
 * qué fechas va cada renglón. El servidor siembra de ahí la copia de la noche
 * al abrir su pestaña: ahí se mueve el orden, se recorta por curfew o se mete
 * la canción del invitado sin tocarle el repertorio a las demás.
 *
 * Los renglones que no son canción (intro, presentación, pausa, cierre) van en
 * la misma lista: son los que parten el show en bloques, y el bloque se deriva
 * de dónde caen en vez de capturarse aparte.
 */

import { Fragment, useRef, useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";
import {
  agruparEnBloques,
  COLORES_BLOQUE,
  esCancion,
  fmtFechaCorta,
  fmtMinSeg,
  segmentarSetlist,
  segundosDesdeTexto,
  TIPOS_FILA_SETLIST,
  TIPO_FILA_SETLIST_LABEL,
} from "@/lib/giras";

export interface CancionFila {
  id: string;
  tipo: string;
  orden: number;
  titulo: string;
  artistaInvitado: string | null;
  nuevoBloque: boolean;
  bloqueNombre: string | null;
  bloqueColor: string | null;
  duracionSeg: number | null;
  tonalidad: string | null;
  bpm: number | null;
  conTrack: boolean;
  notasAudio: string | null;
  notasLuces: string | null;
  notasVideo: string | null;
  cambioInstrumento: string | null;
  notas: string | null;
  /// En qué fechas va el renglón. Vacío = en todas. Solo se captura en el base.
  soloEnShows: string[];
  /// El renglón del base del que nació esta copia; nulo si nació en la noche.
  origenId: string | null;
}

export interface ShowDeLaGira {
  id: string;
  fecha: Date | string;
  ciudad: string | null;
}

export interface SetlistFila {
  id: string;
  showId: string | null;
  nombre: string;
  esBase: boolean;
  duracionMin: number | null;
  notas: string | null;
  canciones: CancionFila[];
  show: { id: string; fecha: Date | string; ciudad: string | null } | null;
}

interface Props {
  giraId: string;
  alcance: "GIRA" | "SHOW";
  showId?: string;
  setlistsIniciales: SetlistFila[];
  /// Quién más se sube al escenario esa noche, para ofrecerlos al marcar de quién
  /// es la canción. Son los invitados de la fecha; un cover se escribe a mano.
  invitados?: { nombre: string; rol: string | null }[];
  /// Las fechas de la gira, para decidir en el base a cuáles va cada renglón.
  shows?: ShowDeLaGira[];
}

const DEMORA_GUARDADO = 700;

/// Un renglón que se arrastra. La manija es su propia celda y no el renglón
/// entero: la fila está llena de inputs, y hacerla arrastrable completa
/// impediría seleccionar el texto de un título para corregirlo.
function RenglonArrastrable({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <td className="ms-td">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[#444] hover:text-white transition-colors touch-none"
          title="Arrastrar para mover de lugar o de bloque"
        >
          ⠿
        </button>
      </td>
      {children}
    </tr>
  );
}

export default function SetlistPanel({ giraId, alcance, showId, setlistsIniciales, invitados, shows }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();

  const listaInvitados = `setlist-invitados-${showId ?? giraId}`;

  const [setlists, setSetlists] = useState<SetlistFila[]>(setlistsIniciales);
  const [abierto, setAbierto] = useState<string | null>(
    // En el show se abre directo el setlist de ese día: es el que se va a leer.
    setlistsIniciales.find((s) => s.showId === showId)?.id ?? setlistsIniciales[0]?.id ?? null,
  );
  const [trabajando, setTrabajando] = useState(false);
  // La fila que acaba de nacer como canción de otro artista: su celda de artista
  // toma el foco, que es el dato que falta por escribir.
  const [focoInvitado, setFocoInvitado] = useState<string | null>(null);
  // Qué bloque tiene la paleta abierta, por el id de su ancla. La paleta se
  // despliega en el mismo renglón y no flotando: la tabla va dentro de un
  // contenedor con scroll horizontal, que recortaría cualquier popover.
  const [paleta, setPaleta] = useState<string | null>(null);
  // Qué renglón tiene abierto el selector de fechas, por la misma razón que la
  // paleta: se despliega en un renglón propio debajo y no flotando.
  const [fechas, setFechas] = useState<string | null>(null);
  // La clave del bloque que se está arrastrando por su encabezado, con drag
  // nativo del navegador y no dnd-kit: así no compite con el arrastre de
  // canciones sueltas, que ya vive en su propio sensor.
  const [bloqueArrastrando, setBloqueArrastrando] = useState<string | null>(null);

  // Los temporizadores viven en un ref: si se recrearan en cada render, cada
  // tecla abriría un guardado nuevo en vez de reemplazar el pendiente.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const timers = timersRef.current;

  const sensores = useSensors(
    // Sin el umbral, un clic en la manija contaría como arrastre de cero píxeles
    // y se comería el foco de la celda.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Canciones ──────────────────────────────────────────────────────────────
  function editarCancion(setlistId: string, cancionId: string, campos: Partial<CancionFila>, inmediato = false) {
    setSetlists((prev) =>
      prev.map((s) =>
        s.id === setlistId
          ? { ...s, canciones: s.canciones.map((c) => (c.id === cancionId ? { ...c, ...campos } : c)) }
          : s,
      ),
    );

    const guardar = async () => {
      const res = await fetch(`/api/gira-setlist-canciones/${cancionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudo guardar la canción");
      }
    };

    const t = timers.get(cancionId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void guardar();
      return;
    }
    timers.set(cancionId, setTimeout(() => void guardar(), DEMORA_GUARDADO));
  }

  async function agregarCancion(
    setlistId: string,
    tipo = "CANCION",
    extra: Record<string, unknown> = {},
  ): Promise<CancionFila | null> {
    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "", tipo, ...extra }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo agregar la canción");
      return null;
    }
    setSetlists((prev) => prev.map((s) => (s.id === setlistId ? { ...s, canciones: [...s.canciones, d.cancion] } : s)));
    return d.cancion as CancionFila;
  }

  /// La canción que no es del artista: la del invitado que se sube o el cover de
  /// esa noche. Nace igual que cualquier otra y lo único distinto es de quién es.
  async function agregarCancionDeOtro(setlistId: string) {
    const c = await agregarCancion(setlistId);
    if (c) setFocoInvitado(c.id);
  }

  /// El bloque nuevo nace marcado (nuevoBloque) y al final de la lista; se
  /// arrastra a donde debe abrir la tanda. Ya no hace falta una pausa que lo
  /// anuncie: el renglón que abre el bloque puede ser cualquier tipo.
  async function agregarBloque(setlistId: string) {
    await agregarCancion(setlistId, "CANCION", { nuevoBloque: true });
  }

  async function reordenar(setlistId: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const previo = setlists;
    const s = previo.find((x) => x.id === setlistId);
    if (!s) return;

    const desde0 = s.canciones.findIndex((c) => c.id === active.id);
    if (desde0 < 0) return;
    const activaOriginal = s.canciones[desde0];

    // Si la fila que se arrastra abre bloque, al irse deja al resto de su
    // tanda sin ancla: la fila que le seguía se promueve para que esas
    // canciones no se fundan solas con el bloque anterior. Hereda el nombre y
    // el color, que antes vivían en la fila que se va.
    let base = s.canciones;
    const flagsNuevos = new Map<string, Partial<CancionFila>>();
    const siguienteOriginal = s.canciones[desde0 + 1];
    if (activaOriginal.nuevoBloque && siguienteOriginal && !siguienteOriginal.nuevoBloque) {
      const promocion = {
        nuevoBloque: true,
        bloqueNombre: activaOriginal.bloqueNombre,
        bloqueColor: activaOriginal.bloqueColor,
      };
      base = s.canciones.map((c) => (c.id === siguienteOriginal.id ? { ...c, ...promocion } : c));
      flagsNuevos.set(siguienteOriginal.id, promocion);
    }

    const desde = base.findIndex((c) => c.id === active.id);
    let hasta = base.findIndex((c) => c.id === over.id);
    if (hasta < 0) return;
    const activa = base[desde];

    // Arrastrar hacia arriba y soltar justo sobre la ancla de un bloque la
    // desplaza en vez de entrar a su tanda: se recorre un lugar más para que
    // la fila se sume al bloque (salvo que ella misma abra uno, que es el
    // arrastre para reubicar dónde empieza una tanda nueva).
    if (desde > hasta && !activa.nuevoBloque && base[hasta]?.nuevoBloque) hasta += 1;

    let finales = arrayMove(base, desde, hasta);

    // Si la activa abre bloque y cae a la mitad de una tanda ya existente (la
    // fila que le queda enseguida no es ancla, o sea no hay un límite ahí), se
    // funde como renglón normal en vez de partir esa tanda en dos: nada más
    // cambia de bloque salvo la fila que se está arrastrando.
    const idx = finales.findIndex((c) => c.id === active.id);
    const siguienteFinal = finales[idx + 1];
    if (finales[idx].nuevoBloque && siguienteFinal && !siguienteFinal.nuevoBloque) {
      finales = finales.map((c) => (c.id === active.id ? { ...c, nuevoBloque: false } : c));
      flagsNuevos.set(active.id as string, { nuevoBloque: false });
    }

    finales = finales.map((c, i) => ({ ...c, orden: i * 10 }));

    setSetlists((prev) => prev.map((x) => (x.id === setlistId ? { ...x, canciones: finales } : x)));

    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones/orden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: finales.map((c) => c.id) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el nuevo orden");
      setSetlists(previo);
      return;
    }

    if (flagsNuevos.size > 0) {
      const resultados = await Promise.all(
        [...flagsNuevos.entries()].map(([cancionId, campos]) =>
          fetch(`/api/gira-setlist-canciones/${cancionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(campos),
          }),
        ),
      );
      if (resultados.some((r) => !r.ok)) {
        toast.error("No se pudo guardar el cambio de bloque");
        setSetlists(previo);
      }
    }
  }

  /// Lo mismo que reordenar() pero moviendo un bloque entero —su encabezado más
  /// las filas que le siguen— de un jalón, para reubicar tandas completas sin
  /// arrastrar renglón por renglón.
  async function moverBloque(setlistId: string, claveOrigen: string, claveDestino: string) {
    if (claveOrigen === claveDestino) return;

    const previo = setlists;
    const s = previo.find((x) => x.id === setlistId);
    if (!s) return;

    const grupos = agruparEnBloques(s.canciones);
    const desde = grupos.findIndex((g) => g.clave === claveOrigen);
    const hasta = grupos.findIndex((g) => g.clave === claveDestino);
    if (desde < 0 || hasta < 0) return;

    const finales = arrayMove(grupos, desde, hasta)
      .flatMap((g) => g.filas)
      .map((c, i) => ({ ...c, orden: i * 10 }));

    setSetlists((prev) => prev.map((x) => (x.id === setlistId ? { ...x, canciones: finales } : x)));

    const res = await fetch(`/api/gira-setlists/${setlistId}/canciones/orden`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: finales.map((c) => c.id) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el nuevo orden");
      setSetlists(previo);
    }
  }

  async function quitarCancion(setlistId: string, cancion: CancionFila) {
    // El nombre y el color del bloque viven en la fila que lo abre (nuevoBloque),
    // sea canción o momento: quitarla se los lleva con ella y la tanda se funde
    // con la anterior. Sin aviso, el nombre se pierde en silencio.
    if (cancion.nuevoBloque && cancion.bloqueNombre?.trim()) {
      const ok = await confirmar({
        title: `Quitar «${esCancion(cancion.tipo) ? cancion.titulo || "sin título" : TIPO_FILA_SETLIST_LABEL[cancion.tipo] ?? cancion.tipo}»`,
        message: `Este renglón es el encabezado del bloque «${cancion.bloqueNombre}». Al quitarlo, esa tanda pierde el nombre y sus canciones se funden con el bloque anterior.`,
        confirmText: "Quitar de todos modos",
        danger: true,
      });
      if (!ok) return;
    }

    // Quitar de una noche un renglón que vino del base le cambia el alcance al
    // base, que es lo único que evita que la siembra lo regrese. Se avisa.
    if (alcance === "SHOW" && cancion.origenId) {
      const ok = await confirmar({
        title: `Quitar «${cancion.titulo || "sin título"}» de esta fecha`,
        message:
          "En el setlist base queda marcada como que no va en esta noche. Las demás fechas no se tocan y el renglón sigue en el repertorio de la gira.",
        confirmText: "Quitar de esta fecha",
      });
      if (!ok) return;
    }

    const res = await fetch(`/api/gira-setlist-canciones/${cancion.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar la canción");
      return;
    }
    setSetlists((prev) =>
      prev.map((s) => (s.id === setlistId ? { ...s, canciones: s.canciones.filter((c) => c.id !== cancion.id) } : s)),
    );
  }

  // ── A qué fechas va un renglón ─────────────────────────────────────────────
  const todasLasFechas = shows?.map((s) => s.id) ?? [];

  function alternarFecha(setlistId: string, c: CancionFila, idShow: string, marcado: boolean) {
    const actual = c.soloEnShows.length ? c.soloEnShows : todasLasFechas;
    const siguiente = marcado ? [...actual, idShow] : actual.filter((x) => x !== idShow);
    if (!siguiente.length) {
      toast.error("Si no va en ninguna fecha, quita el renglón del setlist.");
      return;
    }
    // Palomeadas todas se guarda vacío: así una fecha que se dé de alta después
    // hereda el renglón sin que nadie tenga que volver a abrir este selector.
    const valor = siguiente.length === todasLasFechas.length ? [] : siguiente;
    editarCancion(setlistId, c.id, { soloEnShows: valor }, true);
  }

  function etiquetaFechas(c: CancionFila) {
    if (!c.soloEnShows.length) return "Todas";
    if (c.soloEnShows.length === 1) {
      const s = shows?.find((x) => x.id === c.soloEnShows[0]);
      return s ? fmtFechaCorta(s.fecha) : "1 fecha";
    }
    return `${c.soloEnShows.length} fechas`;
  }

  /// Funciones planas y no componentes: declarados aquí adentro, un componente
  /// cambia de identidad en cada render y React le remontaría el selector
  /// abierto a media captura.
  function celdaFechas(c: CancionFila) {
    const todas = c.soloEnShows.length === 0;
    return (
      <td className="ms-td">
        <button
          onClick={() => setFechas(fechas === c.id ? null : c.id)}
          className={`ms-micro px-1.5 py-0.5 rounded-sm border transition-colors ${
            todas
              ? "border-[#1a1a1a] text-[#6b7280] hover:text-white"
              : "border-[#B3985B]/40 text-[#B3985B] hover:border-[#B3985B]"
          }`}
          title={todas ? "Va en todas las fechas de la gira" : "Solo va en algunas fechas"}
        >
          {etiquetaFechas(c)}
        </button>
      </td>
    );
  }

  function filaFechas(setlistId: string, c: CancionFila, columnas: number) {
    if (fechas !== c.id) return null;
    return (
      <tr className="bg-[#0d0d0d]">
        <td className="ms-td" colSpan={columnas}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-1">
            <span className="ms-micro text-[#9ca3af]">¿En qué fechas va «{c.titulo || "sin título"}»?</span>
            <label className="flex items-center gap-1.5 ms-micro text-white cursor-pointer">
              <input
                type="checkbox"
                checked={c.soloEnShows.length === 0}
                onChange={() => editarCancion(setlistId, c.id, { soloEnShows: [] }, true)}
                className="accent-[#B3985B] w-3.5 h-3.5"
              />
              Todas
            </label>
            {shows?.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 ms-micro text-[#9ca3af] cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.soloEnShows.length === 0 || c.soloEnShows.includes(s.id)}
                  onChange={(e) => alternarFecha(setlistId, c, s.id, e.target.checked)}
                  className="accent-[#B3985B] w-3.5 h-3.5"
                />
                {fmtFechaCorta(s.fecha)}
                {s.ciudad ? ` · ${s.ciudad}` : ""}
              </label>
            ))}
          </div>
        </td>
      </tr>
    );
  }

  // ── Setlists ───────────────────────────────────────────────────────────────
  function editarSetlist(id: string, campos: Partial<SetlistFila>, inmediato = false) {
    setSetlists((prev) => prev.map((s) => (s.id === id ? { ...s, ...campos } : s)));

    const guardar = async () => {
      const res = await fetch(`/api/gira-setlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "No se pudo guardar el setlist");
        return;
      }
      // Marcar el base desmarca al anterior: se refleja en pantalla sin recargar.
      if (campos.esBase) {
        setSetlists((prev) => prev.map((s) => (s.id === id ? s : { ...s, esBase: false })));
      }
    };

    const t = timers.get(id);
    if (t) clearTimeout(t);
    if (inmediato) {
      void guardar();
      return;
    }
    timers.set(id, setTimeout(() => void guardar(), DEMORA_GUARDADO));
  }

  async function crear() {
    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/setlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esBase: !setlists.some((s) => s.esBase) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo crear el setlist");
        return;
      }
      setSetlists((prev) => [...prev, d.setlist]);
      setAbierto(d.setlist.id);
      toast.success("Setlist creado");
    } finally {
      setTrabajando(false);
    }
  }

  /// El orden del base a todas las fechas. La siembra automática nunca mueve lo
  /// que ya está en una noche, así que reordenar el base no llega solo: esto es
  /// lo que lo baja, y de paso siembra la fecha que todavía no se había abierto.
  async function bajarOrden() {
    const ok = await confirmar({
      title: "Bajar el orden a todas las fechas",
      message: `Las ${todasLasFechas.length} fechas de la gira quedan en el orden de este base. Lo que se agregó en una noche —la canción del invitado, el cover— se queda pegado al renglón que hoy lo precede, y el resto de lo capturado en la fecha (tonos, cues, duraciones) no se toca.`,
      confirmText: "Bajar el orden",
    });
    if (!ok) return;

    setTrabajando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/setlists/orden-a-fechas`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo bajar el orden a las fechas");
        return;
      }
      toast.success(
        d.fechas === 0
          ? "Las fechas ya estaban en este orden"
          : `${d.fechas} ${d.fechas === 1 ? "fecha" : "fechas"} al orden del base · ${d.renglones} renglones movidos`,
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function quitarSetlist(s: SetlistFila) {
    const ok = await confirmar({
      title: "Quitar el setlist",
      message: `Se borran también sus ${s.canciones.length} canciones con sus notas de audio, luces y video. No se puede deshacer.`,
      confirmText: "Quitar setlist",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-setlists/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar el setlist");
      return;
    }
    setSetlists((prev) => prev.filter((x) => x.id !== s.id));
    toast.success("Setlist eliminado");
  }

  // En la fecha solo se ve el suyo: el base se lee y se edita en la gira, y
  // mostrarlo aquí editable le reescribiría el repertorio a las demás noches.
  const visibles = alcance === "SHOW" ? setlists.filter((s) => s.showId === showId) : setlists;

  return (
    <div className="space-y-3">
      {invitados?.length ? (
        <datalist id={listaInvitados}>
          {invitados.map((i) => (
            <option key={i.nombre} value={i.nombre} />
          ))}
        </datalist>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Setlist</h2>
          <p className="ms-subtitle mt-0.5">
            {alcance === "SHOW"
              ? "Lo que va esta noche. El base de la gira decide qué renglones llegan aquí; lo que cambies en esta tabla —orden, tono, cues— se queda en esta fecha."
              : "El repertorio completo de la gira. Cada renglón va a todas las fechas salvo que en la columna Fechas le marques en cuáles; las fechas se siembran de aquí al abrir su pestaña."}{" "}
            Arrastra un renglón de la manija para moverlo de lugar o de bloque; arrastra el ⠿⠿ del encabezado de un
            bloque para reubicar la tanda completa.
          </p>
        </div>
        {alcance === "GIRA" && (
          <div className="flex flex-wrap gap-2">
            {todasLasFechas.length > 0 && setlists.some((s) => s.esBase && s.canciones.length > 0) && (
              <button
                onClick={() => void bajarOrden()}
                disabled={trabajando}
                className="ms-btn-secondary disabled:opacity-50"
                title="Deja las fechas de la gira en el orden de este setlist base"
              >
                Bajar el orden a las fechas
              </button>
            )}
            <button onClick={() => void crear()} disabled={trabajando} className="ms-btn-secondary disabled:opacity-50">
              Setlist en blanco
            </button>
          </div>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            {alcance === "SHOW"
              ? "Esta fecha se quedó sin setlist. Recarga la pestaña y se vuelve a sembrar del base de la gira."
              : "Todavía no hay setlist. Crea el base de la gira y de ahí se siembra cada fecha."}
          </p>
        </div>
      ) : (
        visibles.map((s) => {
          const expandido = abierto === s.id;
          const segundos = s.canciones.reduce((t, c) => t + (c.duracionSeg ?? 0), 0);
          const segmentos = segmentarSetlist(s.canciones);
          const totalCanciones = s.canciones.filter((c) => esCancion(c.tipo)).length;
          const totalBloques = segmentos.length;
          // A qué fechas va un renglón se decide en el base y solo ahí: en la
          // noche la columna sobra, porque lo que se ve ya es lo que le toca.
          const verFechas = s.esBase && !s.showId && todasLasFechas.length > 0;
          const columnas = verFechas ? 16 : 15;

          return (
            <section key={s.id} className={`ms-card ${expandido ? "border-[#B3985B]/30" : ""}`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white truncate">
                    {s.nombre}
                    {s.esBase && <span className="ms-badge ms-badge-gold ml-2">Base de la gira</span>}
                    {s.show && (
                      <span className="ms-badge ms-badge-gray ml-2">
                        {fmtFechaCorta(s.show.fecha)} · {s.show.ciudad ?? "Sin ciudad"}
                      </span>
                    )}
                  </p>
                  <p className="ms-meta mt-0.5">
                    {totalCanciones} canciones
                    {totalBloques > 1 ? ` · ${totalBloques} bloques` : ""}
                    {segundos > 0 ? ` · ${Math.round(segundos / 60)} min cantados` : ""}
                    {s.duracionMin ? ` · ${s.duracionMin} min de slot` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {s.canciones.length > 0 && (
                    <BotonDocumentoGira
                      url={`/api/gira-setlists/${s.id}/escenario`}
                      label="PDF de escenario"
                    />
                  )}
                  <button
                    onClick={() => setAbierto(expandido ? null : s.id)}
                    className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                  >
                    {expandido ? "Cerrar" : "Abrir"}
                  </button>
                </div>
              </div>

              {expandido && (
                <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr] gap-3">
                    <div>
                      <label className="ms-label block mb-1.5">Nombre</label>
                      <input
                        value={s.nombre}
                        onChange={(e) => editarSetlist(s.id, { nombre: e.target.value })}
                        className="ms-input"
                      />
                    </div>
                    <div>
                      <label className="ms-label block mb-1.5">Slot (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={s.duracionMin ?? ""}
                        onChange={(e) =>
                          editarSetlist(s.id, { duracionMin: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        placeholder="ej. 90"
                        className="ms-input"
                      />
                    </div>
                    <div>
                      <label className="ms-label block mb-1.5">Notas del setlist</label>
                      <input
                        value={s.notas ?? ""}
                        onChange={(e) => editarSetlist(s.id, { notas: e.target.value })}
                        placeholder="ej. sin encore por curfew"
                        className="ms-input"
                      />
                    </div>
                  </div>

                  {alcance === "GIRA" && !s.showId && (
                    <label className="flex items-center gap-2 ms-meta cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.esBase}
                        onChange={(e) => editarSetlist(s.id, { esBase: e.target.checked }, true)}
                        className="accent-[#B3985B] w-4 h-4"
                      />
                      Es el setlist base de la gira (del que copian los shows)
                    </label>
                  )}

                  {s.canciones.length === 0 ? (
                    <p className="ms-meta">Sin canciones todavía.</p>
                  ) : (
                    <DndContext
                      sensors={sensores}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => void reordenar(s.id, e)}
                    >
                      <SortableContext items={s.canciones.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="ms-table-wrapper overflow-x-auto">
                      <table className={`${verFechas ? "min-w-[1930px]" : "min-w-[1790px]"} w-full`}>
                        <thead className="ms-thead">
                          <tr>
                            <th className="ms-th w-[30px]" />
                            <th className="ms-th w-[120px]">Tipo</th>
                            <th className="ms-th w-[40px]">#</th>
                            <th className="ms-th w-[240px]">Canción</th>
                            <th className="ms-th w-[160px]">De otro artista</th>
                            <th className="ms-th w-[90px]">Dura</th>
                            <th className="ms-th w-[80px]">Tono</th>
                            <th className="ms-th w-[70px]">BPM</th>
                            <th className="ms-th w-[60px]">Track</th>
                            <th className="ms-th w-[180px]">Audio</th>
                            <th className="ms-th w-[180px]">Luces</th>
                            <th className="ms-th w-[180px]">Video</th>
                            <th className="ms-th w-[160px]">Cambio de instrumento</th>
                            <th className="ms-th w-[220px]">Notas</th>
                            {verFechas && <th className="ms-th w-[110px]">Fechas</th>}
                            <th className="ms-th w-[40px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {segmentos.map((seg) => {
                            const totalCancionesBloque = seg.renglones.filter((r) => r.clase === "cancion").length;
                            const segundosBloque = seg.renglones.reduce((t, r) => t + (r.fila.duracionSeg ?? 0), 0);

                            return (
                              <Fragment key={seg.clave}>
                                <tr
                                  className={`bg-[#0d0d0d] ${bloqueArrastrando === seg.anclaId ? "opacity-40" : ""}`}
                                  onDragOver={(e) => {
                                    if (bloqueArrastrando) e.preventDefault();
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (bloqueArrastrando) void moverBloque(s.id, bloqueArrastrando, seg.anclaId);
                                    setBloqueArrastrando(null);
                                  }}
                                >
                                  <td className="ms-td" colSpan={columnas}>
                                    <span className="inline-flex items-center gap-2">
                                      <span
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "move";
                                          setBloqueArrastrando(seg.anclaId);
                                        }}
                                        onDragEnd={() => setBloqueArrastrando(null)}
                                        className="cursor-grab active:cursor-grabbing text-[#444] hover:text-white transition-colors select-none"
                                        title="Arrastrar para mover todo el bloque"
                                      >
                                        ⠿⠿
                                      </span>
                                      <button
                                        onClick={() => setPaleta(paleta === seg.anclaId ? null : seg.anclaId)}
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[11px] font-bold text-black"
                                        style={{ backgroundColor: seg.color }}
                                        title="Cambiar el color del bloque"
                                      >
                                        {seg.numero}
                                      </button>
                                      <input
                                        value={seg.nombre ?? ""}
                                        onChange={(e) => editarCancion(s.id, seg.anclaId, { bloqueNombre: e.target.value })}
                                        placeholder={`Bloque ${seg.numero}`}
                                        title="Cómo le dice el crew a esta tanda"
                                        className="ms-input-inline w-[200px] text-white"
                                      />
                                      {paleta === seg.anclaId ? (
                                        <span className="inline-flex items-center gap-1">
                                          {COLORES_BLOQUE.map((col) => (
                                            <button
                                              key={col}
                                              onClick={() => {
                                                editarCancion(s.id, seg.anclaId, { bloqueColor: col }, true);
                                                setPaleta(null);
                                              }}
                                              className={`w-5 h-5 rounded-sm ${
                                                seg.color === col ? "ring-2 ring-white ring-offset-1 ring-offset-[#0d0d0d]" : ""
                                              }`}
                                              style={{ backgroundColor: col }}
                                              title={col}
                                            />
                                          ))}
                                          <button
                                            onClick={() => {
                                              editarCancion(s.id, seg.anclaId, { bloqueColor: null }, true);
                                              setPaleta(null);
                                            }}
                                            className="ms-micro text-[#9ca3af] hover:text-white px-1"
                                            title="Volver al color que le toca por su número"
                                          >
                                            Automático
                                          </button>
                                        </span>
                                      ) : (
                                        <span className="ms-micro text-[#9ca3af]">
                                          {totalCancionesBloque} canciones
                                          {segundosBloque > 0 ? ` · ${Math.round(segundosBloque / 60)} min` : ""}
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                </tr>
                                {seg.renglones.map((r) => {
                                  const c = r.fila;

                                  /// El toggle que decide si esta fila abre su propia tanda: vive en la
                                  /// celda del tipo porque es la única columna que tienen en común la
                                  /// canción y el momento, y así no hace falta otra columna aparte.
                                  const toggleBloque = (
                                    <button
                                      onClick={() => editarCancion(s.id, c.id, { nuevoBloque: !c.nuevoBloque }, true)}
                                      className={`shrink-0 w-4 h-4 rounded-sm border text-[9px] leading-none flex items-center justify-center transition-colors ${
                                        c.nuevoBloque
                                          ? "border-[#B3985B] text-[#B3985B]"
                                          : "border-[#2a2a2a] text-[#444] hover:text-white hover:border-[#444]"
                                      }`}
                                      title={
                                        c.nuevoBloque
                                          ? "Quitar el inicio de bloque: se funde con la tanda anterior"
                                          : "Marcar como inicio de un bloque nuevo"
                                      }
                                    >
                                      ▸
                                    </button>
                                  );

                                  if (r.clase === "momento") {
                                    return (
                                      <Fragment key={c.id}>
                                      <RenglonArrastrable id={c.id} className="ms-tr align-top bg-[#121212]">
                                        <td className="ms-td">
                                          <div className="flex items-center gap-1">
                                            {toggleBloque}
                                            <select
                                              value={c.tipo}
                                              onChange={(e) => editarCancion(s.id, c.id, { tipo: e.target.value }, true)}
                                              className="ms-input-inline w-full"
                                            >
                                              {TIPOS_FILA_SETLIST.map((t) => (
                                                <option key={t} value={t}>
                                                  {TIPO_FILA_SETLIST_LABEL[t]}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </td>
                                        <td className="ms-td ms-micro text-[#555]">—</td>
                                        <td className="ms-td">
                                          <input
                                            value={c.titulo}
                                            onChange={(e) => editarCancion(s.id, c.id, { titulo: e.target.value })}
                                            placeholder="ej. Intro (video)"
                                            className="ms-input-inline w-full"
                                          />
                                        </td>
                                        <td className="ms-td">
                                          <input
                                            defaultValue={fmtMinSeg(c.duracionSeg)}
                                            onBlur={(e) =>
                                              editarCancion(
                                                s.id,
                                                c.id,
                                                { duracionSeg: segundosDesdeTexto(e.target.value) },
                                                true,
                                              )
                                            }
                                            placeholder="1:30"
                                            className="ms-input-inline w-full"
                                          />
                                        </td>
                                        <td className="ms-td" colSpan={9}>
                                          <input
                                            value={c.notas ?? ""}
                                            onChange={(e) => editarCancion(s.id, c.id, { notas: e.target.value })}
                                            placeholder="Qué pasa en este momento: video pregrabado, cambio de vestuario, presentación de la banda…"
                                            className="ms-input-inline w-full"
                                          />
                                        </td>
                                        {verFechas && celdaFechas(c)}
                                        <td className="ms-td text-right">
                                          <button
                                            onClick={() => void quitarCancion(s.id, c)}
                                            className="text-[#555] hover:text-red-400 transition-colors"
                                            title="Quitar momento"
                                          >
                                            ✕
                                          </button>
                                        </td>
                                      </RenglonArrastrable>
                                      {verFechas && filaFechas(s.id, c, columnas)}
                                      </Fragment>
                                    );
                                  }

                                  const posicion = r.posicion;
                                  return (
                                    <Fragment key={c.id}>
                                    <RenglonArrastrable id={c.id} className="ms-tr align-top">
                                      <td className="ms-td">
                                        <div className="flex items-center gap-1">
                                          {toggleBloque}
                                          <select
                                            value={c.tipo}
                                            onChange={(e) => editarCancion(s.id, c.id, { tipo: e.target.value }, true)}
                                            className="ms-input-inline w-full"
                                          >
                                            {TIPOS_FILA_SETLIST.map((t) => (
                                              <option key={t} value={t}>
                                                {TIPO_FILA_SETLIST_LABEL[t]}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </td>
                                      <td className="ms-td ms-micro tabular-nums">{posicion}</td>
                                      <td className="ms-td">
                                        <input
                                          value={c.titulo}
                                          onChange={(e) => editarCancion(s.id, c.id, { titulo: e.target.value })}
                                          placeholder="Título"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        {/* Vacío = la canción es del artista de la
                                            gira. Se escribe solo cuando no lo es. */}
                                        <input
                                          list={invitados?.length ? listaInvitados : undefined}
                                          value={c.artistaInvitado ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { artistaInvitado: e.target.value })}
                                          autoFocus={c.id === focoInvitado}
                                          placeholder="—"
                                          title="De quién es la canción si no es del artista: el invitado que la canta o el cover"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          defaultValue={fmtMinSeg(c.duracionSeg)}
                                          onBlur={(e) =>
                                            editarCancion(
                                              s.id,
                                              c.id,
                                              { duracionSeg: segundosDesdeTexto(e.target.value) },
                                              true,
                                            )
                                          }
                                          placeholder="3:45"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          value={c.tonalidad ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { tonalidad: e.target.value })}
                                          placeholder="Am"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          type="number"
                                          min={0}
                                          value={c.bpm ?? ""}
                                          onChange={(e) =>
                                            editarCancion(s.id, c.id, {
                                              bpm: e.target.value === "" ? null : Number(e.target.value),
                                            })
                                          }
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td text-center">
                                        <input
                                          type="checkbox"
                                          checked={c.conTrack}
                                          onChange={(e) => editarCancion(s.id, c.id, { conTrack: e.target.checked }, true)}
                                          className="accent-[#B3985B] w-4 h-4"
                                          title="Lleva track"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          value={c.notasAudio ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { notasAudio: e.target.value })}
                                          placeholder="…"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          value={c.notasLuces ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { notasLuces: e.target.value })}
                                          placeholder="…"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          value={c.notasVideo ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { notasVideo: e.target.value })}
                                          placeholder="…"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        <input
                                          value={c.cambioInstrumento ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { cambioInstrumento: e.target.value })}
                                          placeholder="ej. acústica"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      <td className="ms-td">
                                        {/* Lo que no es de una disciplina sola:
                                            de qué va la canción, con quién sale,
                                            qué pidió el artista para ese momento. */}
                                        <input
                                          value={c.notas ?? ""}
                                          onChange={(e) => editarCancion(s.id, c.id, { notas: e.target.value })}
                                          placeholder="Nota general de la canción"
                                          className="ms-input-inline w-full"
                                        />
                                      </td>
                                      {verFechas && celdaFechas(c)}
                                      <td className="ms-td text-right">
                                        <button
                                          onClick={() => void quitarCancion(s.id, c)}
                                          className="text-[#555] hover:text-red-400 transition-colors"
                                          title={
                                            alcance === "SHOW"
                                              ? "Quitar de esta fecha: el base deja de mandarla a esta noche"
                                              : "Quitar canción"
                                          }
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    </RenglonArrastrable>
                                    {verFechas && filaFechas(s.id, c, columnas)}
                                    </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => void agregarCancion(s.id)} className="ms-btn-ghost">
                      + Agregar canción
                    </button>
                    <button onClick={() => void agregarCancionDeOtro(s.id)} className="ms-btn-ghost">
                      + Canción de otro artista
                    </button>
                    <button onClick={() => void agregarCancion(s.id, "PAUSA")} className="ms-btn-ghost">
                      + Agregar pausa
                    </button>
                    <button onClick={() => void agregarBloque(s.id)} className="ms-btn-ghost">
                      + Agregar bloque
                    </button>
                    <button
                      onClick={() => void quitarSetlist(s)}
                      className="ms-btn-ghost text-red-400/80 hover:text-red-300 ml-auto"
                    >
                      Quitar setlist
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
