// js/utils.js (no-module)
(function(){
  function getCSS(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  const colors = {
    cyan:  () => getCSS('--neon-cyan'),
    green: () => getCSS('--neon-green'),
    amber: () => getCSS('--neon-amber'),
    red:   () => getCSS('--neon-red'),
    dim:   () => getCSS('--safe-dim')
  };
  function colorBySev(s){ return s===3 ? colors.red() : s===2 ? colors.amber() : colors.green(); }

  function exIcon(sev){
    const color = colorBySev(sev);
    const pulse = sev===3 ? 'animation:pulse 1.8s infinite ease-out;' : '';
    const glow  =
      sev===3 ? `filter:drop-shadow(0 0 6px ${colors.red()}) drop-shadow(0 0 16px rgba(255,23,68,.7));` :
      sev===2 ? `filter:drop-shadow(0 0 6px ${colors.amber()}) drop-shadow(0 0 14px rgba(255,191,0,.6));` :
                `filter:drop-shadow(0 0 6px ${colors.green()}) drop-shadow(0 0 14px rgba(57,255,20,.6));`;
    return L.divIcon({
      className:"", iconSize:[28,28], iconAnchor:[14,14],
      html: `<div style="position:relative; transform:translate(-50%,-50%); width:28px; height:28px; display:grid; place-items:center; color:${color}; font-weight:900; font-size:22px; ${glow}">
               <span style="line-height:1">!</span>
               <span style="content:''; position:absolute; inset:0; border-radius:50%; background:currentColor; opacity:.25; filter:blur(6px); ${pulse}"></span>
             </div>`
    });
  }
  function iconPin(level){
    const cls = level===3 ? 'pin-red' : level===2 ? 'pin-amber' : 'pin-green';
    const char = level>=2 ? '!' : '•';
    const size = level===3 ? 24 : level===2 ? 20 : 16;
    return L.divIcon({
      className:"", iconSize:[26,26], iconAnchor:[13,13],
      html:`<div class="pulse-pin ${cls}" style="font-size:${size}px">${char}</div>`
    });
  }
  function pillLabel(text){
    return L.divIcon({ className:"", iconSize:[1,1], iconAnchor:[0,0], html:`<div class="pill">${text}</div>` });
  }
  function weight(sev){ return Math.min(1, (Number(sev)||1) / 3); }

  function accidentsNearRoute(acidentes, routeLine, bufferMeters){
    const limiarKm = bufferMeters / 1000;
    const perto = [];
    for (const a of acidentes){
      const snap = turf.nearestPointOnLine(routeLine, [a.lng, a.lat]);
      const dKm  = turf.distance(turf.point([a.lng, a.lat]), snap, { units:'kilometers' });
      if (dKm <= limiarKm) perto.push(a);
    }
    return perto;
  }
  function makeAccidentPinsLayer(acidentes, { routeLine=null, bufferKm=0.7, filterByBuffer=true } = {}){
    const group = L.layerGroup();
    for (const a of acidentes){
      let dentro = true;
      if (filterByBuffer && routeLine){
        const snap = turf.nearestPointOnLine(routeLine, [a.lng, a.lat]);
        const dKm  = turf.distance(turf.point([a.lng, a.lat]), snap, { units:'kilometers' });
        dentro = dKm <= bufferKm;
      }
      if (!dentro) continue;
      const sev = Number(a.severidade||1);
      const marker = L.marker([a.lat, a.lng], { icon: exIcon(sev), zIndexOffset:1200 })
        .bindPopup(`<div style="min-width:240px"><strong>Severidade:</strong> ${sev} ${sev===3?'(ALTO)':sev===2?'(MÉDIO)':'(BAIXO)'}<br/>${a.desc?`<strong>Obs.:</strong> ${a.desc}<br/>`:''}<small>Lat: ${a.lat.toFixed(5)}, Lng: ${a.lng.toFixed(5)}</small></div>`);
      group.addLayer(marker);
    }
    return group;
  }

  // expõe no escopo global
  window.Utils = { getCSS, colors, colorBySev, exIcon, iconPin, pillLabel, weight, accidentsNearRoute, makeAccidentPinsLayer };
})();
