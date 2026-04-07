// ==========================================
// NETWORK — STATUS DA CONEXÃO
// ==========================================

// Estado global
window.APP_NETWORK = {
  online: navigator.onLine,
  lastChange: new Date()
};

// Atualiza status
function updateNetworkStatus(status) {
  window.APP_NETWORK.online = status;
  window.APP_NETWORK.lastChange = new Date();

  console.log(`[NETWORK] ${status ? "ONLINE" : "OFFLINE"}`);

  // Dispara eventos globais
  window.dispatchEvent(
    new CustomEvent(status ? "app:online" : "app:offline", {
      detail: window.APP_NETWORK
    })
  );
}

// Eventos nativos do navegador
window.addEventListener("online", () => updateNetworkStatus(true));
window.addEventListener("offline", () => updateNetworkStatus(false));

// Função utilitária
function isOnline() {
  return window.APP_NETWORK.online;
}

// Log inicial
console.log(`[NETWORK INIT] ${window.APP_NETWORK.online ? "ONLINE" : "OFFLINE"}`);


// ==========================================
// EXPORT GLOBAL
// ==========================================

window.isOnline = isOnline;