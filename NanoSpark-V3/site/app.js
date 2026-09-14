/**
 * Nano Spark PRD — Main Entry
 * 9-section immersive site + 360 viewer
 */
import { panoramas as builtInPanoramas, loadExternalConfig } from './js/config.js';
import { PanoramaViewer } from './js/viewer.js';

const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

// Preloader
window.addEventListener('load',()=> setTimeout(()=> $('#preloader')?.classList.add('done'), 600));

// Nav scrolled
const nav = $('#siteNav');
window.addEventListener('scroll',()=>{
  if(window.scrollY>20) nav?.classList.add('scrolled');
  else nav?.classList.remove('scrolled');
  // active link
  const sections = ['hero','lab','infrastructure','electronics','coding-robotics-iot','safety','curriculum','ecosystem','contact'];
  let cur = 'hero';
  sections.forEach(id=>{
    const el = document.getElementById(id);
    if(el && window.scrollY >= el.offsetTop - 120) cur = id;
  });
  $$('.nav nav a').forEach(a=> a.classList.toggle('active', a.getAttribute('href')==='#'+cur));
});

// Mobile drawer
$('#drawerClose')?.addEventListener('click',()=> $('#mobileDrawer')?.classList.remove('open'));
document.querySelector('.menu')?.addEventListener('click',()=> $('#mobileDrawer')?.classList.add('open'));
$$('#mobileDrawer a').forEach(a=> a.addEventListener('click',()=> $('#mobileDrawer')?.classList.remove('open')));

// Viewer
const canvas = document.getElementById('panoCanvas');
const container = document.getElementById('tourCanvas');
const hotspotLayer = document.getElementById('hotspotLayer');
const titleEl = document.getElementById('panoTitle');
const descEl = document.getElementById('panoDesc');
const loadingEl = document.getElementById('panoLoading');
const thumbStrip = document.getElementById('thumbStrip');
let viewer=null;
async function initViewer(){
  if(!canvas||!container) return;
  const external = await loadExternalConfig();
  const active = external && external.length ? external : builtInPanoramas;
  viewer = new PanoramaViewer(canvas, container, {
    panoramas: active, hotspotLayer, titleEl, descEl, loadingEl, thumbStrip,
    onHotspotNavigate:(targetId)=> {
      const t = active.find(p=>p.id===targetId);
      if(t) console.info('[app] hotspot ->', t.title);
    }
  });
  $$('.zone-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id = btn.dataset.pano;
      if(active.find(p=>p.id===id) && viewer){ viewer.load(id); document.getElementById('lab')?.scrollIntoView({behavior:'smooth'});}
    });
  });
  $$('.zone-card').forEach(c=>{
    c.addEventListener('click',()=>{
      const id = c.dataset.pano;
      if(id && viewer) { viewer.load(id); document.getElementById('lab')?.scrollIntoView({behavior:'smooth'}); }
    });
  });
  document.getElementById('btnResetView')?.addEventListener('click',()=>{
    viewer?.load(active[0].id);
  });
  window._pano = viewer;
}
initViewer();

// Form per PRD §9
const form = document.getElementById('leadForm');
const pills = $$('.pill-group button');
const hidden = form?.querySelector('input[name="interested"]');
const formMsg = document.getElementById('formMsg');
const selected = new Set();
pills.forEach(b=>{
  b.addEventListener('click',()=>{
    const v = b.dataset.value;
    if(selected.has(v)){ selected.delete(v); b.classList.remove('active'); }
    else { selected.add(v); b.classList.add('active'); }
    if(hidden) hidden.value = [...selected].join(', ');
  });
});
form?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const fd = new FormData(form);
  if(fd.get('honeypot')) return;
  const required = ['name','school','designation','phone','email','location'];
  for(const k of required){
    if(!fd.get(k) || String(fd.get(k)).trim()===''){
      formMsg.textContent = `Please fill ${k}`;
      formMsg.style.color='red';
      return;
    }
  }
  if(!selected.size){
    formMsg.textContent = 'Please select at least one Interested Area';
    formMsg.style.color='red';
    return;
  }
  // Simulate success per PRD confirmed wording
  formMsg.style.color='green';
  formMsg.textContent = 'Thank you. Your enquiry has been received. The Nano Spark team will get in touch with you.';
  form.reset();
  selected.clear();
  pills.forEach(b=>b.classList.remove('active'));
  if(hidden) hidden.value='';
  // Analytics hook
  console.info('[analytics] form_success');
  // TODO: wire to backend per PRD §15 to nanospark46@gmail.com
});
