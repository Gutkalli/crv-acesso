/* ============================================================
   CRV CONTROLE DE ACESSO — ocorrencias.js
   ============================================================ */

console.log('🚀 OCORRENCIAS iniciado');

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModalOcorr();
  initModalDetalhe();
  initFiltros();
  preencherDataAtual();
  carregarOcorrencias();

  initModalExportarOcorr();
  document.getElementById('btn-ocorr-exportar')?.addEventListener('click', abrirModalExportarOcorr);
});


/* ============================================================
   ESTADO GLOBAL
   ============================================================ */

let ocorrenciasLista = [];
let ocorrenciaEditando = null;


/* ============================================================
   ABAS
   ============================================================ */

function initTabs() {
  document.querySelectorAll('.ocorr-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ocorr-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filtrarPorAba(tab.dataset.tab);
    });
  });
}

function filtrarPorAba(aba) {
  let filtrada = ocorrenciasLista;

  if (aba === 'abertas')   filtrada = ocorrenciasLista.filter(o => o.status === 'aberta');
  if (aba === 'analise')   filtrada = ocorrenciasLista.filter(o => o.status === 'analise');
  if (aba === 'resolvidas') filtrada = ocorrenciasLista.filter(o => o.status === 'resolvida');

  renderizarOcorrencias(filtrada);
}


/* ============================================================
   CARREGAR OCORRÊNCIAS
   ============================================================ */

async function carregarOcorrencias() {
  const sb = window.getSupabase();
  if (!sb) return;

  try {
    console.log('📡 Buscando ocorrências...');

    const { data, error } = await sb
      .from('ocorrencias')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar ocorrências:', error);
      return;
    }

    ocorrenciasLista = data || [];

    console.log('✅ Ocorrências carregadas:', ocorrenciasLista.length);

    atualizarKPIsOcorr(ocorrenciasLista);
    renderizarOcorrencias(ocorrenciasLista);

  } catch (err) {
    console.error('Erro inesperado:', err);
  }
}


/* ============================================================
   KPIs
   ============================================================ */

function atualizarKPIsOcorr(lista) {
  const hoje = new Date().toISOString().split('T')[0];

  const vals = document.querySelectorAll('.kpi-value');
  if (vals[0]) vals[0].textContent = lista.filter(o => o.status === 'aberta').length;
  if (vals[1]) vals[1].textContent = lista.filter(o => o.status === 'analise').length;
  if (vals[2]) vals[2].textContent = lista.filter(o => o.status === 'resolvida' && o.updated_at?.startsWith(hoje)).length;
  if (vals[3]) vals[3].textContent = lista.filter(o => o.prioridade === 'Crítica').length;
}


/* ============================================================
   RENDERIZAR LISTA
   ============================================================ */

function renderizarOcorrencias(lista) {
  const listEl = document.getElementById('ocorr-list');
  const empty  = document.getElementById('ocorr-empty');
  const label  = document.getElementById('ocorr-total-label');

  if (!listEl) return;

  listEl.innerHTML = '';

  if (!lista || lista.length === 0) {
    empty?.classList.remove('ocorr-hidden');
    listEl.classList.add('ocorr-hidden');
    if (label) label.textContent = '0 ocorrências';
    return;
  }

  empty?.classList.add('ocorr-hidden');
  listEl.classList.remove('ocorr-hidden');
  if (label) label.textContent = `${lista.length} ocorrências`;

  lista.forEach(o => renderItemOcorr(o));
}


/* ============================================================
   MODAL — NOVA OCORRÊNCIA
   ============================================================ */

