
/* =========================================================
   ADMIN · GALERÍA POR CARPETAS Y SERIES
   Guarda carpeta/serie, metadata y ruta real gallery/serie/.
========================================================= */
(function(){
  if(window.__RM_ADMIN_GALLERY_FOLDERS__) return;
  window.__RM_ADMIN_GALLERY_FOLDERS__ = true;

  const DEFAULT_FOLDERS = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino','General'
  ];

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug = value => String(value || 'general')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'general';

  function currentData(){
    try{
      const data = typeof getData === 'function' ? getData() : {};
      data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
      data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      return data;
    }catch(e){
      return {settings:{},gallery:[]};
    }
  }

  function folderMap(data){
    return data.settings && data.settings.galleryFolderMap && typeof data.settings.galleryFolderMap === 'object'
      ? data.settings.galleryFolderMap : {};
  }

  function folderOf(item, data){
    const direct = item?.serie || item?.series || item?.folder || item?.carpeta || item?.category || item?.categoria;
    if(direct) return String(direct);
    const map = folderMap(data);
    const url = item?.url || item?.image || item?.image_url || '';
    return map[url] || 'General';
  }

  function allFolders(data){
    const stored = Array.isArray(data.settings?.galleryFolders) ? data.settings.galleryFolders : [];
    const items = (data.gallery || []).map(item => folderOf(item,data));
    return [...new Set([...DEFAULT_FOLDERS, ...stored, ...items].filter(Boolean))];
  }

  function persistFolderData(data){
    data.settings = data.settings || {};
    const map = {};
    (data.gallery || []).forEach(item => {
      const url = item.url || item.image || '';
      const folder = folderOf(item,data);
      item.serie = folder;
      item.series = folder;
      item.folder = folder;
      item.carpeta = folder;
      if(url) map[url] = folder;
    });
    data.settings.galleryFolderMap = map;
    data.settings.galleryFolders = [...new Set([
      ...DEFAULT_FOLDERS,
      ...(Array.isArray(data.settings.galleryFolders) ? data.settings.galleryFolders : []),
      ...Object.values(map)
    ].filter(Boolean))];
    return data;
  }

  function mediaType(item){
    const type = String(item?.type || item?.tipo || '').toLowerCase();
    const url = String(item?.url || item?.image || '').toLowerCase();
    return type === 'video' || type === 'video' || /\.mp4|\.webm|\.mov|youtube|youtu\.be/.test(url) ? 'video' : 'image';
  }

  function disableOldSeriesAdmin(){
    const legacy = $('rmGallerySeriesAdmin');
    if(legacy){
      legacy.innerHTML = '';
      legacy.hidden = true;
      legacy.style.setProperty('display','none','important');
    }
  }

  function renderList(){
    const list = $('rmFolderGalleryList');
    if(!list) return;
    const data = persistFolderData(currentData());
    const folders = allFolders(data);
    const rows = data.gallery || [];

    list.innerHTML = rows.length ? rows.map((item,index) => {
      const title = item.title || item.titulo || 'Sin título';
      const url = item.url || item.image || '';
      const folder = folderOf(item,data);
      const type = mediaType(item);
      const preview = url
        ? (type === 'video' ? '<div class="rm-folder-gallery-video">▶</div>' : '<img src="'+esc(url)+'" alt="'+esc(title)+'">')
        : '<div class="rm-folder-gallery-empty">RM</div>';
      return '<article class="rm-folder-gallery-item" data-index="'+index+'">' +
        '<div class="rm-folder-gallery-preview">'+preview+'</div>' +
        '<div class="rm-folder-gallery-copy"><strong>'+esc(title)+'</strong><span>'+esc(folder)+' · '+(type==='video'?'Video':'Fotografía')+'</span></div>' +
        '<select class="rmMoveGalleryFolder">'+folders.map(f => '<option value="'+esc(f)+'" '+(f===folder?'selected':'')+'>'+esc(f)+'</option>').join('')+'</select>' +
        '<button type="button" class="rmDeleteFolderMedia">Eliminar</button>' +
      '</article>';
    }).join('') : '<div class="rm-folder-gallery-empty-state">Aún no hay fotos o videos cargados. Selecciona una carpeta/serie y agrega contenido.</div>';

    list.querySelectorAll('.rmMoveGalleryFolder').forEach(select => {
      select.addEventListener('change', () => {
        const item = select.closest('.rm-folder-gallery-item');
        const idx = Number(item.dataset.index);
        const d = currentData();
        if(!d.gallery[idx]) return;
        const folder = select.value || 'General';
        d.gallery[idx].serie = folder;
        d.gallery[idx].series = folder;
        d.gallery[idx].folder = folder;
        d.gallery[idx].carpeta = folder;
        persistFolderData(d);
        if(typeof saveData === 'function') saveData(d);
        if(typeof toast === 'function') toast('Carpeta cambiada. Presiona Guardar carpetas para sincronizar.');
      });
    });

    list.querySelectorAll('.rmDeleteFolderMedia').forEach(button => {
      button.addEventListener('click', async () => {
        const row = button.closest('.rm-folder-gallery-item');
        const idx = Number(row.dataset.index);
        const d = currentData();
        if(!d.gallery[idx]) return;
        if(!confirm('¿Eliminar este archivo de la galería?')) return;
        d.gallery.splice(idx,1);
        persistFolderData(d);
        try{
          if(typeof saveAll === 'function') await saveAll(d);
          else if(typeof saveData === 'function') saveData(d);
          if(typeof toast === 'function') toast('Archivo eliminado.');
        }catch(error){
          if(typeof err === 'function') err(error);
        }
        renderList();
      });
    });
  }

  function updateFolderInput(){
    const select = $('rmGalleryFolder');
    const custom = $('rmCustomGalleryFolder');
    if(!select || !custom) return;
    custom.hidden = select.value !== '__new__';
    if(select.value !== '__new__') custom.value = '';
  }

  function selectedFolder(){
    const select = $('rmGalleryFolder');
    const custom = $('rmCustomGalleryFolder');
    const chosen = select?.value === '__new__' ? String(custom?.value || '').trim() : String(select?.value || '').trim();
    return chosen || 'General';
  }

  function createPanel(){
    const panel = $('tab-gallery');
    if(!panel) return;

    const data = persistFolderData(currentData());
    const folders = allFolders(data);

    panel.className = 'tab-content hidden rm-folder-gallery-admin';
    panel.innerHTML =
      '<h2>Galería por carpetas y series</h2>' +
      '<p class="rm-folder-gallery-help">Primero elige la carpeta o serie. El archivo se guardará físicamente en <b>gallery/carpeta/</b> y aparecerá dentro de esa carpeta en la web pública.</p>' +
      '<div class="rm-folder-gallery-form">' +
        '<label>Carpeta o serie<select id="rmGalleryFolder">'+
          folders.map(folder => '<option value="'+esc(folder)+'">'+esc(folder)+'</option>').join('')+
          '<option value="__new__">＋ Crear nueva carpeta</option>' +
        '</select></label>' +
        '<label id="rmCustomGalleryFolderWrap" hidden>Nueva carpeta<input id="rmCustomGalleryFolder" placeholder="Ej: Escuela de fútbol"></label>' +
        '<label>Título del archivo<input id="rmFolderMediaTitle" placeholder="Ej: Triunfo de la serie juvenil"></label>' +
        '<label>Tipo de contenido<select id="rmFolderMediaType"><option value="image">Fotografía</option><option value="video">Video</option></select></label>' +
        '<label>Subir fotografía o video<input id="rmFolderMediaFile" type="file" accept="image/*,video/*"></label>' +
        '<div class="rm-folder-gallery-or">o</div>' +
        '<label>URL de fotografía o video<input id="rmFolderMediaUrl" type="url" placeholder="https://..."></label>' +
        '<button type="button" id="rmFolderAddMedia">Guardar en carpeta</button>' +
      '</div>' +
      '<div class="rm-folder-gallery-actions"><button type="button" id="rmSaveFolderChanges">Guardar cambios de carpetas</button></div>' +
      '<h3 class="rm-folder-gallery-subtitle">Archivos cargados</h3>' +
      '<div id="rmFolderGalleryList" class="rm-folder-gallery-list"></div>';

    $('rmGalleryFolder').addEventListener('change', updateFolderInput);
    $('rmFolderAddMedia').addEventListener('click', addMedia);
    $('rmSaveFolderChanges').addEventListener('click', saveFolderChanges);
    renderList();
  }

  async function addMedia(){
    const folder = selectedFolder();
    const title = String($('rmFolderMediaTitle')?.value || '').trim();
    let url = String($('rmFolderMediaUrl')?.value || '').trim();
    const declaredType = $('rmFolderMediaType')?.value || 'image';
    const file = $('rmFolderMediaFile')?.files?.[0];

    if(file){
      try{
        // Ruta física real: gallery/<carpeta o serie>/<archivo>
        url = await uploadFile(file, 'gallery/' + slug(folder));
      }catch(error){
        if(typeof err === 'function') err(error);
        else alert(error.message || String(error));
        return;
      }
    }

    if(!url){
      if(typeof toast === 'function') toast('Selecciona un archivo o ingresa una URL.','error');
      else alert('Selecciona un archivo o ingresa una URL.');
      return;
    }

    const type = file ? (file.type?.startsWith('video') ? 'video' : 'image') : declaredType;
    const data = currentData();
    const item = {
      title: title || folder,
      titulo: title || folder,
      type,
      tipo:type,
      url,
      image:url,
      serie:folder,
      series:folder,
      folder,
      carpeta:folder
    };

    data.gallery.unshift(item);
    persistFolderData(data);

    try{
      if(typeof saveAll === 'function') await saveAll(data);
      else if(typeof saveData === 'function') saveData(data);
      if(typeof toast === 'function') toast('Archivo guardado en la carpeta '+folder+'.');
    }catch(error){
      if(typeof err === 'function') err(error);
      return;
    }

    $('rmFolderMediaTitle').value = '';
    $('rmFolderMediaUrl').value = '';
    $('rmFolderMediaFile').value = '';
    $('rmGalleryFolder').value = folder;
    renderList();
  }

  async function saveFolderChanges(){
    const data = persistFolderData(currentData());
    try{
      if(typeof saveAll === 'function') await saveAll(data);
      else if(typeof saveData === 'function') saveData(data);
      if(typeof toast === 'function') toast('Carpetas y series sincronizadas correctamente.');
      renderList();
    }catch(error){
      if(typeof err === 'function') err(error);
    }
  }

  function renameTab(){
    document.querySelectorAll('.tabs button[data-tab="tab-gallery"]').forEach(button => {
      button.textContent = 'Galería';
    });
  }

  function renderEventually(){
    disableOldSeriesAdmin();
    renameTab();
    createPanel();
  }

  function boot(){
    renderEventually();
    // El módulo antiguo alcanza a ejecutarse hasta los 2.6 s.
    setTimeout(renderEventually, 3100);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }

  if(typeof renderAll === 'function' && !window.__RM_WRAP_ADMIN_RENDER_GALLERY__){
    window.__RM_WRAP_ADMIN_RENDER_GALLERY__ = true;
    const previous = renderAll;
    window.renderAll = function(){
      const result = previous.apply(this, arguments);
      setTimeout(renderEventually, 50);
      return result;
    };
  }

  window.rmAdminGalleryFolders = renderEventually;
})();
