// ==========================================
// DB — INDEXEDDB (OFFLINE STORAGE)
// ==========================================

const DB_NAME = "crv_acesso_db";
const DB_VERSION = 1;

let db = null;

// ==========================================
// INIT
// ==========================================

function initDB() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {

      db = event.target.result;

      // FUNCIONÁRIOS
      if (!db.objectStoreNames.contains("funcionarios")) {
        db.createObjectStore("funcionarios", { keyPath: "id" });
      }

      // ACESSOS
      if (!db.objectStoreNames.contains("acessos")) {
        db.createObjectStore("acessos", { keyPath: "id" });
      }

      // FILA DE SYNC
      if (!db.objectStoreNames.contains("sync_queue")) {
        db.createObjectStore("sync_queue", { keyPath: "id" });
      }

      console.log("[DB] Estrutura criada");

    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("[DB] Conectado");
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("[DB] Erro:", event.target.error);
      reject(event.target.error);
    };

  });

}

// ==========================================
// GET STORE
// ==========================================

function getStore(storeName, mode = "readonly") {

  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);

}

// ==========================================
// GENERIC SAVE
// ==========================================

function salvarLocal(store, data) {

  return new Promise((resolve, reject) => {

    const request = getStore(store, "readwrite").put(data);

    request.onsuccess = () => resolve(data);
    request.onerror   = () => reject(request.error);

  });

}

// ==========================================
// LISTAR
// ==========================================

function listarLocal(store) {

  return new Promise((resolve, reject) => {

    const request = getStore(store).getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);

  });

}

// ==========================================
// REMOVER
// ==========================================

function removerLocal(store, id) {

  return new Promise((resolve, reject) => {

    const request = getStore(store, "readwrite").delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror   = () => reject(request.error);

  });

}

// ==========================================
// FILA DE SYNC
// ==========================================

function adicionarFila(item) {

  return salvarLocal("sync_queue", {
    id: Date.now().toString(),
    ...item
  });

}

function getFila() {
  return listarLocal("sync_queue");
}

function removerDaFila(id) {
  return removerLocal("sync_queue", id);
}

// ==========================================
// EXPORT GLOBAL (PADRÃO DO SISTEMA)
// ==========================================

window.initDB = initDB;
window.salvarLocal = salvarLocal;
window.listarLocal = listarLocal;
window.removerLocal = removerLocal;
window.adicionarFila = adicionarFila;
window.getFila = getFila;
window.removerDaFila = removerDaFila;