function initModalOcorr() {
  const overlay   = document.getElementById('modal-ocorr');
  const btnNova   = document.getElementById('btn-nova-ocorr');
  const btnNovaE  = document.getElementById('btn-nova-ocorr-empty');
  const btnFechar = document.getElementById('modal-ocorr-fechar');
  const btnCancel = document.getElementById('btn-ocorr-cancelar');
  const btnSalvar = document.getElementById('btn-ocorr-salvar');

  const abrir = () => {
    ocorrenciaEditando = null;
    limparModalOcorr();
    overlay.classList.remove('ocorr-hidden');
    document.body.style.overflow = 'hidden';
    const titulo = document.getElementById('modal-ocorr-titulo');
    if (titulo) titulo.innerHTML = '<i class="ph ph-warning-circle"></i> Nova Ocorrência';
  };

  const fechar = () => {
    overlay.classList.add('ocorr-hidden');
    document.body.style.overflow = '';
  };

  if (btnNova)   btnNova.addEventListener('click', abrir);
  if (btnNovaE)  btnNovaE.addEventListener('click', abrir);
  if (btnFechar) btnFechar.addEventListener('click', fechar);
  if (btnCancel) btnCancel.addEventListener('click', fechar);

  if (btnSalvar) {
    btnSalvar.addEventListener('click', async () => {
      if (!validarModalOcorr()) return;

      const sb = window.getSupabase();
      if (!sb) {
        alert('Banco de dados não conectado.');
        return;
      }

      const dados = coletarDadosOcorr();

      try {
        let response;

        if (ocorrenciaEditando) {
          response = await sb
            .from('ocorrencias')
            .update(dados)
            .eq('id', ocorrenciaEditando);
        } else {
          response = await sb
            .from('ocorrencias')
            .insert([dados]);
        }

        if (response.error) {
          console.error(response.error);
          alert('Erro ao salvar: ' + response.error.message);
          return;
        }

        console.log('✅ Ocorrência salva');
        fechar();
        carregarOcorrencias();

      } catch (err) {
        console.error(err);
        alert('Erro inesperado ao salvar.');
      }
    });
  }
}

