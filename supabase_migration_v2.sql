-- ============================================================
-- CRV CONTROLE DE ACESSO — MIGRAÇÃO v2
-- Cria tabelas faltantes e corrige schema para o frontend
-- Execute no Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. TABELA: empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        TEXT NOT NULL,
    cnpj        TEXT,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. TABELA: grupos (Regras de Acesso)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grupos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        TEXT NOT NULL,
    descricao   TEXT,
    empresa_id  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TABELA: areas (Regras de Acesso + Equipamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.areas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome             TEXT NOT NULL,
    descricao        TEXT,
    nivel_restricao  TEXT NOT NULL DEFAULT 'baixo'
        CHECK (nivel_restricao IN ('baixo','medio','alto','critico')),
    empresa_id       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. FK: funcionarios → empresas
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_funcionarios_empresa'
    ) THEN
        ALTER TABLE public.funcionarios
            ADD CONSTRAINT fk_funcionarios_empresa
            FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- ============================================================
-- 5. COLUNAS FALTANTES: regras_acesso
-- ============================================================
ALTER TABLE public.regras_acesso
    ADD COLUMN IF NOT EXISTS tipo       TEXT,
    ADD COLUMN IF NOT EXISTS prioridade TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'ativa',
    ADD COLUMN IF NOT EXISTS grupo_id   UUID,
    ADD COLUMN IF NOT EXISTS area_id    UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_regras_grupo'
    ) THEN
        ALTER TABLE public.regras_acesso
            ADD CONSTRAINT fk_regras_grupo
            FOREIGN KEY (grupo_id) REFERENCES public.grupos(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_regras_area'
    ) THEN
        ALTER TABLE public.regras_acesso
            ADD CONSTRAINT fk_regras_area
            FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.grupos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grupos'   AND policyname='autenticados_tudo') THEN
        CREATE POLICY "autenticados_tudo" ON public.grupos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='areas'    AND policyname='autenticados_tudo') THEN
        CREATE POLICY "autenticados_tudo" ON public.areas    FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='empresas' AND policyname='autenticados_tudo') THEN
        CREATE POLICY "autenticados_tudo" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END;
$$;

-- ============================================================
-- 7. TRIGGERS updated_at
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['grupos','areas','empresas']
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
-- 8. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_grupos_nome  ON public.grupos(nome);
CREATE INDEX IF NOT EXISTS idx_areas_nome   ON public.areas(nome);
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas(nome);

-- ============================================================
SELECT 'Migração v2 concluída! Tabelas criadas: empresas, grupos, areas';
-- ============================================================
