// ==========================================
// SYNC — SINCRONIZAÇÃO AUTOMÁTICA
// ==========================================


// ==========================================
// PROCESSAR FILA
// ==========================================

async function processarFila() {

  console.log("[SYNC] Iniciando sincronização...");

  if (!window.getFila) {
    console.warn("[SYNC] DB não pronto");
    return;
  }

  const fila = await window.getFila();

  if (!fila || !fila.length) {
    console.log("[SYNC] Nada para sincronizar");
    return;
  }

  console.log(`[SYNC] ${fila.length} item(ns) na fila`);

  for (const item of fila) {

    try {

      await enviarItem(item);

      await window.removerDaFila(item.id);

      console.log("[SYNC] Item sincronizado:", item);

    } catch (err) {

      console.error("[SYNC] Erro ao sincronizar:", err);

      // não remove → tenta novamente depois
    }

  }

}


// ==========================================
// ENVIAR ITEM PARA SUPABASE
// ==========================================

async function enviarItem(item) {

  const sb = window.getSupabase();

  if (!sb) {
    throw new Error("Supabase não inicializado");
  }

  const { tabela, tipo, data } = item;

  if (!tabela || !data) {
    throw new Error("Item inválido na fila");
  }

  // INSERT
  if (tipo === "insert") {

    const { error } = await sb
      .from(tabela)
      .insert([data]);

    if (error) throw error;

  }

  // UPDATE
  if (tipo === "update") {

    const { error } = await sb
      .from(tabela)
      .update(data)
      .eq("id", data.id);

    if (error) throw error;

  }

  // DELETE
  if (tipo === "delete") {

    const { error } = await sb
      .from(tabela)
      .delete()
      .eq("id", data.id);

    if (error) throw error;

  }

}


// ==========================================
// MONTAR ITEM DE FILA
// ==========================================

function montarItemFila(tabela, tipo, data) {

  return {
    id: Date.now().toString(),
    tabela,
    tipo,   // insert | update | delete
    data
  };

}


// ==========================================
// DISPARO AUTOMÁTICO
// ==========================================

window.addEventListener("app:online", () => {

  console.log("[SYNC] Internet voltou → sincronizando");

  processarFila();

});


// ==========================================
// EXPORT GLOBAL
// ==========================================

window.processarFila  = processarFila;
window.montarItemFila = montarItemFila;

// Expõe como namespace syncCRV (usado pelo monitoramento.js)
window.syncCRV = {
  processarFila,
  montarItemFila,
  adicionarFila: window.adicionarFila || function() {}
};