function limparModalOcorr() {
  ['o-funcionario', 'o-local', 'o-descricao', 'o-responsavel', 'o-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['o-tipo', 'o-prioridade', 'o-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  const dataEl = document.getElementById('o-data');
  if (dataEl) {
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    dataEl.value = agora.toISOString().slice(0, 16);
  }
}

function validarModalOcorr() {
  const tipo      = document.getElementById('o-tipo')?.value;
  const prioridade = document.getElementById('o-prioridade')?.value;
  const descricao = document.getElementById('o-descricao')?.value.trim();

  if (!tipo) {
    alert('Selecione o tipo de ocorrência.');
    document.getElementById('o-tipo')?.focus();
    return false;
  }

  if (!prioridade) {
    alert('Selecione a prioridade.');
    document.getElementById('o-prioridade')?.focus();
    return false;
  }

  if (!descricao) {
    alert('Informe a descrição da ocorrência.');
    document.getElementById('o-descricao')?.focus();
    return false;
  }

  return true;
}

function coletarDadosOcorr() {
  return {
    tipo:        document.getElementById('o-tipo')?.value,
    prioridade:  document.getElementById('o-prioridade')?.value,
    funcionario: document.getElementById('o-funcionario')?.value.trim() || null,
    local:       document.getElementById('o-local')?.value.trim() || null,
    descricao:   document.getElementById('o-descricao')?.value.trim(),
    data:        document.getElementById('o-data')?.value || null,
    status:      document.getElementById('o-status')?.value || 'aberta',
    responsavel: document.getElementById('o-responsavel')?.value.trim() || null,
    obs:         document.getElementById('o-obs')?.value.trim() || null,
  };
}


/* ============================================================
   MODAL — DETALHE DA OCORRÊNCIA
   ============================================================ */

function initModalDetalhe() {
  const overlay    = document.getElementById('modal-ocorr-detalhe');
  const btnFechar  = document.getElementById('modal-detalhe-fechar');
  const btnFechar2 = document.getElementById('btn-detalhe-fechar');
  const btnEditar  = document.getElementById('btn-detalhe-editar');
  const btnResolver = document.getElementById('btn-detalhe-resolver');

  const fechar = () => {
    overlay.classList.add('ocorr-hidden');
    document.body.style.overflow = '';
  };

  if (btnFechar)  btnFechar.addEventListener('click', fechar);
  if (btnFechar2) btnFechar2.addEventListener('click', fechar);

  if (btnEditar) {
    btnEditar.addEventListener('click', () => {
      fechar();
      if (ocorrenciaEditando) {
        const ocorr = ocorrenciasLista.find(o => o.id === ocorrenciaEditando);
        if (ocorr) abrirModalEdicao(ocorr);
      }
    });
  }

  if (btnResolver) {
    btnResolver.addEventListener('click', async () => {
      if (!ocorrenciaEditando) return;

      const sb = window.getSupabase();
      if (!sb) return;

      const { error } = await sb
        .from('ocorrencias')
        .update({ status: 'resolvida' })
        .eq('id', ocorrenciaEditando);

      if (error) {
        alert('Erro ao resolver: ' + error.message);
        return;
      }

      console.log('✅ Ocorrência resolvida');
      fechar();
      carregarOcorrencias();
    });
  }
}

function abrirDetalheOcorrById(id) {
  const ocorr = ocorrenciasLista.find(o => String(o.id) === String(id));
  if (ocorr) abrirDetalheOcorr(ocorr);
}

function abrirDetalheOcorr(ocorr) {
  ocorrenciaEditando = ocorr.id;

  const overlay = document.getElementById('modal-ocorr-detalhe');
  const body    = document.getElementById('modal-detalhe-body');

  const corPrioridade = {
    'Crítica': 'critica',
    'Alta':    'alta',
    'Normal':  'normal',
    'Baixa':   'baixa',
  }[ocorr.prioridade] || 'normal';

  const icones = {
    'Acesso negado':         'ph-x-circle',
    'Uso indevido':          'ph-warning',
    'Equipamento offline':   'ph-wifi-slash',
    'Saída fora do horário': 'ph-clock',
    'Tentativa suspeita':    'ph-shield-warning',
    'Outro':                 'ph-warning-circle',
  };

  const icone = icones[ocorr.tipo] || 'ph-warning-circle';

  const statusLabels = {
    aberta:    'Aberta',
    analise:   'Em análise',
    resolvida: 'Resolvida',
    fechada:   'Fechada',
  };

  body.innerHTML = `
    <div class="ocorr-detalhe-header">
      <div class="ocorr-detalhe-icon ocorr-item-icon ${corPrioridade}">
        <i class="ph ${icone}"></i>
      </div>
      <div class="ocorr-detalhe-info">
        <div class="ocorr-detalhe-titulo">${ocorr.tipo}</div>
        <div class="ocorr-detalhe-badges">
          <span class="ocorr-prioridade-badge ${corPrioridade}">${ocorr.prioridade}</span>
          <span class="ocorr-status-badge ${ocorr.status}">${statusLabels[ocorr.status] || ocorr.status}</span>
        </div>
      </div>
    </div>

    <div class="modal-section-title">Detalhes</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Funcionário</span>
        <span style="color:var(--text-primary);font-weight:500;">${ocorr.funcionario || '—'}</span>
      </div>
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Local / Área</span>
        <span style="color:var(--text-primary);font-weight:500;">${ocorr.local || '—'}</span>
      </div>
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Data / Hora</span>
        <span style="color:var(--text-primary);font-weight:500;">${ocorr.data ? new Date(ocorr.data).toLocaleString('pt-BR') : '—'}</span>
      </div>
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Responsável</span>
        <span style="color:var(--text-primary);font-weight:500;">${ocorr.responsavel || '—'}</span>
      </div>
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Descrição</span>
        <span style="color:var(--text-secondary);line-height:1.6;">${ocorr.descricao || '—'}</span>
      </div>
      ${ocorr.obs ? `
      <div style="display:flex;gap:10px;font-size:0.83rem;">
        <span style="color:var(--text-muted);min-width:110px;">Observações</span>
        <span style="color:var(--text-secondary);line-height:1.6;">${ocorr.obs}</span>
      </div>` : ''}
    </div>

    <div class="modal-section-title">Histórico</div>
    <div class="ocorr-timeline" id="ocorr-timeline-detalhe">
      ${renderTimeline(ocorr.timeline || [])}
    </div>
  `;

  overlay.classList.remove('ocorr-hidden');
  document.body.style.overflow = 'hidden';
}

function renderTimeline(eventos) {
  if (!eventos.length) {
    return `<p style="font-size:0.8rem;color:var(--text-muted);padding:10px 0;">
      Nenhuma ação registrada ainda.
    </p>`;
  }

  return eventos.map(ev => `
    <div class="ocorr-timeline-item">
      <div class="ocorr-timeline-dot-wrap">
        <div class="ocorr-timeline-dot ${ev.cor || ''}"></div>
        <div class="ocorr-timeline-line"></div>
      </div>
      <div class="ocorr-timeline-content">
        <div class="ocorr-timeline-acao">${ev.acao}</div>
        <div class="ocorr-timeline-meta">
          <span>${ev.usuario || '—'}</span>
          <span>${ev.hora || '—'}</span>
        </div>
      </div>
    </div>
  `).join('');
}


/* ============================================================
   ABRIR MODAL EDIÇÃO
   ============================================================ */

function abrirModalEdicao(ocorr) {
  ocorrenciaEditando = ocorr.id;

  const overlay = document.getElementById('modal-ocorr');
  const titulo  = document.getElementById('modal-ocorr-titulo');

  if (titulo) titulo.innerHTML = '<i class="ph ph-pencil-simple"></i> Editar Ocorrência';

  const map = {
    'o-tipo':        ocorr.tipo,
    'o-prioridade':  ocorr.prioridade,
    'o-funcionario': ocorr.funcionario,
    'o-local':       ocorr.local,
    'o-descricao':   ocorr.descricao,
    'o-responsavel': ocorr.responsavel,
    'o-obs':         ocorr.obs,
    'o-status':      ocorr.status,
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  });

  if (ocorr.data) {
    const dataEl = document.getElementById('o-data');
    if (dataEl) {
      const d = new Date(ocorr.data);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      dataEl.value = d.toISOString().slice(0, 16);
    }
  }

  overlay.classList.remove('ocorr-hidden');
  document.body.style.overflow = 'hidden';
}


