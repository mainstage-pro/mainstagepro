import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Server-side navigation fix ─────────────────────────────────────────────
// Strip Claude's broken scripts and inject our bulletproof goTo implementation.
// Running server-side means we can use /logo-white.png as a relative URL
// (the browser will resolve it against the serving domain).

// CSS injection: controls all slide visibility via .active class
// Using !important beats ALL inline styles and CSS rules Claude may have generated
const SLIDE_CSS = `<style id="ms-nav-css">
section.slide, div.slide { display: none !important; }
section.slide.active, div.slide.active { display: flex !important; }
</style>`;

const NAV_SCRIPT = `
<script>
var cur = 0;
var _slides = [];
var _dots   = [];
var _counter = null;

function init() {
  _slides  = Array.from(document.querySelectorAll('.slide'));
  _dots    = Array.from(document.querySelectorAll('.dot'));
  _counter = document.getElementById('slide-counter');
  if (!_slides.length) return;
  _slides[0].classList.add('active');
  _dots.forEach(function(d, i) { d.style.opacity = i === 0 ? '1' : '0.3'; });
  if (_counter) _counter.textContent = '01 / ' + String(_slides.length).padStart(2, '0');
}

function goTo(n) {
  if (!_slides.length) init();
  if (!_slides.length) return;
  n = parseInt(n, 10);
  if (isNaN(n)) return;
  _slides[cur].classList.remove('active');
  if (_dots[cur]) _dots[cur].style.opacity = '0.3';
  cur = ((n % _slides.length) + _slides.length) % _slides.length;
  _slides[cur].classList.add('active');
  if (_dots[cur]) _dots[cur].style.opacity = '1';
  if (_counter) _counter.textContent =
    String(cur + 1).padStart(2, '0') + ' / ' + String(_slides.length).padStart(2, '0');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(cur + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(cur - 1);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>`;

// Real logo as an <img> tag — served from same origin so no base64 needed
const LOGO_IMG = `<img src="/logo-white.png" alt="Mainstage Pro" style="height:28px;object-fit:contain;display:block;">`;

function fixHtml(html: string): string {
  // 1. Remove Claude's scripts
  let result = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // 2. Replace logo: __LOGO_SRC__ placeholder (new prompts) and SVG (old prompts)
  result = result.split("__LOGO_SRC__").join("/logo-white.png");
  result = result.replace(
    /<svg[^>]*viewBox=['"]0 0 220 38['"][\s\S]*?<\/svg>/gi,
    LOGO_IMG
  );

  // 3. Inject CSS + script — try before </head>, then before </body>, then append
  const injection = SLIDE_CSS + "\n" + NAV_SCRIPT;
  if (result.includes("</head>")) {
    result = result.replace(/<\/head>/i, SLIDE_CSS + "</head>");
    result = result.includes("</body>")
      ? result.replace(/<\/body>/i, NAV_SCRIPT + "</body>")
      : result + NAV_SCRIPT;
  } else if (result.includes("</body>")) {
    result = result.replace(/<\/body>/i, injection + "</body>");
  } else {
    result = result + injection;
  }

  return result;
}

/**
 * GET /api/capacitacion/[id]/versiones/[vid]/html
 * Serves the presentation as a real HTML page (Content-Type: text/html).
 * No iframe sandbox — the browser treats this as a first-class page.
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

  const version = await prisma.versionPresentacion.findFirst({
    where: { id: vid, sesionId: id },
    select: { htmlContent: true, version: true },
  });

  if (!version) {
    return new NextResponse("Versión no encontrada", { status: 404 });
  }

  const fixed = fixHtml(version.htmlContent);

  return new NextResponse(fixed, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
