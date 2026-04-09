/* ============================================================
   CRV CONTROLE DE ACESSO
   REGRAS DE ACESSO — regras_acesso.js
   ============================================================ */

console.log('🚀 REGRAS_ACESSO iniciado');

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let regrasLista   = [];
let gruposLista   = [];
let areasLista    = [];
let regraEditando = null;
let grupoEditando = null;
let areaEditando  = null;

/* ============================================================
   INIT — aguarda partials do main.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Garante que os modais começam fechados independente de qualquer CSS externo
  ['modal-regra', 'modal-grupo', 'modal-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('regra-hidden');
  });

  initTabs();
  initModalRegra();
  initModalGrupo();
  initModalArea();
  initBusca();
  initModaisExtras();
  initModalExportarRegras();
  carregarTudo();

  document.getElementById('btn-exportar')?.addEventListener('click', abrirModalExportarRegras);
});

/* ============================================================
   CARREGAR TUDO
   ============================================================ */
async function carregarTudo() {
  await Promise.all([
    carregarRegras(),
    carregarGrupos(),
    carregarAreas()
  ]);
  atualizarKPIs();
}

/* ============================================================
   ABAS — usa .regra-hidden definido no regras_acesso.css
   ============================================================ */
function initTabs() {
  const paineis = {
    regras: 'tab-regras',
    grupos: 'tab-grupos',
    areas:  'tab-areas'
  };

  document.querySelectorAll('.regra-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.regra-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.values(paineis).forEach(id => {
        document.getElementById(id)?.classList.add('regra-hidden');
      });

      const alvo = paineis[tab.dataset.tab];
      if (alvo) document.getElementById(alvo)?.classList.remove('regra-hidden');
    });
  });
}

/* ============================================================
   BUSCA + FILTROS
   ============================================================ */
function initBusca() {
  const inputBusca   = document.getElementById('busca-regras');
  const filtroTipo   = document.getElementById('filtro-tipo');
  const filtroStatus = document.getElementById('filtro-status');

  const aplicar = () => {
    const termo  = inputBusca?.value.toLowerCase() || '';
    const tipo   = filtroTipo?.value || '';
    const status = filtroStatus?.value || '';

    const filtrada = regrasLista.filter(r => {
      const matchTermo =
        !termo ||
        r.nome?.toLowerCase().includes(termo) ||
        r.grupos?.nome?.toLowerCase().includes(termo) ||
        r.areas?.nome?.toLowerCase().includes(termo);
      const matchTipo   = !tipo   || r.tipo   === tipo;
      const matchStatus = !status || r.status === status;
      return matchTermo && matchTipo && matchStatus;
    });

    renderizarRegras(filtrada);
  };

  inputBusca?.addEventListener('input', aplicar);
  filtroTipo?.addEventListener('change', aplicar);
  filtroStatus?.addEventListener('change', aplicar);
}

/* ============================================================
   HELPERS DE MODAL
   ============================================================ */
function abrirOverlay(id) {
  document.getElementById(id)?.classList.remove('regra-hidden');
  document.body.style.overflow = 'hidden';
}

function fecharOverlay(id) {
  document.getElementById(id)?.classList.add('regra-hidden');
  document.body.style.overflow = '';
}

/* ============================================================
   MODAL REGRA
   ============================================================ */