/* ============================================================
   EDITAR / EXCLUIR
   ============================================================ */

function editarOcorr(id) {
  const ocorr = ocorrenciasLista.find(o => o.id == id);
  if (ocorr) abrirModalEdicao(ocorr);
}

async function excluirOcorr(id) {
  if (!confirm('Excluir esta ocorrência?')) return;

  const sb = window.getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from('ocorrencias')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Erro ao excluir: ' + error.message);
    return;
  }

  console.log('✅ Ocorrência excluída');
  carregarOcorrencias();
}


/* ============================================================
   RENDERIZAR ITEM
   ============================================================ */

function renderItemOcorr(ocorr) {
  const lista = document.getElementById('ocorr-list');
  if (!lista) return;

  const corPrioridade = {
    'Crítica': 'critica',
    'Alta':    'alta',
    'Normal':  'normal',
    'Baixa':   'baixa',
  }[ocorr.prioridade] || 'normal';

  const icones = {
    'Acesso negado':         'ph-x-circle',
    'Uso indevido':          'ph-warning',
    'Equipamento offline':   'ph-wifi-slash',
    'Saída fora do horário': 'ph-clock',
    'Tentativa suspeita':    'ph-shield-warning',
    'Outro':                 'ph-warning-circle',
  };

  const icone = icones[ocorr.tipo] || 'ph-warning-circle';

  const statusLabels = {
    aberta:    '<span class="ocorr-status-badge aberta">Aberta</span>',
    analise:   '<span class="ocorr-status-badge analise">Em análise</span>',
    resolvida: '<span class="ocorr-status-badge resolvida">Resolvida</span>',
    fechada:   '<span class="ocorr-status-badge fechada">Fechada</span>',
  };

  const hora = ocorr.data
    ? new Date(ocorr.data).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : '—';

  const item = document.createElement('div');
  item.className = `ocorr-item ${corPrioridade}`;
  item.innerHTML = `
    <div class="ocorr-item-icon ${corPrioridade}">
      <i class="ph ${icone}"></i>
    </div>
    <div class="ocorr-item-body">
      <div class="ocorr-item-header">
        <span class="ocorr-item-titulo">${ocorr.tipo}</span>
        <span class="ocorr-prioridade-badge ${corPrioridade}">${ocorr.prioridade}</span>
        ${statusLabels[ocorr.status] || ''}
      </div>
      <div class="ocorr-item-desc">${ocorr.descricao || '—'}</div>
      <div class="ocorr-item-meta">
        <span><i class="ph ph-user"></i>${ocorr.funcionario || 'Sem vínculo'}</span>
        <span><i class="ph ph-map-pin"></i>${ocorr.local || '—'}</span>
        <span><i class="ph ph-user-gear"></i>${ocorr.responsavel || 'Sem responsável'}</span>
      </div>
    </div>
    <div class="ocorr-item-actions">
      <div class="ocorr-item-hora">${hora}</div>
      <div class="ocorr-item-btns">
        <button class="btn btn-ghost btn-sm btn-icon" title="Ver detalhes"
          onclick="abrirDetalheOcorrById('${ocorr.id}')">
          <i class="ph ph-eye"></i>
        </button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar"
          onclick="editarOcorr('${ocorr.id}')">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="btn btn-danger btn-sm btn-icon" title="Excluir"
          onclick="excluirOcorr('${ocorr.id}')">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>
  `;

  lista.appendChild(item);
}


