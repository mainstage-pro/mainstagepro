/* Mainstage Pro — Navigation + Edit Script
 * Served as a static asset: /ms-nav.js
 * Injected via <script src="/ms-nav.js"> into every generated presentation.
 * No template-literal escape issues — this file is served as-is.
 */

var cur=0,_s=[],_d=[],_c=null,_ok=false,_edit=false,_end=null;

// Read session/version IDs from meta tags injected by the route handler
var _sidEl=document.querySelector('meta[name="ms-sid"]');
var _vidEl=document.querySelector('meta[name="ms-vid"]');
var _evalEl=document.querySelector('meta[name="ms-has-eval"]');
var _sid=_sidEl?_sidEl.getAttribute('content'):null;
var _vid=_vidEl?_vidEl.getAttribute('content'):null;
var _hasEval=_evalEl?_evalEl.getAttribute('content')==='1':false;

function pad2(n){return(n<10?'0':'')+n;}
function toArr(nl){var a=[];for(var i=0;i<nl.length;i++)a.push(nl[i]);return a;}

function msShow(idx){
  try{
    var atEnd=(idx===_s.length);
    for(var i=0;i<_s.length;i++){
      _s[i].style.display=(i===idx)?'flex':'none';
    }
    if(_end)_end.style.display=atEnd?'flex':'none';
    if(_d[cur])_d[cur].className='ms-dot';
    cur=idx;
    if(_d[cur])_d[cur].className='ms-dot on';
    if(_c)_c.textContent=atEnd?'Fin':(pad2(cur+1)+' / '+pad2(_s.length));
  }catch(e){}
}

// Pantalla final: se anexa al <body> (fuera de #deck para no persistirse al guardar).
// Es la slide-tope tras la última: ofrece repasar o pasar a la evaluación.
function msBuildEnd(){
  _end=document.getElementById('ms-end');
  if(_end)return;
  var wrap=document.createElement('div');
  wrap.id='ms-end';
  wrap.style.cssText='position:fixed;inset:0;display:none;flex-direction:column;'
    +'align-items:center;justify-content:center;text-align:center;'
    +'padding:24px 24px 96px;background:#040404;z-index:900';
  var titulo=_hasEval?'\u00bfListo para la evaluaci\u00f3n?':'\u00a1Terminaste la lecci\u00f3n!';
  var sub=_hasEval
    ?'Repasa el curso las veces que necesites. Cuando te sientas seguro, presenta la evaluaci\u00f3n.'
    :'Repasa el curso las veces que necesites y m\u00e1rcalo como completado cuando termines.';
  var evalLabel=_hasEval?'Tomar evaluaci\u00f3n \u2192':'Marcar como completado \u2713';
  wrap.innerHTML=
     '<div class="ms-eyebrow" style="justify-content:center">Fin del curso</div>'
    +'<h1 class="ms-title lg" style="max-width:16ch">'+titulo+'</h1>'
    +'<p class="ms-subtitle" style="max-width:52ch;margin-left:auto;margin-right:auto">'+sub+'</p>'
    +'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:36px">'
    +'<button id="ms-repasar" style="padding:0 22px;height:46px;border-radius:10px;background:none;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:14px;font-weight:600;cursor:pointer">\u21ba Repasar curso</button>'
    +'<button id="ms-eval-go" style="padding:0 22px;height:46px;border-radius:10px;background:#B3985B;border:none;color:#000;font-size:14px;font-weight:800;cursor:pointer">'+evalLabel+'</button>'
    +'</div>';
  document.body.appendChild(wrap);
  _end=wrap;
  var rp=document.getElementById('ms-repasar');
  if(rp)rp.onclick=function(){goTo(0);};
  var eg=document.getElementById('ms-eval-go');
  if(eg)eg.onclick=function(){
    try{if(window.parent)window.parent.postMessage({type:'ms-finalizar'},'*');}catch(e){}
  };
}