function initModalRegra() {
  const btnNovo      = document.getElementById('btn-nova-regra');
  const btnNovoEmpty = document.getElementById('btn-nova-regra-empty');
  const btnFechar    = document.getElementById('modal-regra-fechar');
  const btnCancelar  = document.getElementById('btn-regra-cancelar');
  const btnSalvar    = document.getElementById('btn-regra-salvar');
  const overlay      = document.getElementById('modal-regra');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalRegra(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalRegra(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-regra'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-regra'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarRegra);

}

/* ============================================================
   MODAL GRUPO
   ============================================================ */

function initModalGrupo() {
  const btnNovo      = document.getElementById('btn-novo-grupo');
  const btnNovoEmpty = document.getElementById('btn-novo-grupo-empty');
  const btnFechar    = document.getElementById('modal-grupo-fechar');
  const btnCancelar  = document.getElementById('btn-grupo-cancelar');
  const btnSalvar    = document.getElementById('btn-grupo-salvar');
  const overlay      = document.getElementById('modal-grupo');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalGrupo(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalGrupo(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-grupo'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-grupo'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarGrupo);

}

function abrirModalRegra(dados) {
  regraEditando = dados ? dados.id : null;

  document.getElementById('modal-regra-titulo').innerHTML = regraEditando
    ? '<i class="ph ph-shield"></i> Editar Regra'
    : '<i class="ph ph-shield-plus"></i> Nova Regra';

  preencherSelectsRegra();

  if (dados) {
    setVal('r-nome',       dados.nome);
    setVal('r-tipo',       dados.tipo);
    setVal('r-prioridade', dados.prioridade);
    setVal('r-grupo',      dados.grupo_id);
    setVal('r-area',       dados.area_id);
    setVal('r-hora-inicio',dados.horario_inicio);
    setVal('r-hora-fim',   dados.horario_fim);
    setVal('r-status',     dados.status);
    const dias = dados.dias_semana || [];
    document.querySelectorAll('.regra-dia input').forEach(cb => {
      cb.checked = dias.includes(Number(cb.value));
    });
  } else {
    limparModalRegra();
  }

  abrirOverlay('modal-regra');
}

function limparModalRegra() {
  ['r-nome', 'r-hora-inicio', 'r-hora-fim'].forEach(id => setVal(id, ''));
  ['r-tipo', 'r-grupo', 'r-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  setVal('r-prioridade', 'normal');
  setVal('r-status', 'ativa');
  document.querySelectorAll('.regra-dia input').forEach((cb, i) => {
    cb.checked = i < 5;
  });
}

function preencherSelectsRegra() {
  const sg = document.getElementById('r-grupo');
  const sa = document.getElementById('r-area');
  if (!sg || !sa) return;

  sg.innerHTML = '<option value="">Selecione...</option>';
  sa.innerHTML = '<option value="">Selecione...</option>';

  gruposLista.forEach(g => sg.add(new Option(g.nome, g.id)));
  areasLista.forEach(a => sa.add(new Option(a.nome, a.id)));
}

async function salvarRegra() {
  const sb = window.getSupabase();
  if (!sb) { mostrarAlerta('Banco de dados não conectado. Verifique sua conexão.'); return; }

  const nome = document.getElementById('r-nome')?.value.trim();
  const tipo = document.getElementById('r-tipo')?.value;

  if (!nome && !tipo) {
    mostrarAlerta('Preencha o nome e o tipo da regra antes de salvar.');
    return;
  }
  if (!nome) { mostrarAlerta('O campo Nome é obrigatório.'); return; }
  if (!tipo) { mostrarAlerta('Selecione um Tipo para a regra.'); return; }

  const dias = [];
  document.querySelectorAll('.regra-dia input').forEach(cb => {
    if (cb.checked) dias.push(Number(cb.value));
  });

  const grupoId = document.getElementById('r-grupo')?.value || null;
  const areaId  = document.getElementById('r-area')?.value  || null;

  const dados = {
    nome,
    tipo,
    prioridade:     document.getElementById('r-prioridade')?.value || 'normal',
    grupo_id:       grupoId || null,
    area_id:        areaId  || null,
    horario_inicio: document.getElementById('r-hora-inicio')?.value || null,
    horario_fim:    document.getElementById('r-hora-fim')?.value    || null,
    dias_semana:    dias,
    status:         document.getElementById('r-status')?.value     || 'ativa'
  };

  const response = regraEditando
    ? await sb.from('regras_acesso').update(dados).eq('id', regraEditando)
    : await sb.from('regras_acesso').insert([dados]);

  if (response.error) {
    mostrarAlerta('Erro ao salvar: ' + response.error.message);
    return;
  }

  const nomeGrupo = gruposLista.find(g => g.id == grupoId)?.nome || null;
  const nomeArea  = areasLista.find(a => a.id == areaId)?.nome   || null;

  fecharOverlay('modal-regra');
  regraEditando = null;
  await carregarRegras();
  atualizarKPIs();

  mostrarModalSucessoRegra(dados, nomeGrupo, nomeArea);
}

function abrirModalGrupo(dados) {
  grupoEditando = dados ? dados.id : null;

  document.getElementById('modal-grupo-titulo').innerHTML = grupoEditando
    ? '<i class="ph ph-users-three"></i> Editar Grupo'
    : '<i class="ph ph-users-three"></i> Novo Grupo';

  setVal('g-nome',      dados ? dados.nome      : '');
  setVal('g-descricao', dados ? dados.descricao : '');

  abrirOverlay('modal-grupo');
}

async function salvarGrupo() {
  const sb = window.getSupabase();
  if (!sb) { mostrarAlerta('Banco de dados não conectado. Verifique sua conexão.'); return; }

  const nome = document.getElementById('g-nome')?.value.trim();
  if (!nome) { mostrarAlerta('O campo Nome do grupo é obrigatório.'); return; }

  const dados = {
    nome,
    descricao: document.getElementById('g-descricao')?.value.trim() || null
  };

  const response = grupoEditando
    ? await sb.from('grupos').update(dados).eq('id', grupoEditando)
    : await sb.from('grupos').insert([dados]);

  if (response.error) { mostrarAlerta('Erro ao salvar grupo: ' + response.error.message); return; }

  fecharOverlay('modal-grupo');
  grupoEditando = null;
  await carregarGrupos();
  atualizarKPIs();
  if (typeof showToast === 'function') showToast(`Grupo "${nome}" salvo com sucesso!`, 'success');
}

/* ============================================================
   MODAL ÁREA
   ============================================================ */
function initModalArea() {
  const btnNovo      = document.getElementById('btn-nova-area');
  const btnNovoEmpty = document.getElementById('btn-nova-area-empty');
  const btnFechar    = document.getElementById('modal-area-fechar');
  const btnCancelar  = document.getElementById('btn-area-cancelar');
  const btnSalvar    = document.getElementById('btn-area-salvar');
  const overlay      = document.getElementById('modal-area');

  if (btnNovo)      btnNovo.addEventListener('click',      (e) => { e.stopPropagation(); abrirModalArea(); });
  if (btnNovoEmpty) btnNovoEmpty.addEventListener('click', (e) => { e.stopPropagation(); abrirModalArea(); });
  if (btnFechar)    btnFechar.addEventListener('click',    () => fecharOverlay('modal-area'));
  if (btnCancelar)  btnCancelar.addEventListener('click',  () => fecharOverlay('modal-area'));
  if (btnSalvar)    btnSalvar.addEventListener('click',    salvarArea);

}

function abrirModalArea(dados) {
  areaEditando = dados ? dados.id : null;

  document.getElementById('modal-area-titulo').innerHTML = areaEditando
    ? '<i class="ph ph-map-pin"></i> Editar Área'
    : '<i class="ph ph-map-pin"></i> Nova Área';

  setVal('a-nome',      dados ? dados.nome           : '');
  setVal('a-descricao', dados ? dados.descricao      : '');
  setVal('a-nivel',     dados ? dados.nivel_restricao: 'baixo');

  abrirOverlay('modal-area');
}

async function salvarArea() {
  const sb = window.getSupabase();
  if (!sb) { mostrarAlerta('Banco de dados não conectado. Verifique sua conexão.'); return; }

  const nome = document.getElementById('a-nome')?.value.trim();
  if (!nome) { mostrarAlerta('O campo Nome da área é obrigatório.'); return; }

  const dados = {
    nome,
    descricao:       document.getElementById('a-descricao')?.value.trim() || null,
    nivel_restricao: document.getElementById('a-nivel')?.value            || 'baixo'
  };

  const response = areaEditando
    ? await sb.from('areas').update(dados).eq('id', areaEditando)
    : await sb.from('areas').insert([dados]);

  if (response.error) { mostrarAlerta('Erro ao salvar área: ' + response.error.message); return; }

  fecharOverlay('modal-area');
  areaEditando = null;
  await carregarAreas();
  atualizarKPIs();
  if (typeof showToast === 'function') showToast(`Área "${nome}" salva com sucesso!`, 'success');
}

/* ============================================================
   CARREGAR REGRAS
   ============================================================ */
async function carregarRegras() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('regras_acesso')
    .select('*, grupos(nome), areas(nome)')
    .order('created_at', { ascending: false });

  if (error) { console.error('[REGRAS]', error); return; }

  regrasLista = data || [];
  renderizarRegras(regrasLista);
}

function renderizarRegras(lista) {
  const tbody     = document.getElementById('regras-tbody');
  const empty     = document.getElementById('regras-empty');
  const tableWrap = document.getElementById('regras-table-wrap');
  const total     = document.getElementById('regras-total');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    tableWrap?.classList.add('regra-hidden');
    if (total) total.textContent = '0 regras';
    return;
  }

  empty?.classList.add('regra-hidden');
  tableWrap?.classList.remove('regra-hidden');
  if (total) total.textContent = `${lista.length} regra${lista.length !== 1 ? 's' : ''}`;

  lista.forEach(r => {
    const statusBadge = r.status === 'ativa'
      ? '<span class="badge badge-success">Ativa</span>'
      : '<span class="badge badge-neutral">Inativa</span>';

    const prioBadge = {
      alta:    '<span class="badge badge-warning">Alta</span>',
      critica: '<span class="badge badge-danger">Crítica</span>',
      normal:  '<span class="badge badge-info">Normal</span>'
    }[r.prioridade] || `<span class="badge">${r.prioridade || '—'}</span>`;

    const horario = r.horario_inicio && r.horario_fim
      ? `${r.horario_inicio} → ${r.horario_fim}`
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.nome || '—'}</strong></td>
      <td>${r.tipo || '—'}</td>
      <td>${r.grupos?.nome || '—'}</td>
      <td>${r.areas?.nome  || '—'}</td>
      <td>${horario}</td>
      <td>${prioBadge}</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarRegra('${r.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirRegra('${r.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   CARREGAR GRUPOS
   ============================================================ */
async function carregarGrupos() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb.from('grupos').select('*').order('nome');
  if (error) { console.error('[GRUPOS]', error); return; }

  gruposLista = data || [];
  renderizarGrupos(gruposLista);
}

function renderizarGrupos(lista) {
  const grid  = document.getElementById('grupos-grid');
  const empty = document.getElementById('grupos-empty');
  if (!grid) return;

  grid.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    grid.classList.add('regra-hidden');
    return;
  }

  empty?.classList.add('regra-hidden');
  grid.classList.remove('regra-hidden');

  lista.forEach(g => {
    const card = document.createElement('div');
    card.className = 'regra-grupo-card';
    card.innerHTML = `
      <div class="regra-grupo-header">
        <div class="regra-grupo-icon"><i class="ph ph-users-three"></i></div>
        <div>
          <div class="regra-grupo-nome">${g.nome || '—'}</div>
          <div class="regra-grupo-desc">${g.descricao || 'Sem descrição'}</div>
        </div>
      </div>
      <div class="regra-grupo-footer">
        <span><i class="ph ph-users"></i> Grupo</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarGrupo('${g.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirGrupo('${g.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   CARREGAR ÁREAS
   ============================================================ */
async function carregarAreas() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb.from('areas').select('*').order('nome');
  if (error) { console.error('[AREAS]', error); return; }

  areasLista = data || [];
  renderizarAreas(areasLista);
}

function renderizarAreas(lista) {
  const grid  = document.getElementById('areas-grid');
  const empty = document.getElementById('areas-empty');
  if (!grid) return;

  grid.innerHTML = '';

  if (!lista.length) {
    empty?.classList.remove('regra-hidden');
    grid.classList.add('regra-hidden');
    return;
  }

  empty?.classList.add('regra-hidden');
  grid.classList.remove('regra-hidden');

  const nivelCor = {
    baixo:   'badge-success',
    medio:   'badge-warning',
    alto:    'badge-danger',
    critico: 'badge-danger'
  };

  lista.forEach(a => {
    const badge = nivelCor[a.nivel_restricao] || '';
    const card = document.createElement('div');
    card.className = 'regra-area-card';
    card.innerHTML = `
      <div class="regra-area-icon ${a.nivel_restricao === 'alto' || a.nivel_restricao === 'critico' ? 'restrita' : ''}">
        <i class="ph ph-map-pin"></i>
      </div>
      <div class="regra-area-nome">${a.nome || '—'}</div>
      <div class="regra-area-meta">${a.descricao || 'Sem descrição'}</div>
      <div class="regra-area-footer">
        <span class="badge ${badge}">${a.nivel_restricao || '—'}</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarArea('${a.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="Excluir" onclick="excluirArea('${a.id}')">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   EDITAR
   ============================================================ */
function editarRegra(id) {
  const r = regrasLista.find(x => x.id == id);
  if (r) abrirModalRegra(r);
}

function editarGrupo(id) {
  const g = gruposLista.find(x => x.id == id);
  if (g) abrirModalGrupo(g);
}

function editarArea(id) {
  const a = areasLista.find(x => x.id == id);
  if (a) abrirModalArea(a);
}

/* ============================================================
   EXCLUIR
   ============================================================ */
async function excluirRegra(id) {
  const r = regrasLista.find(x => x.id == id);
  const confirmado = await confirmarExclusao(
    `Deseja excluir a regra "${r?.nome || 'selecionada'}"? Esta ação não pode ser desfeita.`
  );
  if (!confirmado) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('regras_acesso').delete().eq('id', id);
  if (error) { mostrarAlerta('Erro ao excluir: ' + error.message); return; }
  await carregarRegras();
  atualizarKPIs();
}

async function excluirGrupo(id) {
  const g = gruposLista.find(x => x.id == id);
  const confirmado = await confirmarExclusao(
    `Deseja excluir o grupo "${g?.nome || 'selecionado'}"? Esta ação não pode ser desfeita.`
  );
  if (!confirmado) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('grupos').delete().eq('id', id);
  if (error) { mostrarAlerta('Erro ao excluir: ' + error.message); return; }
  await carregarGrupos();
  atualizarKPIs();
}

async function excluirArea(id) {
  const a = areasLista.find(x => x.id == id);
  const confirmado = await confirmarExclusao(
    `Deseja excluir a área "${a?.nome || 'selecionada'}"? Esta ação não pode ser desfeita.`
  );
  if (!confirmado) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('areas').delete().eq('id', id);
  if (error) { mostrarAlerta('Erro ao excluir: ' + error.message); return; }
  await carregarAreas();
  atualizarKPIs();
}

/* ============================================================
   KPIs
   ============================================================ */
function atualizarKPIs() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('kpi-regras',   regrasLista.filter(r => r.status === 'ativa').length);
  set('kpi-grupos',   gruposLista.length);
  set('kpi-areas',    areasLista.length);
  set('kpi-horarios', regrasLista.filter(r => r.horario_inicio).length);
}

/* ============================================================
   HELPER
   ============================================================ */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

/* ============================================================
   MODAL EXPORTAR REGRAS DE ACESSO
   ============================================================ */

function abrirModalExportarRegras() {
  const overlay  = document.getElementById('modal-exportar-regras');
  const emptyEl  = document.getElementById('export-regras-empty');
  const dadosEl  = document.getElementById('export-regras-dados');
  const btnConf  = document.getElementById('btn-export-regras-confirmar');
  if (!overlay) return;

  const total = regrasLista.length + gruposLista.length + areasLista.length;
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('export-regras-count-regras', regrasLista.length);
  el('export-regras-count-grupos', gruposLista.length);
  el('export-regras-count-areas',  areasLista.length);

  if (emptyEl) emptyEl.style.display = total ? 'none'  : 'block';
  if (dadosEl) dadosEl.style.display = total ? 'block' : 'none';
  if (btnConf) btnConf.disabled      = !total;

  abrirOverlay('modal-exportar-regras');
}

function initModalExportarRegras() {
  document.getElementById('modal-export-regras-fechar')?.addEventListener('click',  () => fecharOverlay('modal-exportar-regras'));
  document.getElementById('btn-export-regras-cancelar')?.addEventListener('click',  () => fecharOverlay('modal-exportar-regras'));
  document.getElementById('btn-export-regras-confirmar')?.addEventListener('click', () => {
    fecharOverlay('modal-exportar-regras');
    exportarCSV();
  });
}

/* ============================================================
   EXPORTAR CSV
   ============================================================ */
function exportarCSV() {
  const totalItens = regrasLista.length + gruposLista.length + areasLista.length;
  if (!totalItens) return;

  const linhas = [];

  // Regras
  if (regrasLista.length) {
    linhas.push(['=== REGRAS DE ACESSO ===']);
    linhas.push(['"Nome"', '"Área"', '"Grupo"', '"Dias"', '"Horário Início"', '"Horário Fim"', '"Ativa"']);
    regrasLista.forEach(r => {
      linhas.push([
        `"${r.nome              || ''}"`,
        `"${r.areas?.nome       || ''}"`,
        `"${r.grupos?.nome      || ''}"`,
        `"${(r.dias_semana || []).join(', ')}"`,
        `"${r.horario_inicio    || ''}"`,
        `"${r.horario_fim       || ''}"`,
        `"${r.status === 'ativa' ? 'Sim' : 'Não'}"`,
      ].join(','));
    });
    linhas.push(['']);
  }

  // Grupos
  if (gruposLista.length) {
    linhas.push(['=== GRUPOS ===']);
    linhas.push(['"Nome"', '"Descrição"', '"Total membros"']);
    gruposLista.forEach(g => {
      linhas.push([
        `"${g.nome       || ''}"`,
        `"${g.descricao  || ''}"`,
        `"${g.total_membros ?? ''}"`,
      ].join(','));
    });
    linhas.push(['']);
  }

  // Áreas
  if (areasLista.length) {
    linhas.push(['=== ÁREAS ===']);
    linhas.push(['"Nome"', '"Descrição"', '"Nível de acesso"']);
    areasLista.forEach(a => {
      linhas.push([
        `"${a.nome          || ''}"`,
        `"${a.descricao     || ''}"`,
        `"${a.nivel_restricao || ''}"`,
      ].join(','));
    });
  }

  const csv  = linhas.map(l => Array.isArray(l) ? l.join('') : l).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `regras_acesso_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') showToast('Exportação concluída!', 'success');
}

/* ============================================================
   MODAIS PROFISSIONAIS — ALERTA / SUCESSO / CONFIRMAR
   ============================================================ */

function initModaisExtras() {
  // Alerta
  ['modal-alerta-regra-fechar', 'modal-alerta-regra-ok'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => fecharOverlay('modal-alerta-regra'));
  });

  // Sucesso
  ['modal-sucesso-regra-fechar', 'modal-sucesso-regra-ok'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => fecharOverlay('modal-sucesso-regra'));
  });

  // Confirmar
  document.getElementById('btn-confirmar-regra-cancelar')?.addEventListener('click', () => {
    fecharOverlay('modal-confirmar-regra');
    if (_confirmarResolve) { _confirmarResolve(false); _confirmarResolve = null; }
  });

  document.getElementById('btn-confirmar-regra-ok')?.addEventListener('click', () => {
    fecharOverlay('modal-confirmar-regra');
    if (_confirmarResolve) { _confirmarResolve(true); _confirmarResolve = null; }
  });
}

/* --- Alerta genérico ------------------------------------ */
function mostrarAlerta(msg) {
  const el = document.getElementById('modal-alerta-regra-msg');
  if (el) el.textContent = msg;
  abrirOverlay('modal-alerta-regra');
}

/* --- Confirm assíncrono --------------------------------- */
let _confirmarResolve = null;

function confirmarExclusao(msg) {
  return new Promise(resolve => {
    _confirmarResolve = resolve;
    const el = document.getElementById('modal-confirmar-regra-msg');
    if (el) el.textContent = msg;
    abrirOverlay('modal-confirmar-regra');
  });
}

/* --- Modal sucesso regra -------------------------------- */
function mostrarModalSucessoRegra(dados, nomeGrupo, nomeArea) {
  const diasNome = { 0:'Dom', 1:'Seg', 2:'Ter', 3:'Qua', 4:'Qui', 5:'Sex', 6:'Sáb' };
  const diasStr  = (dados.dias_semana || []).map(d => diasNome[d] || d).join(', ') || '—';

  const horario = (dados.horario_inicio && dados.horario_fim)
    ? `${dados.horario_inicio} → ${dados.horario_fim}`
    : (dados.horario_inicio || dados.horario_fim || '—');

  const tipoLabel = {
    horario:'Horário', area:'Área', grupo:'Grupo', excecao:'Exceção'
  }[dados.tipo] || dados.tipo || '—';

  const prioLabel = {
    normal:'Normal', alta:'Alta', critica:'Crítica'
  }[dados.prioridade] || dados.prioridade || 'Normal';

  const prioColor = { normal:'var(--primary)', alta:'var(--warning)', critica:'var(--danger)' }[dados.prioridade] || 'var(--primary)';

  const statusBadge = dados.status === 'ativa'
    ? '<span class="badge badge-success">Ativa</span>'
    : '<span class="badge badge-neutral">Inativa</span>';

  const body = document.getElementById('modal-sucesso-regra-body');
  if (!body) return;

  body.innerHTML = `
    <div class="regra-sucesso-hero">
      <div class="regra-sucesso-icone">
        <i class="ph ph-shield-check"></i>
      </div>
      <div class="regra-sucesso-nome">${dados.nome}</div>
    </div>
    <div class="regra-sucesso-grid">
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Tipo</span>
        <span>${tipoLabel}</span>
      </div>
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Prioridade</span>
        <span style="color:${prioColor};font-weight:600;">${prioLabel}</span>
      </div>
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Grupo</span>
        <span>${nomeGrupo || '—'}</span>
      </div>
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Área</span>
        <span>${nomeArea || '—'}</span>
      </div>
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Horário</span>
        <span>${horario}</span>
      </div>
      <div class="regra-sucesso-item">
        <span class="regra-sucesso-label">Dias</span>
        <span>${diasStr}</span>
      </div>
      <div class="regra-sucesso-item" style="grid-column:1/-1;">
        <span class="regra-sucesso-label">Status</span>
        <span>${statusBadge}</span>
      </div>
    </div>
  `;

  abrirOverlay('modal-sucesso-regra');
}