
/* =========================================================
   ADMIN · GALERÍA COMPLETA DESDE SUPABASE STORAGE
   - Lee la tabla gallery y todos los archivos de Storage.
   - Incluye gallery/, gallery/series/, media/, photos/ y fotos/.
   - Sin intervalos ni MutationObserver.
========================================================= */
(function(){
  if(window.__RM_ADMIN_GALLERY_FULL_STORAGE__) return;
  window.__RM_ADMIN_GALLERY_FULL_STORAGE__ = true;

  const BASE_SERIES = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino','General'
  ];
  const PREFIXES = ['gallery','media','photos','fotos'];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const slug = value => String(value || 'general')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'general';

  function dataSafe(){
    try{
      const d = typeof getData === 'function' ? getData() : {};
      d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
      d.gallery = Array.isArray(d.gallery) ? d.gallery : [];
      return d;
    }catch(e){
      return {settings:{},gallery:[]};
    }
  }

  function typeOf(item){
    const type = String(item?.type || item?.tipo || '').toLowerCase();
    const url = String(item?.url || item?.image || '').toLowerCase();
    return type === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)|youtube|youtu\.be/.test(url) ? 'video' : 'image';
  }

  function imageOrVideo(name, mime){
    const text = (String(name || '')+' '+String(mime || '')).toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|heic|heif|mp4|webm|mov|m4v)$/i.test(String(name || '')) ||
      text.includes('image/') || text.includes('video/');
  }

  function storagePathFromUrl(url){
    const value = String(url || '');
    const marker = '/storage/v1/object/public/'+BUCKET+'/';
    const index = value.indexOf(marker);
    if(index >= 0) return decodeURIComponent(value.slice(index + marker.length).split('?')[0]);
    const signed = '/storage/v1/object/sign/'+BUCKET+'/';
    const signedIndex = value.indexOf(signed);
    if(signedIndex >= 0) return decodeURIComponent(value.slice(signedIndex + signed.length).split('?')[0]);
    return '';
  }

  function stableKey(item){
    const url = item?.url || item?.image || '';
    const storagePath = storagePathFromUrl(url);
    // La misma foto puede tener URL pública o firmada: la ruta física es la identidad.
    if(storagePath) return 'storage:' + storagePath;
    try{
      const parsed = new URL(String(url || ''));
      return 'url:' + parsed.origin.toLowerCase() + parsed.pathname;
    }catch(error){
      return 'url:' + String(url || '').split('?')[0].trim();
    }
  }

  function duplicateMap(d){
    d.settings = d.settings || {};
    d.settings.galleryFileHashes = d.settings.galleryFileHashes && typeof d.settings.galleryFileHashes === 'object'
      ? d.settings.galleryFileHashes : {};
    return d.settings.galleryFileHashes;
  }

  async function fingerprintFile(file){
    if(!file) return '';
    const basic = [file.name || '', file.size || 0, file.lastModified || 0].join('|');
    try{
      if(window.crypto?.subtle && typeof file.arrayBuffer === 'function'){
        const bytes = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2,'0')).join('');
      }
    }catch(error){}
    return 'basic:' + basic;
  }

  function uniqueGallery(items){
    const map = new Map();
    (items || []).forEach(item => {
      const key = stableKey(item);
      if(!key || key === 'url:') return;
      const current = map.get(key);
      if(!current){
        map.set(key, item);
        return;
      }
      // Se conserva la versión con título/carpeta ya definida.
      map.set(key, {
        ...item,
        ...current,
        url: current.url || item.url,
        image: current.image || item.image || current.url || item.url,
        title: current.title || item.title,
        serie: current.serie || item.serie,
        folder: current.folder || item.folder,
        carpeta: current.carpeta || item.carpeta,
        hash: current.hash || item.hash
      });
    });
    return Array.from(map.values());
  }

  function alreadyExists(d, candidate){
    const candidateKey = stableKey(candidate);
    const hash = candidate?.hash || candidate?.fileHash || '';
    const hashes = duplicateMap(d);

    if(hash && hashes[hash]) return true;
    return (d.gallery || []).some(item => stableKey(item) === candidateKey);
  }

  function nameTitle(path){
    const base = String(path || '').split('/').pop().replace(/\.[^.]+$/,'');
    return base
      .replace(/^\d{10,}[_-][a-z0-9]+[_-]/i,'')
      .replace(/^\d{10,}[_-]/,'')
      .replace(/[_-]+/g,' ')
      .trim() || 'Archivo de galería';
  }

  function allFolderNames(d){
    const saved = Array.isArray(d.settings?.galleryFolders) ? d.settings.galleryFolders : [];
    const fromItems = (d.gallery || []).map(item => item.serie || item.series || item.folder || item.carpeta || '');
    return [...new Set([...BASE_SERIES, ...saved, ...fromItems].filter(Boolean))];
  }

  function displayFolder(raw, d){
    const candidate = String(raw || '').trim();
    if(!candidate) return 'General';
    const all = allFolderNames(d);
    const target = slug(candidate);
    const found = all.find(folder => slug(folder) === target);
    if(found) return found;
    if(target === 'general' || target === 'gallery' || target === 'media') return 'General';
    return candidate
      .replace(/[_-]+/g,' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function folderFor(item, d){
    const direct = item?.serie || item?.series || item?.folder || item?.carpeta || item?.category || item?.categoria;
    if(direct) return displayFolder(direct,d);

    const map = d.settings?.galleryFolderMap && typeof d.settings.galleryFolderMap === 'object'
      ? d.settings.galleryFolderMap : {};
    const url = item?.url || item?.image || '';
    if(map[url]) return displayFolder(map[url],d);

    const path = storagePathFromUrl(url);
    const parts = path.split('/').filter(Boolean);
    if(parts[0] === 'gallery' && parts.length >= 3) return displayFolder(parts[1],d);
    return 'General';
  }

  function applyMetadata(d){
    d.settings = d.settings || {};
    const map = {};
    const hashes = duplicateMap(d);
    const folders = allFolderNames(d);

    // El estado local siempre queda sin elementos repetidos.
    d.gallery = uniqueGallery(d.gallery || []);

    (d.gallery || []).forEach(item => {
      const folder = folderFor(item,d);
      item.serie = folder;
      item.series = folder;
      item.folder = folder;
      item.carpeta = folder;
      item.type = typeOf(item);
      const url = item.url || item.image || '';
      if(url) map[url] = folder;
      if(item.hash) hashes[item.hash] = {
        url,
        folder,
        title:item.title || '',
        updatedAt:new Date().toISOString()
      };
      if(!folders.includes(folder)) folders.push(folder);
    });
    d.settings.galleryFolderMap = map;
    d.settings.galleryFileHashes = hashes;
    d.settings.galleryFolders = folders;
    return d;
  }

  function status(text, type=''){
    const box = $('rmFullGalleryStatus');
    if(!box) return;
    box.className = 'rm-full-gallery-status '+type;
    box.textContent = text;
  }

  async function ensureClient(){
    if(typeof initSB === 'function') initSB();
    if(!supabaseClient?.storage) throw new Error('Supabase no está conectado. Abre Configuración y guarda la conexión.');
    return supabaseClient;
  }

  async function dbGalleryRows(client){
    const rows = [];
    let offset = 0;
    while(true){
      const {data,error} = await client.from('gallery')
        .select('*')
        .order('sort_order',{ascending:true})
        .range(offset,offset+999);
      if(error) throw error;
      const batch = Array.isArray(data) ? data : [];
      rows.push(...batch.map(row => ({title:row.title || '',type:row.type || 'image',url:row.url || ''})));
      if(batch.length < 1000) break;
      offset += 1000;
    }
    return rows;
  }

  async function listPrefix(client, prefix, depth=0){
    if(depth > 5) return [];
    const files = [];
    let offset = 0;
    while(true){
      const {data,error} = await client.storage.from(BUCKET).list(prefix,{
        limit:1000,
        offset,
        sortBy:{column:'name',order:'asc'}
      });
      if(error) throw error;
      const batch = Array.isArray(data) ? data : [];
      for(const item of batch){
        const isFolder = !item.id && !item.metadata;
        const path = prefix ? prefix + '/' + item.name : item.name;
        if(isFolder){
          const nested = await listPrefix(client,path,depth+1);
          files.push(...nested);
        }else if(imageOrVideo(item.name,item.metadata?.mimetype)){
          files.push({
            path,
            name:item.name,
            mime:item.metadata?.mimetype || '',
            updatedAt:item.updated_at || item.created_at || ''
          });
        }
      }
      if(batch.length < 1000) break;
      offset += 1000;
    }
    return files;
  }

  async function storageGalleryFiles(client){
    const collected = [];
    const visited = new Set();
    for(const prefix of PREFIXES){
      try{
        const rows = await listPrefix(client,prefix);
        for(const row of rows){
          if(visited.has(row.path)) continue;
          visited.add(row.path);
          const {data} = client.storage.from(BUCKET).getPublicUrl(row.path);
          const url = data?.publicUrl || '';
          if(!url) continue;
          const parts = row.path.split('/').filter(Boolean);
          const rawFolder = parts[0] === 'gallery' && parts.length >= 3 ? parts[1] : 'General';
          collected.push({
            title:nameTitle(row.path),
            type:/\.(mp4|webm|mov|m4v)$/i.test(row.name) ? 'video' : 'image',
            url,
            folderRaw:rawFolder,
            storagePath:row.path,
            updatedAt:row.updatedAt
          });
        }
      }catch(error){
        // Algunas carpetas antiguas pueden no existir; la otra información sigue cargando.
        if(prefix === 'gallery') throw error;
      }
    }
    return collected;
  }

  function mergeAll(d, dbRows, storageRows){
    const merged = new Map();
    const add = (item, origin='') => {
      const url = item?.url || item?.image || '';
      if(!url) return;
      const key = stableKey(item) || ('url:' + url);
      const before = merged.get(key);
      const incoming = {...item};
      if(!before){
        merged.set(key,incoming);
        return;
      }
      merged.set(key,{
        ...incoming,
        ...before,
        url:before.url || incoming.url,
        image:before.image || incoming.image || before.url || incoming.url,
        title:before.title || incoming.title,
        type:before.type || incoming.type,
        serie:before.serie || incoming.serie,
        series:before.series || incoming.series,
        folder:before.folder || incoming.folder,
        carpeta:before.carpeta || incoming.carpeta,
        _fromStorage:before._fromStorage || incoming._fromStorage
      });
    };

    (d.gallery || []).forEach(item => add({...item},'local'));
    (dbRows || []).forEach(item => add({...item},'database'));
    (storageRows || []).forEach(item => {
      add({
        title:item.title,
        type:item.type,
        url:item.url,
        image:item.url,
        serie:displayFolder(item.folderRaw,d),
        series:displayFolder(item.folderRaw,d),
        folder:displayFolder(item.folderRaw,d),
        carpeta:displayFolder(item.folderRaw,d),
        _fromStorage:true,
        _storagePath:item.storagePath
      },'storage');
    });

    d.gallery = uniqueGallery(Array.from(merged.values())).map(item => {
      const output = {...item};
      delete output._fromStorage;
      delete output._storagePath;
      output.serie = folderFor(output,d);
      output.series = output.serie;
      output.folder = output.serie;
      output.carpeta = output.serie;
      output.type = typeOf(output);
      return output;
    }).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

    return applyMetadata(d);
  }

  async function persistSettings(client, d){
    const {error} = await client.from('settings').upsert(
      {key:'settings',value:JSON.stringify(d.settings || {})},
      {onConflict:'key'}
    );
    if(error) throw error;
  }

  async function insertMissingRows(client, d, dbRows){
    const known = new Set((dbRows || []).map(stableKey).filter(Boolean));
    const uniqueMissing = uniqueGallery(d.gallery || []).filter(item => !known.has(stableKey(item)));
    if(!uniqueMissing.length) return 0;

    const rows = [];
    const seen = new Set();
    for(const item of uniqueMissing){
      const key = stableKey(item);
      const url = item.url || item.image || '';
      if(!url || seen.has(key)) continue;
      seen.add(key);

      // Segunda barrera: se consulta Supabase antes de insertar.
      const {data:exists,error:existsError} = await client.from('gallery')
        .select('url')
        .eq('url',url)
        .limit(1);
      if(existsError) throw existsError;
      if(Array.isArray(exists) && exists.length) continue;

      rows.push({
        title:item.title || item.serie || 'Galería',
        type:item.type || 'image',
        url,
        sort_order:Math.max(0,(d.gallery.length - rows.length))
      });
    }

    for(let start=0; start<rows.length; start+=100){
      const {error} = await client.from('gallery').insert(rows.slice(start,start+100));
      if(error) throw error;
    }
    return rows.length;
  }

  async function reloadEverything({sync=false}={}){
    const refresh = $('rmReloadFullGallery');
    const syncButton = $('rmSyncFullGallery');
    if(refresh) refresh.disabled = true;
    if(syncButton) syncButton.disabled = true;
    status('Cargando todas las fotos y videos sin duplicarlas...', 'loading');

    try{
      const client = await ensureClient();
      const [dbRows, storageRows] = await Promise.all([
        dbGalleryRows(client),
        storageGalleryFiles(client)
      ]);

      const d = mergeAll(dataSafe(),dbRows,storageRows);
      if(typeof saveData === 'function') saveData(d);

      let inserted = 0;
      if(sync){
        status('Sincronizando archivos encontrados con Supabase...', 'loading');
        inserted = await insertMissingRows(client,d,dbRows);
        await persistSettings(client,d);
      }

      renderPanel(d);
      const total = d.gallery.length;
      status(
        sync
          ? '✓ '+total+' archivos disponibles. '+inserted+' archivo(s) agregado(s) a la galería de Supabase.'
          : '✓ '+total+' archivos disponibles: '+dbRows.length+' registrados y '+storageRows.length+' encontrados en Storage.',
        'ok'
      );
    }catch(error){
      console.error(error);
      renderPanel(dataSafe());
      status('No se pudo leer todo Storage: '+(error?.message || error)+'. Las fotos ya registradas siguen visibles.', 'error');
    }finally{
      if(refresh) refresh.disabled = false;
      if(syncButton) syncButton.disabled = false;
    }
  }

  function folders(d){
    return allFolderNames(d);
  }

  function renderPanel(d=dataSafe()){
    const panel = $('tab-gallery');
    if(!panel) return;

    // Se elimina la galería antigua por series fuera de Admin: no toca fixture ni página pública.
    const legacy = $('rmGallerySeriesAdmin');
    if(legacy){
      legacy.hidden = true;
      legacy.style.setProperty('display','none','important');
    }

    const allFolders = folders(d);
    panel.className = 'tab-content hidden rm-full-gallery-admin';
    panel.innerHTML =
      '<div class="rm-full-gallery-header">'+
        '<div><h2>Galería: todas las fotografías y videos</h2><p>El listado reúne los archivos registrados y los existentes en Storage, sin repetir archivos.</p></div>'+
        '<div class="rm-full-gallery-actions">'+
          '<button type="button" id="rmReloadFullGallery">Actualizar listado completo</button>'+
          '<button type="button" id="rmSyncFullGallery">Sincronizar todo con Supabase</button>'+
        '</div>'+
      '</div>'+
      '<div id="rmFullGalleryStatus" class="rm-full-gallery-status">Cargando galería...</div>'+
      '<div class="rm-full-gallery-form">'+
        '<label>Carpeta / serie<select id="rmFullGalleryFolder">'+allFolders.map(folder => '<option value="'+esc(folder)+'">'+esc(folder)+'</option>').join('')+'<option value="__new__">＋ Crear nueva carpeta</option></select></label>'+
        '<label id="rmFullCustomFolderWrap" hidden>Nueva carpeta<input id="rmFullCustomFolder" placeholder="Ej: Escuela de Fútbol"></label>'+
        '<label>Título<input id="rmFullGalleryTitle" placeholder="Ej: Fecha 8 · Serie Juveniles"></label>'+
        '<label>Tipo<select id="rmFullGalleryType"><option value="image">Fotografía</option><option value="video">Video</option></select></label>'+
        '<label>Archivo<input id="rmFullGalleryFile" type="file" accept="image/*,video/*"></label>'+
        '<label>URL<input id="rmFullGalleryUrl" type="url" placeholder="https://..."></label>'+
        '<button type="button" id="rmFullAddGallery">Guardar en carpeta</button>'+
      '</div>'+
      '<div class="rm-full-gallery-tools">'+
        '<input id="rmFullGallerySearch" type="search" placeholder="Buscar por título o serie">'+
        '<select id="rmFullGalleryFilter"><option value="__all__">Todas las carpetas</option>'+allFolders.map(folder => '<option value="'+esc(folder)+'">'+esc(folder)+'</option>').join('')+'</select>'+
        '<strong id="rmFullGalleryCount"></strong>'+
      '</div>'+
      '<div id="rmFullGalleryRows" class="rm-full-gallery-rows"></div>';

    $('rmReloadFullGallery')?.addEventListener('click', () => reloadEverything({sync:false}));
    $('rmSyncFullGallery')?.addEventListener('click', () => reloadEverything({sync:true}));
    $('rmFullGalleryFolder')?.addEventListener('change', () => {
      const wrap = $('rmFullCustomFolderWrap');
      if(wrap) wrap.hidden = $('rmFullGalleryFolder').value !== '__new__';
    });
    $('rmFullAddGallery')?.addEventListener('click', addGalleryItem);
    $('rmFullGallerySearch')?.addEventListener('input', () => renderRows(dataSafe()));
    $('rmFullGalleryFilter')?.addEventListener('change', () => renderRows(dataSafe()));
    renderRows(d);
  }

  function visibleRows(d){
    const search = String($('rmFullGallerySearch')?.value || '').toLowerCase().trim();
    const filter = $('rmFullGalleryFilter')?.value || '__all__';
    return uniqueGallery(d.gallery || []).filter(item => {
      const folder = folderFor(item,d);
      const text = ((item.title || '')+' '+folder).toLowerCase();
      return (!search || text.includes(search)) && (filter === '__all__' || folder === filter);
    });
  }

  function renderRows(d=dataSafe()){
    const holder = $('rmFullGalleryRows');
    const count = $('rmFullGalleryCount');
    if(!holder) return;
    const list = visibleRows(d);
    if(count) count.textContent = list.length+' archivo(s)';
    const allFolders = folders(d);

    holder.innerHTML = list.length ? list.map(item => {
      const index = d.gallery.indexOf(item);
      const url = item.url || item.image || '';
      const title = item.title || item.titulo || 'Archivo de galería';
      const folder = folderFor(item,d);
      return '<article class="rm-full-gallery-row" data-index="'+index+'">'+
        '<div class="rm-full-gallery-preview">'+
          (typeOf(item) === 'video' ? '<span>▶</span>' : '<img src="'+esc(url)+'" alt="'+esc(title)+'" loading="lazy">')+
        '</div>'+
        '<div class="rm-full-gallery-copy"><strong>'+esc(title)+'</strong><small>'+esc(folder)+' · '+(typeOf(item)==='video'?'Video':'Fotografía')+'</small></div>'+
        '<select class="rmFullMoveFolder">'+allFolders.map(value => '<option value="'+esc(value)+'" '+(value===folder?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select>'+
        '<button type="button" class="rmFullSaveFolder">Guardar carpeta</button>'+
      '</article>';
    }).join('') : '<div class="rm-full-gallery-empty">No hay archivos que coincidan con el filtro.</div>';

    holder.querySelectorAll('.rmFullSaveFolder').forEach(button => {
      button.addEventListener('click', async () => {
        const row = button.closest('.rm-full-gallery-row');
        const index = Number(row.dataset.index);
        const d = dataSafe();
        const item = d.gallery[index];
        if(!item) return;
        const folder = row.querySelector('.rmFullMoveFolder')?.value || 'General';
        item.serie = folder;
        item.series = folder;
        item.folder = folder;
        item.carpeta = folder;
        applyMetadata(d);
        if(typeof saveData === 'function') saveData(d);

        try{
          const client = await ensureClient();
          await persistSettings(client,d);
          status('✓ Carpeta guardada en Supabase: '+folder+'.','ok');
          renderRows(d);
        }catch(error){
          status('No se pudo sincronizar la carpeta: '+(error?.message || error),'error');
        }
      });
    });
  }

  async function addGalleryItem(){
    const select = $('rmFullGalleryFolder');
    const custom = String($('rmFullCustomFolder')?.value || '').trim();
    const folder = select?.value === '__new__' ? (custom || 'General') : (select?.value || 'General');
    const title = String($('rmFullGalleryTitle')?.value || '').trim();
    const wantedType = $('rmFullGalleryType')?.value || 'image';
    const file = $('rmFullGalleryFile')?.files?.[0];
    let url = String($('rmFullGalleryUrl')?.value || '').trim();

    if(!file && !url){
      status('Selecciona un archivo o ingresa una URL.','error');
      return;
    }

    const d = applyMetadata(dataSafe());
    const hash = file ? await fingerprintFile(file) : '';

    // Primera barrera: mismo archivo binario o misma URL ya registrada.
    if((hash && alreadyExists(d,{hash})) || (!file && alreadyExists(d,{url,image:url}))){
      status('Este archivo ya está cargado. No se creó un duplicado.','error');
      return;
    }

    try{
      const client = await ensureClient();
      if(file){
        // Solo se sube después de verificar la huella del archivo.
        url = await uploadFile(file,'gallery/'+slug(folder));
      }

      const item = {
        title:title || folder,
        titulo:title || folder,
        type:file ? (file.type?.startsWith('video') ? 'video' : 'image') : wantedType,
        tipo:file ? (file.type?.startsWith('video') ? 'video' : 'image') : wantedType,
        url,
        image:url,
        serie:folder,
        series:folder,
        folder,
        carpeta:folder,
        hash
      };

      // Segunda barrera con la URL final generada por Storage.
      if(alreadyExists(d,item)){
        status('Este archivo ya existe en la galería. No se creó un duplicado.','error');
        return;
      }

      const {data:existingRows,error:existingError} = await client.from('gallery')
        .select('url')
        .eq('url',url)
        .limit(1);
      if(existingError) throw existingError;
      if(Array.isArray(existingRows) && existingRows.length){
        status('Este archivo ya está registrado en Supabase. No se creó un duplicado.','error');
        return;
      }

      d.gallery.unshift(item);
      applyMetadata(d);
      if(typeof saveData === 'function') saveData(d);

      const {error} = await client.from('gallery').insert({
        title:item.title,
        type:item.type,
        url:item.url,
        sort_order:0
      });
      if(error) throw error;
      await persistSettings(client,d);

      ['rmFullGalleryTitle','rmFullGalleryUrl','rmFullCustomFolder'].forEach(id => {if($(id)) $(id).value='';});
      if($('rmFullGalleryFile')) $('rmFullGalleryFile').value='';
      status('✓ Archivo guardado en '+folder+' sin duplicarlo.','ok');
      renderPanel(d);
      renderRows(d);
    }catch(error){
      status('No se pudo guardar: '+(error?.message || error),'error');
    }
  }

  function activateTab(){
    const tabs = document.querySelector('.tabs');
    const panel = $('tab-gallery');
    if(!tabs || !panel) return;
    const button = tabs.querySelector('[data-tab="tab-gallery"]');
    if(button && button.dataset.rmFullGalleryBound !== '1'){
      button.dataset.rmFullGalleryBound = '1';
      button.textContent = 'Galería';
      button.addEventListener('click', () => {
        setTimeout(() => reloadEverything({sync:false}), 40);
      });
    }
  }

  function setup(){
    activateTab();
    renderPanel(dataSafe());
    // Se consulta una vez al finalizar la carga inicial; no hay bucles ni observadores.
    reloadEverything({sync:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 4200), {once:true});
  }else{
    setTimeout(setup, 4200);
  }

  window.rmReloadAllGalleryFromStorage = () => reloadEverything({sync:false});
})();
