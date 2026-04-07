/* ============================================================
   CREDENCIAIS — credenciais.js (CORRIGIDO PROFISSIONAL)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  console.log('🚀 CREDENCIAIS iniciado');

  // 🔥 GARANTE QUE O SUPABASE EXISTE
const sb = window.getSupabase();

if (!sb) {
  console.error('[CREDENCIAIS] Supabase não inicializado');
  return;
}

  initModal();
  initTabs();
  initBusca();

  carregarCredenciais();

  document.getElementById('btn-cred-exportar')?.addEventListener('click', exportarCredenciais);

});

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let credenciaisLista = [];
let credencialEditando = null;

/* ============================================================
   BUSCA (CORREÇÃO DO ERRO)
   ============================================================ */
function initBusca() {

  console.log('[CREDENCIAIS] Busca iniciada');

  const input = document.getElementById('input-busca');

  if (!input) return;

  input.addEventListener('input', () => {

    const termo = input.value.toLowerCase();

    const filtradas = credenciaisLista.filter(c =>
      c.funcionarios?.nome?.toLowerCase().includes(termo) ||
      (c.codigo || '').toLowerCase().includes(termo)
    );

    renderizarCredenciais(filtradas);

  });

}

/* ============================================================
   MODAL
   ============================================================ */
function initModal() {

  const overlay   = document.getElementById('modal-credencial');
  const btnNova   = document.getElementById('btn-nova');
  const btnNovaE  = document.getElementById('btn-nova-empty');
  const btnFechar = document.getElementById('cred-modal-fechar');
  const btnCancel = document.getElementById('cred-btn-cancelar');
  const btnSalvar = document.getElementById('cred-btn-salvar');

  [btnNova, btnNovaE].forEach(btn => {
    btn?.addEventListener('click', () => abrirModal());
  });

  [btnFechar, btnCancel].forEach(btn => {
    btn?.addEventListener('click', fecharModal);
  });


  btnSalvar?.addEventListener('click', salvarCredencial);

}

/* ============================================================
   ABRIR / FECHAR
   ============================================================ */
async function abrirModal(dados = null) {

  await carregarFuncionariosSelect();

  const overlay = document.getElementById('modal-credencial');
  const titulo  = document.getElementById('modal-titulo');

  limparModal();

  if (dados) {

    credencialEditando = dados.id;

    titulo.textContent = 'Editar Credencial';

    document.getElementById('cred-funcionario').value = dados.funcionario_id;

    const tipoItem = document.querySelector(`.cred-tipo-item[data-tipo="${dados.tipo}"]`);
    tipoItem?.click();

  } else {

    credencialEditando = null;
    titulo.textContent = 'Nova Credencial';

  }

  overlay.classList.remove('func-table-hidden');
  document.body.style.overflow = 'hidden';

}

function fecharModal() {
  document.getElementById('modal-credencial')?.classList.add('func-table-hidden');
  document.body.style.overflow = '';
}

/* ============================================================
   LIMPAR MODAL
   ============================================================ */
function limparModal() {

  ['cred-funcionario','cred-num-cartao','cred-senha','cred-senha-conf']
  .forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('.cred-tipo-item')
    .forEach(i => i.classList.remove('selected'));

}

/* ============================================================
   SALVAR (CORRIGIDO BANCO)
   ============================================================ */
async function salvarCredencial() {

  const sb = window.getSupabase();

if (!sb) {
  console.error('[CREDENCIAIS] Supabase não inicializado');
  return;
}

  const funcionarioId = document.getElementById('cred-funcionario').value;

  if (!funcionarioId) return alert('Selecione funcionário');

  const tipo = document.querySelector('.cred-tipo-item.selected')?.dataset.tipo;

  if (!tipo) return alert('Selecione tipo');

  const dados = {
    funcionario_id: funcionarioId,
    tipo,
    codigo: document.getElementById('cred-num-cartao')?.value || null,
    ativo: true
  };

  let response;

  if (credencialEditando) {
    response = await sb.from('credenciais').update(dados).eq('id', credencialEditando);
  } else {
    response = await sb.from('credenciais').insert([dados]);
  }

  if (response.error) {
    alert(response.error.message);
    return;
  }

  console.log('✅ Credencial salva');

  fecharModal();
  carregarCredenciais();

}

