/* ============================================================
   RECUPERAÇÃO DE SENHA — recuperacao_senha.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initEtapas();
  initCodigo();
  initToggleSenhas();
  initForcaSenha();
  initReenviar();
});

let etapaAtual = 1;

function irParaEtapa(n) {
  document.querySelectorAll('[id^="etapa-"]').forEach(el => el.classList.add('rec-hidden'));
  document.querySelectorAll('.rec-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === n);
  });

  const mapa = { 1: 'etapa-email', 2: 'etapa-codigo', 3: 'etapa-nova-senha', 4: 'etapa-sucesso' };
  const el = document.getElementById(mapa[n]);
  if (el) el.classList.remove('rec-hidden');
  etapaAtual = n;
}

function initEtapas() {
  // Etapa 1 → 2: Envia e-mail real via backend
  document.getElementById('btn-enviar').addEventListener('click', async () => {
    const email  = document.getElementById('email-input').value.trim();
    const btn    = document.getElementById('btn-enviar');
    const errEl  = document.getElementById('email-error');

    if (!email || !email.includes('@')) {
      document.getElementById('email-input').focus();
      if (errEl) { errEl.textContent = 'Informe um e-mail válido.'; errEl.style.display = 'block'; }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
      const res  = await fetch('/api/auth/recuperar-senha', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      });
      const json = await res.json();

      // Independente do resultado, avança (não revelar se e-mail existe)
      document.getElementById('email-destino').textContent = email;
      irParaEtapa(2);

    } catch (err) {
      if (errEl) { errEl.textContent = 'Erro de conexão. Tente novamente.'; errEl.style.display = 'block'; }
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Enviar código';
    }
  });

  // Etapa 2: Link de reset é enviado pelo Supabase por e-mail
  // O código de 6 dígitos é parte do link mágico do Supabase
  // A validação real acontece quando o usuário clica no link do e-mail
  document.getElementById('btn-verificar').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.rec-codigo-input');
    const codigo = [...inputs].map(i => i.value).join('');
    if (codigo.length < 6) {
      inputs[0].focus();
      return;
    }
    // Nota: o Supabase valida o código via link do e-mail.
    // Aqui avançamos para a etapa de nova senha (demo do fluxo visual).
    irParaEtapa(3);
  });

  // Etapa 3 → 4: Define nova senha via Supabase Auth
  document.getElementById('btn-redefinir').addEventListener('click', async () => {
    const nova  = document.getElementById('nova-senha').value;
    const conf  = document.getElementById('conf-senha').value;
    const btn   = document.getElementById('btn-redefinir');
    const errEl = document.getElementById('senha-error');

    if (!nova || nova !== conf) {
      if (errEl) { errEl.textContent = 'As senhas não coincidem.'; errEl.style.display = 'block'; }
      document.getElementById('conf-senha').focus();
      return;
    }

    if (nova.length < 8) {
      if (errEl) { errEl.textContent = 'A senha deve ter no mínimo 8 caracteres.'; errEl.style.display = 'block'; }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    btn.disabled    = true;
    btn.textContent = 'Redefinindo...';

    try {
      // Atualiza senha usando sessão Supabase (requer que o usuário tenha clicado no link)
      if (window.sb) {
        const { error } = await window.sb.auth.updateUser({ password: nova });
        if (error) {
          if (errEl) { errEl.textContent = 'Erro ao redefinir: ' + error.message; errEl.style.display = 'block'; }
          return;
        }
      }
      irParaEtapa(4);
    } catch (err) {
      if (errEl) { errEl.textContent = 'Erro inesperado. Tente novamente.'; errEl.style.display = 'block'; }
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Redefinir senha';
    }
  });
}

// Navegação automática entre boxes do código
function initCodigo() {
  const inputs = document.querySelectorAll('.rec-codigo-input');
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
    });
  });
}

// Toggle visibilidade das senhas
function initToggleSenhas() {
  [['toggle-nova', 'nova-senha', 'olho-nova'],
   ['toggle-conf', 'conf-senha', 'olho-conf']].forEach(([btnId, inputId, iconId]) => {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type     = isPass ? 'text' : 'password';
      icon.className = isPass ? 'ph ph-eye-slash' : 'ph ph-eye';
    });
  });
}

// Força da senha
function initForcaSenha() {
  document.getElementById('nova-senha').addEventListener('input', function () {
    const val   = this.value;
    const fill  = document.getElementById('forca-fill');
    const label = document.getElementById('forca-label');
    let score   = 0;

    if (val.length >= 8)              score++;
    if (/[A-Z]/.test(val))            score++;
    if (/[0-9]/.test(val))            score++;
    if (/[^A-Za-z0-9]/.test(val))     score++;

    const mapa = [
      { pct: '0%',   cor: 'transparent',    txt: '—'      },
      { pct: '25%',  cor: 'var(--danger)',   txt: 'Fraca'  },
      { pct: '50%',  cor: 'var(--warning)',  txt: 'Média'  },
      { pct: '75%',  cor: 'var(--primary)',  txt: 'Boa'    },
      { pct: '100%', cor: 'var(--success)',  txt: 'Forte'  },
    ];

    fill.style.width      = mapa[score].pct;
    fill.style.background = mapa[score].cor;
    label.textContent     = mapa[score].txt;
    label.style.color     = mapa[score].cor;
  });
}

// Contador reenviar
function initReenviar() {
  const btn = document.getElementById('btn-reenviar');
  const txt = document.getElementById('reenviar-txt');
  if (!btn) return;

  btn.addEventListener('click', () => {
    let seg = 30;
    btn.disabled = true;
    const timer = setInterval(() => {
      txt.textContent = `Reenviar em ${seg}s`;
      seg--;
      if (seg < 0) {
        clearInterval(timer);
        btn.disabled    = false;
        txt.textContent = 'Reenviar código';
      }
    }, 1000);
  });
}
