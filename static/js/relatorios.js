/* ============================================================
   CRV CONTROLE DE ACESSO — relatorios.js
   ============================================================ */

console.log('🚀 RELATORIOS iniciado');

document.addEventListener('DOMContentLoaded', () => {
  initTipos();
  initPeriodo();
  initAcoes();
  carregarKPIs();
  carregarHistorico();
});


/* ============================================================
   ESTADO GLOBAL
   ============================================================ */

let tipoAtivo   = 'acesso';
let dadosPrevia = [];


/* ============================================================
   CONFIGURAÇÃO DOS TIPOS
   ============================================================ */

const TIPOS_CONFIG = {

  acesso: {
    label:   'Controle de Acesso',
    tabela:  'acessos',
    campoData: 'data',
    colunas: ['Funcionário', 'Equipamento', 'Tipo', 'Sentido', 'Método', 'Data/Hora', 'Resultado'],
    campos:  (row) => [
      row.funcionario_id  || '—',
      row.equipamento_id  || '—',
      row.tipo            || '—',
      row.sentido         || '—',
      row.metodo          || '—',
      row.data ? new Date(row.data).toLocaleString('pt-BR') : '—',
      row.resultado       || '—',
    ],
    extras: [
      { id: 'rel-resultado-acesso', label: 'Resultado', tipo: 'select',
        opcoes: ['Todos', 'liberado', 'negado'] },
    ],
    filtrar: (row) => {
      const resultado = document.getElementById('rel-resultado-acesso')?.value;
      if (resultado && resultado !== 'Todos' && row.resultado !== resultado) return false;
      return true;
    },
  },

  presenca: {
    label:   'Presença de Funcionários',
    tabela:  'acessos',
    campoData: 'data',
    colunas: ['Funcionário', 'Equipamento', 'Tipo', 'Data/Hora', 'Resultado'],
    campos:  (row) => [
      row.funcionario_id  || '—',
      row.equipamento_id  || '—',
      row.tipo            || '—',
      row.data ? new Date(row.data).toLocaleString('pt-BR') : '—',
      row.resultado       || '—',
    ],
    extras: [
      { id: 'rel-resultado-pres', label: 'Resultado', tipo: 'select',
        opcoes: ['Todos', 'liberado', 'negado'] },
    ],
    filtrar: (row) => {
      const resultado = document.getElementById('rel-resultado-pres')?.value;
      if (resultado && resultado !== 'Todos' && row.resultado !== resultado) return false;
      return true;
    },
  },

  ocorrencias: {
    label:   'Ocorrências',
    tabela:  'ocorrencias',
    campoData: 'created_at',
    colunas: ['Tipo', 'Prioridade', 'Funcionário', 'Local', 'Data/Hora', 'Responsável', 'Status'],
    campos:  (row) => [
      row.tipo            || '—',
      row.prioridade      || '—',
      row.funcionario     || row.funcionario_id || '—',
      row.local           || '—',
      row.data
        ? new Date(row.data).toLocaleString('pt-BR')
        : row.created_at
          ? new Date(row.created_at).toLocaleString('pt-BR')
          : '—',
      row.responsavel     || '—',
      row.status          || '—',
    ],
    extras: [
      { id: 'rel-prioridade', label: 'Prioridade', tipo: 'select',
        opcoes: ['Todas', 'Crítica', 'Alta', 'Normal', 'Baixa'] },
      { id: 'rel-status-ocorr', label: 'Status', tipo: 'select',
        opcoes: ['Todos', 'aberta', 'analise', 'resolvida', 'fechada'] },
    ],
    filtrar: (row) => {
      const prio   = document.getElementById('rel-prioridade')?.value;
      const status = document.getElementById('rel-status-ocorr')?.value;
      if (prio   && prio   !== 'Todas' && row.prioridade !== prio)   return false;
      if (status && status !== 'Todos' && row.status     !== status) return false;
      return true;
    },
  },

  equipamentos: {
    label:   'Equipamentos',
    tabela:  'equipamentos',
    campoData: 'created_at',
    colunas: ['Nome', 'Tipo', 'Localização', 'IP', 'Último contato', 'Status'],
    campos:  (row) => [
      row.nome            || '—',
      row.tipo            || '—',
      row.localizacao     || '—',
      row.ip              || '—',
      row.ultimo_contato
        ? new Date(row.ultimo_contato).toLocaleString('pt-BR')
        : '—',
      row.status          || '—',
    ],
    extras: [
      { id: 'rel-tipo-equip', label: 'Tipo', tipo: 'select',
        opcoes: ['Todos', 'catraca', 'leitor_facial', 'leitor_biometrico', 'controlador'] },
      { id: 'rel-status-equip', label: 'Status', tipo: 'select',
        opcoes: ['Todos', 'online', 'offline', 'alerta', 'manutencao'] },
    ],
    filtrar: (row) => {
      const tipo   = document.getElementById('rel-tipo-equip')?.value;
      const status = document.getElementById('rel-status-equip')?.value;
      if (tipo   && tipo   !== 'Todos' && row.tipo   !== tipo)   return false;
      if (status && status !== 'Todos' && row.status !== status) return false;
      return true;
    },
  },

  visitantes: {
    label:   'Visitantes',
    tabela:  'acessos',
    campoData: 'data',
    colunas: ['Funcionário', 'Equipamento', 'Tipo', 'Data/Hora', 'Resultado'],
    campos:  (row) => [
      row.funcionario_id  || '—',
      row.equipamento_id  || '—',
      row.tipo            || '—',
      row.data ? new Date(row.data).toLocaleString('pt-BR') : '—',
      row.resultado       || '—',
    ],
    extras: [],
    filtrar: () => true,
  },

  auditoria: {
    label:   'Auditoria do Sistema',
    tabela:  'auditoria',
    campoData: 'data',
    colunas: ['Usuário', 'Ação', 'Tabela', 'Registro ID', 'Data/Hora'],
    campos:  (row) => [
      row.usuario_id      || '—',
      row.acao            || '—',
      row.tabela          || row.modulo || '—',
      row.registro_id     || '—',
      row.data ? new Date(row.data).toLocaleString('pt-BR') : '—',
    ],
    extras: [
      { id: 'rel-tabela-audit', label: 'Tabela', tipo: 'select',
        opcoes: ['Todas', 'funcionarios', 'credenciais', 'equipamentos',
                 'ocorrencias', 'regras_acesso', 'acessos'] },
      { id: 'rel-acao-audit', label: 'Ação', tipo: 'select',
        opcoes: ['Todas', 'criar', 'editar', 'excluir', 'login', 'logout'] },
    ],
    filtrar: (row) => {
      const tabela = document.getElementById('rel-tabela-audit')?.value;
      const acao   = document.getElementById('rel-acao-audit')?.value;
      if (tabela && tabela !== 'Todas' && row.tabela !== tabela) return false;
      if (acao   && acao   !== 'Todas' && row.acao   !== acao)   return false;
      return true;
    },
  },

};


