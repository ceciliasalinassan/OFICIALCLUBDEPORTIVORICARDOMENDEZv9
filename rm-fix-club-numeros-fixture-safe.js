
/* =========================================================
   REPARACIÓN SEGURA
   - Club en números solo una vez
   - Fixture del club visible y restaurado
========================================================= */
(function(){
  if(window.__RM_FIX_NUMBERS_AND_FIXTURE_SAFE__) return;
  window.__RM_FIX_NUMBERS_AND_FIXTURE_SAFE__ = true;

  function forceVisible(el){
    if(!el) return;
    el.hidden = false;
    el.style.setProperty('display','block','important');
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.style.setProperty('height','auto','important');
    el.style.setProperty('min-height','0','important');
    el.style.setProperty('max-height','none','important');
    el.style.setProperty('overflow','visible','important');
  }

  function fixClubNumbers(){
    // La sección estática original es la duplicada.
    // No se eliminan padres ni contenedores generales, para no afectar Fixture u otras secciones.
    const staticSummary = document.getElementById('clubSummarySection');
    if(staticSummary){
      staticSummary.hidden = true;
      staticSummary.style.setProperty('display','none','important');
      staticSummary.style.setProperty('visibility','hidden','important');
      staticSummary.style.setProperty('height','0','important');
      staticSummary.style.setProperty('margin','0','important');
      staticSummary.style.setProperty('padding','0','important');
      staticSummary.style.setProperty('overflow','hidden','important');
    }

    // Se conserva únicamente el panel editable y actualizable desde Admin.
    const panels = Array.from(document.querySelectorAll('#rmClubNumbersPanel'));
    panels.forEach((panel, index) => {
      if(index === 0) forceVisible(panel);
      else panel.remove();
    });
  }

  function restoreFixture(){
    const fixture = document.getElementById('fixture');
    if(!fixture) return;

    forceVisible(fixture);

    const grid = document.getElementById('fixtureGrid');
    if(grid){
      grid.hidden = false;
      grid.style.setProperty('display','grid','important');
      grid.style.setProperty('visibility','visible','important');
      grid.style.setProperty('opacity','1','important');
    }

    // Fixture queda antes de Jugador Destacado y antes de las tablas.
    const player = document.getElementById('playerHighlightsSection');
    const positions = document.getElementById('rmFecha8Standings') || document.getElementById('posiciones');
    if(player && player.parentElement === fixture.parentElement){
      fixture.parentElement.insertBefore(fixture, player);
    }else if(positions && positions.parentElement === fixture.parentElement){
      fixture.parentElement.insertBefore(fixture, positions);
    }
  }

  function apply(){
    fixClubNumbers();
    restoreFixture();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      apply();
      setTimeout(apply, 500);
      setTimeout(apply, 1800);
    }, {once:true});
  }else{
    apply();
    setTimeout(apply, 500);
  }

  window.addEventListener('load', () => setTimeout(apply, 250), {once:true});
  window.rmFixClubNumbersAndFixture = apply;
})();
