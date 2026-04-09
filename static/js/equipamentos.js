/* ============================================================
   CRV CONTROLE DE ACESSO
   TELA: EQUIPAMENTOS — equipamentos.js
   ============================================================ */

console.log('🚀 EQUIPAMENTOS iniciado');

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let equipLista    = [];
let equipEditando = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Garante que modais começam fechados
  ['modal-equip'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('equip-hidden');
  });

  // Aguarda o main.js terminar de injetar sidebar/header
  setTimeout(() => {
    initViewToggle();
    initModalEquip();
    initTipoEquip();
    initBusca();
    initModalExportarEquip();
    carregarDados();
  }, 300);
});

/* ============================================================
   CARREGAR TUDO
   ============================================================ */
async function carregarDados() {
  await Promise.all([
    carregarEquipamentos(),
    carregarAreasSelect()
  ]);
  atualizarKPIs();
}

async function carregarEquipamentos() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('equipamentos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('[EQUIP]', error); return; }

  equipLista = data || [];
  renderizarEquipamentos(equipLista);
}

async function carregarAreasSelect() {
  const sb = window.getSupabase();
  if (!sb) return;

  const { data, error } = await sb.from('areas').select('id, nome').order('nome');
  if (error) { console.error('[AREAS]', error); return; }

  const select = document.getElementById('e-area');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione a área...</option>';
  (data || []).forEach(a => select.add(new Option(a.nome, a.id)));
}

/* ============================================================
   RENDERIZAR
   ============================================================ */
function renderizarEquipamentos(lista) {
  const grid  = document.getElementById('equip-cards-grid');
  const empty = document.getElementById('equip-empty');
  const tbody = document.getElementById('equip-tbody');
  const total = document.getElementById('equip-total-label');

  if (!grid) return;
  grid.innerHTML = '';
  if (tbody) tbody.innerHTML = '';
  if (total) total.textContent = `${lista.length} equipamento${lista.length !== 1 ? 's' : ''}`;

  if (!lista.length) {
    empty?.classList.remove('equip-hidden');
    grid.classList.add('equip-hidden');
    return;
  }

  empty?.classList.add('equip-hidden');
  grid.classList.remove('equip-hidden');

  lista.forEach(e => {
    renderCardEquip(e);
    if (tbody) renderLinhaTabela(e, tbody);
  });
}

