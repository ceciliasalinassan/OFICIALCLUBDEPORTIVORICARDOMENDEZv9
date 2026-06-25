
/* =========================================================
   ADMIN · CARGA DE FOTOS SIEMPRE VISIBLE
   Formulario fijo en HTML. Sin temporizadores ni observers.
========================================================= */
(function(){
  if(window.__RM_VISIBLE_GALLERY_UPLOAD__) return;
  window.__RM_VISIBLE_GALLERY_UPLOAD__ = true;

  const SERIES = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino','General'
  ];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function slug(value){
    return String(value || 'general')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'') || 'general';
  }

  function canonicalUrl(url){
    const raw = String(url || '').trim();
    if(!raw) return '';
    try{
      const parsed = new URL(raw);
      return parsed.origin.toLowerCase()+parsed.pathname;
    }catch(error){
      return raw.split('?')[0];
    }
  }

  function dataSafe(){
    try{
      const d = typeof getData === 'function' ? getData() : {};
      d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
      d.gallery = Array.isArray(d.gallery) ? d.gallery : [];
      return d;
    }catch(error){
      return {settings:{},gallery:[]};
    }
  }

  function saveSafe(data){
    try{
      if(typeof saveData === 'function') saveData(data);
    }catch(error){}
  }

  function setStatus(text,type=''){
    const box = $('rmVisibleGalleryStatus');
    if(!box) return;
    box.className = 'rm-visible-gallery-status '+type;
    box.textContent = text;
  }

  function typeOf(item){
    const declared = String(item?.type || item?.tipo || '').toLowerCase();
    const url = String(item?.url || item?.image || '').toLowerCase();
    return declared === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)|youtube|youtu\.be/.test(url) ? 'video' : 'image';
  }

  function folderOf(item,data){
    const direct = item?.serie || item?.series || item?.folder || item?.carpeta;
    if(direct) return String(direct);
    const map = data?.settings?.galleryFolderMap || {};
    return map[item?.url || item?.image || ''] || 'General';
  }

  function applyMetadata(data){
    data.settings = data.settings || {};
    data.settings.galleryFolderMap = data.settings.galleryFolderMap && typeof data.settings.galleryFolderMap === 'object'
      ? data.settings.galleryFolderMap : {};
    data.settings.galleryFileHashes = data.settings.galleryFileHashes && typeof data.settings.galleryFileHashes === 'object'
      ? data.settings.galleryFileHashes : {};
    data.settings.galleryFolders = Array.isArray(data.settings.galleryFolders)
      ? data.settings.galleryFolders : [];

    const unique = new Map();
    (data.gallery || []).forEach(item => {
      const key = canonicalUrl(item?.url || item?.image || '');
      if(!key || unique.has(key)) return;
      unique.set(key,item);
    });
    data.gallery = Array.from(unique.values());

    data.gallery.forEach(item => {
      const folder = folderOf(item,data);
      item.serie = folder;
      item.series = folder;
      item.folder = folder;
      item.carpeta = folder;
      const url = item.url || item.image || '';
      if(url) data.settings.galleryFolderMap[url] = folder;
      if(!data.settings.galleryFolders.includes(folder)) data.settings.galleryFolders.push(folder);
    });
    return data;
  }

  async function fingerprint(file){
    if(!file) return '';
    const basic = 'file:'+String(file.name || '').toLowerCase()+'|'+(file.size || 0)+'|'+(file.lastModified || 0);
    if(file.size > 8*1024*1024 || !window.crypto?.subtle || typeof file.arrayBuffer !== 'function') return basic;
    try{
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256',bytes);
      return 'sha256:'+Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2,'0')).join('');
    }catch(error){
      return basic;
    }
  }

  function isDuplicate(data,{url='',hash=''}){
    const hashes = data.settings?.galleryFileHashes || {};
    if(hash && hashes[hash]) return true;
    const key = canonicalUrl(url);
    return key && data.gallery.some(item => canonicalUrl(item.url || item.image || '') === key);
  }

  function updateFolderOptions(data){
    const filter = $('rmVisibleGalleryFilter');
    if(!filter) return;
    const values = [...new Set([...SERIES, ...(data.settings?.galleryFolders || []), ...(data.gallery || []).map(item => folderOf(item,data))].filter(Boolean))];
    const current = filter.value || '__all__';
    filter.innerHTML = '<option value="__all__">Todas las carpetas</option>'+values.map(value => '<option value="'+esc(value)+'">'+esc(value)+'</option>').join('');
    filter.value = [...filter.options].some(option => option.value === current) ? current : '__all__';
  }

  function renderList(){
    const holder = $('rmVisibleGalleryList');
    if(!holder) return;

    const data = applyMetadata(dataSafe());
    const search = String($('rmVisibleGallerySearch')?.value || '').trim().toLowerCase();
    const filter = $('rmVisibleGalleryFilter')?.value || '__all__';
    updateFolderOptions(data);

    const items = data.gallery.filter(item => {
      const folder = folderOf(item,data);
      const haystack = ((item.title || item.titulo || '')+' '+folder).toLowerCase();
      return (!search || haystack.includes(search)) && (filter === '__all__' || filter === folder);
    });

    holder.innerHTML = items.length ? items.map(item => {
      const title = item.title || item.titulo || 'Archivo de galería';
      const url = item.url || item.image || '';
      const folder = folderOf(item,data);
      return '<article class="rm-visible-gallery-row">'+
        '<div class="rm-visible-gallery-thumb">'+
          (typeOf(item) === 'video' ? '<span>▶</span>' : '<img src="'+esc(url)+'" alt="'+esc(title)+'" loading="lazy">')+
        '</div>'+
        '<div><strong>'+esc(title)+'</strong><small>'+esc(folder)+' · '+(typeOf(item)==='video'?'Video':'Fotografía')+'</small></div>'+
      '</article>';
    }).join('') : '<div class="rm-visible-gallery-empty">Aún no hay archivos en esta carpeta.</div>';
  }

  async function uploadNow(){
    const button = $('rmVisibleUploadGallery');
    if(!button || button.dataset.busy === '1') return;

    const folderSelect = $('rmVisibleGalleryFolder');
    const customFolder = String($('rmVisibleNewFolder')?.value || '').trim();
    const folder = folderSelect?.value === '__new__'
      ? (customFolder || 'General')
      : (folderSelect?.value || 'General');
    const title = String($('rmVisibleGalleryTitle')?.value || '').trim();
    const file = $('rmVisibleGalleryFile')?.files?.[0];
    let url = String($('rmVisibleGalleryUrl')?.value || '').trim();
    const declaredType = $('rmVisibleGalleryType')?.value || 'image';

    if(!file && !url){
      setStatus('Selecciona una foto/video o pega una URL.','error');
      return;
    }

    button.dataset.busy = '1';
    button.disabled = true;
    const label = button.textContent;
    button.textContent = 'Subiendo...';

    try{
      const data = applyMetadata(dataSafe());
      const hash = file ? await fingerprint(file) : '';

      if((hash && isDuplicate(data,{hash})) || (!file && isDuplicate(data,{url}))){
        throw new Error('Este archivo ya existe en la galería.');
      }

      if(file){
        if(typeof uploadFile !== 'function'){
          throw new Error('No se encontró el cargador de archivos. Abre Configuración y guarda Supabase.');
        }
        // La ruta física se crea por carpeta/serie.
        url = await uploadFile(file,'gallery/'+slug(folder));
      }

      if(isDuplicate(data,{url,hash})){
        throw new Error('Este archivo ya existe en la galería.');
      }

      const type = file ? (file.type?.startsWith('video') ? 'video' : 'image') : declaredType;
      const item = {
        title:title || folder,
        titulo:title || folder,
        type,
        tipo:type,
        url,
        image:url,
        serie:folder,
        series:folder,
        folder,
        carpeta:folder,
        hash
      };

      data.gallery.unshift(item);
      data.settings.galleryFolderMap = data.settings.galleryFolderMap || {};
      data.settings.galleryFolderMap[url] = folder;
      if(hash) data.settings.galleryFileHashes[hash] = {url,folder,title:item.title,updatedAt:new Date().toISOString()};
      applyMetadata(data);
      saveSafe(data);

      // Se guarda en Gallery y Settings usando la función principal de Admin.
      if(typeof pushCloud !== 'function'){
        throw new Error('No se pudo guardar en Supabase.');
      }
      await pushCloud(data);
      try{ if(typeof fillAdmin === 'function') fillAdmin(); }catch(error){}

      ['rmVisibleGalleryTitle','rmVisibleGalleryUrl','rmVisibleNewFolder'].forEach(id => {
        if($(id)) $(id).value = '';
      });
      if($('rmVisibleGalleryFile')) $('rmVisibleGalleryFile').value = '';
      if($('rmVisibleFileName')) $('rmVisibleFileName').textContent = 'Ningún archivo seleccionado';

      setStatus('✓ Archivo cargado correctamente en '+folder+'.','ok');
      renderList();
    }catch(error){
      console.error(error);
      setStatus('No se pudo cargar: '+(error?.message || error),'error');
    }finally{
      button.disabled = false;
      button.textContent = label;
      button.dataset.busy = '';
    }
  }

  async function refreshFromSupabase(){
    const button = $('rmVisibleRefreshGallery');
    if(button) button.disabled = true;
    setStatus('Actualizando fotos cargadas...','loading');
    try{
      if(typeof pullCloud !== 'function') throw new Error('No se pudo conectar con Supabase.');
      await pullCloud();
      applyMetadata(dataSafe());
      saveSafe(dataSafe());
      renderList();
      setStatus('✓ Listado actualizado.','ok');
    }catch(error){
      setStatus('No se pudo actualizar: '+(error?.message || error),'error');
    }finally{
      if(button) button.disabled = false;
    }
  }

  function openGalleryTab(){
    document.querySelectorAll('.tabs button').forEach(button => button.classList.remove('active'));
    const nav = document.querySelector('.tabs [data-tab="tab-gallery"]');
    if(nav) nav.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(panel => panel.classList.add('hidden'));
    $('tab-gallery')?.classList.remove('hidden');
    renderList();
  }

  function bind(){
    $('rmVisibleUploadGallery')?.addEventListener('click', uploadNow);
    $('rmVisibleRefreshGallery')?.addEventListener('click', refreshFromSupabase);
    $('rmVisibleGalleryFolder')?.addEventListener('change', () => {
      const wrap = $('rmVisibleNewFolderWrap');
      if(wrap) wrap.hidden = $('rmVisibleGalleryFolder').value !== '__new__';
    });
    $('rmVisibleGalleryFile')?.addEventListener('change', () => {
      const file = $('rmVisibleGalleryFile')?.files?.[0];
      if($('rmVisibleFileName')) $('rmVisibleFileName').textContent = file ? file.name : 'Ningún archivo seleccionado';
      if(file && file.type?.startsWith('video') && $('rmVisibleGalleryType')) $('rmVisibleGalleryType').value = 'video';
      if(file && file.type?.startsWith('image') && $('rmVisibleGalleryType')) $('rmVisibleGalleryType').value = 'image';
    });
    $('rmVisibleGallerySearch')?.addEventListener('input', renderList);
    $('rmVisibleGalleryFilter')?.addEventListener('change', renderList);

    // La pestaña abre la carga sin depender de módulos tardíos.
    document.querySelector('.tabs [data-tab="tab-gallery"]')?.addEventListener('click', () => {
      requestAnimationFrame(renderList);
    });

    renderList();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind, {once:true});
  }else{
    bind();
  }

  window.rmOpenGalleryUpload = openGalleryTab;
})();
