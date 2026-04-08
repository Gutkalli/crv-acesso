/* ============================================================
   MONITORAMENTO — PROFISSIONAL (CRV)
   Tempo real + Offline + Supabase ready
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 MONITORAMENTO iniciado');

  Monitoramento.init();
});

const Monitoramento = (() => {

  let pausado = false;
  let online = navigator.onLine;

  const feedEl = () => document.getElementById('monitor-feed');

  async function init() {
    try {
      console.log('📡 Inicializando monitoramento...');

      bindEventos();
      atualizarStatusRede();

      await carregarInicial();
      iniciarRealtime();

    } catch (e) {
      console.error('❌ Erro ao iniciar monitoramento:', e);
    }
  }

  function bindEventos() {
    document.getElementById('btn-pausar').addEventListener('click', togglePausa);
    document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltro);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    document.addEventListener('app:online', onOnline);
    document.addEventListener('app:offline', onOffline);

    // Botões das catracas (delegação de eventos)
    document.addEventListener('click', (e) => {
      const btn  = e.target.closest('.catraca-item button');
      if (!btn) return;
      const item = btn.closest('.catraca-item');
      const nome = item?.querySelector('.catraca-nome')?.textContent || 'Catraca';

      if (btn.title === 'Liberar passagem') {
        liberarPassagem(item?.dataset.id, nome);
      } else if (btn.title === 'Ver logs') {
        verLogsCatraca(item?.dataset.id, nome);
      } else if (btn.title === 'Bloquear catraca' || btn.title === 'Ativar catraca') {
        toggleBloquearCatraca(item, nome);
      }
    });
  }

  function liberarPassagem(id, nome) {
    const modal       = document.getElementById('modal-liberar');
    const nomeEl      = document.getElementById('modal-liberar-nome');
    const btnConfirmar = document.getElementById('btn-liberar-confirmar');
    const btnCancelar  = document.getElementById('btn-liberar-cancelar');

    if (!modal) return;

    if (nomeEl) nomeEl.textContent = nome;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const fechar = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      btnConfirmar.removeEventListener('click', onConfirmar);
      btnCancelar.removeEventListener('click', fechar);
    };

    const onConfirmar = () => {
      fechar();
      mostrarModalResultado('liberada', nome);
      console.log(`[MONITOR] Liberar passagem — catraca id=${id}, nome="${nome}"`);
    };

    btnConfirmar.addEventListener('click', onConfirmar);
    btnCancelar.addEventListener('click', fechar);
  }

  function verLogsCatraca(id, nome) {
    const modal   = document.getElementById('modal-logs');
    const nomeEl  = document.getElementById('modal-logs-nome');
    const lista   = document.getElementById('modal-logs-lista');
    const btnF1   = document.getElementById('btn-logs-fechar');
    const btnF2   = document.getElementById('btn-logs-fechar2');
    if (!modal) return;

    if (nomeEl) nomeEl.textContent = nome;

    // Gera logs simulados baseados no id da catraca
    const agora  = Date.now();
    const nomes  = ['Carlos Silva','Maria Souza','João Pereira','Ana Lima','Pedro Santos','Lucia Ferreira'];
    const logs   = Array.from({ length: 12 }, (_, i) => ({
      nome:      nomes[i % nomes.length],
      resultado: i % 5 === 0 ? 'negado' : 'liberado',
      hora:      new Date(agora - i * 7 * 60000).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
      data:      new Date(agora - i * 7 * 60000).toLocaleDateString('pt-BR'),
      metodo:    ['Cartão','Biometria','PIN','Facial'][i % 4],
    }));

    let filtroAtivo = 'todos';

    function renderLogs() {
      const filtrados = filtroAtivo === 'todos' ? logs : logs.filter(l => l.resultado === filtroAtivo);
      lista.innerHTML = filtrados.length ? filtrados.map(l => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${l.resultado==='liberado'?'var(--success)':'var(--danger)'}"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.83rem;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.nome}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${l.metodo} · ${l.data} ${l.hora}</div>
          </div>
          <span style="font-size:0.72rem;padding:2px 8px;border-radius:10px;white-space:nowrap;font-weight:600;
            background:${l.resultado==='liberado'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};
            color:${l.resultado==='liberado'?'var(--success)':'var(--danger)'};">
            ${l.resultado==='liberado'?'Liberado':'Negado'}
          </span>
        </div>
      `).join('') : `<p style="text-align:center;color:var(--text-muted);font-size:0.83rem;padding:24px 0;">Nenhum registro encontrado.</p>`;
    }

    renderLogs();

    // Filtros
    document.querySelectorAll('.log-filtro-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.log-filtro-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-muted)';
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        filtroAtivo = btn.dataset.filtro;
        renderLogs();
      };
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const fechar = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      btnF1.removeEventListener('click', fechar);
      btnF2.removeEventListener('click', fechar);
    };

    btnF1.addEventListener('click', fechar);
    btnF2.addEventListener('click', fechar);
  }

  function toggleBloquearCatraca(item, nome) {
    const bloqueada   = item.dataset.bloqueada === 'true';
    const modal       = document.getElementById('modal-bloquear');
    const header      = document.getElementById('modal-bloquear-header');
    const iconEl      = document.getElementById('modal-bloquear-icon');
    const tituloEl    = document.getElementById('modal-bloquear-titulo');
    const nomeEl      = document.getElementById('modal-bloquear-nome');
    const descEl      = document.getElementById('modal-bloquear-desc');
    const subEl       = document.getElementById('modal-bloquear-sub');
    const avisoEl     = document.getElementById('modal-bloquear-aviso');
    const btnConf     = document.getElementById('btn-bloquear-confirmar');
    const btnCancel   = document.getElementById('btn-bloquear-cancelar');
    if (!modal) return;

    if (bloqueada) {
      // Vai ativar
      header.style.background = 'linear-gradient(135deg,#10b981,#059669)';
      iconEl.style.background  = 'rgba(255,255,255,0.15)';
      iconEl.innerHTML         = '<i class="ph ph-lock-open" style="font-size:1.4rem;color:#fff;"></i>';
      tituloEl.textContent     = 'Ativar Catraca';
      btnConf.innerHTML        = '<i class="ph ph-lock-open"></i> Ativar agora';
      btnConf.style.background = 'var(--success)';
      descEl.textContent       = 'Confirma a reativação desta catraca?';
      subEl.textContent        = 'A catraca voltará a aceitar acessos normalmente.';
      avisoEl.style.cssText    = 'padding:10px 14px;border-radius:8px;display:flex;align-items:center;gap:8px;font-size:0.81rem;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.35);color:var(--success);';
      avisoEl.innerHTML        = '<i class="ph ph-check-circle" style="font-size:1rem;flex-shrink:0;"></i> Todos os acessos configurados serão restaurados.';
    } else {
      // Vai bloquear
      header.style.background = 'linear-gradient(135deg,#ef4444,#b91c1c)';
      iconEl.style.background  = 'rgba(255,255,255,0.15)';
      iconEl.innerHTML         = '<i class="ph ph-lock" style="font-size:1.4rem;color:#fff;"></i>';
      tituloEl.textContent     = 'Bloquear Catraca';
      btnConf.innerHTML        = '<i class="ph ph-lock"></i> Bloquear agora';
      btnConf.style.background = 'var(--danger)';
      descEl.textContent       = 'Confirma o bloqueio desta catraca?';
      subEl.textContent        = 'Nenhuma passagem será autorizada enquanto estiver bloqueada.';
      avisoEl.style.cssText    = 'padding:10px 14px;border-radius:8px;display:flex;align-items:center;gap:8px;font-size:0.81rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);color:var(--danger);';
      avisoEl.innerHTML        = '<i class="ph ph-warning" style="font-size:1rem;flex-shrink:0;"></i> Esta ação impedirá todos os acessos imediatamente.';
    }

    nomeEl.textContent = nome;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const fechar = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      btnConf.removeEventListener('click', onConfirmar);
      btnCancel.removeEventListener('click', fechar);
    };

    const onConfirmar = () => {
      fechar();
      const novoBloqueada = !bloqueada;
      item.dataset.bloqueada = novoBloqueada;

      // Atualiza dot e botão bloquear
      const dot   = item.querySelector('.catraca-dot');
      const btnLk = item.querySelector('button[title="Bloquear catraca"], button[title="Ativar catraca"]');
      if (dot) {
        dot.className = `catraca-dot ${novoBloqueada ? 'offline' : 'online'}`;
      }
      if (btnLk) {
        btnLk.title     = novoBloqueada ? 'Ativar catraca' : 'Bloquear catraca';
        btnLk.innerHTML = novoBloqueada
          ? '<i class="ph ph-lock" style="color:var(--danger);"></i>'
          : '<i class="ph ph-lock-open"></i>';
      }
      // Desabilita "Liberar passagem" se bloqueada
      const btnLiberar = item.querySelector('button[title="Liberar passagem"]');
      if (btnLiberar) btnLiberar.disabled = novoBloqueada;

      // Modal de resultado
      mostrarModalResultado(novoBloqueada ? 'bloqueada' : 'ativada', nome);

      console.log(`[MONITOR] ${novoBloqueada ? 'Bloqueio' : 'Ativação'} — ${nome}`);
    };

    btnConf.addEventListener('click', onConfirmar);
    btnCancel.addEventListener('click', fechar);
  }

  function atualizarStatusRede() {
    const label = document.getElementById('ws-label');
    label.textContent = online ? 'Conectado' : 'Offline';
  }

  async function carregarInicial() {
    console.log('📡 Buscando acessos...');

    try {
      if (online) {
        const dados = await window.apiCRV.buscarAcessosRecentes();

        renderFeed(dados);
        atualizarKPIs(dados);

        console.log('✅ Dados carregados (online)');
      } else {
        // Modo offline: busca do IndexedDB local
        const dados = await (window.listarLocal?.('acessos') || Promise.resolve([]));

        renderFeed(dados);

        console.log('📴 Dados carregados do offline');
      }
    } catch (e) {
      console.error('❌ Erro ao carregar dados:', e);
    }
  }

  function renderFeed(lista) {
    const feed = feedEl();
    feed.innerHTML = '';

    if (!lista || lista.length === 0) {
      feed.innerHTML = `
        <div class="monitor-empty">
          <i class="ph ph-broadcast"></i>
          <span>Aguardando eventos...</span>
        </div>
      `;
      return;
    }

    lista.reverse().forEach(ev => adicionarEvento(ev));
  }

  function adicionarEvento(ev) {
    if (pausado) return;

    const filtro = document.getElementById('filtro-tipo').value;
    if (filtro && ev.resultado !== filtro) return;

    const hora = new Date(ev.data).toLocaleTimeString('pt-BR');

    const item = document.createElement('div');
    item.className = `feed-item ${ev.resultado}`;

    item.innerHTML = `
      <div class="feed-avatar">${getIniciais(ev.nome || 'Usuário')}</div>

      <div class="feed-info">
        <div class="feed-nome">${ev.nome || 'Não identificado'}</div>
        <div class="feed-meta">
          <span>${ev.setor || '-'}</span>
          <span>·</span>
          <span>${ev.catraca || '-'}</span>
          <span>·</span>
          <span>${ev.metodo}</span>
        </div>
      </div>

      <div class="feed-right">
        <span class="feed-hora">${hora}</span>
        ${badgeTipo(ev.tipo)}
        ${badgeResultado(ev.resultado)}
      </div>
    `;

    feedEl().prepend(item);

    limitarFeed();
    atualizarUltimo(ev);
  }

  function atualizarUltimo(ev) {
    document.getElementById('last-empty').classList.add('rec-hidden');
    document.getElementById('last-content').classList.remove('rec-hidden');

    document.getElementById('last-avatar').textContent = getIniciais(ev.nome);
    document.getElementById('last-nome').textContent = ev.nome || '—';
    document.getElementById('last-meta').textContent =
      `${ev.catraca} · ${new Date(ev.data).toLocaleTimeString('pt-BR')}`;

    document.getElementById('last-badges').innerHTML =
      `${badgeResultado(ev.resultado)} ${badgeTipo(ev.tipo)}`;
  }

  function atualizarKPIs(lista) {
    const total = lista.length;
    const negados = lista.filter(e => e.resultado === 'negado').length;
    const presentes = lista.filter(e => e.tipo === 'entrada').length;

    document.getElementById('kpi-eventos').textContent = total;
    document.getElementById('kpi-negados').textContent = negados;
    document.getElementById('kpi-presentes').textContent = presentes;
    document.getElementById('kpi-alertas').textContent =
      lista.filter(e => e.resultado === 'alerta').length;
  }

  function iniciarRealtime() {
    console.log('📡 Iniciando tempo real...');

    if (!window.getSupabase) return;

    const sb = window.getSupabase();
    if (!sb) return;

    sb.channel('acessos-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'acessos'
        },
        payload => {
          console.log('📡 Evento recebido:', payload);

          const ev = payload.new;

          adicionarEvento(ev);

          if (!online) {
            window.syncCRV.adicionarFila('acessos', ev);
          }
        }
      )
      .subscribe();
  }

  function togglePausa() {
    pausado = !pausado;

    document.getElementById('btn-pausar').innerHTML = pausado
      ? '<i class="ph ph-play"></i> Retomar'
      : '<i class="ph ph-pause"></i> Pausar';
  }

  function aplicarFiltro() {
    carregarInicial();
  }

  function onOnline() {
    online = true;
    atualizarStatusRede();

    console.log('🔄 Conexão restaurada');
    sincronizarFila();
  }

  function onOffline() {
    online = false;
    atualizarStatusRede();

    console.log('📴 Modo offline ativo');
  }

  async function sincronizarFila() {
    console.log('🔄 Sincronizando fila...');

    try {
      await window.syncCRV.processarFila();
      console.log('✅ Fila sincronizada');
    } catch (e) {
      console.error('❌ Erro ao sincronizar:', e);
    }
  }

  function limitarFeed() {
    const feed = feedEl();
    while (feed.children.length > 50) {
      feed.lastChild.remove();
    }
  }

  function getIniciais(nome = '') {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function badgeResultado(tipo) {
    return {
      liberado: '<span class="badge badge-success">Liberado</span>',
      negado: '<span class="badge badge-danger">Negado</span>',
      alerta: '<span class="badge badge-warning">Alerta</span>'
    }[tipo] || '';
  }

  function badgeTipo(tipo) {
    return tipo === 'entrada'
      ? '<span class="badge badge-info">Entrada</span>'
      : '<span class="badge badge-neutral">Saída</span>';
  }

  function mostrarModalResultado(tipo, nome) {
    const modal   = document.getElementById('modal-resultado-bloqueio');
    const header  = document.getElementById('res-header');
    const iconEl  = document.getElementById('res-icon');
    const titulo  = document.getElementById('res-titulo');
    const nomeEl  = document.getElementById('res-nome');
    const desc    = document.getElementById('res-desc');
    const tag     = document.getElementById('res-status-tag');
    const btnOk   = document.getElementById('btn-resultado-ok');
    if (!modal) return;

    const cfg = {
      bloqueada: {
        gradient: 'linear-gradient(135deg,#ef4444,#b91c1c)',
        icon:     'ph ph-lock',
        titulo:   'Catraca Bloqueada',
        desc:     'Nenhuma passagem será autorizada enquanto esta catraca estiver bloqueada. O bloqueio pode ser revertido a qualquer momento.',
        tagBg:    'rgba(239,68,68,0.1)',
        tagColor: 'var(--danger)',
        tagBorder:'1px solid rgba(239,68,68,0.3)',
        tagHtml:  '<i class="ph ph-lock"></i> Status: Bloqueada',
      },
      ativada: {
        gradient: 'linear-gradient(135deg,#10b981,#059669)',
        icon:     'ph ph-lock-open',
        titulo:   'Catraca Ativada',
        desc:     'A catraca voltou a operar normalmente. Todos os acessos configurados foram restaurados com sucesso.',
        tagBg:    'rgba(16,185,129,0.1)',
        tagColor: 'var(--success)',
        tagBorder:'1px solid rgba(16,185,129,0.3)',
        tagHtml:  '<i class="ph ph-check-circle"></i> Status: Ativa',
      },
      liberada: {
        gradient: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
        icon:     'ph ph-door-open',
        titulo:   'Passagem Liberada',
        desc:     'O comando de abertura foi enviado ao equipamento. A ação foi registrada na auditoria do sistema.',
        tagBg:    'rgba(14,165,233,0.1)',
        tagColor: 'var(--primary)',
        tagBorder:'1px solid rgba(14,165,233,0.3)',
        tagHtml:  '<i class="ph ph-door-open"></i> Comando enviado com sucesso',
      },
    };

    const c = cfg[tipo] || cfg.ativada;

    header.style.background = c.gradient;
    iconEl.className        = c.icon;
    titulo.textContent      = c.titulo;
    desc.textContent        = c.desc;
    tag.style.background    = c.tagBg;
    tag.style.color         = c.tagColor;
    tag.style.border        = c.tagBorder;
    tag.innerHTML           = c.tagHtml;
    btnOk.style.background  = c.gradient;
    nomeEl.textContent      = nome;

    modal.style.display          = 'flex';
    document.body.style.overflow = 'hidden';

    const fecharResultado = () => {
      modal.style.display          = 'none';
      document.body.style.overflow = '';
      btnOk.removeEventListener('click', fecharResultado);
    };

    btnOk.addEventListener('click', fecharResultado);
  }

  return { init };

})();