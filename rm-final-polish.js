/* FINAL POLISH: corrige conflictos de versiones anteriores */
(function(){
  if(window.__RM_FINAL_POLISH_20260624__) return;
  window.__RM_FINAL_POLISH_20260624__=true;
  function hide(el){ if(!el)return; el.hidden=true; el.style.setProperty('display','none','important'); el.style.setProperty('visibility','hidden','important'); el.style.setProperty('height','0','important'); el.style.setProperty('max-height','0','important'); el.style.setProperty('margin','0','important'); el.style.setProperty('padding','0','important'); }
  function show(el){ if(!el)return; el.hidden=false; el.style.setProperty('display','block','important'); el.style.setProperty('visibility','visible','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('height','auto','important'); el.style.setProperty('max-height','none','important'); }
  function polish(){
    document.querySelectorAll('#rmSponsorsTopCarousel,.rm-sponsors-top-carousel').forEach(hide);
    const moving=document.querySelector('#rmSponsorsDefCarousel,.rm-sponsors-def-carousel');
    show(moving);
    if(moving){ const tr=moving.querySelector('.rm-def-carousel-track'); if(tr){tr.style.setProperty('animation','rmDefCarouselMove 22s linear infinite','important');tr.style.setProperty('animation-play-state','running','important');} }
    document.querySelectorAll('#rmNewsAccordionSection').forEach(hide);
    show(document.getElementById('rmNovedadesFinal'));
    show(document.getElementById('rmFecha8Standings'));
  }
  function run(){ try{ if(typeof window.rmFecha8NoticiasFinal==='function')window.rmFecha8NoticiasFinal(); }catch(e){} setTimeout(polish,80); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{[120,900,2200,5000].forEach(ms=>setTimeout(run,ms));}); else [120,900,2200,5000].forEach(ms=>setTimeout(run,ms));
  window.addEventListener('pageshow',()=>setTimeout(run,250));
})();


/* =========================================================
   AJUSTE INTERNO DE RENDIMIENTO - SIN CAMBIOS VISUALES
   Mantiene estética, evita tareas repetidas y audio pesado al inicio.
========================================================= */
(function () {
  if (window.__RM_PERF_ONLY_NO_VISUAL_CHANGE__) return;
  window.__RM_PERF_ONLY_NO_VISUAL_CHANGE__ = true;

  function enableLazyAudio() {
    var audio = document.getElementById('clubMusicAudio');
    var button = document.getElementById('musicToggleBtn');
    if (!audio || !button || button.dataset.perfLazyBound) return;

    var originalSrc = audio.getAttribute('src') || audio.dataset.src || '';
    if (!originalSrc) return;

    audio.dataset.src = originalSrc;
    audio.removeAttribute('src');
    audio.preload = 'none';
    audio.load();
    button.dataset.perfLazyBound = '1';

    var originalHandler = button.onclick;
    button.onclick = async function (event) {
      if (!audio.getAttribute('src')) {
        audio.src = audio.dataset.src;
        audio.load();
      }
      if (typeof originalHandler === 'function') {
        return originalHandler.call(this, event);
      }
      try {
        if (audio.paused) await audio.play();
        else audio.pause();
      } catch (error) {
        console.warn('Audio requiere interacción del usuario.', error);
      }
    };
  }

  function reduceMotionOnLowPower() {
    var mobile = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mobile && !reduced) return;

    // No cambia el diseño: limita las animaciones decorativas excesivas.
    document.documentElement.classList.add('rm-perf-mobile');
  }

  function boot() {
    enableLazyAudio();
    reduceMotionOnLowPower();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener('pageshow', boot, { once: true });
})();