/* ============================================================
   MOSTRAR LISTA
   ============================================================ */

function mostrarListaOcorr() {
  document.getElementById('ocorr-empty')?.classList.add('ocorr-hidden');
  document.getElementById('ocorr-list')?.classList.remove('ocorr-hidden');
}


/* ============================================================
   FILTROS
   ============================================================ */

function initFiltros() {
  let debounce;

  const aplicar = () => {
    const termo     = document.getElementById('busca-ocorr')?.value.toLowerCase() || '';
    const tipo      = document.getElementById('filtro-tipo-ocorr')?.value || '';
    const prioridade = document.getElementById('filtro-prioridade-ocorr')?.value || '';
    const data      = document.getElementById('filtro-data-ocorr')?.value || '';

    const filtrada = ocorrenciasLista.filter(o => {
      const matchTermo =
        !termo ||
        o.tipo?.toLowerCase().includes(termo) ||
        o.descricao?.toLowerCase().includes(termo) ||
        o.funcionario?.toLowerCase().includes(termo) ||
        o.local?.toLowerCase().includes(termo);

      const matchTipo      = !tipo      || o.tipo === tipo;
      const matchPrioridade = !prioridade || o.prioridade === prioridade;
      const matchData      = !data      || o.data?.startsWith(data);

      return matchTermo && matchTipo && matchPrioridade && matchData;
    });

    renderizarOcorrencias(filtrada);
  };

  document.getElementById('busca-ocorr')?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(aplicar, 300);
  });

  document.getElementById('filtro-tipo-ocorr')?.addEventListener('change', aplicar);
  document.getElementById('filtro-prioridade-ocorr')?.addEventListener('change', aplicar);
  document.getElementById('filtro-data-ocorr')?.addEventListener('change', aplicar);
}


/* ============================================================
   HELPERS
   ============================================================ */

function preencherDataAtual() {
  const dataEl = document.getElementById('filtro-data-ocorr');
  if (dataEl) {
    dataEl.value = new Date().toISOString().split('T')[0];
  }
}


/* ============================================================
   EXPORTAR CSV
   ============================================================ */

function exportarOcorrencias() {
  const lista = ocorrenciasLista;

  if (!lista.length) {
    alert('Nenhuma ocorrência para exportar.');
    return;
  }

  const BOM = '\uFEFF';
  const sep = ';';
  const colunas = ['Tipo', 'Prioridade', 'Status', 'Funcionário', 'Local', 'Responsável', 'Data/Hora', 'Descrição'];

  const linhas = lista.map(o => [
    o.tipo        || '',
    o.prioridade  || '',
    o.status      || '',
    o.funcionario || '',
    o.local       || '',
    o.responsavel || '',
    o.data ? new Date(o.data).toLocaleString('pt-BR') : '',
    (o.descricao  || '').replace(/"/g, '""'),
  ].map(v => `"${v}"`).join(sep));

  const csv  = [colunas.join(sep), ...linhas].join('\r\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `CRV_Ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}