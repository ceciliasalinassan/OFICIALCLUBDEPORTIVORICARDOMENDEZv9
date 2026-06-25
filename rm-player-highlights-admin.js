
/* =========================================================
   ADMIN · JUGADOR DESTACADO POR SERIE
========================================================= */
(function(){
  if(window.__RM_ADMIN_PLAYER_HIGHLIGHTS__) return;
  window.__RM_ADMIN_PLAYER_HIGHLIGHTS__ = true;

  const SERIES = [
    'Peques','Segunda Infantil','Primera Infantil','Juveniles',
    'Serie de Oro','Super Senior','Senior 35','Serie Damas',
    'Serie de Honor','Primera Adulta','Segunda Adulta','Serie Platino'
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function tabPanel(){
    return document.getElementById('tab-player-highlights');
  }

  function ensureTab(){
    const tabs = document.querySelector('.tabs');
    if(!tabs) return;

    if(!document.getElementById('tab-player-highlights-button')){
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'tab-player-highlights-button';
      button.dataset.tab = 'tab-player-highlights';
      button.textContent = 'Jugador destacado';

      const standingsButton = Array.from(tabs.querySelectorAll('button')).find(btn => btn.dataset.tab === 'tab-standings');
      if(standingsButton) standingsButton.insertAdjacentElement('afterend', button);
      else tabs.appendChild(button);

      button.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(panel => panel.classList.add('hidden'));
        tabPanel()?.classList.remove('hidden');
        renderList();
      });
    }

    if(!tabPanel()){
      const panel = document.createElement('div');
      panel.id = 'tab-player-highlights';
      panel.className = 'tab-content hidden';
      panel.innerHTML =
        '<h2>Jugador destacado por serie</h2>' +
        '<p class="rm-highlight-admin-help">Carga un jugador destacado para cada serie. Puedes marcar sus cualidades: táctica, garra y liderazgo.</p>' +
        '<label>Serie</label>' +
        '<select id="highlightSerie">'+SERIES.map(serie => '<option value="'+esc(serie)+'">'+esc(serie)+'</option>').join('')+'</select>' +
        '<label>Nombre del jugador destacado</label>' +
        '<input id="highlightPlayerName" placeholder="Ej: Juan Pérez">' +
        '<label>Fotografía del jugador</label>' +
        '<input id="highlightPlayerPhoto" type="file" accept="image/*">' +
        '<div class="rm-highlight-admin-checks">' +
          '<label><input id="highlightTactica" type="checkbox" checked> Táctica</label>' +
          '<label><input id="highlightGarra" type="checkbox" checked> Garra</label>' +
          '<label><input id="highlightLiderazgo" type="checkbox" checked> Liderazgo</label>' +
        '</div>' +
        '<button id="savePlayerHighlight" type="button">Guardar jugador destacado</button>' +
        '<div id="playerHighlightsAdminList"></div>';

      const standingsPanel = document.getElementById('tab-standings');
      if(standingsPanel) standingsPanel.insertAdjacentElement('afterend', panel);
      else document.getElementById('adminPanel')?.appendChild(panel);

      panel.querySelector('#savePlayerHighlight').addEventListener('click', saveHighlight);
    }
  }

  function highlightsData(){
    try{
      const d = getData();
      return Array.isArray(d.playerHighlights) ? d.playerHighlights : [];
    }catch(e){
      return [];
    }
  }

  function renderList(){
    const list = document.getElementById('playerHighlightsAdminList');
    if(!list) return;

    const values = highlightsData();
    list.innerHTML = values.length ? values.map((item,index) =>
      '<div class="rm-highlight-admin-row">' +
        (item.image ? '<img src="'+esc(item.image)+'" alt="'+esc(item.name || 'Jugador')+'">' : '<span>RM</span>') +
        '<div><strong>'+esc(item.serie || '')+'</strong><small>'+esc(item.name || '')+'</small></div>' +
        '<div class="rm-highlight-admin-tags">'+
          (item.tactica !== false ? '<em>Táctica</em>' : '') +
          (item.garra !== false ? '<em>Garra</em>' : '') +
          (item.liderazgo !== false ? '<em>Liderazgo</em>' : '') +
        '</div>' +
        '<button type="button" class="rmDeleteHighlight" data-index="'+index+'">Eliminar</button>' +
      '</div>'
    ).join('') : '<div class="empty-state">Aún no hay jugadores destacados cargados.</div>';

    list.querySelectorAll('.rmDeleteHighlight').forEach(button => {
      button.addEventListener('click', async () => {
        const index = Number(button.dataset.index);
        const d = getData();
        d.playerHighlights = Array.isArray(d.playerHighlights) ? d.playerHighlights : [];
        d.playerHighlights.splice(index,1);
        try{
          await saveAll(d);
          renderList();
          if(typeof toast === 'function') toast('Jugador destacado eliminado.');
        }catch(error){
          if(typeof err === 'function') err(error);
        }
      });
    });
  }

  async function saveHighlight(){
    const serie = document.getElementById('highlightSerie')?.value || SERIES[0];
    const name = String(document.getElementById('highlightPlayerName')?.value || '').trim();
    const photo = document.getElementById('highlightPlayerPhoto')?.files?.[0];

    if(!name){
      if(typeof toast === 'function') toast('Ingresa el nombre del jugador destacado.','error');
      return;
    }

    try{
      let image = '';
      if(photo) image = await uploadFile(photo,'players');

      const d = getData();
      d.playerHighlights = Array.isArray(d.playerHighlights) ? d.playerHighlights : [];
      const entry = {
        serie,
        name,
        image,
        tactica: !!document.getElementById('highlightTactica')?.checked,
        garra: !!document.getElementById('highlightGarra')?.checked,
        liderazgo: !!document.getElementById('highlightLiderazgo')?.checked,
        updatedAt: new Date().toISOString()
      };

      const existing = d.playerHighlights.findIndex(item => String(item.serie || '').toLowerCase() === serie.toLowerCase());
      if(existing >= 0){
        if(!image) entry.image = d.playerHighlights[existing].image || '';
        d.playerHighlights[existing] = entry;
      }else{
        d.playerHighlights.push(entry);
      }

      await saveAll(d);
      document.getElementById('highlightPlayerName').value = '';
      document.getElementById('highlightPlayerPhoto').value = '';
      renderList();
      if(typeof toast === 'function') toast('Jugador destacado guardado correctamente.');
    }catch(error){
      if(typeof err === 'function') err(error);
    }
  }

  function boot(){
    ensureTab();
    renderList();

    if(typeof fillAdmin === 'function' && !window.__RM_FILL_ADMIN_HIGHLIGHTS__){
      window.__RM_FILL_ADMIN_HIGHLIGHTS__ = true;
      const previous = fillAdmin;
      window.fillAdmin = function(){
        const result = previous.apply(this, arguments);
        setTimeout(renderList, 0);
        return result;
      };
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