function msInit(){
  if(_ok)return;
  var found=document.querySelectorAll('.slide');
  if(!found.length)return;
  try{
    _ok=true;
    _s=toArr(found);
    _d=toArr(document.querySelectorAll('.ms-dot'));
    _c=document.getElementById('ms-counter');
    msBuildEnd();
    msShow(0);
    msAddEditUI();
  }catch(e){
    _ok=false;
  }
}

function goTo(n){
  if(!_ok)msInit();
  if(!_s.length)return;
  n=parseInt(n,10);
  if(isNaN(n))return;
  if(n<0)n=0;                 // tope inicial: no rebasa la primera slide
  if(n>_s.length)n=_s.length; // tope final: la pantalla de evaluación es el límite
  if(n===cur)return;
  msShow(n);
}

document.addEventListener('keydown',function(e){
  if(_edit)return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')goTo(cur+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')goTo(cur-1);
  if(e.key==='f'||e.key==='F')msToggleFullscreen();
  if(e.key==='Escape'&&document.fullscreenElement)document.exitFullscreen();
});

// ── Edit mode ───────────────────────────────────────────────────────────────
var EDIT_SEL='.ms-title,.ms-subtitle,.ms-card-title,.ms-card-body'
  +',.ms-quote,.ms-quote-source,.ms-stat-num,.ms-stat-label'
  +',.ms-obj-box,.ms-tag,h1,h2,h3';

function msAddEditUI(){
  var nav=document.getElementById('ms-nav');
  if(!nav||document.getElementById('ms-edit-btn'))return;

  // ── Fullscreen button ──
  var fb=document.createElement('button');
  fb.id='ms-fs-btn'; fb.className='ms-btn'; fb.title='Pantalla completa (F)';
  fb.innerHTML='\u26f6'; fb.onclick=msToggleFullscreen;
  nav.insertBefore(fb, nav.firstElementChild);

  // ── Edit + Save buttons ──
  var eb=document.createElement('button');
  eb.id='ms-edit-btn'; eb.className='ms-btn'; eb.title='Editar';
  eb.innerHTML='\u270f'; eb.onclick=msToggleEdit;

  var sb=document.createElement('button');
  sb.id='ms-save-btn';
  sb.style.cssText='display:none;padding:0 14px;height:32px;border-radius:8px;'
    +'background:#B3985B;border:none;color:#000;font-size:12px;'
    +'font-weight:700;cursor:pointer;white-space:nowrap';
  sb.textContent='Guardar'; sb.onclick=msSave;

  var msg=document.createElement('span');
  msg.id='ms-msg';
  msg.style.cssText='font-size:11px;font-weight:600;display:none;margin:0 6px';

  var last=nav.lastElementChild;
  nav.insertBefore(msg,last);
  nav.insertBefore(sb,last);
  nav.insertBefore(eb,last);
}

// ── Fullscreen ───────────────────────────────────────────────────────────────
function msToggleFullscreen(){
  if(!document.fullscreenElement){
    (document.documentElement.requestFullscreen
      ||document.documentElement.webkitRequestFullscreen
      ||function(){}).call(document.documentElement);
  } else {
    (document.exitFullscreen
      ||document.webkitExitFullscreen
      ||function(){}).call(document);
  }
}

function msUpdateFsBtn(){
  var fb=document.getElementById('ms-fs-btn');
  if(!fb)return;
  var isFs=!!document.fullscreenElement;
  // ⛶ = enter fullscreen  ⊡ = exit (use unicode arrows)
  fb.innerHTML=isFs?'\u2715':'\u26f6';
  fb.title=isFs?'Salir de pantalla completa (Esc)':'Pantalla completa (F)';
  fb.style.color=isFs?'#B3985B':'';
}

document.addEventListener('fullscreenchange', msUpdateFsBtn);
document.addEventListener('webkitfullscreenchange', msUpdateFsBtn);

function msToggleEdit(){
  _edit=!_edit;
  var eb=document.getElementById('ms-edit-btn');
  var sb=document.getElementById('ms-save-btn');
  var msg=document.getElementById('ms-msg');
  var els=document.querySelectorAll(EDIT_SEL);
  for(var i=0;i<els.length;i++){
    var el=els[i];
    if(el.closest&&el.closest('#ms-nav'))continue;
    el.contentEditable=_edit?'true':'false';
    el.style.outline=_edit?'1px dashed rgba(179,152,91,.5)':'';
  }
  if(eb)eb.style.color=_edit?'#B3985B':'';
  if(sb)sb.style.display=_edit?'inline-block':'none';
  if(msg)msg.style.display='none';
}

