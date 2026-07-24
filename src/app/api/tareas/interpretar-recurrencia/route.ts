import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";
import {
  parsearRecurrencia,
  formatearRecurrencia,
  detectarEnTexto,
  type RecurrenciaConfig,
} from "@/lib/recurrencia";

export const runtime = "nodejs";

// Valida y normaliza un objeto arbitrario a un RecurrenciaConfig seguro. null si no es válido.
function sanitizarCfg(raw: unknown): RecurrenciaConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const tipo = o.tipo;
  if (tipo !== "diario" && tipo !== "semanal" && tipo !== "mensual" && tipo !== "anual") return null;

  const cada = Math.max(1, Math.min(60, Math.round(Number(o.cada) || 1)));
  const cfg: RecurrenciaConfig = { tipo, cada };

  const asIntArray = (v: unknown, lo: number, hi: number): number[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const nums = v
      .map(x => Math.round(Number(x)))
      .filter(n => Number.isFinite(n) && n >= lo && n <= hi);
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    return uniq.length ? uniq : undefined;
  };

  if (tipo === "semanal") {
    cfg.diasSemana = asIntArray(o.diasSemana, 0, 6) ?? [new Date().getDay()];
  }
  if (tipo === "mensual") {
    const semanaMes = asIntArray(o.semanaMes, 1, 5);
    const diasSemana = asIntArray(o.diasSemana, 0, 6);
    if (semanaMes && diasSemana) {
      cfg.semanaMes = semanaMes;
      cfg.diasSemana = diasSemana;
    } else {
      const diasMes = asIntArray(o.diasMes, 1, 31);
      const diaMes = Number(o.diaMes);
      if (diasMes && diasMes.length > 1) cfg.diasMes = diasMes;
      else if (diasMes && diasMes.length === 1) cfg.diaMes = diasMes[0];
      else if (Number.isFinite(diaMes) && diaMes >= 1 && diaMes <= 31) cfg.diaMes = Math.round(diaMes);
      else cfg.diaMes = new Date().getDate();
    }
  }
  if (tipo === "anual") {
    const mes = Number(o.mesAnio);
    if (Number.isFinite(mes) && mes >= 0 && mes <= 11) cfg.mesAnio = Math.round(mes);
  }
  return cfg;
}

const SYSTEM = `Eres un intérprete de recurrencias y fechas para un gestor de tareas en español (México).
Recibes una frase libre del usuario y devuelves ÚNICAMENTE un objeto JSON (sin markdown, sin explicación).

Formas de salida válidas:
1) Recurrencia:  {"tipo":"recurrencia","cfg":{...}}
2) Fecha única:  {"tipo":"fecha","fecha":"YYYY-MM-DD"}
3) No entendido: {"tipo":"none"}

El objeto "cfg" sigue este esquema (RecurrenciaConfig):
{
  "tipo": "diario" | "semanal" | "mensual" | "anual",
  "cada": number,          // repetir cada N unidades (>=1). "quincenal" = semanal con cada:2
  "diasSemana": number[],  // 0=Domingo 1=Lunes 2=Martes 3=Miércoles 4=Jueves 5=Viernes 6=Sábado
  "diaMes": number,        // día fijo del mes (1..31) para un solo día
  "diasMes": number[],     // varios días fijos del mes, ej. [1,15]
  "semanaMes": number[],   // 1..5 (5 = última) — para "primer/segundo/último ... del mes"
  "mesAnio": number        // 0..11 opcional para anual anclado a un mes
}

Reglas:
- "diario"/"todos los días" -> {"tipo":"diario","cada":1}
- "de lunes a viernes"/"entre semana" -> {"tipo":"semanal","cada":1,"diasSemana":[1,2,3,4,5]}
- "fines de semana" -> {"tipo":"semanal","cada":1,"diasSemana":[0,6]}
- "cada viernes y domingo" -> {"tipo":"semanal","cada":1,"diasSemana":[5,0]}
- "cada día 10 del mes" -> {"tipo":"mensual","cada":1,"diaMes":10}
- "los días 1 y 15" -> {"tipo":"mensual","cada":1,"diasMes":[1,15]}
- "primer viernes del mes" -> {"tipo":"mensual","cada":1,"semanaMes":[1],"diasSemana":[5]}
- "último día hábil" no es exacto: aproxima a {"tipo":"mensual","cada":1,"semanaMes":[5],"diasSemana":[1,2,3,4,5]}
- Si la frase describe una fecha concreta única (ej. "el 5 de julio", "mañana"), usa tipo "fecha".
- Si no puedes interpretarlo, usa {"tipo":"none"}.
Responde SOLO el JSON.`;

function extraerJson(txt: string): unknown {
  const match = txt.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) return NextResponse.json({ error: "Falta el texto" }, { status: 400 });

  // 1) Intento local sin costo (recurrencia)
  const local = parsearRecurrencia(texto.toLowerCase());
  if (local) {
    return NextResponse.json({
      tipo: "recurrencia",
      cfg: local,
      display: formatearRecurrencia(local),
      fuente: "local",
    });
  }

  // 2) Intento local de fecha única inline (hoy, mañana, "5 de julio", día suelto)
  const inline = detectarEnTexto(texto);
  if (inline.cfg) {
    return NextResponse.json({
      tipo: "recurrencia",
      cfg: inline.cfg,
      display: formatearRecurrencia(inline.cfg),
      fuente: "local",
    });
  }
  if (inline.fecha) {
    return NextResponse.json({ tipo: "fecha", fecha: inline.fecha, fuente: "local" });
  }

  // 3) Fallback IA
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      tipo: "none",
      error: "No pude interpretarlo automáticamente (la IA no está configurada).",
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const hoy = new Date().toISOString().slice(0, 10);
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: `Hoy es ${hoy}. Frase: "${texto}"` }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    const parsed = extraerJson(raw) as { tipo?: string; cfg?: unknown; fecha?: unknown } | null;
    if (!parsed || !parsed.tipo) {
      return NextResponse.json({ tipo: "none", error: "No entendí esa recurrencia." });
    }

    if (parsed.tipo === "recurrencia") {
      const cfg = sanitizarCfg(parsed.cfg);
      if (!cfg) return NextResponse.json({ tipo: "none", error: "No entendí esa recurrencia." });
      return NextResponse.json({
        tipo: "recurrencia",
        cfg,
        display: formatearRecurrencia(cfg),
        fuente: "ia",
      });
    }

    if (parsed.tipo === "fecha" && typeof parsed.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha)) {
      return NextResponse.json({ tipo: "fecha", fecha: parsed.fecha, fuente: "ia" });
    }

    return NextResponse.json({ tipo: "none", error: "No entendí esa recurrencia." });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo interpretar: ${String(e)}` }, { status: 500 });
  }
}