/* ============================================================
   FUNCIONÁRIOS SELECT
   ============================================================ */
async function carregarFuncionariosSelect(){

  const sb = window.getSupabase();

if (!sb) {
  console.error('[CREDENCIAIS] Supabase não inicializado');
  return;
}
  const select = document.getElementById("cred-funcionario");

  select.innerHTML = '<option value="">Selecione...</option>';

  const {data} = await sb.from("funcionarios").select("id,nome");

  data?.forEach(f=>{
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.nome;
    select.appendChild(opt);
  });

}

/* ============================================================
   TABS
   ============================================================ */
function initTabs() {

  const tabs = document.querySelectorAll('.cred-tab');

  tabs.forEach(tab => {

    tab.addEventListener('click', () => {

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      aplicarFiltroTipo(tab.dataset.tab);

    });

  });

}

function aplicarFiltroTipo(tipo) {

  if (tipo === 'todas') return renderizarCredenciais(credenciaisLista);

  const filtradas = credenciaisLista.filter(c => c.tipo === tipo);

  renderizarCredenciais(filtradas);

}

/* ============================================================
   CARREGAR
   ============================================================ */
async function carregarCredenciais() {

  const sb = window.getSupabase();

if (!sb) {
  console.error('[CREDENCIAIS] Supabase não inicializado');
  return;
}

  console.log('📡 Buscando credenciais...');

  const { data } = await sb
    .from('credenciais')
    .select('*, funcionarios(nome)')
    .order('created_at', { ascending: false });

  credenciaisLista = data || [];

  console.log('✅ Credenciais carregadas:', credenciaisLista.length);

  renderizarCredenciais(credenciaisLista);
  atualizarKPIs(credenciaisLista);

}

/* ============================================================
   KPIs (CORRIGIDO)
   ============================================================ */
function atualizarKPIs(lista) {

  const ativos = lista.filter(c => c.ativo).length;

  document.querySelectorAll('.kpi-value')[0].textContent = lista.length;
  document.querySelectorAll('.kpi-value')[1].textContent = ativos;
  document.querySelectorAll('.kpi-value')[2].textContent = lista.filter(c => c.tipo === 'biometria').length;
  document.querySelectorAll('.kpi-value')[3].textContent = lista.filter(c => !c.ativo).length;

}

/* ============================================================
   RENDER
   ============================================================ */
function renderizarCredenciais(lista){

  const tbody = document.getElementById('cred-tbody');

  tbody.innerHTML='';

  lista.forEach(c=>{

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${c.funcionarios?.nome || '-'}</td>
      <td>${c.tipo}</td>
      <td>${c.codigo || '-'}</td>
      <td>${c.ativo ? 'Ativo' : 'Bloqueado'}</td>
      <td>
        <button onclick="editarCredencial('${c.id}')">Editar</button>
        <button onclick="excluirCredencial('${c.id}')">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

}

/* ============================================================
   EDITAR / EXCLUIR
   ============================================================ */
function editarCredencial(id){
  const cred = credenciaisLista.find(c=>c.id==id);
  abrirModal(cred);
}

async function excluirCredencial(id){

  const sb = window.getSupabase();

if (!sb) {
  console.error('[CREDENCIAIS] Supabase não inicializado');
  return;
}

  if(!confirm('Excluir?')) return;

  await sb.from('credenciais').delete().eq('id',id);

  carregarCredenciais();

}


/* ============================================================
   EXPORTAR CSV
   ============================================================ */

function exportarCredenciais() {
  const lista = credenciaisLista;

  if (!lista.length) {
    alert('Nenhuma credencial para exportar.');
    return;
  }

  const BOM = '\uFEFF';
  const sep = ';';
  const colunas = ['Funcionário', 'Tipo', 'Status', 'Identificador', 'Validade', 'Cadastrado em'];

  const linhas = lista.map(c => [
    c.funcionario_id || '',
    c.tipo           || '',
    c.status         || '',
    c.identificador  || '',
    c.validade ? new Date(c.validade).toLocaleDateString('pt-BR') : '',
    c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(sep));

  const csv  = [colunas.join(sep), ...linhas].join('\r\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `CRV_Credenciais_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}