/* ============================================================
   KPIs
   ============================================================ */

async function carregarKPIs() {
  const sb = window.getSupabase();
  if (!sb) return;

  try {
    const mesIni = new Date();
    mesIni.setDate(1);
    const mesIniStr = mesIni.toISOString().split('T')[0];

    const [resAcessos, resOcorr] = await Promise.all([
      sb.from('acessos')
        .select('*', { count: 'exact', head: true })
        .gte('data', mesIniStr + 'T00:00:00'),
      sb.from('ocorrencias')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', mesIniStr + 'T00:00:00'),
    ]);

    const vals = document.querySelectorAll('.kpi-value');
    if (vals[0]) vals[0].textContent = '0';
    if (vals[1]) vals[1].textContent = '0';
    if (vals[2]) vals[2].textContent = resAcessos.count ?? 0;
    if (vals[3]) vals[3].textContent = resOcorr.count   ?? 0;

  } catch (err) {
    console.error('Erro KPIs:', err);
  }
}


/* ============================================================
   HISTÓRICO DE RELATÓRIOS
   ============================================================ */

async function carregarHistorico() {
  const sb = window.getSupabase();
  if (!sb) return;

  try {
    const { data, error } = await sb
      .from('auditoria')
      .select('*')
      .eq('acao', 'gerar')
      .order('data', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Histórico indisponível:', error.message);
      return;
    }

    if (!data || data.length === 0) return;

    mostrarHistorico();

    data.forEach(row => {
      renderLinhaHistorico({
        id:        row.id,
        tipo:      row.descricao || 'Relatório',
        periodo:   row.extra?.periodo  || '—',
        formato:   row.extra?.formato  || 'csv',
        geradoEm:  row.data ? new Date(row.data).toLocaleString('pt-BR') : '—',
        geradoPor: row.usuario_id      || '—',
        tamanho:   row.extra?.tamanho  || '—',
      });
    });

  } catch (err) {
    console.error('Erro histórico:', err);
  }
}


