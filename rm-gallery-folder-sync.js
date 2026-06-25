
/* =========================================================
   SINCRONIZACIÓN DE CARPETAS DE GALERÍA
   Mantiene metadata de serie aunque la tabla gallery no tenga columna serie.
========================================================= */
(function(){
  if(window.__RM_GALLERY_FOLDER_SYNC__) return;
  window.__RM_GALLERY_FOLDER_SYNC__ = true;

  function getDataSafe(){
    try{return typeof getData === 'function' ? getData() : {};}catch(e){return {};}
  }
  function saveDataSafe(data){
    try{if(typeof saveData === 'function') saveData(data);}catch(e){}
  }
  function mapOf(data){
    return data?.settings?.galleryFolderMap && typeof data.settings.galleryFolderMap === 'object'
      ? data.settings.galleryFolderMap : {};
  }
  function folderOf(item,data){
    return item?.serie || item?.series || item?.folder || item?.carpeta ||
      mapOf(data)[item?.url || item?.image || ''] || 'General';
  }
  function hydrate(data){
    if(!data || !Array.isArray(data.gallery)) return data;
    data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    const map = mapOf(data);
    data.gallery.forEach(item => {
      const url = item.url || item.image || '';
      const folder = folderOf(item,data);
      item.serie = folder;
      item.series = folder;
      item.folder = folder;
      item.carpeta = folder;
      if(url) map[url] = folder;
    });
    data.settings.galleryFolderMap = map;
    return data;
  }

  async function patchPullCloud(){
    try{
      if(typeof pullCloud !== 'function' || window.__RM_GALLERY_PULL_PATCHED__) return;
      window.__RM_GALLERY_PULL_PATCHED__ = true;
      const original = pullCloud;
      pullCloud = async function(){
        const data = await original.apply(this, arguments);
        const fixed = hydrate(data);
        saveDataSafe(fixed);
        return fixed;
      };
      window.pullCloud = pullCloud;
    }catch(e){}
  }

  function renderPublicFolders(){
    if(/admin/i.test(location.pathname)) return;
    const data = hydrate(getDataSafe());
    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    const old = document.getElementById('rmGalleryFoldersSection');
    if(!old) return;
    // La galería principal existente leerá los campos serie/folder recuperados.
    // Se fuerza una nueva ejecución si el módulo público está disponible.
    try{
      if(typeof window.rmNoticiasGaleriaSeries === 'function') window.rmNoticiasGaleriaSeries();
    }catch(e){}
  }

  function boot(){
    patchPullCloud();
    const data = hydrate(getDataSafe());
    saveDataSafe(data);
    renderPublicFolders();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  setTimeout(boot, 3600);
  setTimeout(boot, 5200);
})();
