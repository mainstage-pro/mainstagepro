import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";


// ── Mainstage Pro CSS framework ────────────────────────────────────────────
// Injected into every presentation so Claude's HTML just uses class names.
const MS_CSS = `<style id="ms-framework">
/* ── Reset ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#040404;
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;
  color:#fff;-webkit-font-smoothing:antialiased}

/* ── Deck & slides ── */
#deck{position:fixed;inset:0;overflow:hidden}
.slide{position:absolute;inset:0;display:flex;flex-direction:column;
  padding:clamp(20px,5vw,72px);
  padding-bottom:calc(clamp(20px,5vw,72px) + 64px);overflow:hidden}

/* ── Navigation bar ── */
#ms-nav{position:fixed;bottom:0;left:0;right:0;height:56px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;background:rgba(4,4,4,.97);
  border-top:1px solid rgba(179,152,91,.12);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:999}
.ms-btn{width:36px;height:36px;display:flex;align-items:center;
  justify-content:center;background:none;
  border:1px solid rgba(255,255,255,.1);border-radius:8px;
  color:rgba(255,255,255,.5);font-size:20px;cursor:pointer;
  transition:border-color .2s,color .2s}
.ms-btn:hover{border-color:#B3985B;color:#B3985B}
.ms-dots{display:flex;gap:6px;align-items:center}
.ms-dot{width:6px;height:6px;border-radius:50%;
  background:rgba(255,255,255,.2);
  transition:background .2s,transform .2s;cursor:pointer}
.ms-dot.on{background:#B3985B;transform:scale(1.3)}
#ms-counter{font-size:13px;font-weight:800;letter-spacing:.05em;
  color:#fff;min-width:60px;text-align:center;
  background:#B3985B;border-radius:6px;padding:2px 8px}



/* ── Logo ── */
.ms-logo{height:22px;object-fit:contain;display:block}

/* ── Backgrounds ── */
.bg-dark{background:#040404}.bg-mid{background:#080808}.bg-card{background:#0a0a0a}

/* ── Typography ── */
.ms-eyebrow{font-size:clamp(9px,1.1vw,11px);font-weight:600;
  text-transform:uppercase;letter-spacing:.18em;color:#B3985B;
  margin-bottom:8px;display:flex;align-items:center;gap:8px}
.ms-eyebrow::before{content:'';display:block;width:3px;height:12px;
  background:#B3985B;border-radius:2px;flex-shrink:0}
.ms-title{font-weight:800;line-height:1.0;letter-spacing:-.035em;color:#fff}
.ms-title.xl{font-size:clamp(28px,7vw,88px)}
.ms-title.lg{font-size:clamp(22px,5vw,62px)}
.ms-title.md{font-size:clamp(18px,3.5vw,42px)}
.ms-subtitle{font-size:clamp(13px,1.8vw,18px);line-height:1.6;
  color:rgba(255,255,255,.45);margin-top:16px}
.ms-gold{color:#B3985B}.ms-muted{color:rgba(255,255,255,.2)}

/* ── Cards ── */
.ms-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
  border-radius:12px;padding:clamp(14px,2vw,24px)}
.ms-card.gold{background:rgba(179,152,91,.05);border-color:rgba(179,152,91,.2)}
.ms-card-label{font-size:10px;font-weight:600;text-transform:uppercase;
  letter-spacing:.15em;color:#B3985B;margin-bottom:8px}
.ms-card-title{font-size:clamp(14px,1.8vw,20px);font-weight:700;
  color:#fff;margin-bottom:6px}
.ms-card-body{font-size:clamp(11px,1.4vw,14px);line-height:1.55;
  color:rgba(255,255,255,.4)}

/* ── Grid ── */
.ms-grid{display:grid;gap:clamp(8px,1.5vw,18px)}
.ms-grid-2{grid-template-columns:repeat(2,1fr)}
.ms-grid-3{grid-template-columns:repeat(3,1fr)}
.ms-grid-4{grid-template-columns:repeat(4,1fr)}
@media(max-width:600px){
  .ms-grid-3,.ms-grid-4{grid-template-columns:1fr}
  .ms-grid-2{grid-template-columns:1fr}}
@media(min-width:601px)and(max-width:900px){
  .ms-grid-4{grid-template-columns:repeat(2,1fr)}}

/* ── List ── */
.ms-list{list-style:none}
.ms-list li{display:flex;gap:12px;align-items:flex-start;
  padding:clamp(8px,1.2vw,14px) 0;
  border-bottom:1px solid rgba(255,255,255,.04);
  font-size:clamp(12px,1.6vw,17px);line-height:1.5;
  color:rgba(255,255,255,.55)}
.ms-list li:last-child{border-bottom:none}
.ms-list li::before{content:'';display:block;width:5px;height:5px;
  border-radius:50%;background:#B3985B;flex-shrink:0;margin-top:7px}
.ms-list li strong{color:#fff;font-weight:600}

/* ── Stats ── */
.ms-stat-num{font-size:clamp(28px,5vw,56px);font-weight:800;
  letter-spacing:-.03em;color:#B3985B;line-height:1}
.ms-stat-label{font-size:clamp(10px,1.2vw,13px);color:rgba(255,255,255,.35);
  margin-top:4px;text-transform:uppercase;letter-spacing:.1em}

/* ── Quote ── */
.ms-quote{font-size:clamp(20px,4vw,48px);font-weight:800;
  letter-spacing:-.03em;line-height:1.1;color:#fff;max-width:85%}
.ms-quote-source{font-size:clamp(10px,1.2vw,13px);
  color:rgba(255,255,255,.25);margin-top:20px;font-style:italic}

/* ── Misc ── */
.ms-divider{height:1px;background:rgba(179,152,91,.12);
  margin:clamp(10px,1.8vw,20px) 0}
.ms-tag{display:inline-flex;align-items:center;padding:4px 12px;
  border-radius:20px;background:rgba(179,152,91,.08);
  border:1px solid rgba(179,152,91,.2);font-size:11px;font-weight:600;
  color:#B3985B;letter-spacing:.1em;text-transform:uppercase}
.ms-obj-box{background:#0a0a0a;border-left:2px solid #B3985B;
  border-radius:0 8px 8px 0;padding:clamp(16px,2.5vw,32px);
  font-size:clamp(14px,2vw,20px);line-height:1.65;
  color:rgba(255,255,255,.75);max-width:900px}
.ms-footer{position:absolute;
  bottom:calc(clamp(20px,3vw,48px) + 64px);
  left:clamp(20px,5vw,72px);right:clamp(20px,5vw,72px);
  display:flex;justify-content:space-between;align-items:flex-end;
  font-size:11px;color:rgba(255,255,255,.15)}

/* ── Slide-in animation ── */
@keyframes msIn{from{opacity:0;transform:translateY(14px)}
  to{opacity:1;transform:translateY(0)}}
.slide.active>*{animation:msIn .4s cubic-bezier(.16,1,.3,1) both}
.slide.active>*:nth-child(2){animation-delay:.07s}
.slide.active>*:nth-child(3){animation-delay:.14s}
.slide.active>*:nth-child(4){animation-delay:.21s}
.slide.active>*:nth-child(5){animation-delay:.28s}
.slide.active>*:nth-child(6){animation-delay:.35s}

/* ── Slide initial state: first slide visible as fallback before JS ── */
.slide{display:none}
.slide:first-child{display:flex}
</style>`;