/* ============================================================
   TIPOS — INIT
   ============================================================ */

function initTipos() {
  document.querySelectorAll('.rel-tipo-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.rel-tipo-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      tipoAtivo = item.dataset.tipo;
      const config = TIPOS_CONFIG[tipoAtivo];
      if (!config) return;

      const badge = document.getElementById('rel-tipo-badge');
      if (badge) badge.textContent = config.label;

      renderCamposExtras(config.extras);
      ocultarPrevia();
    });
  });

  renderCamposExtras(TIPOS_CONFIG[tipoAtivo].extras);
}

function renderCamposExtras(extras) {
  const wrap = document.getElementById('rel-campos-extras');
  if (!wrap) return;

  if (!extras || !extras.length) {
    wrap.innerHTML = '';
    return;
  }

  const rows = [];
  for (let i = 0; i < extras.length; i += 2) {
    rows.push(extras.slice(i, i + 2));
  }

  wrap.innerHTML = rows.map(row => `
    <div class="rel-config-row">
      ${row.map(campo => `
        <div class="form-group">
          <label class="form-label">${campo.label}</label>
          ${campo.tipo === 'select'
            ? `<select class="form-control" id="${campo.id}">
                ${campo.opcoes.map(op => `<option value="${op}">${op}</option>`).join('')}
               </select>`
            : `<input type="text" class="form-control" id="${campo.id}"
                 placeholder="${campo.placeholder || ''}">`
          }
        </div>
      `).join('')}
    </div>
  `).join('');
}


/* ============================================================
   PERÍODO
   ============================================================ */

function initPeriodo() {
  const select = document.getElementById('rel-periodo');
  const custom = document.getElementById('rel-datas-custom');
  if (!select || !custom) return;

  select.addEventListener('change', () => {
    if (select.value === 'personalizado') {
      custom.classList.remove('rel-hidden');
    } else {
      custom.classList.add('rel-hidden');
    }
  });

  const hoje = new Date().toISOString().split('T')[0];
  const dataIni = document.getElementById('rel-data-ini');
  const dataFim = document.getElementById('rel-data-fim');
  if (dataIni) dataIni.value = hoje;
  if (dataFim) dataFim.value = hoje;
}


/* ============================================================
   AÇÕES
   ============================================================ */

function initAcoes() {
  document.getElementById('btn-rel-previa')?.addEventListener('click', gerarPrevia);
  document.getElementById('btn-gerar')?.addEventListener('click', gerarRelatorio);
  document.getElementById('btn-rel-gerar')?.addEventListener('click', gerarRelatorio);
  document.getElementById('btn-agendar')?.addEventListener('click', abrirAgendamento);
  document.getElementById('btn-rel-agendar')?.addEventListener('click', abrirAgendamento);
}

function coletarFiltros() {
  const periodo = document.getElementById('rel-periodo')?.value;
  let dataIni = '', dataFim = '';

  if (periodo === 'personalizado') {
    dataIni = document.getElementById('rel-data-ini')?.value;
    dataFim = document.getElementById('rel-data-fim')?.value;
  } else {
    const range = calcularRange(periodo);
    dataIni = range.inicio;
    dataFim = range.fim;
  }

  return {
    tipo:        tipoAtivo,
    periodo,
    dataIni,
    dataFim,
    setor:       document.getElementById('rel-setor')?.value             || '',
    funcionario: document.getElementById('rel-funcionario')?.value.trim() || '',
    formato:     document.getElementById('rel-formato')?.value           || 'csv',
  };
}

function calcularRange(periodo) {
  const hoje = new Date();
  const fmt  = (d) => d.toISOString().split('T')[0];

  switch (periodo) {
    case 'hoje':
      return { inicio: fmt(hoje), fim: fmt(hoje) };
    case 'ontem': {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 1);
      return { inicio: fmt(d), fim: fmt(d) };
    }
    case 'semana': {
      const d = new Date(hoje);
      d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
      return { inicio: fmt(d), fim: fmt(hoje) };
    }
    case 'mes': {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: fmt(d), fim: fmt(hoje) };
    }
    case 'mes_ant': {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { inicio: fmt(ini), fim: fmt(fim) };
    }
    default:
      return { inicio: fmt(hoje), fim: fmt(hoje) };
  }
}


/* ============================================================
   PRÉ-VISUALIZAÇÃO
   ============================================================ */

