/* ============================================================
   LOGIN — login.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initToggleSenha();
});

function initTheme() {
  const saved = localStorage.getItem('crv-theme') || 'dark';
  applyTheme(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('crv-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
}

function initToggleSenha() {
  const btn   = document.getElementById('toggle-pass');
  const input = document.getElementById('senha');
  const icon  = document.getElementById('olho-icon');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type     = isPass ? 'text' : 'password';
    icon.className = isPass ? 'ph ph-eye-slash' : 'ph ph-eye';
  });
}

// Navegação simples para telas sem sidebar
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-href]');
  if (!el) return;
  e.preventDefault();
  const rotas = {
  'dashboard':        'dashboard.html',
  'recuperacao_senha':'recuperacao_senha.html',
  'login':            'login.html'
};
  const rota = rotas[el.dataset.href];
  if (rota) window.location.href = rota;
});
