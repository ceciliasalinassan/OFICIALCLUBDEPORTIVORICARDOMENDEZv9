/* =========================================================
   ADMIN · GALERÍA SIMPLE (SIN SERIES)
   Crea y administra fotos o videos directamente.
========================================================= */
(function(){
  if(window.__RM_ADMIN_GALERIA_SIMPLE__) return;
  window.__RM_ADMIN_GALERIA_SIMPLE__ = true;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function disableGalleryBySeries(){
    // Bloque invisible con el mismo id: impide que el módulo antiguo lo vuelva a crear.
    let old = $('rmGallerySeriesAdmin');
    if(!old){
      old = document.createElement('div');
      old.id = 'rmGallerySeriesAdmin';
      document.body.appendChild(old);
    }
    old.innerHTML = '';
    old.hidden = true;
    old.setAttribute('aria-hidden','true');
    old.style.setProperty('display','none','important');
    old.style.setProperty('visibility','hidden','important');
    old.style.setProperty('height','0','important');
    old.style.setProperty('margin','0','important');
    old.style.setProperty('padding','0','important');
    old.style.setProperty('overflow','hidden','important');
  }

  function galleryData(){
    try{
      const data = typeof getData === 'function' ? getData() : {};
      data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
      return data;
    }catch(e){
      return {gallery:[]};
    }
  }

  function mediaType(item){
    const type = String(item?.type || '').toLowerCase();
    const url = String(item?.url || item?.image || '').toLowerCase();
    return type === 'video' || /\.mp4|\.webm|\.mov|youtube|youtu\.be/.test(url) ? 'video' : 'image';
  }

  function renderList(){
    const list = $('simpleGalleryList');
    if(!list) return;
    const data = galleryData();
    const rows = data.gallery || [];
    list.innerHTML = rows.length ? rows.map((item,index) => {
      const title = item.title || 'Sin título';
      const url = item.url || item.image || '';
      const type = mediaType(item);
      const preview = url
        ? (type === 'video' ? '<div class="rm-simple-gallery-video">▶</div>' : '<img src="'+esc(url)+'" alt="'+esc(title)+'">')
        : '<div class="rm-simple-gallery-empty">RM</div>';
      return '<article class="rm-simple-gallery-item">'+
        '<div class="rm-simple-gallery-preview">'+preview+'</div>'+
        '<div class="rm-simple-gallery-copy"><strong>'+esc(title)+'</strong><span>'+ (type === 'video' ? 'Video' : 'Fotografía') +'</span></div>'+
        '<button type="button" class="rmSimpleDeleteMedia" data-index="'+index+'">Eliminar</button>'+
      '</article>';
    }).join('') : '<div class="rm-simple-gallery-empty-state">Aún no hay fotografías ni videos en la galería.</div>';

    list.querySelectorAll('.rmSimpleDeleteMedia').forEach(button => {
      button.addEventListener('click', async () => {
        const index = Number(button.dataset.index);
        const data = galleryData();
        const item = data.gallery[index];
        if(!item) return;
        if(!confirm('¿Eliminar este elemento de la galería?')) return;
        data.gallery.splice(index,1);
        try{
          if(typeof saveAll === 'function') await saveAll(data);
          else if(typeof saveData === 'function') saveData(data);
          if(typeof toast === 'function') toast('Elemento eliminado de la galería.');
        }catch(error){
          if(typeof err === 'function') err(error);
          return;
        }
        renderList();
      });
    });
  }

  function createGalleryPanel(){
    const panel = $('tab-gallery');
    if(!panel) return;

    panel.classList.add('rm-simple-gallery-admin');
    panel.innerHTML =
      '<h2>Crear Galería</h2>'+
      '<p class="rm-simple-gallery-help">Agrega fotografías o videos a la galería general del club. No se dividen por series.</p>'+
      '<div class="rm-simple-gallery-form">'+
        '<label>Título del archivo<input id="rmSimpleMediaTitle" placeholder="Ej: Triunfo de Ricardo Méndez"></label>'+
        '<label>Tipo de contenido<select id="rmSimpleMediaType"><option value="image">Fotografía</option><option value="video">Video</option></select></label>'+
        '<label>Subir fotografía o video<input id="rmSimpleMediaFile" type="file" accept="image/*,video/*"></label>'+
        '<div class="rm-simple-gallery-or">o</div>'+
        '<label>URL de fotografía o video<input id="rmSimpleMediaUrl" type="url" placeholder="https://..."></label>'+
        '<button type="button" id="rmSimpleAddMedia">Agregar a la galería</button>'+
      '</div>'+
      '<h3 class="rm-simple-gallery-subtitle">Contenido cargado</h3>'+
      '<div id="simpleGalleryList" class="rm-simple-gallery-list"></div>';

    $('rmSimpleAddMedia').addEventListener('click', addMedia);
    renderList();
  }

  async function addMedia(){
    const title = String($('rmSimpleMediaTitle')?.value || '').trim();
    let url = String($('rmSimpleMediaUrl')?.value || '').trim();
    const declaredType = $('rmSimpleMediaType')?.value || 'image';
    const file = $('rmSimpleMediaFile')?.files?.[0];

    if(file){
      try{
        url = await uploadFile(file,'gallery');
      }catch(error){
        if(typeof err === 'function') err(error);
        return;
      }
    }

    if(!url){
      if(typeof toast === 'function') toast('Selecciona un archivo o ingresa una URL.','error');
      else alert('Selecciona un archivo o ingresa una URL.');
      return;
    }

    const type = file ? (file.type && file.type.startsWith('video') ? 'video' : 'image') : declaredType;
    const data = galleryData();
    data.gallery.unshift({title: title || (type === 'video' ? 'Video' : 'Fotografía'), type, url});

    try{
      if(typeof saveAll === 'function') await saveAll(data);
      else if(typeof saveData === 'function') saveData(data);
      if(typeof toast === 'function') toast('Contenido agregado a la galería.');
    }catch(error){
      if(typeof err === 'function') err(error);
      return;
    }

    $('rmSimpleMediaTitle').value = '';
    $('rmSimpleMediaUrl').value = '';
    $('rmSimpleMediaFile').value = '';
    renderList();
  }

  function renameTab(){
    document.querySelectorAll('.tabs button[data-tab="tab-gallery"]').forEach(button => {
      button.textContent = 'Galería';
    });
  }

  function boot(){
    disableGalleryBySeries();
    renameTab();
    createGalleryPanel();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
  setTimeout(boot, 250);
  setTimeout(boot, 1200);
  setTimeout(boot, 2600);
  window.rmAdminGaleriaSimple = boot;
})();
