
-- Migration to add RLS policies for aguardando_peritagem table
-- Created on 2026-03-06

-- Enable RLS
ALTER TABLE IF EXISTS aguardando_peritagem ENABLE ROW LEVEL SECURITY;

-- Policy for viewing items: All authenticated users can see aguardando_peritagem
DROP POLICY IF EXISTS "Todos podem ver aguardando_peritagem" ON aguardando_peritagem;
CREATE POLICY "Todos podem ver aguardando_peritagem" ON aguardando_peritagem
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy for managing items: Only PCP and Gestor can perform all actions
DROP POLICY IF EXISTS "PCP e Gestor podem gerenciar aguardando_peritagem" ON aguardando_peritagem;
CREATE POLICY "PCP e Gestor podem gerenciar aguardando_peritagem" ON aguardando_peritagem
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('gestor', 'pcp')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('gestor', 'pcp')
        )
    );

-- Policy for Peritos: They can update the status when starting a peritagem
DROP POLICY IF EXISTS "Peritos podem atualizar status de aguardando_peritagem" ON aguardando_peritagem;
CREATE POLICY "Peritos podem atualizar status de aguardando_peritagem" ON aguardando_peritagem
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'perito'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'perito'
        )
    );
