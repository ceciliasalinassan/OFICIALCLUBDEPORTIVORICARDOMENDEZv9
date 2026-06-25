
/* =========================================================
   MEJORAS ADMINISTRACIÓN · PANEL DE PARTIDO Y PUBLICACIÓN
   Sin intervalos, sin MutationObserver y sin reordenamientos continuos.
========================================================= */
(function(){
  if(window.__RM_ADMIN_MEJORAS_ESTABLES__) return;
  window.__RM_ADMIN_MEJORAS_ESTABLES__ = true;

  const SERIES = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino','General'
  ];

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const slug = value => String(value || 'general')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'general';

  function getSafeData(){
    try{
      const data = typeof getData === 'function' ? getData() : {};
      data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      data.news = Array.isArray(data.news) ? data.news : [];
      data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
      data.playerHighlights = Array.isArray(data.playerHighlights) ? data.playerHighlights : [];
      return data;
    }catch(e){
      return {settings:{},news:[],gallery:[],playerHighlights:[]};
    }
  }

  function getControls(data){
    data.settings = data.settings || {};
    const current = data.settings.contentControls;
    if(!current || typeof current !== 'object'){
      data.settings.contentControls = {news:{},gallery:{},highlights:{}};
    }
    const controls = data.settings.contentControls;
    controls.news = controls.news && typeof controls.news === 'object' ? controls.news : {};
    controls.gallery = controls.gallery && typeof controls.gallery === 'object' ? controls.gallery : {};
    controls.highlights = controls.highlights && typeof controls.highlights === 'object' ? controls.highlights : {};
    return controls;
  }

  function normal(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  }

  function newsKey(item){
    return String(item?.id || item?.image || item?.url || [item?.title || item?.titulo || '', item?.date || item?.fecha || ''].join('|'));
  }

  function galleryKey(item){
    return String(item?.id || item?.url || item?.image || item?.image_url || item?.title || item?.titulo || '');
  }

  function highlightKey(item){
    return normal(item?.serie || item?.series || 'general') + '|' + normal(item?.name || item?.nombre || '');
  }

  function itemControl(data, type, item){
    const controls = getControls(data);
    const key = type === 'news' ? newsKey(item) : (type === 'gallery' ? galleryKey(item) : highlightKey(item));
    const map = controls[type];
    if(!map[key] || typeof map[key] !== 'object'){
      map[key] = {
        serie: item?.serie || item?.series || item?.folder || item?.carpeta || 'General',
        published: item?.published !== false
      };
    }
    return {key, value:map[key]};
  }

  function hydrateMeta(data){
    const controls = getControls(data);
    data.news.forEach(item => {
      const meta = itemControl(data,'news',item).value;
      item.serie = meta.serie || item.serie || 'General';
      item.series = item.serie;
      item.published = meta.published !== false;
    });
    data.gallery.forEach(item => {
      const meta = itemControl(data,'gallery',item).value;
      item.serie = meta.serie || item.serie || item.folder || 'General';
      item.series = item.serie;
      item.folder = item.serie;
      item.carpeta = item.serie;
      item.published = meta.published !== false;
      if(item.url || item.image){
        data.settings.galleryFolderMap = data.settings.galleryFolderMap || {};
        data.settings.galleryFolderMap[item.url || item.image] = item.serie;
      }
    });
    data.playerHighlights.forEach(item => {
      const meta = itemControl(data,'highlights',item).value;
      item.published = meta.published !== false;
    });
    return data;
  }

  function setStatus(text, type='ok'){
    const el = $('rmMejorasSyncStatus');
    if(!el) return;
    el.className = 'rm-mejoras-sync-status '+type;
    el.textContent = (type === 'ok' ? '✓ ' : '⚠ ') + text;
  }

  async function saveCloudConfirmed(data, successMessage){
    hydrateMeta(data);
    try{
      if(typeof saveData === 'function') saveData(data);
      if(typeof pushCloud !== 'function') throw new Error('No se encontró la función de guardado.');
      await pushCloud(data);
      setStatus(successMessage || 'Guardado correctamente en Supabase.', 'ok');
      if(typeof toast === 'function') toast(successMessage || 'Guardado correctamente en Supabase.');
      return true;
    }catch(error){
      if(typeof saveData === 'function') saveData(data);
      const message = 'Guardado local. No se pudo sincronizar con Supabase: ' + (error?.message || error);
      setStatus(message, 'error');
      if(typeof toast === 'function') toast(message, 'error');
      return false;
    }
  }

  function openTab(tabId, button){
    document.querySelectorAll('.tabs button').forEach(item => item.classList.remove('active'));
    if(button) button.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(panel => panel.classList.add('hidden'));
    $(tabId)?.classList.remove('hidden');
  }

  function addTab(id, label, beforeTab){
    const tabs = document.querySelector('.tabs');
    if(!tabs) return null;
    let button = tabs.querySelector('[data-tab="'+id+'"]');
    if(!button){
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = id;
      button.textContent = label;
      const ref = beforeTab ? tabs.querySelector('[data-tab="'+beforeTab+'"]') : null;
      if(ref) ref.insertAdjacentElement('beforebegin', button);
      else tabs.appendChild(button);
      button.addEventListener('click', () => openTab(id,button));
    }
    return button;
  }

  function addPanel(id){
    let panel = $(id);
    if(!panel){
      panel = document.createElement('section');
      panel.id = id;
      panel.className = 'tab-content hidden rm-mejoras-panel';
      const main = document.querySelector('main') || document.querySelector('#adminPanel') || document.body;
      main.appendChild(panel);
    }
    return panel;
  }

  function foldersFrom(data){
    const saved = Array.isArray(data.settings.galleryFolders) ? data.settings.galleryFolders : [];
    const used = [
      ...data.news.map(item => item.serie || item.series || 'General'),
      ...data.gallery.map(item => item.serie || item.series || item.folder || 'General')
    ];
    return [...new Set([...SERIES, ...saved, ...used].filter(Boolean))];
  }

  function optionList(values, selected){
    return values.map(value => '<option value="'+esc(value)+'" '+(String(value)===String(selected)?'selected':'')+'>'+esc(value)+'</option>').join('');
  }

  function ensureMatchPanelAdmin(){
    addTab('tab-match-panel','Panel de partido','tab-results');
    const panel = addPanel('tab-match-panel');
    const data = hydrateMeta(getSafeData());
    const news = data.news || [];

    panel.innerHTML =
      '<div class="rm-mejoras-title-row"><div><h2>Panel de partido</h2><p>Registra cada partido por serie y publícalo automáticamente en la web.</p></div><div id="rmMejorasSyncStatus" class="rm-mejoras-sync-status">✓ Listo para guardar.</div></div>' +
      '<div class="rm-match-panel-form">' +
        '<label>Serie<select id="rmMatchSerie">'+optionList(SERIES,SERIES[0])+'</select></label>' +
        '<label>Rival<input id="rmMatchRival" placeholder="Ej: Deportivo San Carlos"></label>' +
        '<label>Fecha<input id="rmMatchFecha" type="date"></label>' +
        '<label>Hora<input id="rmMatchHora" type="time"></label>' +
        '<label>Cancha / lugar<input id="rmMatchCancha" placeholder="Ej: Estadio Municipal"></label>' +
        '<label>Resultado<input id="rmMatchResultado" placeholder="Ej: Ricardo Méndez 3 - 1 Rival"></label>' +
        '<label>Jugador destacado<input id="rmMatchJugador" placeholder="Nombre del jugador"></label>' +
        '<label>Noticia relacionada<select id="rmMatchNoticia"><option value="">Sin noticia relacionada</option>'+news.map(item => '<option value="'+esc(newsKey(item))+'">'+esc(item.title || item.titulo || 'Noticia')+'</option>').join('')+'</select></label>' +
        '<label>Foto o video del partido<input id="rmMatchMediaFile" type="file" accept="image/*,video/*"></label>' +
        '<label>URL de foto o video<input id="rmMatchMediaUrl" type="url" placeholder="https://..."></label>' +
        '<label class="rm-inline-check"><input id="rmMatchVisible" type="checkbox" checked> Publicar en la web</label>' +
        '<label class="rm-inline-check"><input id="rmMatchSaveResult" type="checkbox" checked> Añadir a Últimos Resultados</label>' +
        '<button type="button" id="rmSaveMatchPanel">Guardar panel de partido</button>' +
      '</div>' +
      '<div class="rm-match-admin-list-wrap"><h3>Partidos guardados</h3><div id="rmMatchPanelList"></div></div>';

    $('rmSaveMatchPanel')?.addEventListener('click', saveMatchPanel);
    renderMatchPanelList();
  }

  async function saveMatchPanel(){
    const data = hydrateMeta(getSafeData());
    const serie = $('rmMatchSerie')?.value || 'General';
    const rival = String($('rmMatchRival')?.value || '').trim();
    const fecha = String($('rmMatchFecha')?.value || '').trim();
    const hora = String($('rmMatchHora')?.value || '').trim();
    const cancha = String($('rmMatchCancha')?.value || '').trim();
    const resultado = String($('rmMatchResultado')?.value || '').trim();
    const jugador = String($('rmMatchJugador')?.value || '').trim();
    const noticiaKey = $('rmMatchNoticia')?.value || '';
    let media = String($('rmMatchMediaUrl')?.value || '').trim();
    const mediaFile = $('rmMatchMediaFile')?.files?.[0];

    if(!rival && !resultado){
      setStatus('Debes ingresar al menos rival o resultado.', 'error');
      return;
    }

    if(mediaFile){
      try{
        media = await uploadFile(mediaFile, 'matches/'+slug(serie));
      }catch(error){
        setStatus(error?.message || 'No se pudo subir el archivo.', 'error');
        return;
      }
    }

    const mediaType = mediaFile
      ? (mediaFile.type?.startsWith('video') ? 'video' : 'image')
      : (/\.(mp4|webm|mov)(\?|$)|youtube|youtu\.be/i.test(media) ? 'video' : 'image');

    data.settings.matchPanels = Array.isArray(data.settings.matchPanels) ? data.settings.matchPanels : [];
    const item = {
      id: 'match_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      serie, rival, fecha, hora, cancha, resultado, jugador,
      noticiaKey, media, mediaType,
      published: !!$('rmMatchVisible')?.checked,
      updatedAt: new Date().toISOString()
    };
    data.settings.matchPanels.unshift(item);

    if(jugador){
      const idx = data.playerHighlights.findIndex(row => normal(row.serie || row.series) === normal(serie));
      const old = idx >= 0 ? data.playerHighlights[idx] : {};
      const highlight = {
        ...old,
        serie,
        name: jugador,
        tactica: old.tactica !== false,
        garra: old.garra !== false,
        liderazgo: old.liderazgo !== false,
        updatedAt: item.updatedAt
      };
      if(media && mediaType === 'image' && !highlight.image) highlight.image = media;
      if(idx >= 0) data.playerHighlights[idx] = highlight;
      else data.playerHighlights.push(highlight);
      itemControl(data,'highlights',highlight).value.published = item.published;
    }

    if(resultado && $('rmMatchSaveResult')?.checked){
      const matchText = 'Ricardo Méndez vs ' + (rival || 'Rival por confirmar');
      const duplicate = data.results.some(row =>
        normal(row.match) === normal(matchText) && String(row.score || '') === resultado && String(row.date || '') === fecha
      );
      if(!duplicate){
        data.results.unshift({
          date: fecha ? fecha + (hora ? ' · '+hora : '') : '',
          match: matchText,
          score: resultado,
          scorers: ''
        });
      }
    }

    const saved = await saveCloudConfirmed(data, 'Panel de partido guardado correctamente en Supabase.');
    if(saved){
      ['rmMatchRival','rmMatchFecha','rmMatchHora','rmMatchCancha','rmMatchResultado','rmMatchJugador','rmMatchMediaUrl'].forEach(id => { if($(id)) $(id).value=''; });
      if($('rmMatchMediaFile')) $('rmMatchMediaFile').value='';
      if($('rmMatchNoticia')) $('rmMatchNoticia').value='';
      renderMatchPanelList();
      renderPublicationControl();
    }
  }

  function renderMatchPanelList(){
    const list = $('rmMatchPanelList');
    if(!list) return;
    const data = hydrateMeta(getSafeData());
    const items = Array.isArray(data.settings.matchPanels) ? data.settings.matchPanels : [];

    list.innerHTML = items.length ? items.map((item,index) =>
      '<article class="rm-match-admin-row">'+
        '<div><strong>'+esc(item.serie || 'General')+'</strong><span>'+esc(item.rival || 'Rival por confirmar')+' · '+esc(item.fecha || 'Sin fecha')+(item.hora ? ' '+esc(item.hora) : '')+'</span><small>'+esc(item.resultado || 'Sin resultado')+'</small></div>'+
        '<div class="rm-match-row-actions"><button type="button" class="rmToggleMatch" data-index="'+index+'">'+(item.published !== false ? 'Ocultar' : 'Publicar')+'</button><button type="button" class="rmDeleteMatch" data-index="'+index+'">Eliminar</button></div>'+
      '</article>'
    ).join('') : '<div class="rm-empty-admin-box">Aún no hay partidos registrados.</div>';

    list.querySelectorAll('.rmToggleMatch').forEach(button => {
      button.addEventListener('click', async () => {
        const data = hydrateMeta(getSafeData());
        const index = Number(button.dataset.index);
        if(!data.settings.matchPanels?.[index]) return;
        data.settings.matchPanels[index].published = data.settings.matchPanels[index].published === false;
        await saveCloudConfirmed(data, data.settings.matchPanels[index].published ? 'Partido publicado en Supabase.' : 'Partido oculto en Supabase.');
        renderMatchPanelList();
      });
    });

    list.querySelectorAll('.rmDeleteMatch').forEach(button => {
      button.addEventListener('click', async () => {
        const data = hydrateMeta(getSafeData());
        const index = Number(button.dataset.index);
        if(!data.settings.matchPanels?.[index] || !confirm('¿Eliminar este panel de partido?')) return;
        data.settings.matchPanels.splice(index,1);
        await saveCloudConfirmed(data, 'Panel de partido eliminado correctamente en Supabase.');
        renderMatchPanelList();
      });
    });
  }

  function visibleButton(text, isVisible, cls=''){
    return '<button type="button" class="rmVisibilityButton '+cls+'">'+(isVisible ? 'Ocultar' : 'Publicar')+'</button>';
  }

  function ensurePublicationControl(){
    addTab('tab-publication-control','Publicar / ocultar','tab-news');
    const panel = addPanel('tab-publication-control');
    panel.innerHTML =
      '<div class="rm-mejoras-title-row"><div><h2>Publicar u ocultar contenido</h2><p>Controla qué aparece en la página pública y asigna una serie a cada noticia o archivo.</p></div><div id="rmMejorasSyncStatus" class="rm-mejoras-sync-status">✓ Listo para guardar.</div></div>'+
      '<div class="rm-publication-tabs"><button type="button" data-rm-public-list="news" class="active">Noticias</button><button type="button" data-rm-public-list="gallery">Galería</button><button type="button" data-rm-public-list="highlights">Jugador destacado</button></div>'+
      '<div id="rmPublicationList" class="rm-publication-list"></div>';

    panel.querySelectorAll('[data-rm-public-list]').forEach(button => {
      button.addEventListener('click', () => {
        panel.querySelectorAll('[data-rm-public-list]').forEach(row => row.classList.remove('active'));
        button.classList.add('active');
        renderPublicationControl(button.dataset.rmPublicList);
      });
    });
    renderPublicationControl('news');
  }

  function renderPublicationControl(type='news'){
    const holder = $('rmPublicationList');
    if(!holder) return;
    const data = hydrateMeta(getSafeData());
    const folders = foldersFrom(data);
    const list = type === 'news' ? data.news : (type === 'gallery' ? data.gallery : data.playerHighlights);

    holder.innerHTML = list.length ? list.map((item,index) => {
      const meta = itemControl(data,type,item);
      const title = type === 'news'
        ? (item.title || item.titulo || 'Noticia')
        : (type === 'gallery' ? (item.title || item.titulo || 'Archivo de galería') : ((item.serie || 'Serie')+' · '+(item.name || item.nombre || 'Jugador')));
      const currentSeries = meta.value.serie || item.serie || item.series || 'General';
      const allowSeries = type !== 'highlights';
      return '<article class="rm-publication-item" data-type="'+type+'" data-index="'+index+'">'+
        '<div class="rm-publication-copy"><strong>'+esc(title)+'</strong><small>'+esc(meta.value.published !== false ? 'Visible en la web' : 'Oculto de la web')+'</small></div>'+
        (allowSeries ? '<select class="rmPublicationSerie">'+optionList(folders,currentSeries)+'</select><button type="button" class="rmSavePublicationSerie">Guardar serie</button>' : '')+
        '<button type="button" class="rmTogglePublication">'+(meta.value.published !== false ? 'Ocultar' : 'Publicar')+'</button>'+
      '</article>';
    }).join('') : '<div class="rm-empty-admin-box">No hay contenido para administrar.</div>';

    holder.querySelectorAll('.rmTogglePublication').forEach(button => {
      button.addEventListener('click', async () => {
        const row = button.closest('.rm-publication-item');
        const itemType = row.dataset.type;
        const index = Number(row.dataset.index);
        const data = hydrateMeta(getSafeData());
        const items = itemType === 'news' ? data.news : (itemType === 'gallery' ? data.gallery : data.playerHighlights);
        const item = items[index];
        if(!item) return;
        const meta = itemControl(data,itemType,item);
        meta.value.published = meta.value.published === false;
        item.published = meta.value.published;
        await saveCloudConfirmed(data, meta.value.published ? 'Contenido publicado correctamente en Supabase.' : 'Contenido oculto correctamente en Supabase.');
        renderPublicationControl(itemType);
      });
    });

    holder.querySelectorAll('.rmSavePublicationSerie').forEach(button => {
      button.addEventListener('click', async () => {
        const row = button.closest('.rm-publication-item');
        const itemType = row.dataset.type;
        const index = Number(row.dataset.index);
        const series = row.querySelector('.rmPublicationSerie')?.value || 'General';
        const data = hydrateMeta(getSafeData());
        const items = itemType === 'news' ? data.news : data.gallery;
        const item = items[index];
        if(!item) return;
        const meta = itemControl(data,itemType,item);
        meta.value.serie = series;
        item.serie = series; item.series = series;
        if(itemType === 'gallery'){
          item.folder = series; item.carpeta = series;
          data.settings.galleryFolderMap = data.settings.galleryFolderMap || {};
          data.settings.galleryFolderMap[item.url || item.image || ''] = series;
        }
        await saveCloudConfirmed(data, 'Serie guardada correctamente en Supabase.');
        renderPublicationControl(itemType);
      });
    });
  }

  function ensureBackupTool(){
    const panel = $('tab-backup');
    if(!panel || $('rmBackupFullClub')) return;
    const box = document.createElement('div');
    box.id = 'rmBackupFullClub';
    box.className = 'admin-card rm-backup-full-club';
    box.innerHTML =
      '<h3>💾 Respaldo completo del club</h3>'+
      '<p>Descarga una copia JSON de toda la información: configuración, partidos, tablas, noticias, galería, jugadores destacados, historial y enlaces de archivos.</p>'+
      '<button type="button" id="rmDownloadFullBackup">Descargar respaldo completo</button>';
    panel.insertAdjacentElement('afterbegin', box);
    $('rmDownloadFullBackup')?.addEventListener('click', () => {
      const data = hydrateMeta(getSafeData());
      const backup = {
        format:'CDRM-RESPALDO-COMPLETO-V1',
        createdAt:new Date().toISOString(),
        club:'Club Deportivo Ricardo Méndez',
        data
      };
      const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'respaldo_club_ricardo_mendez_'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Respaldo completo descargado.', 'ok');
      if(typeof toast === 'function') toast('Respaldo completo descargado.');
    });
  }

  function patchCloudHydration(){
    if(typeof pullCloud !== 'function' || window.__RM_PULL_HYDRATE_MEJORAS__) return;
    window.__RM_PULL_HYDRATE_MEJORAS__ = true;
    const previous = pullCloud;
    window.pullCloud = async function(){
      const data = await previous.apply(this,arguments);
      const hydrated = hydrateMeta(data || getSafeData());
      if(typeof saveData === 'function') saveData(hydrated);
      return hydrated;
    };
  }

  function init(){
    patchCloudHydration();
    ensureMatchPanelAdmin();
    ensurePublicationControl();
    ensureBackupTool();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      init();
      // Una sola segunda pasada para convivir con los módulos previos que cargan la Galería.
      setTimeout(init, 3600);
    }, {once:true});
  }else{
    init();
    setTimeout(init, 3600);
  }

  window.rmAdminMejorasEstables = init;
})();
