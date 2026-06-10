/* Mainstage Pro — Navigation + Edit Script
 * Served as a static asset: /ms-nav.js
 * Injected via <script src="/ms-nav.js"> into every generated presentation.
 * No template-literal escape issues — this file is served as-is.
 */

var cur=0,_s=[],_d=[],_c=null,_ok=false,_edit=false;

// Read session/version IDs from meta tags injected by the route handler
var _sidEl=document.querySelector('meta[name="ms-sid"]');
var _vidEl=document.querySelector('meta[name="ms-vid"]');
var _sid=_sidEl?_sidEl.getAttribute('content'):null;
var _vid=_vidEl?_vidEl.getAttribute('content'):null;

function pad2(n){return(n<10?'0':'')+n;}
function toArr(nl){var a=[];for(var i=0;i<nl.length;i++)a.push(nl[i]);return a;}

function msShow(idx){
  try{
    for(var i=0;i<_s.length;i++){
      _s[i].style.display=(i===idx)?'flex':'none';
    }
    if(_d[cur])_d[cur].className='ms-dot';
    cur=idx;
    if(_d[cur])_d[cur].className='ms-dot on';
    if(_c)_c.textContent=pad2(cur+1)+' / '+pad2(_s.length);
  }catch(e){}
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
    msShow(0);
    msAddEditUI();
  }catch(e){
    _ok=false;
  }
}

function goTo(n){
  if(!_ok)msInit();
  if(!_s.length)return;
  n=((parseInt(n,10)%_s.length)+_s.length)%_s.length;
  if(n===cur)return;
  msShow(n);
}

document.addEventListener('keydown',function(e){
  if(_edit)return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')goTo(cur+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')goTo(cur-1);
});

// ── Edit mode ───────────────────────────────────────────────────────────────
var EDIT_SEL='.ms-title,.ms-subtitle,.ms-card-title,.ms-card-body'
  +',.ms-quote,.ms-quote-source,.ms-stat-num,.ms-stat-label'
  +',.ms-obj-box,.ms-tag,h1,h2,h3';

function msAddEditUI(){
  var nav=document.getElementById('ms-nav');
  if(!nav||document.getElementById('ms-edit-btn'))return;

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