// ── Nav script tag ── injected before </body>; served as a static asset
// This avoids ALL template-literal escape issues that broke the inline version.
const NAV_SCRIPT_TAG = '<script src="/ms-nav.js"></script>';


// ── Logo URL ── use public URL, NOT base64
function getLogoUrl(): string {
  return "/logo-white.png";
}

// ── fixHtml ────────────────────────────────────────────────────
function fixHtml(html: string, logoUrl: string, sessionId: string, versionId: string, tieneEval: boolean): string {
  // 1. Strip ALL scripts from Claude (closed and unclosed)
  let result = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  result = result.replace(/<script[\s\S]*/i, "");

  // 2. Strip Claude's style blocks (we inject our own)
  result = result.replace(/<style[\s\S]*?<\/style>/gi, "");

  // 3. Replace logo placeholder with simple URL (no base64 — avoids 222KB bloat)
  result = result.split("LOGO_HERE").join(logoUrl);
  result = result.split("__LOGO_SRC__").join(logoUrl);
  result = result.replace(
    /<svg[^>]*viewBox=['"]0 0 220 38['"][\s\S]*?<\/svg>/gi,
    `<img src="${logoUrl}" class="ms-logo" alt="Mainstage Pro">`
  );

  // 4. Inject meta tags + CSS into <head>
  const metaTags = `<meta name="ms-sid" content="${sessionId}">
<meta name="ms-vid" content="${versionId}">
<meta name="ms-has-eval" content="${tieneEval ? "1" : "0"}">`;

  const headInject = metaTags + "\n" + MS_CSS;

  if (result.includes("</head>")) {
    result = result.replace(/<[/]head>/i, () => headInject + "</head>");
  } else if (result.includes("<head>")) {
    result = result.replace(/<head>/i, () => "<head>" + headInject);
  } else {
    result = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
${headInject}</head>` + result;
  }

  // 5. Inject <script src="/ms-nav.js"> at end of body (AFTER all slides are in the DOM)
  // Script is a static asset served by Vercel CDN — no template-literal escape issues.
  if (result.includes("</body>")) {
    result = result.replace(/<[/]body>/i, () => NAV_SCRIPT_TAG + "</body>");
  } else {
    result = result + NAV_SCRIPT_TAG;
  }

  return result;
}


/**
 * GET /api/capacitacion/[id]/versiones/[vid]/html
 * Serves the presentation as a real HTML page (Content-Type: text/html).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id, vid } = await params;

  const [version, evaluacion] = await Promise.all([
    prisma.versionPresentacion.findFirst({
      where: { id: vid, sesionId: id },
      select: { htmlContent: true, version: true },
    }),
    prisma.evaluacionCapacitacion.findUnique({
      where: { sesionId: id },
      select: { id: true },
    }),
  ]);

  if (!version) {
    return new NextResponse("Versión no encontrada", { status: 404 });
  }

  const logoUrl = getLogoUrl();
  const fixed = fixHtml(version.htmlContent, logoUrl, id, vid, !!evaluacion);


  return new NextResponse(fixed, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
