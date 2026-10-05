import {
  Accessibility, Ambulance, Anchor, Armchair, ArrowUpDown, Baby, Beer, Blocks, Building2, Bus,
  Cable, Camera, Car, Cctv, CigaretteOff, CircleParking, ClipboardList, ClipboardSignature,
  Coffee, CreditCard, Crown, Cross, Disc3, DoorClosed, Droplet, Droplets, FireExtinguisher, Flag,
  Footprints, Forklift, Fuel, Gift, Guitar, Headphones, Info, Key, LayoutGrid, Lightbulb, LogIn,
  LogOut, Monitor, Newspaper, PartyPopper, PlugZap, Projector, Recycle, ShieldCheck,
  ShoppingBag, ShowerHead, Shirt, Signpost, Siren, SlidersHorizontal, Speaker, Stethoscope, Store,
  Table, Tent, Theater, Ticket, Toilet, TrafficCone, Trash2, TreePine, TriangleAlert, Truck, Umbrella,
  Users, Utensils, Warehouse, Wifi, Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Los puntos de servicio que se marcan en un site plan. Es un catálogo cerrado a
 * propósito: un plano se lee de un vistazo y eso solo pasa si la cruz médica se ve
 * igual en todos. El objeto guarda la `clave`, nunca el icono, para que cambiar el
 * dibujo no obligue a tocar los planos ya hechos.
 */
export type IconoSitePlan = {
  clave: string;
  etiqueta: string;
  grupo: string;
  Icono: LucideIcon;
  /** Color con el que nace el pin. Se puede cambiar por objeto. */
  color: string;
};

const ROJO = "#D9444F";
const TURQUESA = "#2DD4BF";
const NARANJA = "#E8734A";
const MORADO = "#C44BC4";
const AZUL = "#3B82F6";
const DORADO = "#E0B64B";

export const ICONOS_SITE_PLAN: IconoSitePlan[] = [
  // Salud y seguridad
  { clave: "AMBULANCIA", etiqueta: "Ambulancia", grupo: "Salud y seguridad", Icono: Ambulance, color: ROJO },
  { clave: "PRIMEROS_AUXILIOS", etiqueta: "Primeros auxilios", grupo: "Salud y seguridad", Icono: Cross, color: ROJO },
  { clave: "MEDICO", etiqueta: "Servicio médico", grupo: "Salud y seguridad", Icono: Stethoscope, color: ROJO },
  { clave: "EXTINTOR", etiqueta: "Extintor", grupo: "Salud y seguridad", Icono: FireExtinguisher, color: ROJO },
  { clave: "SALIDA_EMERGENCIA", etiqueta: "Salida de emergencia", grupo: "Salud y seguridad", Icono: LogOut, color: ROJO },
  { clave: "PUNTO_ENCUENTRO", etiqueta: "Punto de encuentro", grupo: "Salud y seguridad", Icono: Flag, color: ROJO },
  { clave: "SEGURIDAD", etiqueta: "Seguridad", grupo: "Salud y seguridad", Icono: ShieldCheck, color: ROJO },
  { clave: "CCTV", etiqueta: "Cámara de vigilancia", grupo: "Salud y seguridad", Icono: Cctv, color: ROJO },
  { clave: "BOMBEROS", etiqueta: "Bomberos", grupo: "Salud y seguridad", Icono: Siren, color: ROJO },
  { clave: "RIESGO", etiqueta: "Zona de riesgo", grupo: "Salud y seguridad", Icono: TriangleAlert, color: ROJO },

  // Servicios al público
  { clave: "BANOS", etiqueta: "Baños", grupo: "Servicios al público", Icono: Toilet, color: TURQUESA },
  { clave: "BANOS_ACCESIBLES", etiqueta: "Baños accesibles", grupo: "Servicios al público", Icono: Accessibility, color: TURQUESA },
  { clave: "LAVAMANOS", etiqueta: "Lavamanos", grupo: "Servicios al público", Icono: Droplets, color: TURQUESA },
  { clave: "REGADERAS", etiqueta: "Regaderas", grupo: "Servicios al público", Icono: ShowerHead, color: TURQUESA },
  { clave: "AGUA", etiqueta: "Agua potable", grupo: "Servicios al público", Icono: Droplet, color: TURQUESA },
  { clave: "GUARDARROPA", etiqueta: "Guardarropa", grupo: "Servicios al público", Icono: Shirt, color: TURQUESA },
  { clave: "INFORMACION", etiqueta: "Información", grupo: "Servicios al público", Icono: Info, color: TURQUESA },
  { clave: "TAQUILLA", etiqueta: "Taquilla", grupo: "Servicios al público", Icono: Ticket, color: TURQUESA },
  { clave: "CAJERO", etiqueta: "Cajero / pagos", grupo: "Servicios al público", Icono: CreditCard, color: TURQUESA },
  { clave: "BASURA", etiqueta: "Basura", grupo: "Servicios al público", Icono: Trash2, color: TURQUESA },
  { clave: "RECICLAJE", etiqueta: "Reciclaje", grupo: "Servicios al público", Icono: Recycle, color: TURQUESA },
  { clave: "WIFI", etiqueta: "Wifi", grupo: "Servicios al público", Icono: Wifi, color: TURQUESA },
  { clave: "LACTANCIA", etiqueta: "Sala de lactancia", grupo: "Servicios al público", Icono: Baby, color: TURQUESA },
  { clave: "NO_FUMAR", etiqueta: "Prohibido fumar", grupo: "Servicios al público", Icono: CigaretteOff, color: TURQUESA },

  // Alimentos y bebidas
  { clave: "COMIDA", etiqueta: "Comida", grupo: "Alimentos y bebidas", Icono: Utensils, color: NARANJA },
  { clave: "FOOD_TRUCK", etiqueta: "Food truck", grupo: "Alimentos y bebidas", Icono: Truck, color: NARANJA },
  { clave: "BAR", etiqueta: "Bar", grupo: "Alimentos y bebidas", Icono: Beer, color: NARANJA },
  { clave: "CAFE", etiqueta: "Café", grupo: "Alimentos y bebidas", Icono: Coffee, color: NARANJA },
  { clave: "CATERING", etiqueta: "Catering de crew", grupo: "Alimentos y bebidas", Icono: ClipboardSignature, color: NARANJA },

  // Producción
  { clave: "ESCENARIO", etiqueta: "Escenario", grupo: "Producción", Icono: Theater, color: MORADO },
  { clave: "FOH", etiqueta: "FOH", grupo: "Producción", Icono: SlidersHorizontal, color: MORADO },
  { clave: "MONITORES", etiqueta: "Monitores", grupo: "Producción", Icono: Headphones, color: MORADO },
  { clave: "AUDIO", etiqueta: "Audio", grupo: "Producción", Icono: Speaker, color: MORADO },
  { clave: "ILUMINACION", etiqueta: "Iluminación", grupo: "Producción", Icono: Lightbulb, color: MORADO },
  { clave: "VIDEO", etiqueta: "Video", grupo: "Producción", Icono: Projector, color: MORADO },
  { clave: "PANTALLA", etiqueta: "Pantalla LED", grupo: "Producción", Icono: Monitor, color: MORADO },
  { clave: "DJ", etiqueta: "Cabina DJ", grupo: "Producción", Icono: Disc3, color: MORADO },
  { clave: "BACKLINE", etiqueta: "Backline", grupo: "Producción", Icono: Guitar, color: MORADO },
  { clave: "RIGGING", etiqueta: "Rigging", grupo: "Producción", Icono: Anchor, color: MORADO },
  { clave: "ENERGIA", etiqueta: "Energía", grupo: "Producción", Icono: Zap, color: MORADO },
  { clave: "PLANTA_LUZ", etiqueta: "Planta de luz", grupo: "Producción", Icono: Fuel, color: MORADO },
  { clave: "TABLERO", etiqueta: "Tablero eléctrico", grupo: "Producción", Icono: PlugZap, color: MORADO },
  { clave: "CABLEADO", etiqueta: "Cruce de cableado", grupo: "Producción", Icono: Cable, color: MORADO },
  { clave: "BODEGA", etiqueta: "Bodega", grupo: "Producción", Icono: Warehouse, color: MORADO },
  { clave: "CAMERINOS", etiqueta: "Camerinos", grupo: "Producción", Icono: DoorClosed, color: MORADO },
  { clave: "PRODUCCION", etiqueta: "Oficina de producción", grupo: "Producción", Icono: ClipboardList, color: MORADO },
  { clave: "PRENSA", etiqueta: "Prensa", grupo: "Producción", Icono: Newspaper, color: MORADO },
  { clave: "FOTO", etiqueta: "Foto / video", grupo: "Producción", Icono: Camera, color: MORADO },

  // Accesos y circulación
  { clave: "ENTRADA", etiqueta: "Entrada", grupo: "Accesos y circulación", Icono: LogIn, color: AZUL },
  { clave: "ACCESO_PUBLICO", etiqueta: "Acceso de público", grupo: "Accesos y circulación", Icono: Users, color: AZUL },
  { clave: "CONTROL_ACCESO", etiqueta: "Control de acceso", grupo: "Accesos y circulación", Icono: Key, color: AZUL },
  { clave: "VIP", etiqueta: "VIP", grupo: "Accesos y circulación", Icono: Crown, color: AZUL },
  { clave: "ACCESO_VEHICULAR", etiqueta: "Acceso vehicular", grupo: "Accesos y circulación", Icono: Car, color: AZUL },
  { clave: "ESTACIONAMIENTO", etiqueta: "Estacionamiento", grupo: "Accesos y circulación", Icono: CircleParking, color: AZUL },
  { clave: "CARGA_DESCARGA", etiqueta: "Carga y descarga", grupo: "Accesos y circulación", Icono: Forklift, color: AZUL },
  { clave: "MONTACARGAS", etiqueta: "Montacargas", grupo: "Accesos y circulación", Icono: ArrowUpDown, color: AZUL },
  { clave: "TRANSPORTE", etiqueta: "Transporte", grupo: "Accesos y circulación", Icono: Bus, color: AZUL },
  { clave: "RUTA_PEATONAL", etiqueta: "Ruta peatonal", grupo: "Accesos y circulación", Icono: Footprints, color: AZUL },
  { clave: "SENALIZACION", etiqueta: "Señalización", grupo: "Accesos y circulación", Icono: Signpost, color: AZUL },
  { clave: "VALLA", etiqueta: "Valla / cierre", grupo: "Accesos y circulación", Icono: TrafficCone, color: AZUL },

  // Estructura y mobiliario
  { clave: "CARPA", etiqueta: "Carpa", grupo: "Estructura y mobiliario", Icono: Tent, color: DORADO },
  { clave: "STAND", etiqueta: "Stand", grupo: "Estructura y mobiliario", Icono: Store, color: DORADO },
  { clave: "TIENDA", etiqueta: "Mercancía", grupo: "Estructura y mobiliario", Icono: ShoppingBag, color: DORADO },
  { clave: "MESAS", etiqueta: "Mesas", grupo: "Estructura y mobiliario", Icono: Table, color: DORADO },
  { clave: "MOBILIARIO", etiqueta: "Mobiliario", grupo: "Estructura y mobiliario", Icono: Armchair, color: DORADO },
  { clave: "GRADA", etiqueta: "Grada", grupo: "Estructura y mobiliario", Icono: LayoutGrid, color: DORADO },
  { clave: "ESTRUCTURA", etiqueta: "Estructura", grupo: "Estructura y mobiliario", Icono: Blocks, color: DORADO },
  { clave: "EDIFICIO", etiqueta: "Edificio", grupo: "Estructura y mobiliario", Icono: Building2, color: DORADO },
  { clave: "ARBOL", etiqueta: "Arbolado", grupo: "Estructura y mobiliario", Icono: TreePine, color: DORADO },
  { clave: "SOMBRA", etiqueta: "Zona de sombra", grupo: "Estructura y mobiliario", Icono: Umbrella, color: DORADO },
  { clave: "ACTIVACION", etiqueta: "Activación", grupo: "Estructura y mobiliario", Icono: PartyPopper, color: DORADO },
  { clave: "REGALOS", etiqueta: "Regalos / premios", grupo: "Estructura y mobiliario", Icono: Gift, color: DORADO },
];

const PORCLAVE = new Map(ICONOS_SITE_PLAN.map(i => [i.clave, i]));

export function iconoDe(clave: string | undefined | null): IconoSitePlan | undefined {
  return clave ? PORCLAVE.get(clave) : undefined;
}

export const GRUPOS_ICONOS = Array.from(new Set(ICONOS_SITE_PLAN.map(i => i.grupo)));