function msSave(){
  var sb=document.getElementById('ms-save-btn');
  var msg=document.getElementById('ms-msg');
  var eb=document.getElementById('ms-edit-btn');
  if(sb){sb.disabled=true;sb.textContent='Guardando...';}

  // Exit edit mode
  var els=document.querySelectorAll(EDIT_SEL);
  for(var i=0;i<els.length;i++){
    els[i].contentEditable='false';
    els[i].style.outline='';
  }
  _edit=false;
  if(eb)eb.style.color='';
  if(sb)sb.style.display='none';

  // Strip active/ms-hidden classes and inline display styles so saved HTML is clean
  for(var j=0;j<_s.length;j++){
    _s[j].classList.remove('active','ms-hidden');
    _s[j].style.display='';
  }

  // Capture nav + deck
  var navEl=document.getElementById('ms-nav');
  var deckEl=document.getElementById('deck');

  // Remove injected edit controls before saving
  var ebClone=document.getElementById('ms-edit-btn');
  var sbClone=document.getElementById('ms-save-btn');
  var msgClone=document.getElementById('ms-msg');
  if(ebClone&&ebClone.parentNode)ebClone.parentNode.removeChild(ebClone);
  if(sbClone&&sbClone.parentNode)sbClone.parentNode.removeChild(sbClone);
  if(msgClone&&msgClone.parentNode)msgClone.parentNode.removeChild(msgClone);

  var navHtml=navEl?navEl.outerHTML:'';
  var deckHtml=deckEl?deckEl.outerHTML:'';

  // Rebuild dots in nav (using indexOf — no regex needed)
  var dotHtml='';
  for(var k=0;k<_s.length;k++)dotHtml+='<span class="ms-dot"></span>';
  var dotsAttr=navHtml.indexOf('id="ms-dots"');
  if(dotsAttr>=0){
    var dotsTagEnd=navHtml.indexOf('>',dotsAttr)+1;
    var dotsClose=navHtml.indexOf('</div>',dotsTagEnd);
    if(dotsTagEnd>0&&dotsClose>0){
      navHtml=navHtml.substring(0,dotsTagEnd)+dotHtml+navHtml.substring(dotsClose);
    }
  }

  var html='<!DOCTYPE html><html lang="es"><head>'
    +'<meta charset="UTF-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">'
    +'<title>'+document.title+'</title>'
    +'</head><body>'+navHtml+deckHtml+'</body></html>';

  if(!_sid||!_vid){
    if(msg){msg.style.display='inline';msg.style.color='#f87171';msg.textContent='No se pudo guardar';}
    _ok=false;msInit();return;
  }

  fetch('/api/capacitacion/'+_sid+'/versiones/'+_vid,{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({htmlContent:html}),
    credentials:'include'
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.ok){
      if(msg){msg.style.display='inline';msg.style.color='#4ade80';msg.textContent='\u2713 Guardado';}
      setTimeout(function(){if(msg)msg.style.display='none';},2500);
    } else {
      if(msg){msg.style.display='inline';msg.style.color='#f87171';msg.textContent='Error al guardar';}
      if(sb){sb.disabled=false;sb.textContent='Guardar';sb.style.display='inline-block';}
    }
    _ok=false;msInit();
  })
  .catch(function(){
    if(msg){msg.style.display='inline';msg.style.color='#f87171';msg.textContent='Error al guardar';}
    if(sb){sb.disabled=false;sb.textContent='Guardar';sb.style.display='inline-block';}
    _ok=false;msInit();
  });
}

// Initialize — script is at end of body so DOM is ready
msInit();
setTimeout(msInit,0);
setTimeout(msInit,150);
document.addEventListener('DOMContentLoaded',msInit);
window.addEventListener('load',msInit);
