import React, { useState, useEffect } from 'react';
import { Search, Loader2, Check, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Peritagens.css';
import './PcpCommon.css';

interface Peritagem {
    os?: string;
    id: string;
    numero_peritagem?: string;
    cliente: string;
    ordem_servico?: string;
    nota_fiscal?: string;
    camisa_int?: string;
    camisa_ext?: string;
    camisa_comp?: string;
    haste_diam?: string;
    haste_comp?: string;
    curso?: string;
    montagem?: string;
    pressao_nominal?: string;
    fabricante_modelo?: string;
    foto_frontal?: string;
    status?: string;
    os_interna?: string;
    numero_os?: string;
    created_at?: string;
}

interface AnaliseTecnica {
    id: string;
    componente: string;
    conformidade: string;
    anomalias?: string;
    solucao?: string;
    fotos?: string[];
    dimensoes?: string;
    qtd?: string;
}

export const PcpAprovaPeritagem: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedPeritagem, setSelectedPeritagem] = useState<Peritagem | null>(null);
    const [technicalAnalyses, setTechnicalAnalyses] = useState<AnaliseTecnica[]>([]);
    const [loadingAnalyses, setLoadingAnalyses] = useState(false);

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, os, numero_peritagem, cliente, os_interna, status, camisa_int, haste_diam, curso, created_at')
                .or('status.eq.PERITAGEM CRIADA,status.eq.AGUARDANDO APROVAÇÃO DO PCP')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
            setErrorMsg(null);
        } catch (err: any) {
            console.error('Erro:', err);
            setErrorMsg(err.message || 'Erro desconhecido ao carregar peritagens.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalyses = async (peritagemId: string) => {
        try {
            setLoadingAnalyses(true);

            // Buscar dados completos da peritagem para o review
            const { data: pData } = await supabase
                .from('peritagens')
                .select('*')
                .eq('id', peritagemId)
                .single();

            if (pData) setSelectedPeritagem(pData);

            const { data, error } = await supabase
                .from('peritagem_analise_tecnica')
                .select('*')
                .eq('peritagem_id', peritagemId);

            if (error) throw error;
            setTechnicalAnalyses(data || []);
        } catch (err) {
            console.error('Erro ao buscar análises:', err);
        } finally {
            setLoadingAnalyses(false);
        }
    };

    useEffect(() => {
        if (selectedPeritagem?.id) {
            fetchAnalyses(selectedPeritagem.id);
        }
    }, [selectedPeritagem?.id]);

    const handleApprove = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('peritagens')
                .update({
                    status: 'AGUARDANDO APROVAÇÃO DO CLIENTE',
                    etapa_atual: 'montagem'
                })
                .eq('id', id);

            if (error) throw error;

            await supabase.from('peritagem_historico').insert([{
                peritagem_id: id,
                status_antigo: 'AGUARDANDO APROVAÇÃO DO PCP',
                status_novo: 'AGUARDANDO APROVAÇÃO DO CLIENTE',
                alterado_por: user.id
            }]);

            setPeritagens(prev => prev.filter(p => p.id !== id));
            alert('Peritagem aprovada e enviada para o comercial.');
        } catch (err) {
            alert('Erro ao aprovar.');
        }
    };

    const handleReject = async (id: string) => {
        if (!user) return;
        // Opcional: Solicitar motivo
        const motivo = window.prompt("Motivo da reprovação (será enviado ao perito):");
        if (motivo === null) return; // Cancelou

        try {
            const { error } = await supabase
                .from('peritagens')
                .update({ status: 'REVISÃO NECESSÁRIA', motivo_rejeicao: motivo })
                .eq('id', id);

            if (error) throw error;

            await supabase.from('peritagem_historico').insert([{
                peritagem_id: id,
                status_antigo: 'AGUARDANDO APROVAÇÃO DO PCP',
                status_novo: 'REVISÃO NECESSÁRIA',
                alterado_por: user.id
            }]);

            setPeritagens(prev => prev.filter(p => p.id !== id));
            alert('Peritagem reprovada e devolvida ao perito.');
        } catch (err) {
            console.error(err);
            alert('Erro ao reprovar.');
        }
    };

    const filtered = peritagens.filter(p => {
        const clienteMatch = (p.cliente || '').toLowerCase().includes(searchTerm.toLowerCase());
        const peritagemMatch = (p.numero_peritagem || '').toLowerCase().includes(searchTerm.toLowerCase());
        const osMatch = (p.os_interna || '').toLowerCase().includes(searchTerm.toLowerCase());
        return clienteMatch || peritagemMatch || osMatch;
    });

    return (
        <div className="ind-container">
            <div className="ind-page-header">
                <div className="ind-title-group">
                    <h1>Aprovação de Peritagem</h1>
                    <p>Revisão técnica e liberação de laudos para o comercial</p>
                </div>
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, ID ou O.S..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-state" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={40} color="#3182ce" />
                </div>
            ) : selectedPeritagem ? (
                <div className="detailed-review-flow">
                    <button className="btn-back-action" onClick={() => setSelectedPeritagem(null)}>
                        ← Voltar para a lista
                    </button>

                    <div className="peritagem-full-review card">
                        <header className="review-main-header">
                            <div>
                                <h2 className="review-title">Revisão Detalhada: {selectedPeritagem.cliente}</h2>
                                <p className="review-os-highlight">OS: {selectedPeritagem.os_interna || '---'}</p>
                            </div>
                            <div className="pcp-approval-actions top">
                                <button
                                    className="btn-pcp-action reject"
                                    onClick={() => { handleReject(selectedPeritagem.id); setSelectedPeritagem(null); }}
                                >
                                    <XCircle size={20} /> Reprovar
                                </button>
                                <button
                                    className="btn-pcp-action approve-all"
                                    onClick={() => { handleApprove(selectedPeritagem.id); setSelectedPeritagem(null); }}
                                >
                                    <Check size={20} /> Aprovar e Enviar p/ Comercial
                                </button>
                            </div>
                        </header>

                        <div className="review-top-layout">
                            {selectedPeritagem.foto_frontal && (
                                <div className="review-section frontal-photo">
                                    <h4 className="review-subtitle">Foto Frontal do Equipamento</h4>
                                    <div className="review-photo-container">
                                        <img src={selectedPeritagem.foto_frontal} alt="Frontal" />
                                    </div>
                                </div>
                            )}

                            <div className="review-section id-dimensions">
                                <h4 className="review-subtitle">Identificação e Dimensões</h4>
                                <div className="review-details-grid">
                                    <div className="review-detail-item"><label>CLIENTE</label> <strong>{selectedPeritagem.cliente}</strong></div>
                                    <div className="review-detail-item"><label>O.S. INTERNA</label> <strong style={{ color: '#2563eb', fontSize: '1.2rem' }}>{selectedPeritagem.os_interna || '---'}</strong></div>
                                    <div className="review-detail-item"><label>ID PERITAGEM</label> <strong>{selectedPeritagem.numero_peritagem}</strong></div>
                                    <div className="review-detail-item"><label>O.S. CLIENTE</label> <strong>{selectedPeritagem.ordem_servico || '---'}</strong></div>
                                    <div className="review-detail-item"><label>NOTA FISCAL</label> <strong>{selectedPeritagem.nota_fiscal || '---'}</strong></div>
                                    <div className="review-detail-item"><label>Ø INTERNO</label> <strong>{selectedPeritagem.camisa_int || '---'} mm</strong></div>
                                    <div className="review-detail-item"><label>Ø HASTE</label> <strong>{selectedPeritagem.haste_diam || '---'} mm</strong></div>
                                    <div className="review-detail-item"><label>CURSO</label> <strong>{selectedPeritagem.curso || '---'} mm</strong></div>
                                    <div className="review-detail-item"><label>FABRICANTE</label> <strong>{selectedPeritagem.fabricante_modelo || '---'}</strong></div>
                                </div>
                            </div>
                        </div>

                        <div className="review-section">
                            <h4 className="review-subtitle">Análise Técnica (Checklist)</h4>
                            {loadingAnalyses ? (
                                <div className="loading-small"><Loader2 className="animate-spin" /> Carregando checklists...</div>
                            ) : (
                                <div className="analysis-review-grid">
                                    {technicalAnalyses.map(analise => (
                                        <div key={analise.id} className={`review-item-card ${(analise.conformidade || '') === 'não conforme' ? 'not-ok' : 'ok'}`}>
                                            <div className="review-item-header">
                                                <div className="item-info">
                                                    <strong className="item-comp-name">{analise.componente}</strong>
                                                    {(analise.dimensoes || analise.qtd) && (
                                                        <div className="item-meta">
                                                            {analise.dimensoes && <span>{analise.dimensoes}</span>}
                                                            {analise.dimensoes && analise.qtd && <span className="divider">|</span>}
                                                            {analise.qtd && <span>Qtd: {analise.qtd}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`item-badge ${(analise.conformidade || '') === 'conforme' ? 'ok' : 'nok'}`}>
                                                    {(analise.conformidade || 'N/A').toUpperCase()}
                                                </span>
                                            </div>

                                            {(analise.conformidade || '') === 'não conforme' && (
                                                <div className="review-item-details">
                                                    <div className="details-stack">
                                                        {analise.anomalias && (
                                                            <div className="detail-field critical">
                                                                <label>Anomalia Encontrada</label>
                                                                <p>{analise.anomalias}</p>
                                                            </div>
                                                        )}
                                                        {analise.solucao && (
                                                            <div className="detail-field">
                                                                <label>Solução Recomendada</label>
                                                                <p>{analise.solucao}</p>
                                                            </div>
                                                        )}
                                                        {analise.fotos && analise.fotos.length > 0 && (
                                                            <div className="detail-field">
                                                                <label>Evidências Fotográficas</label>
                                                                <div className="photo-evidence-grid">
                                                                    {analise.fotos.map((f, i) => (
                                                                        <img key={i} src={f} alt="Evidência" className="photo-evidence-item" onClick={() => window.open(f, '_blank')} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pcp-approval-actions bottom">
                            <button
                                className="btn-pcp-action reject"
                                onClick={() => { handleReject(selectedPeritagem.id); setSelectedPeritagem(null); }}
                            >
                                <XCircle size={24} /> Reprovar Peritagem
                            </button>
                            <button
                                className="btn-pcp-action approve-all"
                                onClick={() => { handleApprove(selectedPeritagem.id); setSelectedPeritagem(null); }}
                            >
                                <Check size={24} /> Confirmar e Enviar para Comercial
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="ind-grid">
                    {filtered.length > 0 ? (
                        filtered.map(p => (
                            <div key={p.id} className="ind-card" onClick={() => setSelectedPeritagem(p)} style={{ cursor: 'pointer' }}>
                                <div className="ind-card-tag">
                                    <span className="os-label">{p.os_interna || 'P-TAG-00'}</span>
                                    <span className="ind-badge ind-badge-info" style={{fontSize: '0.6rem'}}>
                                        {p.status}
                                    </span>
                                </div>

                                <div className="ind-card-body">
                                    <h3 className="ind-card-title">{p.cliente}</h3>
                                    <span className="ind-card-subtitle">Entrada em {new Date(p.created_at || '').toLocaleDateString('pt-BR')}</span>

                                    <div className="ind-data-mini-grid" style={{ marginBottom: 0 }}>
                                        <div className="ind-data-item">
                                            <span className="ind-data-label">Cilindro Ø</span>
                                            <span className="ind-data-value">{p.camisa_int || '---'}/{p.haste_diam || '---'}</span>
                                        </div>
                                        <div className="ind-data-item">
                                            <span className="ind-data-label">Curso</span>
                                            <span className="ind-data-value">{p.curso || '---'} mm</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ind-card-footer">
                                    <button className="ind-btn ind-btn-primary" style={{ width: '100%' }}>
                                        <Search size={18} />
                                        <span>Revisar Laudo</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', color: '#718096', gridColumn: '1 / -1', padding: '3rem' }}>
                            {errorMsg ? (
                                <span style={{ color: '#ef4444' }}>Ocorreu um erro: {errorMsg}</span>
                            ) : (
                                <span>Nenhuma peritagem pendente.</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
