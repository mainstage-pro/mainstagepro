import sys

with open("src/components/cotizaciones/AsistenteCotizacion.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'import { useState, useRef, useCallback } from "react";',
    'import { useState, useRef, useCallback, useEffect } from "react";'
)

# 2. Replace the Dato block
old_line = '<Dato label="Cliente" valor={borrador.cliente.nombre ?? "—"} nota={borrador.cliente.match ? "existente" : "nuevo"} />'
new_line = '''<DatoClienteSelect 
                valor={borrador.cliente.nombre ?? ""} 
                match={borrador.cliente.match} 
                onChange={(c) => setBorrador((prev) => (prev ? { ...prev, cliente: c } : prev))} 
              />'''

content = content.replace(old_line, new_line)

# 3. Add DatoClienteSelect before DatoSelect
dato_cliente_component = '''
function DatoClienteSelect({
  valor,
  match,
  onChange,
}: {
  valor: string;
  match: { id: string; nombre: string } | null;
  onChange: (cliente: { match: { id: string; nombre: string } | null; nombre: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(valor || "");
  const [resultados, setResultados] = useState<{ id: string; nombre: string }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(valor || "");
  }, [valor]);

  const search = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      try {
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResultados(data.clientes || []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 relative">
      <div className="text-[#666] text-[10px] uppercase tracking-wide flex justify-between">
        <span>Cliente</span>
        <span className={match ? "text-[#B3985B]" : "text-[#aaa]"}>{match ? "existente" : "nuevo"}</span>
      </div>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange({ match: null, nombre: e.target.value });
          search(e.target.value);
        }}
        onFocus={() => { setOpen(true); search(q); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Nombre del cliente..."
        className="w-full bg-transparent text-white text-xs mt-0.5 focus:outline-none placeholder-[#555]"
      />
      {open && resultados.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-[#161616]">
          {resultados.map((c) => (
            <button
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setQ(c.nombre);
                onChange({ match: c, nombre: c.nombre });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#161616] flex flex-col"
            >
              <span className="text-white text-xs">{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DatoSelect({
'''

content = content.replace("function DatoSelect({", dato_cliente_component)

with open("src/components/cotizaciones/AsistenteCotizacion.tsx", "w", encoding="utf-8") as f:
    f.write(content)

