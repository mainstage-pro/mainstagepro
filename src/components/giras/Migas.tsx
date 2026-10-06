import Link from "next/link";

export interface Miga {
  label: string;
  /// Sin href = el escalón donde estás parado; se pinta sin liga.
  href?: string;
}

/// Camino de regreso de una pantalla anidada de giras. Cada escalón es una liga:
/// desde un show se vuelve al listado, a la gira y a sus shows sin tantear.
export default function Migas({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Dónde estoy" className="flex items-center gap-1.5 ms-micro flex-wrap">
      {items.map((m, i) => (
        <span key={`${m.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#333]">/</span>}
          {m.href ? (
            <Link href={m.href} className="text-[#777] hover:text-[#B3985B] transition-colors">
              {m.label}
            </Link>
          ) : (
            <span className="text-[#555]">{m.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
