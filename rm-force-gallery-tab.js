
/* =========================================================
   ADMIN · ACCESO DIRECTO A GALERÍA
   Garantiza que el formulario fijo se muestre al presionar la pestaña.
   Sin timers, observers ni re-renderizado automático.
========================================================= */
(function(){
  if(window.__RM_FORCE_GALLERY_TAB__) return;
  window.__RM_FORCE_GALLERY_TAB__ = true;

  function showGallery(){
    const panel = document.getElementById('tab-gallery');
    const button = document.querySelector('.tabs [data-tab="tab-gallery"]');
    if(!panel) return;

    document.querySelectorAll('.tabs button').forEach(item => item.classList.remove('active'));
    if(button) button.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(item => {
      if(item !== panel) item.classList.add('hidden');
    });
    panel.classList.remove('hidden');
    panel.style.removeProperty('display');
    panel.style.removeProperty('visibility');

    if(location.hash === '#gallery'){
      panel.scrollIntoView({block:'start', behavior:'auto'});
    }
  }

  function boot(){
    const button = document.querySelector('.tabs [data-tab="tab-gallery"]');
    button?.addEventListener('click', function(){
      requestAnimationFrame(showGallery);
    });

    if(location.hash === '#gallery'){
      showGallery();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }

  window.rmOpenGalleryUpload = showGallery;
})();