function renderLinhaTabela(e, tbody) {
  const badgeMap = {
    online:     'badge-success',
    offline:    'badge-danger',
    alerta:     'badge-warning',
    manutencao: 'badge-neutral'
  };
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${e.nome || '—'}</strong></td>
    <td>${e.tipo || '—'}</td>
    <td>${e.ip || '—'}</td>
    <td>${e.local || '—'}</td>
    <td>${e.ultimo_contato || '—'}</td>
    <td>${e.firmware || '—'}</td>
    <td><span class="badge ${badgeMap[e.status] || ''}">${e.status || '—'}</span></td>
    <td>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar" onclick="editarEquip('${e.id}')">
          <i class="ph ph-pencil"></i>
        </button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Logs" onclick="verLogsEquip('${e.id}')">
          <i class="ph ph-list-magnifying-glass"></i>
        </button>
      </div>
    </td>
  `;
  tbody.appendChild(tr);
}

/* ============================================================
   KPIs
   ============================================================ */
function atualizarKPIs() {
  const kpiCards = document.querySelectorAll('.kpi-value');
  if (kpiCards.length >= 4) {
    kpiCards[0].textContent = equipLista.length;
    kpiCards[1].textContent = equipLista.filter(e => e.status === 'online').length;
    kpiCards[2].textContent = equipLista.filter(e => e.status === 'offline').length;
    kpiCards[3].textContent = equipLista.filter(e => e.status === 'alerta').length;
  }
}

/* ============================================================
   ALTERNÂNCIA DE VIEW
   ============================================================ */
function initViewToggle() {
  const btnCards  = document.getElementById('btn-view-cards');
  const btnTabela = document.getElementById('btn-view-tabela');
  const viewCards = document.getElementById('view-equip-cards');
  const viewTab   = document.getElementById('view-equip-tabela');

  btnCards?.addEventListener('click', () => {
    btnCards.classList.add('active');
    btnTabela.classList.remove('active');
    viewCards.classList.remove('equip-hidden');
    viewTab.classList.add('equip-hidden');
  });

  btnTabela?.addEventListener('click', () => {
    btnTabela.classList.add('active');
    btnCards.classList.remove('active');
    viewTab.classList.remove('equip-hidden');
    viewCards.classList.add('equip-hidden');
  });
}

/* ============================================================
   MODAL — NOVO / EDITAR EQUIPAMENTO
   ============================================================ */
function initModalEquip() {
  const overlay   = document.getElementById('modal-equip');
  const btnNovo   = document.getElementById('btn-novo-equip');
  const btnNovoE  = document.getElementById('btn-novo-equip-empty');
  const btnFechar = document.getElementById('modal-equip-fechar');
  const btnCancel = document.getElementById('btn-equip-cancelar');
  const btnSalvar = document.getElementById('btn-equip-salvar');
  const btnTestar = document.getElementById('btn-equip-testar');

  const abrir = () => {
    equipEditando = null;
    document.getElementById('modal-equip-titulo').innerHTML =
      '<i class="ph ph-device-mobile"></i> Novo Equipamento';
    limparModalEquip();
    overlay.classList.remove('equip-hidden');
    document.body.style.overflow = 'hidden';
  };

  const fechar = () => {
    overlay.classList.add('equip-hidden');
    document.body.style.overflow = '';
    equipEditando = null;
  };

  if (btnNovo)   btnNovo.addEventListener('click',   (e) => { e.stopPropagation(); abrir(); });
  if (btnNovoE)  btnNovoE.addEventListener('click',  (e) => { e.stopPropagation(); abrir(); });
  if (btnFechar) btnFechar.addEventListener('click',  fechar);
  if (btnCancel) btnCancel.addEventListener('click',  fechar);

  btnTestar?.addEventListener('click', testarConexao);

  btnSalvar?.addEventListener('click', async () => {
    if (!validarModalEquip()) return;

    const sb = window.getSupabase();
    if (!sb) { alert('Banco não conectado.'); return; }

    const dados = coletarDadosEquip();

    const response = equipEditando
      ? await sb.from('equipamentos').update(dados).eq('id', equipEditando)
      : await sb.from('equipamentos').insert([dados]);

    if (response.error) { alert('Erro: ' + response.error.message); return; }

    fechar();
    await carregarDados();
  });
}

function limparModalEquip() {
  ['e-nome','e-modelo','e-serie','e-local',
   'e-ip','e-firmware','e-obs','e-usuario'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const senha = document.getElementById('e-senha');
  if (senha) senha.value = '';

  ['e-sentido','e-area','e-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  const porta = document.getElementById('e-porta');
  if (porta) porta.value = '80';

  document.querySelectorAll('.equip-tipo-item').forEach(i => i.classList.remove('selected'));
}

function validarModalEquip() {
  const nome  = document.getElementById('e-nome')?.value.trim();
  const local = document.getElementById('e-local')?.value.trim();
  const ip    = document.getElementById('e-ip')?.value.trim();

  if (!nome)  { alert('Informe o nome do equipamento.');   document.getElementById('e-nome')?.focus();  return false; }
  if (!local) { alert('Informe a localização.');           document.getElementById('e-local')?.focus(); return false; }
  if (!ip)    { alert('Informe o endereço IP.');           document.getElementById('e-ip')?.focus();    return false; }
  if (!validarIP(ip)) { alert('Endereço IP inválido.');    document.getElementById('e-ip')?.focus();    return false; }

  return true;
}

function coletarDadosEquip() {
  const tipoSel = document.querySelector('.equip-tipo-item.selected');
  return {
    tipo:          tipoSel?.dataset.tipo || null,
    nome:          document.getElementById('e-nome')?.value.trim()    || null,
    modelo:        document.getElementById('e-modelo')?.value.trim()  || null,
    serie:         document.getElementById('e-serie')?.value.trim()   || null,
    local:         document.getElementById('e-local')?.value.trim()   || null,
    ip:            document.getElementById('e-ip')?.value.trim()      || null,
    porta:         document.getElementById('e-porta')?.value.trim()   || '80',
    usuario:       document.getElementById('e-usuario')?.value.trim() || null,
    sentido:       document.getElementById('e-sentido')?.value        || null,
    area_id:       document.getElementById('e-area')?.value           || null,
    firmware:      document.getElementById('e-firmware')?.value.trim()|| null,
    status:        document.getElementById('e-status')?.value         || 'offline',
    observacao:    document.getElementById('e-obs')?.value.trim()     || null,
  };
}

/* ============================================================
   TESTAR CONEXÃO
   ============================================================ */
function testarConexao() {
  const ip    = document.getElementById('e-ip')?.value.trim();
  const porta = document.getElementById('e-porta')?.value.trim() || '80';

  if (!ip) { alert('Informe o IP antes de testar.'); return; }

  const btn = document.getElementById('btn-equip-testar');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner"></i> Testando...';

  // TODO: chamar endpoint backend /api/equipamentos/testar-conexao
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-plug"></i> Testar conexão';
    console.log(`[EQUIP] Testar conexão: ${ip}:${porta}`);
  }, 2000);
}

/* ============================================================
   SELEÇÃO DE TIPO
   ============================================================ */
function initTipoEquip() {
  document.querySelectorAll('.equip-tipo-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.equip-tipo-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
}

/* ============================================================
   BUSCA + FILTROS
   ============================================================ */
function initBusca() {
  const inputBusca  = document.getElementById('busca-equip');
  const filtroTipo  = document.getElementById('filtro-tipo-equip');
  const filtroStatus = document.getElementById('filtro-status-equip');

  const aplicar = () => {
    const termo  = inputBusca?.value.toLowerCase()  || '';
    const tipo   = filtroTipo?.value.toLowerCase()  || '';
    const status = filtroStatus?.value              || '';

    const filtrada = equipLista.filter(e => {
      const matchTermo  = !termo  ||
        e.nome?.toLowerCase().includes(termo)  ||
        e.ip?.toLowerCase().includes(termo)    ||
        e.local?.toLowerCase().includes(termo);
      const matchTipo   = !tipo   || e.tipo?.toLowerCase()   === tipo;
      const matchStatus = !status || e.status === status;
      return matchTermo && matchTipo && matchStatus;
    });

    renderizarEquipamentos(filtrada);
  };

  inputBusca?.addEventListener('input',   aplicar);
  filtroTipo?.addEventListener('change',  aplicar);
  filtroStatus?.addEventListener('change', aplicar);

  document.getElementById('btn-equip-exportar')?.addEventListener('click', exportarCSV);
}

function exportarCSV() {
  if (!equipLista.length) {
    if (typeof showToast === 'function') showToast('Nenhum equipamento para exportar.', 'warning');
    return;
  }

  const headers = ['Nome', 'Tipo', 'IP', 'Porta', 'Localização', 'Sentido', 'Firmware', 'Status', 'Último Contato'];
  const rows = equipLista.map(e => [
    e.nome         || '',
    e.tipo         || '',
    e.ip           || '',
    e.porta        || '80',
    e.local        || '',
    e.sentido      || '',
    e.firmware     || '',
    e.status       || '',
    e.ultimo_contato || ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `equipamentos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') showToast('Exportação concluída!', 'success');
}

