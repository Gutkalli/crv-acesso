/* ============================================================
   DASHBOARD — CRV CONTROLE DE ACESSO
   ============================================================ */

console.log("📊 DASHBOARD.JS iniciado");

// ==========================================
// INIT
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

  console.log("🚀 DASHBOARD carregando...");

  renderDataAtual();

  await inicializarDashboard();

});


// ==========================================
// INIT COMPLETO
// ==========================================

async function inicializarDashboard() {
  try {
    // Tenta API backend primeiro (mais completa e segura)
    const usuario = (() => {
      try { return JSON.parse(localStorage.getItem('usuario_logado') || '{}'); } catch { return {}; }
    })();

    const token = usuario.token || '';

    if (token) {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const kpis = await res.json();
          aplicarKPIs(kpis);
          await carregarFeedAcessos();
          return;
        }
      } catch (_fetchErr) {
        // Backend indisponível ou token inválido — fallback para Supabase direto
      }
    }

    // Fallback: Supabase direto
    const api = window.apiCRV;
    if (api?.getKPIsDashboard) {
      const kpis = await api.getKPIsDashboard();
      if (kpis) { aplicarKPIs(kpis); }
      else limparKPIs();
    } else {
      limparKPIs();
    }

  } catch (err) {
    console.error("Erro no dashboard:", err);
    limparKPIs();
  }
}

// ==========================================
// FEED DE ACESSOS RECENTES (TABELA)
// ==========================================

async function carregarFeedAcessos() {
  const sb = window.getSupabase?.();
  if (!sb) return;

  const tbody = document.getElementById('dash-acessos-tbody');
  if (!tbody) return;

  try {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('acessos')
      .select('*, funcionarios(nome)')
      .gte('data', hoje + 'T00:00:00')
      .order('data', { ascending: false })
      .limit(10);

    if (error || !data?.length) return;

    tbody.innerHTML = '';
    data.forEach(acesso => {
      const hora = acesso.data ? new Date(acesso.data).toLocaleTimeString('pt-BR') : '—';
      const badge = acesso.resultado === 'liberado'
        ? '<span class="badge badge-success">Liberado</span>'
        : acesso.resultado === 'negado'
          ? '<span class="badge badge-danger">Negado</span>'
          : '<span class="badge badge-warning">Alerta</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${acesso.funcionarios?.nome || 'Não identificado'}</td>
        <td>${acesso.equipamento_id || '—'}</td>
        <td>${acesso.metodo || '—'}</td>
        <td>${hora}</td>
        <td>${badge}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    console.warn('Feed de acessos indisponível:', e);
  }
}


// ==========================================
// DATA ATUAL
// ==========================================

function renderDataAtual() {

  const el = document.getElementById("dashboard-date");

  if (!el) {
    console.warn("⚠️ Elemento data não encontrado");
    return;
  }

  const hoje = new Date();

  el.textContent = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  console.log("📅 Data renderizada");

}


// ==========================================
// APLICAR KPIs
// ==========================================

function aplicarKPIs(kpis) {
  setValor("kpi-total",   kpis.totalFuncionarios);
  setValor("kpi-ativos",  kpis.ativos);
  setValor("kpi-inativos", kpis.inativos);
  setValor("kpi-acessos", kpis.acessosHoje);

  // Campos adicionais do novo endpoint
  if (kpis.acessosNegados   !== undefined) setValor("kpi-negados",    kpis.acessosNegados);
  if (kpis.ocorrenciasAbertas !== undefined) setValor("kpi-ocorrencias", kpis.ocorrenciasAbertas);
  if (kpis.equipamentosOnline !== undefined) setValor("kpi-equip-online", kpis.equipamentosOnline);
}


// ==========================================
// HELPERS
// ==========================================

function setValor(id, valor) {

  const el = document.getElementById(id);

  if (!el) {
    console.warn(`⚠️ Elemento não encontrado: ${id}`);
    return;
  }

  el.textContent = valor ?? 0;

}

function limparKPIs() {

  setValor("kpi-total", "--");
  setValor("kpi-ativos", "--");
  setValor("kpi-inativos", "--");
  setValor("kpi-acessos", "--");

  console.warn("🧹 KPIs resetados");

}