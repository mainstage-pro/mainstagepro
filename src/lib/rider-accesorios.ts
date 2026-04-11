/**
 * Catálogo de accesorios sugeridos por equipo para el Rider / Checklist de bodega.
 * Basado en configuraciones reales de audio, iluminación y video profesional.
 *
 * Para editar: agrega o quita items de cada categoría/modelo.
 * El sistema los ofrece como sugerencias — el usuario decide cuáles incluir.
 */

export interface AccesorioDef {
  id: string;
  nombre: string;
  unidad: string; // "pza" | "par" | "lote" | "m"
  nota?: string;  // Nota de uso / configuración
}

// ─── Accesorios por CATEGORÍA de equipo ──────────────────────────────────────
// Se usan cuando no hay match exacto por modelo

export const ACCESORIOS_POR_CATEGORIA: Record<string, AccesorioDef[]> = {

  // ── Audio PA / Bafles activos ─────────────────────────────────────────────
  "Audio PA": [
    { id: "cable_xlr_10m",       nombre: "Cable XLR balanceado 10m",         unidad: "pza" },
    { id: "cable_xlr_5m",        nombre: "Cable XLR balanceado 5m",          unidad: "pza" },
    { id: "cable_poder_bafle",   nombre: "Cable de poder bafle activo",      unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle",                 unidad: "pza",  nota: "Para bafles sobre trípode" },
    { id: "poste_speakon",       nombre: "Poste speakon (top sobre sub)",    unidad: "pza",  nota: "Para configuración sub + top" },
    { id: "cable_speakon",       nombre: "Cable Speakon 2m",                 unidad: "pza",  nota: "Conexión sub ↔ top" },
    { id: "cover_bafle",         nombre: "Cover / funda de transporte",      unidad: "pza" },
  ],

  // ── Subwoofers activos ────────────────────────────────────────────────────
  "Subwoofer": [
    { id: "cable_poder_sub",     nombre: "Cable de poder subwoofer",         unidad: "pza" },
    { id: "cable_speakon_sub",   nombre: "Cable Speakon (sub → top)",        unidad: "pza" },
    { id: "cable_xlr_sub",       nombre: "Cable XLR entrada de señal",       unidad: "pza" },
    { id: "ruedas_sub",          nombre: "Ruedas de transporte",             unidad: "par",  nota: "Si el sub no tiene ruedas integradas" },
    { id: "cover_sub",           nombre: "Cover de transporte subwoofer",    unidad: "pza" },
  ],

  // ── Consola digital ───────────────────────────────────────────────────────
  "Consola": [
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",           unidad: "pza",  nota: "Ej: Sony MDR-7506" },
    { id: "cable_usb_a_b",       nombre: "Cable USB A-B (consola-laptop)",   unidad: "pza" },
    { id: "laptop_backup",       nombre: "Laptop para backup / playback",    unidad: "pza",  nota: "Con software de la consola instalado" },
    { id: "fuente_consola",      nombre: "Fuente de poder de repuesto",      unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego de cables XLR para stage",   unidad: "lote" },
    { id: "cable_ethernet",      nombre: "Cable Ethernet (para digital)",    unidad: "pza" },
    { id: "tablet_control",      nombre: "Tablet/iPad para control remoto",  unidad: "pza",  nota: "Para consolas con app remota" },
    { id: "stagebox",            nombre: "Stagebox / snake digital",         unidad: "pza",  nota: "Si el setup lo requiere" },
  ],

  // ── Micrófonos inalámbricos ───────────────────────────────────────────────
  "Micrófono": [
    { id: "pilas_aa",            nombre: "Pilas AA (de litio preferente)",   unidad: "par",  nota: "2 pilas por receptor inalámbrico" },
    { id: "soporte_micro",       nombre: "Soporte de micrófono",             unidad: "pza" },
    { id: "clip_micro",          nombre: "Clip / holder de micrófono",       unidad: "pza" },
    { id: "cable_xlr_micro",     nombre: "Cable XLR salida de receptor",     unidad: "pza" },
    { id: "antena_ext",          nombre: "Antena de extensión activa",       unidad: "pza",  nota: "Para mayor alcance en sistemas IEM/wireless" },
    { id: "funda_micro",         nombre: "Funda de micrófono",               unidad: "pza" },
    { id: "lavalier_repuesto",   nombre: "Cápsula / lavalier de repuesto",   unidad: "pza",  nota: "Para sistemas de solapa" },
  ],

  // ── Monitores de piso / IEM ───────────────────────────────────────────────
  "Monitor": [
    { id: "cable_xlr_monitor",   nombre: "Cable XLR para monitor de piso",  unidad: "pza" },
    { id: "cable_poder_monitor", nombre: "Cable de poder monitor activo",    unidad: "pza" },
    { id: "cuña_goma",           nombre: "Cuña de goma antideslizante",      unidad: "pza",  nota: "Evita que el monitor se mueva en escenario" },
    { id: "auriculares_iem",     nombre: "Auriculares IEM",                  unidad: "pza",  nota: "Para sistema in-ear" },
  ],

  // ── Iluminación (PARs, Wash, Moving Heads) ───────────────────────────────
  "Iluminación": [
    { id: "cable_dmx_xlr",       nombre: "Cable DMX XLR3 5m",               unidad: "pza" },
    { id: "cable_dmx_xlr_10",    nombre: "Cable DMX XLR3 10m",              unidad: "pza" },
    { id: "cable_poder_luz",     nombre: "Cable de poder luminaria",        unidad: "pza" },
    { id: "extension_luz",       nombre: "Extensión eléctrica (para luces)","unidad": "pza" },
    { id: "tripode_luz",         nombre: "Trípode de iluminación",          unidad: "pza" },
    { id: "clamp_truss",         nombre: "Clamp / gancho para truss",       unidad: "pza",  nota: "Para colgar en estructura" },
    { id: "controlador_dmx",     nombre: "Controlador DMX 512",             unidad: "pza",  nota: "Si no hay consola de iluminación" },
    { id: "distribuidor_dmx",    nombre: "Splitter / distribuidor DMX",     unidad: "pza",  nota: "Para cadenas largas de fixtures" },
    { id: "corriente_multicontacto","nombre":"Multicontacto eléctrico",     unidad: "pza" },
  ],

  // ── Cabezas móviles ───────────────────────────────────────────────────────
  "Cabeza móvil": [
    { id: "cable_dmx_cabeza",    nombre: "Cable DMX para cabeza móvil",     unidad: "pza" },
    { id: "cable_poder_cabeza",  nombre: "Cable de poder cabeza",           unidad: "pza" },
    { id: "clamp_cabeza",        nombre: "Clamp / soporte de cabeza",       unidad: "pza" },
    { id: "seguro_cabeza",       nombre: "Seguro de cable de seguridad",    unidad: "pza",  nota: "Obligatorio en instalación en altura" },
    { id: "bolsa_herramientas",  nombre: "Bolsa de herramientas iluminación","unidad":"pza" },
  ],

  // ── Pantallas LED / Videowall ─────────────────────────────────────────────
  "Pantalla LED": [
    { id: "cable_datos_led",     nombre: "Cable de datos LED (Cat5/6)",     unidad: "pza" },
    { id: "cable_poder_led",     nombre: "Cable de poder gabinete LED",     unidad: "pza" },
    { id: "procesador_led",      nombre: "Procesador / controladora LED",   unidad: "pza" },
    { id: "laptop_led",          nombre: "Laptop para contenido LED",       unidad: "pza",  nota: "Con Resolume, Watchout o similar" },
    { id: "conversor_hdmi",      nombre: "Conversor HDMI → DVI/SDI",        unidad: "pza" },
    { id: "cable_hdmi",          nombre: "Cable HDMI",                      unidad: "pza" },
    { id: "estructura_led",      nombre: "Estructura de soporte LED",       unidad: "pza" },
    { id: "llave_hex",           nombre: "Llave hexagonal para gabinetes",  unidad: "pza" },
  ],

  // ── Proyección ────────────────────────────────────────────────────────────
  "Proyector": [
    { id: "control_proyector",   nombre: "Control remoto del proyector",    unidad: "pza" },
    { id: "cable_hdmi_20m",      nombre: "Cable HDMI 20m (activo/óptico)",  unidad: "pza" },
    { id: "cable_vga",           nombre: "Cable VGA + adaptador",           unidad: "pza",  nota: "Backup" },
    { id: "pantalla_proyeccion", nombre: "Pantalla de proyección",          unidad: "pza",  nota: "Si no usa la del venue" },
    { id: "tripode_pantalla",    nombre: "Trípode o soporte de pantalla",   unidad: "pza" },
    { id: "laptop_presentacion", nombre: "Laptop para presentaciones",      unidad: "pza" },
    { id: "laser_pointer",       nombre: "Apuntador láser / presentador",   unidad: "pza" },
  ],

  // ── Equipo DJ ─────────────────────────────────────────────────────────────
  "DJ": [
    { id: "cable_rca_dj",        nombre: "Cable RCA para tornamesa",        unidad: "par" },
    { id: "cable_xlr_dj",        nombre: "Cable XLR salida mixer",          unidad: "pza" },
    { id: "cable_usb_dj",        nombre: "Cable USB tipo A o B",            unidad: "pza" },
    { id: "audifonos_dj",        nombre: "Audífonos para DJ",               unidad: "pza" },
    { id: "laptop_dj",           nombre: "Laptop DJ con Serato/Rekordbox",  unidad: "pza" },
    { id: "pendrive_musica",     nombre: "USB / pendrive con música",       unidad: "pza" },
    { id: "adaptador_dj",        nombre: "Adaptador de corriente DJ gear",  unidad: "pza" },
    { id: "mesa_dj",             nombre: "Mesa / soporte para DJ",          unidad: "pza" },
  ],

  // ── General / Herramientas ────────────────────────────────────────────────
  "General": [
    { id: "cinta_gaffer",        nombre: "Cinta gaffer negra",              unidad: "rollo" },
    { id: "cinta_gaffer_color",  nombre: "Cinta gaffer de colores",         unidad: "rollo", nota: "Para marcar cables/zonas" },
    { id: "velcro_cables",       nombre: "Velcro para amarrar cables",      unidad: "rollo" },
    { id: "multicontacto",       nombre: "Multicontacto eléctrico",         unidad: "pza" },
    { id: "extension_25m",       nombre: "Extensión eléctrica 25m",         unidad: "pza" },
    { id: "linterna",            nombre: "Linterna o lampara de producción","unidad": "pza" },
    { id: "herramienta_baja",    nombre: "Destornillador / navaja",         unidad: "pza" },
    { id: "marcador_sharpie",    nombre: "Marcadores (Sharpie)",            unidad: "pza" },
    { id: "caja_herramientas",   nombre: "Caja de herramientas general",    unidad: "pza" },
  ],
};

// ─── Accesorios por MODELO específico ────────────────────────────────────────
// Mayor precisión que por categoría. Si el modelo del equipo coincide, se usa este.

export const ACCESORIOS_POR_MODELO: Record<string, AccesorioDef[]> = {

  // ── Electro-Voice EKX ─────────────────────────────────────────────────────
  "EKX-12P": [
    { id: "cable_poder_ekx",     nombre: "Cable de poder EKX-12P (IEC C13)",unidad: "pza" },
    { id: "cable_xlr_10m",       nombre: "Cable XLR señal 10m",             unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle",                unidad: "pza",  nota: "Para uso a piso o en trípode" },
    { id: "poste_speakon",       nombre: "Poste speakon (para sub + top)",  unidad: "pza",  nota: "Si se combina con EKX-18SP" },
    { id: "cable_speakon",       nombre: "Cable Speakon 2m",                unidad: "pza",  nota: "Conexión sub ↔ top en poste" },
    { id: "cover_ekx12",         nombre: "Cover transporte EKX-12P",        unidad: "pza" },
  ],
  "EKX-15P": [
    { id: "cable_poder_ekx",     nombre: "Cable de poder EKX-15P (IEC C13)",unidad: "pza" },
    { id: "cable_xlr_10m",       nombre: "Cable XLR señal 10m",             unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle (resistente)",   unidad: "pza" },
    { id: "poste_speakon",       nombre: "Poste speakon (para sub + top)",  unidad: "pza",  nota: "Si se combina con EKX-18SP" },
    { id: "cable_speakon",       nombre: "Cable Speakon 2m",                unidad: "pza" },
    { id: "cover_ekx15",         nombre: "Cover transporte EKX-15P",        unidad: "pza" },
  ],
  "EKX-18SP": [
    { id: "cable_poder_ekx18sp", nombre: "Cable de poder EKX-18SP (IEC C13)",unidad:"pza" },
    { id: "cable_speakon_sub",   nombre: "Cable Speakon sub → top",         unidad: "pza" },
    { id: "cable_xlr_sub",       nombre: "Cable XLR entrada de señal",      unidad: "pza" },
    { id: "ruedas_sub",          nombre: "Ruedas de transporte EKX-18SP",   unidad: "par" },
    { id: "cover_ekx18",         nombre: "Cover transporte EKX-18SP",       unidad: "pza" },
  ],
  "EKX-12": [
    { id: "amplificador_ch",     nombre: "Amplificador Crown/QSC para EKX-12",unidad:"pza",nota:"Si no es la versión activa" },
    { id: "cable_speakon_ekx12", nombre: "Cable Speakon (amp → bafle)",     unidad: "pza" },
    { id: "cable_xlr_10m",       nombre: "Cable XLR señal 10m",             unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle",                unidad: "pza" },
  ],

  // ── Yamaha ────────────────────────────────────────────────────────────────
  "DXR12": [
    { id: "cable_poder_dxr",     nombre: "Cable de poder DXR12",            unidad: "pza" },
    { id: "cable_xlr_10m",       nombre: "Cable XLR señal 10m",             unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle",                unidad: "pza" },
    { id: "cover_dxr12",         nombre: "Funda transporte DXR12",          unidad: "pza" },
  ],
  "DXR15": [
    { id: "cable_poder_dxr",     nombre: "Cable de poder DXR15",            unidad: "pza" },
    { id: "cable_xlr_10m",       nombre: "Cable XLR señal 10m",             unidad: "pza" },
    { id: "tripode_bafle",       nombre: "Trípode de bafle",                unidad: "pza" },
    { id: "cover_dxr15",         nombre: "Funda transporte DXR15",          unidad: "pza" },
  ],
  "DXS15": [
    { id: "cable_poder_dxs",     nombre: "Cable de poder DXS15",            unidad: "pza" },
    { id: "cable_speakon_dxs",   nombre: "Cable Speakon sub → top",         unidad: "pza" },
    { id: "cover_dxs15",         nombre: "Funda transporte DXS15",          unidad: "pza" },
  ],

  // ── Consolas Yamaha ───────────────────────────────────────────────────────
  "MG16XU": [
    { id: "cable_usb",           nombre: "Cable USB tipo B",                unidad: "pza" },
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",          unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego cables XLR para stage",     unidad: "lote" },
  ],
  "TF1": [
    { id: "cable_ethernet_tf",   nombre: "Cable Ethernet para control iPad",unidad: "pza" },
    { id: "ipad_tf",             nombre: "iPad con app TF StageMix",        unidad: "pza",  nota: "Control remoto" },
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",          unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego cables XLR para stage",     unidad: "lote" },
    { id: "stagebox_tf",         nombre: "Rio stagebox (si aplica)",        unidad: "pza" },
  ],
  "QL1": [
    { id: "cable_ethernet",      nombre: "Cable Ethernet RJ45",             unidad: "pza" },
    { id: "tablet_ql",           nombre: "Tablet con app StageMix",         unidad: "pza" },
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",          unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego cables XLR para stage",     unidad: "lote" },
    { id: "stagebox_ql",         nombre: "Rio 1608-D stagebox",             unidad: "pza" },
  ],

  // ── Consolas Allen & Heath ────────────────────────────────────────────────
  "Qu-16": [
    { id: "cable_ethernet",      nombre: "Cable Ethernet (control iPad)",   unidad: "pza" },
    { id: "ipad_qu",             nombre: "iPad con app Qu-Pad",             unidad: "pza" },
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",          unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego cables XLR para stage",     unidad: "lote" },
  ],
  "SQ-5": [
    { id: "cable_ethernet",      nombre: "Cable Ethernet (control iPad)",   unidad: "pza" },
    { id: "ipad_sq",             nombre: "iPad con app SQ MixPad",          unidad: "pza" },
    { id: "audifonos_mix",       nombre: "Audífonos de monitoreo",          unidad: "pza" },
    { id: "cables_xlr_stage",    nombre: "Juego cables XLR para stage",     unidad: "lote" },
  ],

  // ── Micrófonos Shure ──────────────────────────────────────────────────────
  "SM58": [
    { id: "cable_xlr_micro",     nombre: "Cable XLR micrófono 5m",         unidad: "pza" },
    { id: "soporte_micro",       nombre: "Soporte de micrófono",            unidad: "pza" },
    { id: "clip_sm58",           nombre: "Clip SM58",                       unidad: "pza" },
  ],
  "SM57": [
    { id: "cable_xlr_micro",     nombre: "Cable XLR micrófono 5m",         unidad: "pza" },
    { id: "soporte_micro",       nombre: "Soporte de micrófono",            unidad: "pza" },
    { id: "clip_sm57",           nombre: "Clip SM57",                       unidad: "pza" },
  ],
  "BLX": [
    { id: "pilas_aa_blx",        nombre: "Pilas AA de litio",               unidad: "par",  nota: "2 por micrófono inalámbrico" },
    { id: "soporte_micro",       nombre: "Soporte de micrófono",            unidad: "pza" },
    { id: "cable_xlr_blx",       nombre: "Cable XLR salida receptor",       unidad: "pza" },
    { id: "clip_blx",            nombre: "Clip holder BLX",                 unidad: "pza" },
  ],
  "ULXD": [
    { id: "pilas_aa_ulxd",       nombre: "Pilas AA de litio Energizer",     unidad: "par",  nota: "2 por transmisor" },
    { id: "cable_xlr_ulxd",      nombre: "Cable XLR salida receptor",       unidad: "pza" },
    { id: "antena_ulxd",         nombre: "Antena de extensión activa",      unidad: "pza" },
  ],
  "QLXD": [
    { id: "pilas_aa_qlxd",       nombre: "Pilas AA de litio",               unidad: "par" },
    { id: "cable_xlr_qlxd",      nombre: "Cable XLR salida receptor",       unidad: "pza" },
    { id: "antena_qlxd",         nombre: "Antena de extensión",             unidad: "pza" },
  ],
};

// ─── Función principal: obtener accesorios sugeridos para un equipo ───────────

/**
 * Devuelve los accesorios sugeridos para un equipo dado su descripción,
 * marca, modelo y categoría. Primero busca por modelo exacto,
 * luego por categoría.
 */
export function getAccesoriosSugeridos(params: {
  descripcion: string;
  marca?: string | null;
  modelo?: string | null;
  categoriaNombre: string;
}): AccesorioDef[] {
  const { marca, modelo, descripcion, categoriaNombre } = params;

  // 1. Busca por modelo exacto
  if (modelo) {
    const key = Object.keys(ACCESORIOS_POR_MODELO).find(k =>
      modelo.toUpperCase().includes(k.toUpperCase()) ||
      k.toUpperCase().includes(modelo.toUpperCase())
    );
    if (key) return ACCESORIOS_POR_MODELO[key];
  }

  // 2. Busca modelo en la descripción
  if (descripcion) {
    const key = Object.keys(ACCESORIOS_POR_MODELO).find(k =>
      descripcion.toUpperCase().includes(k.toUpperCase())
    );
    if (key) return ACCESORIOS_POR_MODELO[key];
  }

  // 3. Busca por categoría
  const catKey = Object.keys(ACCESORIOS_POR_CATEGORIA).find(k =>
    categoriaNombre.toUpperCase().includes(k.toUpperCase()) ||
    k.toUpperCase().includes(categoriaNombre.toUpperCase())
  );
  if (catKey) return ACCESORIOS_POR_CATEGORIA[catKey];

  // 4. Siempre incluye generales
  return ACCESORIOS_POR_CATEGORIA["General"];
}
