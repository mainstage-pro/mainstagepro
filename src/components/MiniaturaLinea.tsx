// Miniatura de una línea de cotización. Sin foto cae al ícono de marca, para que
// la columna no se descuadre entre líneas con y sin imagen.
export function MiniaturaLinea({ src, size = 32 }: { src?: string | null; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || "/logo-icon.png"}
      alt=""
      style={{ width: size, height: size }}
      className={`object-contain rounded shrink-0 ${src ? "opacity-75" : "opacity-15"}`}
    />
  );
}