async function gerarPrevia() {
  const sb = window.getSupabase();
  if (!sb) { alert('Banco de dados não conectado.'); return; }

  const filtros = coletarFiltros();
  const config  = TIPOS_CONFIG[tipoAtivo];
  if (!config) return;

  const btn = document.getElementById('btn-rel-previa');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner" style="animation:rel-spin .8s linear infinite"></i> Gerando...';
  }

  try {
    const campoData = config.campoData;

    const { data, error } = await sb
      .from(config.tabela)
      .select('*')
      .gte(campoData, filtros.dataIni + 'T00:00:00')
      .lte(campoData, filtros.dataFim + 'T23:59:59')
      .order(campoData, { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro na prévia:', error);
      alert('Erro ao buscar dados: ' + error.message);
      return;
    }

    dadosPrevia = (data || []).filter(row => config.filtrar(row));
    mostrarPrevia(filtros, config, dadosPrevia);

  } catch (err) {
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ph ph-eye"></i> Pré-visualizar';
    }
  }
}

function mostrarPrevia(filtros, config, dados) {
  document.getElementById('rel-previa-empty')?.classList.add('rel-hidden');
  document.getElementById('rel-previa-content')?.classList.remove('rel-hidden');

  const meta = document.getElementById('rel-previa-meta');
  if (meta) {
    meta.innerHTML = `
      <span><strong>${config.label}</strong></span>
      <span>${filtros.dataIni} → ${filtros.dataFim}</span>
      ${filtros.setor ? `<span>Setor: ${filtros.setor}</span>` : ''}
      <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
    `;
  }

  const thead = document.getElementById('rel-previa-thead');
  if (thead) {
    thead.innerHTML = `<tr>${config.colunas.map(c => `<th>${c}</th>`).join('')}</tr>`;
  }

  const tbody = document.getElementById('rel-previa-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    if (!dados || dados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${config.colunas.length}"
            style="text-align:center;color:var(--text-muted);padding:24px;font-size:0.83rem;">
            <i class="ph ph-magnifying-glass"
              style="font-size:1.2rem;opacity:.4;display:block;margin:0 auto 8px;"></i>
            Nenhum registro encontrado para os filtros selecionados
          </td>
        </tr>`;
    } else {
      dados.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = config.campos(row)
          .map(c => `<td class="text-sm">${c}</td>`)
          .join('');
        tbody.appendChild(tr);
      });
    }
  }

  const info = document.getElementById('rel-previa-info');
  if (info) info.textContent = `${config.label} · ${filtros.dataIni} a ${filtros.dataFim}`;

  const total = document.getElementById('rel-previa-total');
  if (total) {
    const qtd = dados?.length || 0;
    total.innerHTML = `<strong>${qtd}</strong> registro${qtd !== 1 ? 's' : ''} encontrado${qtd !== 1 ? 's' : ''}`;
  }
}

function ocultarPrevia() {
  document.getElementById('rel-previa-empty')?.classList.remove('rel-hidden');
  document.getElementById('rel-previa-content')?.classList.add('rel-hidden');
  const info = document.getElementById('rel-previa-info');
  if (info) info.textContent = 'Configure e clique em pré-visualizar';
}


/* ============================================================
   GERAR RELATÓRIO — EXPORT CSV
   ============================================================ */

async function gerarRelatorio() {
  const sb = window.getSupabase();
  if (!sb) { alert('Banco de dados não conectado.'); return; }

  const filtros = coletarFiltros();
  const config  = TIPOS_CONFIG[tipoAtivo];
  if (!config) return;

  const btn = document.getElementById('btn-rel-gerar');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner" style="animation:rel-spin .8s linear infinite"></i> Gerando...';
  }

  try {
    const campoData = config.campoData;

    const { data, error } = await sb
      .from(config.tabela)
      .select('*')
      .gte(campoData, filtros.dataIni + 'T00:00:00')
      .lte(campoData, filtros.dataFim + 'T23:59:59')
      .order(campoData, { ascending: false });

    if (error) {
      alert('Erro ao buscar dados: ' + error.message);
      return;
    }

    const dados = (data || []).filter(row => config.filtrar(row));

    if (!dados.length) {
      alert('Nenhum registro encontrado para os filtros selecionados.');
      return;
    }

    exportarCSV(
      config.label,
      config.colunas,
      dados.map(row => config.campos(row)),
      filtros
    );

    await registrarAuditoria(filtros, dados.length);
    await carregarHistorico();

  } catch (err) {
    console.error(err);
    alert('Erro inesperado ao gerar relatório.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ph ph-file-arrow-down"></i> Gerar e baixar';
    }
  }
}

function exportarCSV(nomeRelatorio, colunas, linhas, filtros) {
  const BOM    = '\uFEFF';
  const sep    = ';';
  const titulo = `${nomeRelatorio} — ${filtros.dataIni} a ${filtros.dataFim}`;

  const linhasCSV = [
    titulo,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    colunas.join(sep),
    ...linhas.map(l =>
      l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(sep)
    ),
  ];

  const blob     = new Blob([BOM + linhasCSV.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `CRV_${nomeRelatorio.replace(/\s/g, '_')}_${filtros.dataIni}_${filtros.dataFim}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('✅ CSV exportado:', a.download);
}

async function registrarAuditoria(filtros, totalRegistros) {
  const sb = window.getSupabase();
  if (!sb) return;

  try {
    await sb.from('auditoria').insert([{
      acao:        'gerar',
      data:        new Date().toISOString(),
      tabela:      TIPOS_CONFIG[filtros.tipo]?.tabela || filtros.tipo,
      descricao:   `Relatório de ${TIPOS_CONFIG[filtros.tipo]?.label || filtros.tipo} gerado`,
      extra: {
        periodo:         filtros.dataIni + ' a ' + filtros.dataFim,
        formato:         filtros.formato,
        total_registros: totalRegistros,
        tamanho:         totalRegistros + ' registros',
      },
    }]);
  } catch (err) {
    console.warn('Auditoria não registrada:', err);
  }
}


/* ============================================================
   AGENDAMENTO
   ============================================================ */

function abrirAgendamento() {
  alert('Agendamento de relatórios automáticos estará disponível em breve.');
}


/* ============================================================
   HELPERS
   ============================================================ */

function renderLinhaPrevia(celulas) {
  const tbody = document.getElementById('rel-previa-tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = celulas.map(c => `<td class="text-sm">${c}</td>`).join('');
  tbody.appendChild(tr);

  const total = document.getElementById('rel-previa-total');
  if (total) {
    const qtd = tbody.querySelectorAll('tr').length;
    total.innerHTML = `<strong>${qtd}</strong> registro${qtd !== 1 ? 's' : ''} encontrado${qtd !== 1 ? 's' : ''}`;
  }
}

function renderLinhaHistorico(rel) {
  const tbody = document.getElementById('rel-historico-tbody');
  if (!tbody) return;

  const formatos = {
    pdf:  '<span class="rel-formato-badge pdf"><i class="ph ph-file-pdf"></i> PDF</span>',
    xlsx: '<span class="rel-formato-badge xlsx"><i class="ph ph-file-xls"></i> XLSX</span>',
    csv:  '<span class="rel-formato-badge csv"><i class="ph ph-file-csv"></i> CSV</span>',
  };

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="font-weight:500;font-size:0.85rem;">${rel.tipo}</td>
    <td class="text-sm text-muted">${rel.periodo}</td>
    <td>${formatos[rel.formato] || rel.formato}</td>
    <td class="text-sm text-muted">${rel.geradoEm}</td>
    <td class="text-sm text-muted">${rel.geradoPor}</td>
    <td class="text-sm text-muted">${rel.tamanho || '—'}</td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm btn-icon" title="Baixar"
          onclick="baixarRelatorio('${rel.id}')">
          <i class="ph ph-download-simple"></i>
        </button>
        <button class="btn btn-danger btn-sm btn-icon" title="Excluir"
          onclick="excluirHistorico('${rel.id}')">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </td>
  `;
  tbody.appendChild(tr);
}

function mostrarHistorico() {
  document.getElementById('rel-historico-empty')?.classList.add('rel-hidden');
  document.getElementById('rel-historico-wrap')?.classList.remove('rel-hidden');
}

function baixarRelatorio(id) {
  alert('Redownload disponível apenas para arquivos ainda em cache. Gere novamente se necessário.');
  console.log('Baixar relatório:', id);
}

async function excluirHistorico(id) {
  if (!confirm('Remover este registro do histórico?')) return;

  const sb = window.getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from('auditoria')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Erro ao excluir: ' + error.message);
    return;
  }

  const tbody = document.getElementById('rel-historico-tbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(tr => {
      if (tr.innerHTML.includes(id)) tr.remove();
    });
  }
}