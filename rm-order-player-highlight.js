
/* =========================================================
   JUGADOR DESTACADO · BLOQUE FIJO Y VISIBLE
========================================================= */
(function(){
  if(window.__RM_PLAYER_HIGHLIGHT_VISIBLE_FIXED__) return;
  window.__RM_PLAYER_HIGHLIGHT_VISIBLE_FIXED__ = true;

  const SERIES = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino'
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function getDataSafe(){
    try{
      if(typeof getData === 'function') return getData() || {};
    }catch(e){}
    try{
      return JSON.parse(localStorage.getItem('cdrm_final_data_v5_funcional') || '{}');
    }catch(e){
      return {};
    }
  }

  function normalizeSerie(value){
    const raw = String(value || '').trim();
    const key = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^serie\s+/i,'').toLowerCase();
    return SERIES.find(serie => serie.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^serie\s+/i,'').toLowerCase() === key) || raw || 'Por serie';
  }

  function getHighlights(){
    const data = getDataSafe();
    const list = Array.isArray(data.playerHighlights)
      ? data.playerHighlights
      : (Array.isArray(data.settings?.playerHighlights) ? data.settings.playerHighlights : []);

    return list.map(item => ({
      serie: normalizeSerie(item.serie || item.series || item.category || ''),
      name: item.name || item.nombre || '',
      image: item.image || item.photo || item.foto || item.url || '',
      tactica: item.tactica !== false,
      garra: item.garra !== false,
      liderazgo: item.liderazgo !== false
    })).filter(item => item.name || item.serie);
  }

  function ensureSection(){
    let section = document.getElementById('playerHighlightsSection');
    if(section) return section;

    section = document.createElement('section');
    section.id = 'playerHighlightsSection';
    section.className = 'section rm-player-highlights-section';
    const positions = document.getElementById('rmFecha8Standings') || document.getElementById('posiciones');
    if(positions?.parentElement) positions.parentElement.insertBefore(section, positions);
    else (document.querySelector('main') || document.body).appendChild(section);
    return section;
  }

  function renderPlayerHighlights(){
    const section = ensureSection();
    const highlights = getHighlights();

    section.hidden = false;
    section.style.setProperty('display','block','important');
    section.style.setProperty('visibility','visible','important');
    section.style.setProperty('opacity','1','important');

    section.innerHTML =
      '<div class="section-head rm-highlight-head">' +
        '<div><h2>Jugador destacado del partido</h2><p>Reconocimiento por serie: táctica, garra y liderazgo.</p></div>' +
        '<span class="rm-highlight-label">RICARDO MÉNDEZ</span>' +
      '</div>' +
      '<div id="rmPlayerHighlightsGrid" class="rm-player-highlights-grid">' +
        (highlights.length ? highlights.map(item =>
          '<article class="rm-player-highlight-card">' +
            (item.image
              ? '<img src="'+esc(item.image)+'" alt="'+esc(item.name || 'Jugador destacado')+'" loading="lazy">'
              : '<div class="rm-player-highlight-photo">RM</div>') +
            '<div class="rm-player-highlight-content">' +
              '<span class="rm-highlight-serie">'+esc(item.serie)+'</span>' +
              '<h3>'+esc(item.name || 'Jugador por definir')+'</h3>' +
              '<div class="rm-highlight-badges">' +
                (item.tactica ? '<span>♟ Táctica</span>' : '') +
                (item.garra ? '<span>🔥 Garra</span>' : '') +
                (item.liderazgo ? '<span>★ Liderazgo</span>' : '') +
              '</div>' +
            '</div>' +
          '</article>'
        ).join('') :
        '<article class="rm-player-highlight-card rm-player-default-card">' +
          '<div class="rm-player-highlight-photo">RM</div>' +
          '<div class="rm-player-highlight-content">' +
            '<span class="rm-highlight-serie">POR SERIE</span>' +
            '<h3>Jugador por definir</h3>' +
            '<div class="rm-highlight-badges"><span>♟ Táctica</span><span>🔥 Garra</span><span>★ Liderazgo</span></div>' +
          '</div>' +
        '</article>') +
      '</div>';

    const positions = document.getElementById('rmFecha8Standings') || document.getElementById('posiciones');
    if(positions?.parentElement && section.parentElement !== document.getElementById('rmSportsSequence')){
      positions.parentElement.insertBefore(section, positions);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      renderPlayerHighlights();
      setTimeout(renderPlayerHighlights, 1200);
    }, {once:true});
  }else{
    renderPlayerHighlights();
    setTimeout(renderPlayerHighlights, 1200);
  }

  window.rmRenderPlayerHighlights = renderPlayerHighlights;
})();
