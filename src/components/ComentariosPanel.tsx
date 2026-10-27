"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { normalizarAmPm } from "@/lib/hora";
import { segmentarContenido, type EntidadComentario } from "@/lib/comentarios";

interface Usuario { id: string; name: string }

interface Comentario {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { id: string; name: string };
}

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  const hora = normalizarAmPm(d.toLocaleString("es-MX", { hour: "numeric", minute: "2-digit" }));
  const hoy = new Date().toDateString() === d.toDateString();
  if (hoy) return `Hoy, ${hora}`;
  return normalizarAmPm(d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }));
}

function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function ComentariosPanel({
  entidad, entidadId, usuarios,
}: { entidad: EntidadComentario; entidadId: string; usuarios: Usuario[] }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mencionesMap, setMencionesMap] = useState<Record<string, string>>({});
  const [sugeridos, setSugeridos] = useState<Usuario[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function cargar() {
    const r = await fetch(`/api/comentarios?entidad=${entidad}&entidadId=${entidadId}`);
    const d = await r.json();
    setComentarios(d.comentarios ?? []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [entidad, entidadId]);

  function onChangeTexto(valor: string) {
    setTexto(valor);
    const cursor = textareaRef.current?.selectionStart ?? valor.length;
    const antes = valor.slice(0, cursor);
    const match = antes.match(/@([^\s@]{0,30})$/);
    if (!match) { setSugeridos(null); return; }
    const q = match[1].toLowerCase();
    const candidatos = usuarios.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 6);
    setSugeridos(candidatos);
  }

  function elegirMencion(u: Usuario) {
    const cursor = textareaRef.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, cursor);
    const despues = texto.slice(cursor);
    const nuevoAntes = antes.replace(/@([^\s@]{0,30})$/, `@${u.name} `);
    const nuevoTexto = nuevoAntes + despues;
    setTexto(nuevoTexto);
    setMencionesMap((prev) => ({ ...prev, [u.name]: u.id }));
    setSugeridos(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const pos = nuevoAntes.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function contenidoParaGuardar(): string {
    let out = texto;
    for (const [name, id] of Object.entries(mencionesMap)) {
      const re = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "g");
      out = out.replace(re, `@[${name}](${id})`);
    }
    return out;
  }

  async function enviar() {
    const contenido = contenidoParaGuardar().trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad, entidadId, contenido }),
      });
      if (r.ok) {
        setTexto("");
        setMencionesMap({});
        await cargar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#141414]">
        <div className="w-8 h-8 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/30 flex items-center justify-center shrink-0">
          <MessageSquare strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Comentarios</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">Usa @ para mencionar y avisarle a alguien</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <p className="text-gray-600 text-sm">Cargando...</p>
        ) : comentarios.length === 0 ? (
          <p className="text-gray-600 text-sm">Sin comentarios todavía</p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {comentarios.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-semibold text-gray-400 shrink-0">
                  {iniciales(c.autor.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{c.autor.name}</span>
                    <span className="ms-meta">{fmtFecha(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {segmentarContenido(c.contenido).map((s, i) =>
                      s.mencion ? (
                        <span key={i} className="text-[#B3985B] font-medium">{s.texto}</span>
                      ) : (
                        <span key={i}>{s.texto}</span>
                      ),
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => onChangeTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !sugeridos) { e.preventDefault(); enviar(); }
            }}
            placeholder="Escribe un comentario... @nombre para mencionar"
            rows={2}
            className="ms-textarea w-full resize-none"
          />
          {sugeridos && sugeridos.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-64 ms-dropdown z-10">
              {sugeridos.map((u) => (
                <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); elegirMencion(u); }} className="ms-dropdown-item w-full text-left">
                  {u.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-2">
            <button onClick={enviar} disabled={!texto.trim() || enviando} className="ms-btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <Send strokeWidth={1.75} className="w-3.5 h-3.5" />
              Comentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
