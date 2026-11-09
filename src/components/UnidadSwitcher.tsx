"use client";

import Image from "next/image";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { seleccionarUnidad } from "@/app/(dashboard)/grupo/actions";

export type Unidad = "PRO" | "LIVE" | "CREATIVE";

const UNIDADES: { unidad: Unidad; nombre: string; desc: string; logo: string }[] = [
  { unidad: "PRO", nombre: "Mainstage Pro", desc: "Renta de equipo y producción técnica", logo: "/logo-icon.png" },
  { unidad: "LIVE", nombre: "Mainstage Live", desc: "Giras y shows", logo: "/logo-live.png" },
  { unidad: "CREATIVE", nombre: "Mainstage Creative", desc: "Diseño y producción creativa", logo: "/logo-creative.png" },
];

export default function UnidadSwitcher({ unidad }: { unidad: Unidad }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-1 text-left text-[#555] hover:text-[#B3985B] text-xs px-1 py-1 transition-colors">
        <span className="flex-1">Unidad de negocio</span>
        <ChevronsUpDownIcon className="w-3 h-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        {UNIDADES.map((u) => (
          <DropdownMenuItem
            key={u.unidad}
            onClick={() => seleccionarUnidad(u.unidad)}
            className="py-2"
          >
            <Image src={u.logo} alt={u.nombre} width={24} height={24} className="rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{u.nombre}</p>
              <p className="text-[#777] text-[11px] truncate">{u.desc}</p>
            </div>
            {u.unidad === unidad && <CheckIcon className="w-4 h-4 text-[#B3985B] shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
