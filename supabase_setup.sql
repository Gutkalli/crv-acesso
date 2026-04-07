-- ============================================================
-- CRV CONTROLE DE ACESSO — SETUP COMPLETO DO BANCO SUPABASE
-- Execute no Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TABELA: usuarios
-- Espelha os usuários do Supabase Auth com perfil e empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    perfil      TEXT NOT NULL CHECK (perfil IN ('admin','gerente','operador','portaria')),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    twofa_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    empresa_id  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TABELA: funcionarios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        TEXT NOT NULL,
    cpf         TEXT,
    matricula   TEXT,
    cargo       TEXT,
    setor       TEXT,
    turno       TEXT,
    email       TEXT,
    telefone    TEXT,
    status      TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','afastado')),
    empresa_id  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TABELA: equipamentos
-- Catracas, câmeras, leitores, controles de acesso
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipamentos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                TEXT NOT NULL,
    tipo                TEXT NOT NULL CHECK (tipo IN ('catraca','camera','leitor','controlador','outro')),
    modelo              TEXT,
    fabricante          TEXT,
    ip                  TEXT,
    porta               INTEGER DEFAULT 80,
    localizacao         TEXT,
    status              TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','manutencao')),
    usuario_dispositivo TEXT,
    empresa_id          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. TABELA: credenciais
-- Cartões, biometria, QR codes e PINs dos funcionários
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credenciais (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id  UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('cartao','biometria','qrcode','pin')),
    identificador   TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','bloqueado')),
    validade        DATE,
    empresa_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. TABELA: acessos
-- Log de passagens — entradas, saídas, liberações, negativas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.acessos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id  UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    equipamento_id  UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
    credencial_id   UUID REFERENCES public.credenciais(id) ON DELETE SET NULL,
    tipo            TEXT CHECK (tipo IN ('entrada','saida','liberacao_manual')),
    metodo          TEXT CHECK (metodo IN ('cartao','biometria','qrcode','pin','manual')),
    resultado       TEXT NOT NULL CHECK (resultado IN ('liberado','negado')),
    motivo_negacao  TEXT,
    data            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    empresa_id      UUID
);

-- ============================================================
-- 7. TABELA: ocorrencias
-- Incidentes e eventos de segurança
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            TEXT NOT NULL,
    prioridade      TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta','media','baixa')),
    status          TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_andamento','fechada')),
    descricao       TEXT NOT NULL,
    local           TEXT,
    funcionario_id  UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    responsavel_id  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    data_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
    empresa_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TABELA: regras_acesso
-- Define quem acessa onde e em que horários
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regras_acesso (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    descricao       TEXT,
    equipamento_id  UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
    setor           TEXT,
    cargo           TEXT,
    turno           TEXT,
    horario_inicio  TIME,
    horario_fim     TIME,
    dias_semana     TEXT[],
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    empresa_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. TABELA: auditoria
-- Log imutável de ações sensíveis do sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auditoria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID,
    usuario_email   TEXT,
    usuario         TEXT,
    acao            TEXT NOT NULL,
    modulo          TEXT NOT NULL,
    descricao       TEXT,
    nivel           TEXT NOT NULL DEFAULT 'info' CHECK (nivel IN ('info','aviso','critico')),
    dados_extras    JSONB,
    data            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. TABELA: configuracoes
-- Configurações globais do sistema por empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id           UUID UNIQUE,
    empresa_nome         TEXT,
    empresa_cnpj         TEXT,
    smtp_host            TEXT,
    smtp_porta           INTEGER DEFAULT 587,
    smtp_usuario         TEXT,
    smtp_ssl             BOOLEAN DEFAULT TRUE,
    notif_email          BOOLEAN DEFAULT TRUE,
    notif_whatsapp       BOOLEAN DEFAULT FALSE,
    notif_sistema        BOOLEAN DEFAULT TRUE,
    backup_automatico    BOOLEAN DEFAULT TRUE,
    backup_intervalo     TEXT DEFAULT 'diario',
    tentativas_bloqueio  INTEGER DEFAULT 5,
    tempo_sessao         INTEGER DEFAULT 480,
    logo_url             TEXT,
    tema                 TEXT DEFAULT 'dark',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 11. TRIGGERS — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['usuarios','funcionarios','equipamentos','credenciais','ocorrencias','regras_acesso','configuracoes']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;
             CREATE TRIGGER trg_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
            t, t
        );
    END LOOP;
END;
$$;


-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credenciais    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_acesso  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes  ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados leem e escrevem (o backend controla via service_role)
CREATE POLICY "autenticados_tudo" ON public.usuarios
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.funcionarios
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.equipamentos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.credenciais
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.acessos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.ocorrencias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.regras_acesso
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.auditoria
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados_tudo" ON public.configuracoes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 13. ÍNDICES — performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_acessos_data          ON public.acessos(data DESC);
CREATE INDEX IF NOT EXISTS idx_acessos_funcionario   ON public.acessos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_acessos_resultado     ON public.acessos(resultado);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status   ON public.funcionarios(status);
CREATE INDEX IF NOT EXISTS idx_funcionarios_nome     ON public.funcionarios(nome);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status    ON public.ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_auditoria_data        ON public.auditoria(data DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario     ON public.auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_credenciais_func      ON public.credenciais(funcionario_id);


-- ============================================================
-- 14. USUÁRIO ADMIN INICIAL
-- IMPORTANTE: Primeiro crie o usuário no Supabase Authentication
-- Dashboard → Authentication → Users → Add user
-- Depois substitua o UUID abaixo pelo ID gerado e execute
-- ============================================================

-- SUBSTITUA 'SEU-UUID-AQUI' pelo ID do usuário criado no Auth
-- INSERT INTO public.usuarios (id, nome, email, perfil, ativo)
-- VALUES (
--     'SEU-UUID-AQUI',
--     'Administrador',
--     'seu@email.com',
--     'admin',
--     true
-- );


-- ============================================================
-- CONCLUÍDO — todas as tabelas criadas com sucesso
-- ============================================================
SELECT 'Setup concluido! Tabelas criadas: ' ||
    string_agg(tablename, ', ' ORDER BY tablename)
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('usuarios','funcionarios','equipamentos','credenciais',
                    'acessos','ocorrencias','regras_acesso','auditoria','configuracoes');