/* ============================================================
   EDITAR
   ============================================================ */
function editarEquip(id) {
  const e = equipLista.find(x => x.id == id);
  if (!e) return;

  equipEditando = e.id;

  document.getElementById('modal-equip-titulo').innerHTML =
    '<i class="ph ph-device-mobile"></i> Editar Equipamento';

  document.querySelectorAll('.equip-tipo-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.tipo === e.tipo);
  });

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  set('e-nome',     e.nome);
  set('e-modelo',   e.modelo);
  set('e-serie',    e.serie);
  set('e-local',    e.local);
  set('e-ip',       e.ip);
  set('e-porta',    e.porta || '80');
  set('e-usuario',  e.usuario);
  set('e-firmware', e.firmware);
  set('e-obs',      e.observacao);
  set('e-sentido',  e.sentido);
  set('e-area',     e.area_id);
  set('e-status',   e.status);

  const overlay = document.getElementById('modal-equip');
  overlay.classList.remove('equip-hidden');
  document.body.style.overflow = 'hidden';
}

/* ============================================================
   EXCLUIR
   ============================================================ */
async function excluirEquip(id) {
  if (!confirm('Excluir este equipamento?')) return;
  const sb = window.getSupabase();
  const { error } = await sb.from('equipamentos').delete().eq('id', id);
  if (error) { alert('Erro: ' + error.message); return; }
  await carregarDados();
}

