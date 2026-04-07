// ==========================================
// API CRV — CAMADA CENTRAL (SEM MODULE)
// ==========================================


// ==========================================
// OBTER USUÁRIO LOGADO
// ==========================================

async function getUsuario() {
  try {
    const usuarioJSON = localStorage.getItem("usuario_logado");
    if (!usuarioJSON) return null;
    return JSON.parse(usuarioJSON);
  } catch (e) {
    console.error("[API] Erro ao obter usuário:", e);
    return null;
  }
}

window.getUsuario = getUsuario;

// ==========================================
// FUNCIONÁRIOS
// ==========================================

async function listarFuncionarios() {

  const usuario = await window.getUsuario?.();
  if (!usuario) return [];

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", usuario.empresa_id)
      .order("nome");

    if (error) {
      console.error("[API] listarFuncionarios:", error.message || error);
      return [];
    }

    return data;

  }

  // OFFLINE
  console.warn("[API] OFFLINE → listar local");

  return await window.listarLocal("funcionarios");

}


// ==========================================
// CRIAR FUNCIONÁRIO
// ==========================================

async function criarFuncionario(payload) {

  const usuario = await window.getUsuario?.();
  if (!usuario) return false;

  const data = {
    ...payload,
    empresa_id: usuario.empresa_id,
    id: Date.now().toString()
  };

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from("funcionarios")
      .insert([data]);

    if (error) {
      console.error("[API] criarFuncionario:", error.message || error);
      return false;
    }

    return true;

  }

  // OFFLINE
  console.warn("[API] OFFLINE → salvando local");

  await window.salvarLocal("funcionarios", data);

  await window.adicionarFila(
    window.montarItemFila("funcionarios", "insert", data)
  );

  return true;

}


// ==========================================
// ATUALIZAR FUNCIONÁRIO
// ==========================================

async function atualizarFuncionario(id, payload) {

  const usuario = await window.getUsuario?.();
  if (!usuario) return false;

  const data = {
    ...payload,
    id,
    empresa_id: usuario.empresa_id
  };

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from("funcionarios")
      .update(data)
      .eq("id", id);

    if (error) {
      console.error("[API] atualizarFuncionario:", error.message || error);
      return false;
    }

    return true;

  }

  // OFFLINE
  console.warn("[API] OFFLINE → update local");

  await window.salvarLocal("funcionarios", data);

  await window.adicionarFila(
    window.montarItemFila("funcionarios", "update", data)
  );

  return true;

}


// ==========================================
// DELETAR FUNCIONÁRIO
// ==========================================

async function deletarFuncionario(id) {

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from("funcionarios")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[API] deletarFuncionario:", error.message || error);
      return false;
    }

    return true;

  }

  // OFFLINE
  console.warn("[API] OFFLINE → delete local");

  await window.adicionarFila(
    window.montarItemFila("funcionarios", "delete", { id })
  );

  return true;

}


// ==========================================
// DASHBOARD — KPIs
// ==========================================

async function getKPIsDashboard() {

  const usuario = await window.getUsuario?.();
  if (!usuario) return null;

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();
    if (!sb) return null;

    try {

      const hoje = new Date().toISOString().split("T")[0];

      const [funcRes, acessosRes] = await Promise.all([

        sb.from("funcionarios")
          .select("id, ativo")
          .eq("empresa_id", usuario.empresa_id),

        sb.from("acessos")
          .select("id")
          .eq("empresa_id", usuario.empresa_id)
          .gte("data", hoje)

      ]);

      const funcionarios = funcRes.data || [];
      const acessosHoje = acessosRes.data || [];

      return {
        totalFuncionarios: funcionarios.length,
        ativos: funcionarios.filter(f => f.ativo).length,
        inativos: funcionarios.filter(f => !f.ativo).length,
        acessosHoje: acessosHoje.length
      };

    } catch (err) {

      console.error("[API] dashboard:", err);
      return null;

    }

  }

  // OFFLINE
  const funcionarios = await window.listarLocal("funcionarios") || [];

  return {
    totalFuncionarios: funcionarios.length,
    ativos: funcionarios.filter(f => f.ativo).length,
    inativos: funcionarios.filter(f => !f.ativo).length,
    acessosHoje: 0
  };

}

// ==========================================
// MONITORAMENTO — ACESSOS
// ==========================================

async function buscarAcessosRecentes() {

  const usuario = await window.getUsuario?.();
  if (!usuario) return [];

  // ONLINE
  if (window.APP_NETWORK?.online) {

    const sb = window.getSupabase();

    if (!sb) {
      console.warn("[API] Supabase não disponível");
      return [];
    }

    const { data, error } = await sb
      .from("acessos")
      .select("*")
      .eq("empresa_id", usuario.empresa_id)
      .order("data", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[API] buscarAcessosRecentes:", error.message || error);
      return [];
    }

    return data || [];

  }

  // OFFLINE
  console.warn("[API] OFFLINE → acessos local");

  return await window.listarLocal?.("acessos") || [];

}

// ==========================================
// EXPORT GLOBAL
// ==========================================

window.apiCRV = {
  listarFuncionarios,
  criarFuncionario,
  atualizarFuncionario,
  deletarFuncionario,
  getKPIsDashboard,
  buscarAcessosRecentes
};