
/* =========================================================
   PÚBLICO · PANEL DE PARTIDO, FILTROS Y PUBLICACIÓN
   Render único después de cargar. Sin intervalos ni observers.
========================================================= */
(function(){
  if(window.__RM_PUBLIC_MEJORAS_ESTABLES__) return;
  window.__RM_PUBLIC_MEJORAS_ESTABLES__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

  function safeData(){
    try{
      const data = typeof getData === 'function' ? getData() : {};
      data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      data.news = Array.isArray(data.news) ? data.news : [];
      data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
      data.playerHighlights = Array.isArray(data.playerHighlights) ? data.playerHighlights : [];
      return data;
    }catch(e){
      try{return JSON.parse(localStorage.getItem('cdrm_final_data_v5_funcional') || '{}');}catch(err){return {settings:{},news:[],gallery:[],playerHighlights:[]};}
    }
  }

  function ensureControls(data){
    data.settings = data.settings || {};
    data.settings.contentControls = data.settings.contentControls && typeof data.settings.contentControls === 'object'
      ? data.settings.contentControls : {};
    const controls = data.settings.contentControls;
    controls.news = controls.news && typeof controls.news === 'object' ? controls.news : {};
    controls.gallery = controls.gallery && typeof controls.gallery === 'object' ? controls.gallery : {};
    controls.highlights = controls.highlights && typeof controls.highlights === 'object' ? controls.highlights : {};
    return controls;
  }

  function newsKey(item){return String(item?.id || item?.image || item?.url || [item?.title || item?.titulo || '', item?.date || item?.fecha || ''].join('|'));}
  function galleryKey(item){return String(item?.id || item?.url || item?.image || item?.image_url || item?.title || item?.titulo || '');}
  function highKey(item){return normal(item?.serie || item?.series || 'general')+'|'+normal(item?.name || item?.nombre || '');}

  function meta(data,type,item){
    const controls = ensureControls(data);
    const key = type === 'news' ? newsKey(item) : (type === 'gallery' ? galleryKey(item) : highKey(item));
    const map = controls[type];
    if(!map[key] || typeof map[key] !== 'object'){
      map[key] = {serie:item?.serie || item?.series || item?.folder || item?.carpeta || 'General', published:item?.published !== false};
    }
    return map[key];
  }

  function hydrate(data){
    data.news.forEach(item => {
      const value = meta(data,'news',item);
      item.serie = value.serie || 'General';
      item.published = value.published !== false;
    });
    data.gallery.forEach(item => {
      const value = meta(data,'gallery',item);
      item.serie = value.serie || item.serie || item.folder || 'General';
      item.published = value.published !== false;
    });
    data.playerHighlights.forEach(item => {
      const value = meta(data,'highlights',item);
      item.published = value.published !== false;
    });
    return data;
  }

  function isVideo(item){
    const type = String(item?.type || item?.tipo || '').toLowerCase();
    const url = String(item?.url || item?.image || item?.media || '').toLowerCase();
    return type === 'video' || /\.(mp4|webm|mov)(\?|$)|youtube|youtu\.be/.test(url);
  }

  function allSeries(items){
    const seen = new Set(['Todas las series']);
    items.forEach(item => seen.add(item.serie || item.series || item.folder || 'General'));
    return Array.from(seen);
  }

  function renderMatchPanels(data){
    const fixture = document.getElementById('fixture');
    if(!fixture || !fixture.parentElement) return;
    const panels = Array.isArray(data.settings?.matchPanels) ? data.settings.matchPanels.filter(item => item.published !== false) : [];
    let section = document.getElementById('rmPublicMatchPanels');
    if(!section){
      section = document.createElement('section');
      section.id = 'rmPublicMatchPanels';
      section.className = 'section rm-public-match-panels';
      fixture.insertAdjacentElement('afterend',section);
    }
    if(!panels.length){
      section.hidden = true;
      section.innerHTML = '';
      return;
    }
    section.hidden = false;
    section.innerHTML =
      '<div class="section-head"><div><h2>Panel de partidos</h2><p>Información actualizada por serie.</p></div></div>'+
      '<div class="rm-public-match-grid">'+
      panels.map(item => {
        const related = data.news.find(row => newsKey(row) === item.noticiaKey && row.published !== false);
        const media = item.media
          ? (item.mediaType === 'video'
            ? '<video controls preload="metadata" src="'+esc(item.media)+'"></video>'
            : '<img src="'+esc(item.media)+'" alt="Partido '+esc(item.serie || '')+'" loading="lazy">')
          : '';
        return '<article class="rm-public-match-card">'+
          (media ? '<div class="rm-public-match-media">'+media+'</div>' : '')+
          '<div class="rm-public-match-body">'+
            '<span class="rm-public-match-serie">'+esc(item.serie || 'General')+'</span>'+
            '<h3>Ricardo Méndez vs '+esc(item.rival || 'Rival por confirmar')+'</h3>'+
            '<p class="rm-public-match-data">📅 '+esc(item.fecha || 'Fecha por confirmar')+(item.hora ? ' · ⏰ '+esc(item.hora) : '')+'</p>'+
            '<p class="rm-public-match-data">📍 '+esc(item.cancha || 'Cancha por confirmar')+'</p>'+
            (item.resultado ? '<strong class="rm-public-match-score">'+esc(item.resultado)+'</strong>' : '')+
            (item.jugador ? '<p class="rm-public-match-player">★ Jugador destacado: <b>'+esc(item.jugador)+'</b></p>' : '')+
            (related ? '<p class="rm-public-match-news">📰 '+esc(related.title || related.titulo || 'Noticia relacionada')+'</p>' : '')+
          '</div>'+
        '</article>';
      }).join('')+
      '</div>';
  }

  function renderNewsFilter(data){
    const section = document.getElementById('rmNewsAccordionSection');
    if(!section) return;
    const visibleNews = data.news.filter(item => item.published !== false);
    const series = allSeries(visibleNews);
    let filterWrap = section.querySelector('.rm-public-series-filter-news');
    if(!filterWrap){
      filterWrap = document.createElement('div');
      filterWrap.className = 'rm-public-series-filter rm-public-series-filter-news';
      const head = section.querySelector('.rm-accordion-head') || section.firstElementChild;
      head?.insertAdjacentElement('afterend',filterWrap);
    }
    filterWrap.innerHTML = '<label>Filtrar por serie <select id="rmNewsSeriesFilter">'+series.map(value => '<option value="'+esc(value)+'">'+esc(value)+'</option>').join('')+'</select></label>';

    const grid = section.querySelector('.rm-news-accordion-grid');
    const fill = selected => {
      if(!grid) return;
      const rows = visibleNews.filter(item => selected === 'Todas las series' || (item.serie || 'General') === selected);
      grid.innerHTML = rows.length ? rows.map(item => {
        const title = item.title || item.titulo || 'Noticia';
        const text = item.text || item.descripcion || item.description || item.body || '';
        const image = item.image || item.url || '';
        return '<article class="rm-news-accordion-card">'+
          (image ? '<img src="'+esc(image)+'" alt="'+esc(title)+'" loading="lazy">' : '<div class="rm-news-no-img">RM</div>')+
          '<div class="rm-news-text"><span class="rm-content-serie">'+esc(item.serie || 'General')+'</span><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>'+
        '</article>';
      }).join('') : '<div class="rm-empty-box">No hay noticias publicadas en esta serie.</div>';
    };
    const select = filterWrap.querySelector('#rmNewsSeriesFilter');
    select.addEventListener('change', () => fill(select.value));
    fill(select.value);
  }

  function renderGalleryFilter(data){
    const section = document.getElementById('rmGalleryFoldersSection');
    if(!section) return;
    const visible = data.gallery.filter(item => item.published !== false);
    const series = allSeries(visible);
    let filterWrap = section.querySelector('.rm-public-series-filter-gallery');
    if(!filterWrap){
      filterWrap = document.createElement('div');
      filterWrap.className = 'rm-public-series-filter rm-public-series-filter-gallery';
      const head = section.querySelector('.rm-gallery-folder-head') || section.firstElementChild;
      head?.insertAdjacentElement('afterend',filterWrap);
    }
    filterWrap.innerHTML = '<label>Filtrar galería por serie <select id="rmGallerySeriesFilter">'+series.map(value => '<option value="'+esc(value)+'">'+esc(value)+'</option>').join('')+'</select></label>';

    const grid = section.querySelector('#rmGalleryFolderGrid');
    const content = section.querySelector('#rmGalleryFolderContent');
    const fill = selected => {
      if(!grid || !content) return;
      content.hidden = true; grid.hidden = false;
      const rows = visible.filter(item => selected === 'Todas las series' || (item.serie || 'General') === selected);
      const grouped = {};
      rows.forEach(item => {
        const serie = item.serie || 'General';
        grouped[serie] = grouped[serie] || [];
        grouped[serie].push(item);
      });
      const keys = Object.keys(grouped);
      grid.innerHTML = keys.length ? keys.map(serie =>
        '<button type="button" class="rm-serie-folder" data-serie="'+esc(serie)+'"><strong>'+esc(serie)+'</strong><span>'+grouped[serie].length+' archivo'+(grouped[serie].length===1?'':'s')+'</span></button>'
      ).join('') : '<div class="rm-empty-box">No hay archivos publicados en esta serie.</div>';

      grid.querySelectorAll('.rm-serie-folder').forEach(button => {
        button.addEventListener('click', () => {
          const serie = button.dataset.serie;
          const files = grouped[serie] || [];
          grid.hidden = true; content.hidden = false;
          content.innerHTML =
            '<div class="rm-folder-open-head"><button type="button" id="rmPublicBackFolders">← Volver</button><h3>'+esc(serie)+'</h3></div>'+
            '<div class="rm-folder-media-grid">'+files.map(item => {
              const url = item.url || item.image || '';
              const title = item.title || item.titulo || serie;
              return '<article class="rm-folder-media-card">'+
                (isVideo(item)
                  ? '<video src="'+esc(url)+'" controls preload="metadata"></video>'
                  : '<img src="'+esc(url)+'" alt="'+esc(title)+'" loading="lazy">')+
                '<h4>'+esc(title)+'</h4></article>';
            }).join('')+'</div>';
          content.querySelector('#rmPublicBackFolders')?.addEventListener('click', () => { content.hidden=true; grid.hidden=false; });
        });
      });
    };
    const select = filterWrap.querySelector('#rmGallerySeriesFilter');
    select.addEventListener('change', () => fill(select.value));
    fill(select.value);
  }

  function renderPublishedHighlights(data){
    const section = document.getElementById('playerHighlightsSection');
    if(!section) return;
    const visible = data.playerHighlights.filter(item => item.published !== false);
    const grid = section.querySelector('#rmPlayerHighlightsGrid');
    if(!grid) return;
    grid.innerHTML = visible.length ? visible.map(item =>
      '<article class="rm-player-highlight-card">'+
        (item.image ? '<img src="'+esc(item.image)+'" alt="'+esc(item.name || 'Jugador destacado')+'" loading="lazy">' : '<div class="rm-player-highlight-photo">RM</div>')+
        '<div class="rm-player-highlight-content"><span class="rm-highlight-serie">'+esc(item.serie || 'Por serie')+'</span><h3>'+esc(item.name || 'Jugador por definir')+'</h3>'+
          '<div class="rm-highlight-badges">'+
            (item.tactica !== false ? '<span>♟ Táctica</span>' : '')+
            (item.garra !== false ? '<span>🔥 Garra</span>' : '')+
            (item.liderazgo !== false ? '<span>★ Liderazgo</span>' : '')+
          '</div>'+
        '</div>'+
      '</article>'
    ).join('') : '<div class="rm-empty-box">No hay jugadores destacados publicados todavía.</div>';
  }

  function improveTableFilter(){
    const select = document.getElementById('rmFecha8SerieSelect') || document.getElementById('serieSelect');
    if(select){
      select.setAttribute('aria-label','Filtrar tabla de posiciones por serie');
      select.title = 'Filtrar tabla por serie';
    }
  }

  function patchPull(){
    if(typeof pullCloud !== 'function' || window.__RM_PUBLIC_PULL_HYDRATED__) return;
    window.__RM_PUBLIC_PULL_HYDRATED__ = true;
    const previous = pullCloud;
    window.pullCloud = async function(){
      const result = await previous.apply(this,arguments);
      const data = hydrate(result || safeData());
      try{ if(typeof saveData === 'function') saveData(data); }catch(e){}
      return data;
    };
  }

  function renderAllImprovements(){
    patchPull();
    const data = hydrate(safeData());
    renderMatchPanels(data);
    renderNewsFilter(data);
    renderGalleryFilter(data);
    renderPublishedHighlights(data);
    improveTableFilter();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      // Espera solo una vez a que terminen los módulos anteriores.
      setTimeout(renderAllImprovements, 3700);
    }, {once:true});
  }else{
    setTimeout(renderAllImprovements, 3700);
  }

  window.rmRenderPublicMejoras = renderAllImprovements;
})();