/* ============================================================
   VER LOGS
   ============================================================ */
function verLogsEquip(id) {
  // TODO: navegar para monitoramento filtrado por equipamento
  console.log('[EQUIP] Ver logs:', id);
}

/* ============================================================
   RENDER CARD
   ============================================================ */
const EQUIP_ICONES = {
  catraca:     'ph-git-branch',
  facial:      'ph-scan',
  biometrico:  'ph-fingerprint',
  controlador: 'ph-cpu',
  camera:      'ph-camera',
  outro:       'ph-cube',
};

function renderCardEquip(equip) {
  const grid = document.getElementById('equip-cards-grid');
  if (!grid) return;

  const icone  = EQUIP_ICONES[equip.tipo] || 'ph-cube';
  const status = equip.status || 'offline';

  const labels = {
    online:     '<span class="equip-status-badge online"><i class="ph ph-circle-fill"></i> Online</span>',
    offline:    '<span class="equip-status-badge offline"><i class="ph ph-circle-fill"></i> Offline</span>',
    alerta:     '<span class="equip-status-badge alerta"><i class="ph ph-warning"></i> Alerta</span>',
    manutencao: '<span class="equip-status-badge manutencao"><i class="ph ph-wrench"></i> Manutenção</span>',
  };

  const card = document.createElement('div');
  card.className = `equip-card ${status}`;
  card.innerHTML = `
    <div class="equip-card-header">
      <div class="equip-card-icon-wrap">
        <i class="ph ${icone}"></i>
      </div>
      <div class="equip-card-titulo">
        <div class="equip-card-nome">${equip.nome || '—'}</div>
        <div class="equip-card-modelo">${equip.modelo || '—'}</div>
      </div>
      <div class="equip-status-dot ${status}"></div>
    </div>
    <div class="equip-card-body">
      <div class="equip-card-info-row">
        <i class="ph ph-map-pin"></i>
        <span>${equip.local || '—'}</span>
      </div>
      <div class="equip-card-info-row">
        <i class="ph ph-network"></i>
        <span>${equip.ip || '—'}:${equip.porta || '80'}</span>
      </div>
      <div class="equip-card-info-row">
        <i class="ph ph-arrow-u-up-right"></i>
        <span>${equip.sentido || '—'}</span>
      </div>
      <div class="equip-card-info-row">
        <i class="ph ph-hard-drive"></i>
        <span>Firmware ${equip.firmware || '—'}</span>
      </div>
    </div>
    <div class="equip-card-footer">
      <div class="equip-card-ultimo">
        <i class="ph ph-clock"></i>
        ${equip.ultimo_contato || 'Sem contato'}
      </div>
      <div class="equip-card-actions">
        ${labels[status] || ''}
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar"
          onclick="editarEquip('${equip.id}')">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Logs"
          onclick="verLogsEquip('${equip.id}')">
          <i class="ph ph-list-magnifying-glass"></i>
        </button>
      </div>
    </div>
  `;

  grid.appendChild(card);
}

/* ============================================================
   HELPER — VALIDAÇÃO IP
   ============================================================ */
function validarIP(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split('.').every(n => parseInt(n) <= 255);
}