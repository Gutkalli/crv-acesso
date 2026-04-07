/* ==========================================================
   CRV CONTROLE DE ACESSO
   SESSION.JS
   Gerenciamento de sessão
   ========================================================== */

/* ==========================================================
   OBTER USUÁRIO LOGADO
   ========================================================== */

function obterUsuarioLogado(){

    const data = localStorage.getItem("usuario_logado");

    if(!data) return null;

    try{

        return JSON.parse(data);

    }catch(err){

        console.error("Erro ao ler sessão:", err);

        localStorage.removeItem("usuario_logado");

        return null;

    }

}

/* ==========================================================
   DEFINIR USUÁRIO
   ========================================================== */

function definirUsuarioSessao(usuario){

    if(!usuario) return;

    localStorage.setItem(
        "usuario_logado",
        JSON.stringify(usuario)
    );

    window.usuarioLogado = usuario;

}

/* ==========================================================
   ENCERRAR SESSÃO
   ========================================================== */

function encerrarSessao(){

    localStorage.removeItem("usuario_logado");

    window.usuarioLogado = null;

}

/* ==========================================================
   VERIFICAR LOGIN
   ========================================================== */

function usuarioEstaLogado(){

    const usuario = obterUsuarioLogado();

    return !!usuario;

}

/* ==========================================================
   RESTAURAR SESSÃO SUPABASE
   ========================================================== */

async function restaurarSessaoSupabase(){

    if(!window.sb) return null;

    try{

        const { data, error } =
            await window.sb.auth.getSession();

        if(error){
            console.warn("Erro ao obter sessão Supabase");
            return null;
        }

        const session = data?.session;

        if(!session || !session.user){
            return null;
        }

        const user = session.user;

        /* BUSCAR PERFIL NA TABELA USUARIOS */

        let { data: perfil, error: perfilError } =
            await window.sb
                .from("usuarios")
                .select("id,nome,perfil")
                .eq("id", user.id)
                .single();

        if(perfilError || !perfil){
            console.warn("Usuário autenticado mas sem registro interno.");
            return null;
        }

        const usuario = {
            id: perfil.id,
            auth_id: user.id,
            email: user.email,
            nome: perfil.nome,
            perfil: perfil.perfil
        };

        definirUsuarioSessao(usuario);

        console.log("Sessão restaurada via Supabase");

        return usuario;

    }catch(err){

        console.error("Erro restaurando sessão:", err);

        return null;

    }

}

/* ==========================================================
   EXPOR GLOBAL
   ========================================================== */

window.sessionCRV = {

    obterUsuarioLogado,
    definirUsuarioSessao,
    encerrarSessao,
    usuarioEstaLogado,
    restaurarSessaoSupabase

};