
/* =========================================================
   RESTAURAR TABLA ACUMULATIVA + RANKING DE SERIES
   Mantiene ambas secciones visibles y actualizadas.
========================================================= */
(function(){
  if(window.__RM_RESTORE_ACUMULADA_RANKING__) return;
  window.__RM_RESTORE_ACUMULADA_RANKING__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const normal = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();

  function publicData(){
    try {
      if(typeof getData === 'function') return getData() || {};
    } catch(e) {}
    return {};
  }

  function fallbackStandings(){
    try {
      if(typeof CDRM_POSICIONES_FECHA7_FINAL !== 'undefined' && CDRM_POSICIONES_FECHA7_FINAL) {
        return CDRM_POSICIONES_FECHA7_FINAL;
      }
    } catch(e) {}
    try {
      if(typeof CDRM_STANDINGS_FECHA7 !== 'undefined' && CDRM_STANDINGS_FECHA7) {
        return CDRM_STANDINGS_FECHA7;
      }
    } catch(e) {}
    return {};
  }

  function getStandings(data){
    const current = data && data.standings && Object.keys(data.standings).length ? data.standings : {};
    return Object.keys(current).length ? current : fallbackStandings();
  }

  function clubName(value){
    const name = String(value || '').trim().replace(/\s+/g,' ');
    if(/^r\.?\s*m[eé]ndez$/i.test(name) || /^ricardo\s+m[eé]ndez$/i.test(name)) return 'R. Méndez';
    if(/^manzana\s*t\.?$/i.test(name)) return 'Manzana T.';
    return name;
  }

  function isRicardoMendez(value){
    return /^(r\.?\s*m[eé]ndez|ricardo\s+m[eé]ndez)$/i.test(String(value || '').trim());
  }

  function numberOf(row, names){
    for(const key of names){
      if(row && row[key] !== undefined && row[key] !== null && row[key] !== '') return Number(row[key]) || 0;
    }
    return 0;
  }

  function calculateAccumulated(data){
    if(Array.isArray(data.accumulated) && data.accumulated.length){
      return data.accumulated.map(item => ({
        club: clubName(item.club || item.team || item.equipo || ''),
        series: Number(item.series || item.seriesCount || 0),
        pj: numberOf(item,['pj']),
        pg: numberOf(item,['pg','g']),
        pe: numberOf(item,['pe','e']),
        pp: numberOf(item,['pp','p']),
        gf: numberOf(item,['gf']),
        gc: numberOf(item,['gc']),
        dg: numberOf(item,['dg','df']) || (numberOf(item,['gf'])-numberOf(item,['gc'])),
        pts: numberOf(item,['pts','puntos'])
      })).filter(row => row.club);
    }

    const standings = getStandings(data);
    const clubs = {};

    Object.entries(standings || {}).forEach(([serie, rows]) => {
      if(!Array.isArray(rows)) return;
      rows.forEach(row => {
        const club = clubName(row.team || row.club || row.equipo || '');
        if(!club || normal(club) === 'total') return;
        const key = normal(club);
        if(!clubs[key]){
          clubs[key] = {club, series:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0};
        }
        const target = clubs[key];
        target.series += 1;
        target.pj += numberOf(row,['pj']);
        target.pg += numberOf(row,['pg','g']);
        target.pe += numberOf(row,['pe','e']);
        target.pp += numberOf(row,['pp','p']);
        target.gf += numberOf(row,['gf']);
        target.gc += numberOf(row,['gc']);
        target.dg += row.dg !== undefined || row.df !== undefined
          ? numberOf(row,['dg','df'])
          : numberOf(row,['gf']) - numberOf(row,['gc']);
        target.pts += numberOf(row,['pts','puntos']);
      });
    });

    return Object.values(clubs);
  }

  function orderAccumulated(rows){
    return [...rows].sort((a,b) =>
      (b.pts - a.pts) ||
      (b.dg - a.dg) ||
      (b.gf - a.gf) ||
      (a.gc - b.gc) ||
      a.club.localeCompare(b.club,'es')
    );
  }

  function calculateSeriesRanking(data){
    const standings = getStandings(data);
    const out = [];

    Object.entries(standings || {}).forEach(([serie, rows]) => {
      if(!Array.isArray(rows)) return;
      const sorted = [...rows].sort((a,b) =>
        numberOf(b,['pts','puntos']) - numberOf(a,['pts','puntos']) ||
        numberOf(b,['dg','df']) - numberOf(a,['dg','df']) ||
        numberOf(b,['gf']) - numberOf(a,['gf'])
      );
      const index = sorted.findIndex(row => isRicardoMendez(row.team || row.club || row.equipo || ''));
      if(index >= 0){
        const row = sorted[index];
        out.push({
          serie,
          posicion: index + 1,
          pj: numberOf(row,['pj']),
          pts: numberOf(row,['pts','puntos']),
          dg: row.dg !== undefined || row.df !== undefined
            ? numberOf(row,['dg','df'])
            : numberOf(row,['gf']) - numberOf(row,['gc'])
        });
      }
    });

    return out.sort((a,b) =>
      (b.pts - a.pts) ||
      (a.posicion - b.posicion) ||
      a.serie.localeCompare(b.serie,'es')
    );
  }

  function ensureSection(id, className){
    let section = document.getElementById(id);
    if(!section){
      section = document.createElement('section');
      section.id = id;
      section.className = 'section ' + className;
    }
    section.hidden = false;
    section.style.setProperty('display','block','important');
    section.style.setProperty('visibility','visible','important');
    section.style.setProperty('opacity','1','important');
    section.style.setProperty('height','auto','important');
    section.style.setProperty('max-height','none','important');
    return section;
  }

  function positionSections(cumulative, ranking){
    const anchor = document.getElementById('rmFecha8Standings') ||
                   document.getElementById('posiciones') ||
                   document.getElementById('fixture') ||
                   document.querySelector('main > section');
    const parent = (anchor && anchor.parentElement) || document.querySelector('main') || document.body;

    if(anchor && anchor.parentElement === parent){
      anchor.insertAdjacentElement('afterend', cumulative);
      cumulative.insertAdjacentElement('afterend', ranking);
    } else {
      parent.appendChild(cumulative);
      parent.appendChild(ranking);
    }
  }

  function renderAccumulated(){
    const data = publicData();
    const rows = orderAccumulated(calculateAccumulated(data));
    const section = ensureSection('ranking', 'rm-acumulada-clubes-section');

    section.innerHTML =
      '<div class="section-head">' +
        '<h2>Tabla Acumulativa de Clubes</h2>' +
        '<p>Sumatoria general de todas las series en competencia.</p>' +
      '</div>' +
      '<div class="table-wrap rm-restored-table-wrap">' +
        '<table class="premium-table rm-restored-table">' +
          '<thead><tr><th>POS</th><th>CLUB</th><th>SERIES</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead>' +
          '<tbody id="cumulativeRows">'+
            (rows.length ? rows.map((row,index) =>
              '<tr class="'+(isRicardoMendez(row.club) ? 'club-highlight-row' : '')+'">' +
                '<td>'+ (index+1) +'</td><td>'+esc(row.club)+'</td><td>'+row.series+'</td><td>'+row.pj+'</td><td>'+row.pg+'</td><td>'+row.pe+'</td><td>'+row.pp+'</td><td>'+row.gf+'</td><td>'+row.gc+'</td><td>'+row.dg+'</td><td><strong>'+row.pts+'</strong></td>' +
              '</tr>'
            ).join('') : '<tr><td colspan="11">Sin datos para la tabla acumulativa.</td></tr>') +
          '</tbody>' +
        '</table>' +
      '</div>';

    return section;
  }

  function renderSeriesRanking(){
    const data = publicData();
    const rows = calculateSeriesRanking(data);
    const section = ensureSection('seriesRankingSection', 'series-ranking-section');

    section.innerHTML =
      '<div class="section-head">' +
        '<h2>Ranking de las Mejores Series</h2>' +
        '<p>Rendimiento de las series del Club Ricardo Méndez.</p>' +
      '</div>' +
      '<div class="table-wrap rm-restored-table-wrap">' +
        '<table class="premium-table rm-restored-table">' +
          '<thead><tr><th>#</th><th>SERIE</th><th>POSICIÓN</th><th>PJ</th><th>PTS</th><th>DG</th></tr></thead>' +
          '<tbody id="seriesRankingRows">'+
            (rows.length ? rows.map((row,index) =>
              '<tr><td>'+ (index+1) +'</td><td>'+esc(row.serie)+'</td><td>'+row.posicion+'°</td><td>'+row.pj+'</td><td><strong>'+row.pts+'</strong></td><td>'+row.dg+'</td></tr>'
            ).join('') : '<tr><td colspan="6">Sin datos de series para el ranking.</td></tr>') +
          '</tbody>' +
        '</table>' +
      '</div>';

    return section;
  }

  function restore(){
    const cumulative = renderAccumulated();
    const ranking = renderSeriesRanking();
    positionSections(cumulative, ranking);
  }

  if(typeof renderPublic === 'function'){
    const previous = renderPublic;
    renderPublic = function(){
      const response = previous.apply(this, arguments);
      restore();
      return response;
    };
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      restore();
      setTimeout(restore, 1200);
    }, {once:true});
  } else {
    restore();
    setTimeout(restore, 1200);
  }

  window.rmRestoreAccumulatedAndRanking = restore;
})();
