
-- Migration to add motivo_rejeicao to peritagens table
-- Created on 2026-03-06

ALTER TABLE peritagens ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

