import {
  Box, Briefcase, CalendarClock, ClipboardCheck, Clock, DollarSign, Fence, FileText,
  Guitar, Handshake, HardHat, Lightbulb, Megaphone, MonitorPlay, Network, Palette,
  Plane, Route, Ruler, ShieldCheck, Sparkles, Speaker, Tent, Theater, Truck, Users,
  Zap, type LucideIcon,
} from "lucide-react";

/**
 * Un servicio no tiene foto: el icono hace de miniatura en el catálogo. Catálogo
 * cerrado como el del site plan, para que el mismo servicio se vea igual en la
 * pantalla, la propuesta y el PDF. La BD guarda el nombre, nunca el componente.
 */
export const ICONOS_SERVICIO: Record<string, LucideIcon> = {
  Briefcase, Route, ClipboardCheck, CalendarClock, Clock, Handshake, Network,
  Users, HardHat, Theater, Megaphone, ShieldCheck,
  Speaker, Lightbulb, MonitorPlay, Guitar, Zap,
  Palette, Ruler, Box, Sparkles,
  Truck, Plane, Tent, Fence, FileText, DollarSign,
};

export function iconoServicio(nombre: string | null | undefined): LucideIcon {
  return (nombre && ICONOS_SERVICIO[nombre]) || Briefcase;
}

export const ICONO_SERVICIO_OPCIONES = Object.keys(ICONOS_SERVICIO);
