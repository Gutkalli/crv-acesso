/* ==========================================================
   CRV CONTROLE DE ACESSO
   PERMISSOES.JS
   Controle de acesso por perfil
   ========================================================== */

/* ==========================================================
   PERFIS DO SISTEMA
   ========================================================== */

const PERFIS = {

    admin: 4,
    gerente: 3,
    operador: 2,
    portaria: 1

};

/* ==========================================================
   OBTER PERFIL ATUAL
   ========================================================== */

function obterPerfilAtual(){

    if(!window.usuarioLogado) return null;

    return window.usuarioLogado.perfil;

}

function parsePerfis(valor){

    if(!valor) return [];

    if(Array.isArray(valor)) return valor;

    return valor
        .toString()
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

}

/* ==========================================================
   VERIFICAR PERMISSÃO
   ========================================================== */

function possuiPermissao(perfilNecessario){

    const perfilUsuario = obterPerfilAtual();

    if(!perfilUsuario || !perfilNecessario) return false;

    const nivelUsuario = PERFIS[perfilUsuario] || 0;
    const perfisNecessarios = parsePerfis(perfilNecessario);

    return perfisNecessarios.some(perfil => {
        const nivelNecessario = PERFIS[perfil] || 0;
        return nivelUsuario >= nivelNecessario;
    });

}

/* ==========================================================
   PROTEGER PÁGINA POR PERFIL
   ========================================================== */

function protegerPagina(perfilNecessario){

    const perfilUsuario = obterPerfilAtual();

    if(!perfilUsuario){

        console.warn("Usuário não autenticado");

        window.location.href = "login.html";

        return;

    }

    if(perfilNecessario && !possuiPermissao(perfilNecessario)){

        console.warn("Acesso negado para perfil:", perfilUsuario);

        alert("Você não possui permissão para acessar esta página.");

        window.location.href = "dashboard.html";

    }

}

/* ==========================================================
   BLOQUEAR ELEMENTOS SEM PERMISSÃO
   ========================================================== */

function aplicarPermissoesUI(){

    const elementos = document.querySelectorAll("[data-permissao]");

    elementos.forEach(el => {

        const perfilNecessario = el.dataset.permissao;

        if(!possuiPermissao(perfilNecessario)){

            el.style.display = "none";

        }

    });

}

/* ==========================================================
   AUTO APLICAR PERMISSÕES NA UI
   ========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{

    try{

        aplicarPermissoesUI();

    }catch(e){

        console.warn("Erro aplicando permissões UI");

    }

});

/* ==========================================================
   EXPOR GLOBAL
   ========================================================== */

window.permissoesCRV = {

    obterPerfilAtual,
    possuiPermissao,
    aplicarPermissoesUI,
    protegerPagina

};