// js/main.js (no-module)
const { colors, colorBySev, iconPin, pillLabel, weight, accidentsNearRoute, makeAccidentPinsLayer } = window.Utils;

const ORIGEM  = { lat:-9.389,  lng:-40.503 };
const DESTINO = { lat:-10.511, lng:-40.321 };

const map = L.map('map', { zoomControl:true }).setView([-9.9, -40.4], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
  maxZoom:20, attribution:'&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// UI
const bufferInput = document.getElementById('buffer');
const bufferVal   = document.getElementById('bufferVal');
bufferInput.addEventListener('input', ()=> bufferVal.textContent = bufferInput.value + ' m');
bufferVal.textContent = bufferInput.value + ' m';

const runBtn        = document.getElementById('run');
const highlightBtn  = document.getElementById('highlight');
const toggleHeatAll = document.getElementById('toggleHeatAll');
const toggleHeatRt  = document.getElementById('toggleHeatRoute');
const togglePinsBtn = document.getElementById('togglePinsFilter');

let baseRouteOuter, baseRouteInner;
let stepLayers = []; // {outer, inner, pin, pill, level}
let highlightOn = false;
let heatAll = null, heatRoute = null;
let pinsLayer = null;
let pinsFilterByRoute = true;
let routeLine = null;

async function fetchRoute(o, d){
  const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('OSRM indisponível ('+res.status+')');
  const json = await res.json();
  if(!json.routes || !json.routes[0]) throw new Error('Sem rota');
  return json.routes[0];
}
function clearLayers(){
  if (baseRouteOuter) map.removeLayer(baseRouteOuter);
  if (baseRouteInner) map.removeLayer(baseRouteInner);
  stepLayers.forEach(s=>{
    s.outer && map.removeLayer(s.outer);
    s.inner && map.removeLayer(s.inner);
    s.pin   && map.removeLayer(s.pin);
    s.pill  && map.removeLayer(s.pill);
  });
  stepLayers = [];
  if (heatRoute) { map.removeLayer(heatRoute); heatRoute=null; }
  if (pinsLayer) { map.removeLayer(pinsLayer);  pinsLayer=null; }
}
function applyHighlight(){
  highlightOn = !highlightOn;
  stepLayers.forEach(s=>{
    if (!highlightOn){
      s.outer.setStyle({ opacity:1 });
      s.inner.setStyle({ opacity: (s.level ? 0.95 : 0.3) });
      s.inner._path && s.inner._path.classList.remove('glow-red','glow-amber','glow-green','glow-dim');
      if (s.level===3) s.inner._path && s.inner._path.classList.add('glow-red');
      if (s.level===2) s.inner._path && s.inner._path.classList.add('glow-amber');
      if (s.level===1) s.inner._path && s.inner._path.classList.add('glow-green');
      if (s.level===0) s.inner._path && s.inner._path.classList.add('glow-dim');
      s.pin  && s.pin.getElement()  && (s.pin.getElement().style.display='block');
      s.pill && s.pill.getElement() && (s.pill.getElement().style.display='block');
    } else {
      const danger = (s.level>=2);
      s.outer.setStyle({ opacity: danger ? 1 : 0 });
      s.inner.setStyle({ opacity: danger ? 1 : 0 });
      s.inner._path && s.inner._path.classList.remove('glow-red','glow-amber','glow-green','glow-dim');
      if (danger){
        if (s.level===3) s.inner._path && s.inner._path.classList.add('glow-red');
        if (s.level===2) s.inner._path && s.inner._path.classList.add('glow-amber');
      } else {
        s.inner._path && s.inner._path.classList.add('glow-dim');
      }
      if (s.pin  && s.pin.getElement())  s.pin.getElement().style.display  = danger ? 'block' : 'none';
      if (s.pill && s.pill.getElement()) s.pill.getElement().style.display = danger ? 'block' : 'none';
    }
  });
}
function rebuildPins(){
  if (pinsLayer) { map.removeLayer(pinsLayer); pinsLayer=null; }
  pinsLayer = makeAccidentPinsLayer(window.acidentes, {
    routeLine,
    bufferKm: Number(bufferInput.value)/1000,
    filterByBuffer: pinsFilterByRoute
  });
  pinsLayer.addTo(map);
}
function buildHeatAll(){
  if (heatAll) map.removeLayer(heatAll);
  const pts = window.acidentes.map(a => [a.lat, a.lng, weight(a.severidade)]);
  heatAll = L.heatLayer(pts, {
    radius: 46, blur: 20, maxZoom: 12,
    gradient: { 0.0: colors.green(), 0.5: colors.amber(), 1.0: colors.red() }
  });
}
function buildHeatRoute(){
  if (heatRoute) { map.removeLayer(heatRoute); heatRoute=null; }
  if (!routeLine) return;
  const prox = accidentsNearRoute(window.acidentes, routeLine, Number(bufferInput.value));
  const pts  = prox.map(a => [a.lat, a.lng, weight(a.severidade)]);
  heatRoute = L.heatLayer(pts, {
    radius: 46, blur: 20, maxZoom: 12,
    gradient: { 0.0: colors.green(), 0.5: colors.amber(), 1.0: colors.red() }
  });
}
async function build(){
  runBtn.disabled = true; runBtn.textContent = 'Calculando…';
  try{
    clearLayers();
    const route = await fetchRoute(ORIGEM, DESTINO);

    const all = route.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
    baseRouteOuter = L.polyline(all, { color:'#000', weight:11, opacity:.9, className:'glow-cyan' }).addTo(map);
    baseRouteInner = L.polyline(all, { color:colors.cyan(), weight:7, opacity:1, className:'glow-cyan' }).addTo(map);
    map.fitBounds(baseRouteOuter.getBounds(), { padding:[40,40] });

    routeLine = turf.lineString(route.geometry.coordinates);
    const bufferKm = Number(bufferInput.value)/1000;

    route.legs.forEach(leg=>{
      leg.steps.forEach(step=>{
        const sc = step.geometry.coordinates; if (!sc || sc.length<2) return;

        let maxSev = 0, count = 0;
        const stepLine = turf.lineString(sc);
        for (const a of window.acidentes){
          const snap = turf.nearestPointOnLine(stepLine, [a.lng, a.lat]);
          const dKm  = turf.distance(turf.point([a.lng, a.lat]), snap, { units:'kilometers' });
          if (dKm <= bufferKm){ maxSev = Math.max(maxSev, a.severidade||1); count++; }
        }

        const latlngs = sc.map(([lng,lat])=>[lat,lng]);
        const color = maxSev ? colorBySev(maxSev) : colors.dim();
        const lwOut = maxSev ? (maxSev===3? 14 : maxSev===2? 12 : 10) : 8;
        const lwIn  = maxSev ? (maxSev===3? 10 : maxSev===2? 8  : 6)  : 4;
        const opIn  = maxSev ? 1 : .25;

        const outer = L.polyline(latlngs, { color:'#000', weight:lwOut, opacity:1 }).addTo(map);
        const inner = L.polyline(latlngs, {
          color, weight:lwIn, opacity:opIn,
          className: (maxSev===3?'glow-red': maxSev===2?'glow-amber': maxSev===1?'glow-green':'glow-dim')
        }).addTo(map);

        const m = Math.floor(sc.length/2); const mid = [sc[m][1], sc[m][0]];
        let pin=null, pill=null;
        if (maxSev){
          pin  = L.marker(mid, { icon: iconPin(maxSev), zIndexOffset: 1000 }).addTo(map);
          const label = `${step.ref || step.name || 'Trecho'} • ${maxSev===3?'ALTO':maxSev===2?'MÉDIO':'BAIXO'}`;
          pill = L.marker(mid, { icon: pillLabel(label) }).addTo(map);
        }

        inner.bindPopup(
          `<div style="min-width:260px">
             <div style="font-weight:800;margin-bottom:6px">${step.ref || step.name || 'Trecho'}</div>
             Severidade: <strong>${maxSev || '—'}</strong><br/>
             Acidentes no buffer: ${count}<br/>
             Buffer considerado: ${(bufferKm*1000).toFixed(0)} m
           </div>`
        );

        stepLayers.push({ outer, inner, pin, pill, level:maxSev||0 });
      });
    });

    buildHeatAll();
    buildHeatRoute();
    rebuildPins();
    highlightOn = false;
  } catch(e){
    console.error(e);
    alert('Erro: ' + e.message);
  } finally {
    runBtn.disabled = false; runBtn.textContent = 'Rota + riscos';
  }
}

// Eventos
runBtn.addEventListener('click', build);
bufferInput.addEventListener('change', build);
highlightBtn.addEventListener('click', applyHighlight);
toggleHeatAll.addEventListener('click', ()=>{ if (!heatAll) buildHeatAll(); if (map.hasLayer(heatAll)) map.removeLayer(heatAll); else heatAll.addTo(map); });
toggleHeatRt.addEventListener('click', ()=>{ if (!heatRoute) buildHeatRoute(); if (heatRoute && (map.hasLayer(heatRoute))) map.removeLayer(heatRoute); else heatRoute && heatRoute.addTo(map); });
togglePinsBtn.addEventListener('click', ()=>{ pinsFilterByRoute = !pinsFilterByRoute; togglePinsBtn.textContent = pinsFilterByRoute ? 'Pinos: só na rota' : 'Pinos: todos'; rebuildPins(); });

// Inicial
build();
