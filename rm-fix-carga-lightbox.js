
/* =========================================================
   REPARACIÓN ESTABLE
   1) Carga real de fotos/videos desde Admin.
   2) Lightbox para ampliar fotografías con un toque/clic.
   No usa intervalos ni observers.
========================================================= */
(function(){
  if(window.__RM_UPLOAD_LIGHTBOX_REPAIR__) return;
  window.__RM_UPLOAD_LIGHTBOX_REPAIR__ = true;

  const DATA_KEY = 'cdrm_final_data_v5_funcional';
  const CFG_KEY = 'cdrm_supabase_cfg_v1';
  const BUCKET_SAFE = 'club-assets';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function pageIsAdmin(){
    return /admin(?:-simple)?\.html$/i.test(location.pathname) || /\/admin\//i.test(location.pathname);
  }

  function safeData(){
    try{
      const d = typeof getData === 'function'
        ? getData()
        : JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
      d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
      d.gallery = Array.isArray(d.gallery) ? d.gallery : [];
      return d;
    }catch(error){
      return {settings:{},gallery:[]};
    }
  }

  function saveSafe(d){
    try{
      if(typeof saveData === 'function') saveData(d);
      else localStorage.setItem(DATA_KEY, JSON.stringify(d));
    }catch(error){}
  }

  function setGalleryStatus(message, type=''){
    const status = document.getElementById('rmFullGalleryStatus');
    if(status){
      status.className = 'rm-full-gallery-status '+type;
      status.textContent = message;
    }
    try{
      if(typeof toast === 'function'){
        toast(message, type === 'error' ? 'error' : 'success');
      }
    }catch(error){}
  }

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

  function fileName(file){
    const original = file?.name || 'archivo.jpg';
    const ext = (original.split('.').pop() || 'jpg')
      .toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
    const base = original.replace(/\.[^.]+$/,'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_-]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,70) || 'archivo';
    const random = (crypto?.randomUUID ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10));
    return Date.now()+'_'+random+'_'+base+'.'+ext;
  }

  async function fastFingerprint(file){
    if(!file) return '';
    const basic = 'file:'+String(file.name || '').toLowerCase()+'|'+(file.size || 0)+'|'+(file.lastModified || 0);
    // Para fotos normales se usa hash real. Para videos muy grandes se evita congelar el navegador.
    if(file.size > 8 * 1024 * 1024 || !window.crypto?.subtle || typeof file.arrayBuffer !== 'function'){
      return basic;
    }
    try{
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return 'sha256:'+Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2,'0')).join('');
    }catch(error){
      return basic;
    }
  }

  function ensureHashMap(d){
    d.settings = d.settings || {};
    d.settings.galleryFileHashes = d.settings.galleryFileHashes && typeof d.settings.galleryFileHashes === 'object'
      ? d.settings.galleryFileHashes : {};
    return d.settings.galleryFileHashes;
  }

  function findDuplicate(d, {url='', hash=''}) {
    const hashes = ensureHashMap(d);
    if(hash && hashes[hash]) return true;
    const target = canonicalUrl(url);
    if(!target) return false;
    return (d.gallery || []).some(item => canonicalUrl(item.url || item.image || '') === target);
  }

  function ensureClient(){
    try{
      if(typeof initSB === 'function') initSB();
    }catch(error){}

    let client = null;
    try{
      if(typeof supabaseClient !== 'undefined' && supabaseClient?.storage) client = supabaseClient;
    }catch(error){}
    if(!client && window.supabaseClient?.storage) client = window.supabaseClient;
    if(!client && window.sb?.storage) client = window.sb;

    if(!client && window.supabase?.createClient){
      try{
        const cfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
        const url = String(cfg.url || 'https://xzcbdyabzgwfoylipgco.supabase.co').replace(/\/$/,'');
        const key = String(cfg.key || 'sb_publishable_rFYVLbY_0uJvOLJ0jftWzw_jsmNwVkl');
        client = window.supabase.createClient(url,key);
        window.supabaseClient = client;
        window.sb = client;
      }catch(error){}
    }

    if(!client?.storage){
      throw new Error('Supabase no está conectado. En Admin abre Configuración y guarda la conexión.');
    }
    return client;
  }

  async function uploadDirect(file, folder){
    const client = ensureClient();
    const path = 'gallery/'+slug(folder)+'/'+fileName(file);
    const {error} = await client.storage.from(BUCKET_SAFE).upload(path,file,{
      cacheControl:'3600',
      upsert:false,
      contentType:file.type || 'application/octet-stream'
    });
    if(error) throw new Error('No se pudo subir el archivo: '+error.message);

    const {data} = client.storage.from(BUCKET_SAFE).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('El archivo se subió, pero no se pudo obtener su URL pública.');
    return {client,path,url:data.publicUrl};
  }

  async function persistGallery(client, d, item){
    const {data:existing,error:readError} = await client.from('gallery')
      .select('url')
      .eq('url',item.url)
      .limit(1);
    if(readError) throw readError;
    if(Array.isArray(existing) && existing.length){
      throw new Error('Esta foto ya estaba registrada en la galería.');
    }

    const {error:insertError} = await client.from('gallery').insert({
      title:item.title,
      type:item.type,
      url:item.url,
      sort_order:0
    });
    if(insertError) throw insertError;

    const settings = d.settings || {};
    const {error:settingsError} = await client.from('settings').upsert(
      {key:'settings',value:JSON.stringify(settings)},
      {onConflict:'key'}
    );
    if(settingsError) throw settingsError;
  }

  async function addGalleryFromAdmin(){
    const button = document.getElementById('rmFullAddGallery');
    if(!button || button.dataset.uploadBusy === '1') return;

    const folderSelect = document.getElementById('rmFullGalleryFolder');
    const customFolder = String(document.getElementById('rmFullCustomFolder')?.value || '').trim();
    const folder = folderSelect?.value === '__new__'
      ? (customFolder || 'General')
      : (folderSelect?.value || 'General');
    const title = String(document.getElementById('rmFullGalleryTitle')?.value || '').trim();
    const typeSelect = document.getElementById('rmFullGalleryType')?.value || 'image';
    const file = document.getElementById('rmFullGalleryFile')?.files?.[0];
    let url = String(document.getElementById('rmFullGalleryUrl')?.value || '').trim();

    if(!file && !url){
      setGalleryStatus('Selecciona una foto/video o ingresa una URL.','error');
      return;
    }

    button.dataset.uploadBusy = '1';
    button.disabled = true;
    const initialText = button.textContent;
    button.textContent = 'Cargando...';

    const d = safeData();
    const hash = file ? await fastFingerprint(file) : '';

    if((hash && findDuplicate(d,{hash})) || (!file && findDuplicate(d,{url}))){
      setGalleryStatus('Este archivo ya existe. No se creó un duplicado.','error');
      button.disabled = false;
      button.textContent = initialText;
      button.dataset.uploadBusy = '';
      return;
    }

    try{
      setGalleryStatus('Subiendo archivo a la carpeta '+folder+'...','loading');
      let client = ensureClient();

      if(file){
        const uploaded = await uploadDirect(file,folder);
        client = uploaded.client;
        url = uploaded.url;
      }

      if(findDuplicate(d,{url,hash})){
        setGalleryStatus('Este archivo ya existe. No se creó un duplicado.','error');
        return;
      }

      const type = file
        ? (file.type?.startsWith('video') ? 'video' : 'image')
        : typeSelect;

      d.settings = d.settings || {};
      const hashes = ensureHashMap(d);
      d.settings.galleryFolderMap = d.settings.galleryFolderMap && typeof d.settings.galleryFolderMap === 'object'
        ? d.settings.galleryFolderMap : {};
      d.settings.galleryFolders = Array.isArray(d.settings.galleryFolders) ? d.settings.galleryFolders : [];
      if(!d.settings.galleryFolders.includes(folder)) d.settings.galleryFolders.push(folder);

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

      d.settings.galleryFolderMap[url] = folder;
      if(hash) hashes[hash] = {url,folder,title:item.title,updatedAt:new Date().toISOString()};
      d.gallery.unshift(item);
      saveSafe(d);

      await persistGallery(client,d,item);

      ['rmFullGalleryTitle','rmFullGalleryUrl','rmFullCustomFolder'].forEach(id => {
        const input = document.getElementById(id);
        if(input) input.value = '';
      });
      const fileInput = document.getElementById('rmFullGalleryFile');
      if(fileInput) fileInput.value = '';

      setGalleryStatus('✓ Foto/video cargado y guardado correctamente en '+folder+'.','ok');

      // Una única recarga de la lista después de guardar, no un ciclo continuo.
      setTimeout(() => {
        try{
          if(typeof window.rmReloadAllGalleryFromStorage === 'function'){
            window.rmReloadAllGalleryFromStorage();
          }
        }catch(error){}
      }, 250);
    }catch(error){
      console.error(error);
      setGalleryStatus(error?.message || 'No se pudo cargar el archivo.','error');
    }finally{
      button.disabled = false;
      button.textContent = initialText;
      button.dataset.uploadBusy = '';
    }
  }

  function bindAdminUpload(){
    if(!pageIsAdmin()) return;

    // Captura el clic antes del botón antiguo para usar el flujo reparado.
    document.addEventListener('click', function(event){
      const button = event.target.closest('#rmFullAddGallery');
      if(!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      addGalleryFromAdmin();
    }, true);
  }

  function eligiblePhoto(img){
    if(!img || !img.src) return false;
    if(img.closest('#rmImageLightbox')) return false;
    if(img.closest('button, .rm-no-lightbox, .club-logo, .brand-logo, #rmLogoBelowTopActions')) return false;
    const source = (img.currentSrc || img.src || '').toLowerCase();
    if(source.startsWith('data:image/svg')) return false;
    return true;
  }

  function closeLightbox(){
    document.getElementById('rmImageLightbox')?.remove();
  }

  function openLightbox(img){
    const src = img.currentSrc || img.src;
    if(!src) return;
    closeLightbox();

    const box = document.createElement('div');
    box.id = 'rmImageLightbox';
    box.className = 'rm-image-lightbox';
    box.setAttribute('role','dialog');
    box.setAttribute('aria-modal','true');
    box.setAttribute('aria-label','Imagen ampliada');
    box.innerHTML =
      '<button type="button" class="rm-image-lightbox-close" aria-label="Cerrar imagen">×</button>'+
      '<img src="'+esc(src)+'" alt="'+esc(img.alt || 'Imagen ampliada')+'">';
    document.body.appendChild(box);

    box.addEventListener('click', event => {
      if(event.target === box || event.target.closest('.rm-image-lightbox-close')) closeLightbox();
    });
  }

  function bindLightbox(){
    // El sistema anterior usaba un setInterval para reasignar clics.
    // Se reemplaza por un solo evento de captura para evitar saltos visuales.
    try{
      if(typeof window.bindLightbox === 'function'){
        window.bindLightbox = function(){};
      }
    }catch(error){}

    document.addEventListener('click', function(event){
      const img = event.target.closest('img');
      if(!eligiblePhoto(img)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openLightbox(img);
    }, true);

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') closeLightbox();
    });
  }

  function boot(){
    bindAdminUpload();
    bindLightbox();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
