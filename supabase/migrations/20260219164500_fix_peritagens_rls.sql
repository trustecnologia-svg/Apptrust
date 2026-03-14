-- Migration to fix RLS policies for peritagens table
-- Created on 2026-02-19

-- Remove old potentially problematic policies
DROP POLICY IF EXISTS "Acesso Total Usuários Autenticados" ON peritagens;
DROP POLICY IF EXISTS "Gestores e PCP vêm tudo" ON peritagens;
DROP POLICY IF EXISTS "Peritos vêm suas peritagens" ON peritagens;

-- Create explicit policies for internal roles
CREATE POLICY "Gestores e PCP Acesso Total" ON peritagens
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

CREATE POLICY "Peritos Acesso Total" ON peritagens
    FOR ALL
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

-- Keep the client SELECT policy
-- DROP POLICY IF EXISTS "Clientes podem ver apenas suas peritagens" ON peritagens;

-- Add a catch-all for any authenticated user just in case
CREATE POLICY "Authenticated users can insert" ON peritagens
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
