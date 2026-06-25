
/* =========================================================
   ORDEN FIJO DE SECCIONES DEPORTIVAS
   Jugador destacado -> Posiciones -> Acumulativa -> Ranking -> Hazte Socio -> Auspiciadores
========================================================= */
(function(){
  if(window.__RM_FINAL_SEQUENCE_FIXED_V4__) return;
  window.__RM_FINAL_SEQUENCE_FIXED_V4__ = true;

  function show(node){
    if(!node) return;
    node.hidden = false;
    node.style.setProperty('display','block','important');
    node.style.setProperty('visibility','visible','important');
    node.style.setProperty('opacity','1','important');
    node.style.setProperty('height','auto','important');
    node.style.setProperty('max-height','none','important');
  }

  function positions(){
    return document.getElementById('rmFecha8Standings') || document.getElementById('posiciones');
  }

  function arrange(){
    if(typeof window.rmRenderPlayerHighlights === 'function') window.rmRenderPlayerHighlights();

    const player = document.getElementById('playerHighlightsSection');
    const table = positions();
    const cumulative = document.getElementById('ranking');
    const best = document.getElementById('seriesRankingSection');
    const member = document.getElementById('memberSection');
    const sponsors = document.getElementById('sponsorsBottomSection');

    if(!table || !table.parentElement) return;

    // Primero jugador destacado fijo antes de la primera tabla.
    if(player){
      show(player);
      table.parentElement.insertBefore(player, table);
    }

    let current = table;
    [cumulative, best, member, sponsors].forEach(section => {
      if(!section) return;
      show(section);
      current.insertAdjacentElement('afterend', section);
      current = section;
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      arrange();
      setTimeout(arrange, 700);
      setTimeout(arrange, 2000);
    }, {once:true});
  }else{
    arrange();
    setTimeout(arrange, 700);
  }

  window.addEventListener('load', () => setTimeout(arrange, 300), {once:true});
  window.rmApplyFinalSectionOrder = arrange;
})();
