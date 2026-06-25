window.RM_HIMNO_INLINE_SRC = 'himno-rimen.mp3';


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
