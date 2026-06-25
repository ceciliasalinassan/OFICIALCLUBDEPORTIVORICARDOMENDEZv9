
/* =========================================================
   LOGO DEL CLUB BAJO BOTONES SUPERIORES
========================================================= */
(function(){
  if(window.__RM_LOGO_BAJO_BOTONES__) return;
  window.__RM_LOGO_BAJO_BOTONES__ = true;

  function insertLogo(){
    var section = document.getElementById('rmEnhancedTopSection');
    var actions = section && section.querySelector('.rm-top-actions');
    if(!section || !actions) return;

    var block = document.getElementById('rmLogoBelowTopActions');
    if(!block){
      block = document.createElement('div');
      block.id = 'rmLogoBelowTopActions';
      block.className = 'rm-logo-below-top-actions';
      block.innerHTML =
        '<img src="logo_ricardo_mendez.png" alt="Escudo Club Deportivo Ricardo Méndez" loading="eager">' +
        '<span>Club Deportivo Ricardo Méndez</span>';
    }

    if(block.parentElement !== section || actions.nextElementSibling !== block){
      actions.insertAdjacentElement('afterend', block);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(insertLogo, 250);
      setTimeout(insertLogo, 1400);
    }, {once:true});
  }else{
    insertLogo();
    setTimeout(insertLogo, 600);
  }

  window.addEventListener('pageshow', insertLogo, {once:true});
  window.rmInsertLogoBelowTopActions = insertLogo;
})();
