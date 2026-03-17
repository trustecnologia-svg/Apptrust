import React, { useState, useEffect } from 'react';
import {
    Search,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    ShoppingCart,
    ClipboardCheck,
    User,
    Loader2,
    Wrench,
    XCircle,
    Check,
    FilePlus,
    CheckSquare,
    Clock,
    Calendar
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Monitoramento.css';

interface Processo {
    id: string;
    os: string;
    cliente: string;
    equipamento: string;
    etapaAtual: number;
    statusTexto: string;
    numero_pedido?: string;
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
    created_at?: string;
    updated_at?: string;
    criado_por_nome?: string;
    criado_por_role?: string;
    desenho_conjunto?: string;
    lubrificante?: string;
    volume?: string;
    acoplamento_polia?: string;
    sistema_lubrificacao?: string;
    outros_especificar?: string;
    observacoes_gerais?: string;
    fabricante?: string;
    tipo_modelo?: string;
    ni?: string;
    ordem?: string;
    tag?: string;
    tipo_cilindro?: string;
    os_interna?: string;
    prioridade?: string;
    data_execucao?: string;
}

interface Historico {
    id: string;
    status_novo: string;
    created_at: string;
    responsavel_nome: string;
    responsavel_cargo?: string;
}

const ETAPAS = [
    { id: 1, titulo: 'PERITAGEM CRIADA', responsavel: 'PERITO', icone: <div className="icon-inner"><FilePlus size={24} /></div> },
    { id: 2, titulo: 'EM ANÁLISE PCP', responsavel: 'PCP', icone: <div className="icon-inner"><CheckSquare size={24} /></div> },
    { id: 3, titulo: 'AGUARDANDO CLIENTE', responsavel: 'COMERCIAL', icone: <div className="icon-inner"><User size={24} /></div> },
    { id: 4, titulo: 'EM MANUTENÇÃO', responsavel: 'OFICINA', icone: <div className="icon-inner"><Wrench size={24} /></div> },
    { id: 5, titulo: 'CONFERÊNCIA FINAL', responsavel: 'PCP', icone: <div className="icon-inner"><ClipboardCheck size={24} /></div> },
    { id: 6, titulo: 'PROCESSO FINALIZADO', responsavel: 'EXPEDIÇÃO', icone: <div className="icon-inner"><CheckCircle2 size={24} /></div> }
];

const getEtapaIndex = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === 'PERITAGEM CRIADA' || s === 'REVISÃO NECESSÁRIA' || s === 'EM PERITAGEM') return 1;
    if (s === 'AGUARDANDO APROVAÇÃO DO PCP' || s === 'PERITAGEM FINALIZADA' || s === 'AGUARDANDO PCP') return 2;
    if (s === 'AGUARDANDO APROVAÇÃO DO CLIENTE' || s === 'AGUARDANDO CLIENTES' || s === 'AGUARDANDO ORÇAMENTO' || s === 'AGUARDANDO APROVAÇÃO DE ORÇAMENTO' || s === 'ORÇAMENTO ENVIADO') return 3;
    if (s === 'EM MANUTENÇÃO' || s === 'CILINDROS EM MANUTENÇÃO' || s === 'CILINDRO EM MANUTENÇÃO' || s === 'AGUARDANDO COMPRAS' || s === 'OS EM ABERTO') return 4;
    if (s === 'AGUARDANDO CONFERÊNCIA FINAL' || s === 'CONFERÊNCIA FINAL') return 5;
    if (s === 'PROCESSO FINALIZADO' || s === 'FINALIZADOS' || s === 'FINALIZADO' || s === 'FINALIZADA') return 6;
    return 1;
};

export const Monitoramento: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [selectedProcess, setSelectedProcess] = useState<Processo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [historico, setHistorico] = useState<Historico[]>([]);
    const [selectedStepInfo, setSelectedStepInfo] = useState<Historico | null>(null);

    const { user, role, isAdmin } = useAuth();
    const [empresaId, setEmpresaId] = useState<string | null>(null);

    useEffect(() => {
        if (user && role === 'cliente') {
            fetchUserEmpresa();
        } else {
            fetchProcessos();
        }
    }, [user, role]);

    useEffect(() => {
        if (role === 'cliente' && empresaId) {
            fetchProcessos();
        }
    }, [empresaId]);

    const fetchUserEmpresa = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('empresa_id')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setEmpresaId(data?.empresa_id || null);
        } catch (err) {
            console.error('Erro ao buscar empresa do usuário:', err);
            setLoading(false);
        }
    };

    const fetchProcessos = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('peritagens')
                .select(`
                    id, numero_peritagem, cliente, os_interna, status, os, tipo_cilindro, created_at, updated_at, 
                    prioridade, data_execucao,
                    camisa_int, camisa_ext, camisa_comp, haste_diam, haste_comp, curso, montagem, pressao_nominal, 
                    fabricante_modelo, nota_fiscal, desenho_conjunto, lubrificante, volume, acoplamento_polia, 
                    sistema_lubrificacao, outros_especificar, observacoes_gerais, fabricante, tipo_modelo, ni, ordem, tag,
                    criador: profiles!criado_por(full_name, role)
                `);

            if (role === 'cliente') {
                if (empresaId) {
                    query = query.eq('empresa_id', empresaId);
                } else {
                    setProcessos([]);
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: Processo[] = data.map(p => {
                const criador = Array.isArray(p.criador) ? p.criador[0] : p.criador;

                return {
                    ...p,
                    os: p.os_interna || p.os || p.numero_peritagem,
                    cliente: p.cliente,
                    equipamento: p.tipo_cilindro || 'Cilindro Hidráulico',
                    statusTexto: p.status,
                    etapaAtual: getEtapaIndex(p.status),
                    criado_por_nome: criador?.full_name || 'Usuário do Sistema',
                    criado_por_role: criador?.role || 'SISTEMA'
                };
            });

            setProcessos(mappedData);
        } catch (err) {
            console.error('Erro ao buscar processos:', err);
        } finally {
            setLoading(false);
        }
    };

    // Efeito para selecionar processo via URL (vindo de "Ver Detalhes" em Peritagens)
    useEffect(() => {
        const urlId = searchParams.get('id');
        if (urlId && processos.length > 0) {
            const found = processos.find(p => p.id === urlId);
            if (found) {
                setSelectedProcess(found);
            }
        }
    }, [searchParams, processos]);

    const fetchHistory = async (peritagemId: string) => {
        try {
            const { data: histData } = await supabase
                .from('peritagem_historico')
                .select('*')
                .eq('peritagem_id', peritagemId)
                .order('created_at', { ascending: false });

            const userIds = Array.from(new Set(histData?.map(h => h.alterado_por) || []));
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', userIds);

            const mappedHist = histData?.map(h => {
                const profile = profiles?.find(p => p.id === h.alterado_por);
                return {
                    id: h.id,
                    status_novo: h.status_novo,
                    created_at: h.created_at,
                    responsavel_nome: profile?.full_name || 'Usuário do Sistema',
                    responsavel_cargo: profile?.role?.toUpperCase() || 'COLABORADOR'
                };
            }) || [];

            setHistorico(mappedHist);
        } catch (err) {
            console.error('Erro ao buscar histórico:', err);
        }
    };

    useEffect(() => {
        if (selectedProcess) {
            fetchHistory(selectedProcess.id);
            setSelectedStepInfo(null);
        }
    }, [selectedProcess]);

    const handleUpdateStatus = async (targetProcess: any, newStatus: string, additionalData: any = {}) => {
        if (!targetProcess || !user) return;

        const oldStatus = targetProcess.statusTexto;

        try {
            const { error } = await supabase
                .from('peritagens')
                .update({
                    status: newStatus,
                    ...additionalData
                })
                .eq('id', targetProcess.id);

            if (error) throw error;

            await supabase.from('peritagem_historico').insert([{
                peritagem_id: targetProcess.id,
                status_antigo: oldStatus,
                status_novo: newStatus,
                alterado_por: user.id
            }]);

            const updated = {
                ...targetProcess,
                ...additionalData,
                statusTexto: newStatus,
                etapaAtual: getEtapaIndex(newStatus)
            };

            if (selectedProcess && selectedProcess.id === targetProcess.id) {
                setSelectedProcess(updated);
                fetchHistory(updated.id);
            }

            setProcessos(prev => prev.map(p => p.id === updated.id ? updated : p));
            alert(`Status atualizado para: ${newStatus}`);
        } catch (err: any) {
            console.error('Erro ao atualizar status:', err);
            alert('Erro ao atualizar status.');
        }
    };

    const filterParams = searchParams.get('filter');

    const filteredProcessos = processos.filter(p => {
        const cValue = (p.cliente || "").toLowerCase();
        const osValue = (p.os || "").toLowerCase();
        const osInternaValue = (p.os_interna || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        const matchesSearch = cValue.includes(search) || osValue.includes(search) || osInternaValue.includes(search);

        if (!filterParams) return matchesSearch;

        const status = (p.statusTexto || "").toUpperCase();

        if (filterParams === 'pcp') {
            return matchesSearch && (status === 'PERITAGEM CRIADA' || status === 'AGUARDANDO APROVAÇÃO DO PCP' || status === 'PERITAGEM FINALIZADA' || status === 'EM PERITAGEM');
        }
        if (filterParams === 'cliente') {
            return matchesSearch && (status === 'AGUARDANDO APROVAÇÃO DO CLIENTE' || status === 'AGUARDANDO CLIENTES' || status === 'ORÇAMENTO ENVIADO' || status === 'AGUARDANDO ORÇAMENTO');
        }
        if (filterParams === 'finalizar') {
            return matchesSearch && (status === 'EM MANUTENÇÃO' || status === 'CILINDROS EM MANUTENÇÃO' || status === 'AGUARDANDO CONFERÊNCIA FINAL' || status === 'AGUARDANDO COMPRAS' || status === 'CILINDRO EM MANUTENÇÃO');
        }

        return matchesSearch;
    });

    const handleBackToList = () => {
        setSelectedProcess(null);
        setSearchParams({}); // Limpa o ID da URL ao voltar
    };

    if (selectedProcess) {
        return (
            <div className="monitoramento-container detail-view">
                <button className="btn-back-text" onClick={handleBackToList}>
                    <ArrowLeft size={18} />
                    <span>Voltar para a lista</span>
                </button>

                <div className="process-header-summary mini">
                    <div className="summary-left">
                        <span className="monitoring-label">
                            <Loader2 size={14} className="spinning-icon" /> MONITORAMENTO DE PROCESSO
                        </span>
                        <h2 className="current-step-title">
                            {selectedProcess.os_interna ? `${selectedProcess.os_interna} (${selectedProcess.os})` : selectedProcess.os} - <span className="highlight-status">{selectedProcess.cliente}</span>
                        </h2>
                    </div>
                </div>

                <div className="timeline-grid">
                    {ETAPAS.map((etapa, index) => {
                        const isCompleted = etapa.id < selectedProcess.etapaAtual;
                        const isActive = etapa.id === selectedProcess.etapaAtual;
                        const isPending = etapa.id > selectedProcess.etapaAtual;

                        let stageHistory = historico.find(h => getEtapaIndex(h.status_novo) === etapa.id);

                        if (etapa.id === 1 && !stageHistory && selectedProcess) {
                            stageHistory = {
                                id: 'initial',
                                status_novo: 'PERITAGEM CRIADA',
                                created_at: selectedProcess.created_at || '',
                                responsavel_nome: selectedProcess.criado_por_nome || 'Sistema (Criação)',
                                responsavel_cargo: selectedProcess.criado_por_role || 'SISTEMA'
                            };
                        }

                        // Fallback para o card ATIVO caso não tenha histórico registrado (ex: transição direta)
                        if (isActive && !stageHistory && selectedProcess) {
                            stageHistory = {
                                id: 'active-fallback',
                                status_novo: selectedProcess.statusTexto,
                                created_at: selectedProcess.updated_at || selectedProcess.created_at || '',
                                responsavel_nome: selectedProcess.criado_por_nome || 'Sistema',
                                responsavel_cargo: selectedProcess.criado_por_role || 'SISTEMA'
                            };
                        }

                        const canClick = !!stageHistory;

                        return (
                            <React.Fragment key={etapa.id}>
                                <div
                                    className={`stage-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''} ${canClick ? 'clickable' : ''}`}
                                    onClick={() => canClick && setSelectedStepInfo(stageHistory!)}
                                >
                                    <span className="stage-number">{etapa.id < 10 ? `0${etapa.id}` : etapa.id}</span>

                                    <div className="stage-icon-box">
                                        {etapa.icone}
                                    </div>

                                    <div className="stage-content">
                                        <h4 className="stage-title">{etapa.titulo}</h4>
                                        <span className="stage-responsible-role">{etapa.responsavel}</span>
                                    </div>

                                    {isActive && <div className="active-pill">ATIVO</div>}
                                </div>
                                {index < ETAPAS.length - 1 && (
                                    <div className="stage-connector">
                                        <ChevronRight size={24} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* AÇÕES RÁPIDAS NO DETALHE */}
                {selectedProcess.statusTexto === 'EM MANUTENÇÃO' && (isAdmin || role === 'montagem') && (
                    <div className="process-detail-actions">
                        <div className="action-card-highlight">
                            <div className="action-icon-bg">
                                <Wrench size={32} />
                            </div>
                            <div className="action-text">
                                <h3>Manutenção em Andamento</h3>
                                <p>Este cilindro está atualmente na oficina. Quando o serviço for concluído, finalize para enviar para conferência.</p>
                            </div>
                            <button
                                className="btn-finalizar-grande"
                                onClick={() => handleUpdateStatus(selectedProcess, 'AGUARDANDO CONFERÊNCIA FINAL', { etapa_atual: 'teste' })}
                            >
                                <Check size={20} /> FINALIZAR MANUTENÇÃO
                            </button>
                        </div>
                    </div>
                )}

                <div className="timeline-footer">
                    <div className="legend">
                        <div className="legend-item"><span className="dot dot-executed"></span> EXECUTADO</div>
                        <div className="legend-item"><span className="dot dot-active"></span> ETAPA ATUAL</div>
                        <div className="legend-item"><span className="dot dot-pending"></span> PENDENTE</div>
                    </div>

                    <div className="instruction-text">
                        CLIQUE NOS CARDS PARA VER DETALHES
                    </div>

                    <div className="process-id-display">
                        O.S: {selectedProcess.os_interna || selectedProcess.os}
                    </div>
                </div>

                {selectedStepInfo && (
                    <div className="history-modal-overlay" onClick={() => setSelectedStepInfo(null)}>
                        <div className="history-modal-content" onClick={e => e.stopPropagation()}>

                            <div className="modal-header-exec">
                                <div className="header-content-exec">
                                    <h3>{selectedStepInfo.status_novo}</h3>
                                    <span>Informações de Execução</span>
                                </div>
                                <button className="modal-close-exec" onClick={() => setSelectedStepInfo(null)}>
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="modal-body-exec">
                                <div className="exec-info-grid">
                                    <div className="exec-info-item">
                                        <label><CheckSquare size={14} /> DATA</label>
                                        <strong>{selectedStepInfo.created_at ? new Date(selectedStepInfo.created_at).toLocaleDateString('pt-BR') : '---'}</strong>
                                    </div>
                                    <div className="exec-info-item">
                                        <label><Loader2 size={14} /> HORÁRIO</label>
                                        <strong>{selectedStepInfo.created_at ? new Date(selectedStepInfo.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---'}</strong>
                                    </div>

                                    {(() => {
                                        if (!selectedStepInfo.created_at) return null;

                                        const now = new Date();
                                        const date = new Date(selectedStepInfo.created_at);
                                        const diffTime = Math.abs(now.getTime() - date.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                        return (
                                            <div className="exec-info-item" style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                                                <label style={{ color: '#d69e2e' }}><Clock size={14} /> AGUARDANDO LIBERAÇÃO</label>
                                                <strong style={{ fontSize: '0.9rem', color: '#744210' }}>
                                                    Há {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                                                </strong>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="exec-user-card">
                                    <div className="user-avatar-initials">
                                        {(() => {
                                            const name = selectedStepInfo.responsavel_nome || 'S';
                                            const parts = name.split(' ');
                                            const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.substring(0, 2);
                                            return initials.toUpperCase();
                                        })()}
                                    </div>
                                    <div className="user-details">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <label style={{ fontSize: '0.65rem', color: '#a0aec0', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>RESPONSÁVEL</label>
                                            <span className="user-name" style={{ fontSize: '1rem', fontWeight: '700', color: '#2d3748' }}>{selectedStepInfo.responsavel_nome}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '0.65rem', color: '#a0aec0', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>FUNÇÃO</label>
                                            <span className={`user-role-badge role-${selectedStepInfo.responsavel_cargo?.toLowerCase() || 'sistema'}`}>
                                                {(() => {
                                                    const r = (selectedStepInfo.responsavel_cargo || '').toLowerCase();
                                                    if (r === 'perito') return 'Perito';
                                                    if (r === 'pcp') return 'PCP';
                                                    if (r === 'gestor') return 'Gestor';
                                                    if (r === 'oficina') return 'Oficina';
                                                    if (r === 'comercial') return 'Comercial';
                                                    return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Sistema';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer-exec">
                                <button className="btn-close-exec" onClick={() => setSelectedStepInfo(null)}>
                                    Fechar Detalhes
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="monitoramento-container list-view">

            <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Monitoramento de Processos</h1>
            <p className="page-subtitle">Selecione uma peritagem para visualizar a linha do tempo e o status atual.</p>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Buscar por O.S. ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="process-list">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" size={40} color="#3182ce" />
                        <p>Buscando processos...</p>
                    </div>
                ) : (
                    <>
                        {filteredProcessos.map(processo => {
                            const showActions = (role === 'pcp' || role === 'gestor' || role === 'perito' || role === 'Programador');
                            const isPcpAwaiting = processo.statusTexto === 'PERITAGEM CRIADA' || processo.statusTexto === 'AGUARDANDO APROVAÇÃO DO PCP';
                            const isClientAwaiting = processo.statusTexto === 'AGUARDANDO APROVAÇÃO DO CLIENTE' || processo.statusTexto === 'AGUARDANDO CLIENTES';
                            const isMaintenance = processo.statusTexto === 'EM MANUTENÇÃO' || processo.statusTexto === 'CILINDROS EM MANUTENÇÃO';

                            return (
                                <div key={processo.id} className="process-card">
                                    <div className="process-main-info" onClick={() => setSelectedProcess(processo)}>
                                        <div className="process-info">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span className="process-tag" style={{ background: '#2d3748', color: 'white' }}>{processo.os_interna || processo.os}</span>
                                                {processo.prioridade && (
                                                    <span className={`priority-badge ${processo.prioridade.toLowerCase() === 'urgente' ? 'priority-urgente' : 'priority-normal'}`} style={{ fontSize: '0.6rem' }}>
                                                        {processo.prioridade}
                                                    </span>
                                                )}
                                            </div>
                                            {processo.os_interna && (
                                                <span style={{ fontSize: '0.65rem', color: '#718096', display: 'block', marginBottom: '4px' }}>
                                                    O.S. Cliente: {(processo.os && (!processo.os.startsWith('S/OS-') || processo.os.length < 15)) ? processo.os : 'NÃO INFORMADA'}
                                                </span>
                                            )}
                                            <h3 className="process-title">{processo.cliente}</h3>
                                            <div style={{ display: 'flex', gap: '8px', color: '#718096', fontSize: '0.8rem', marginTop: '4px' }}>
                                                <Calendar size={12} />
                                                <span>{processo.data_execucao ? new Date(processo.data_execucao).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                                            </div>
                                            <span className="process-client">{processo.equipamento}</span>
                                        </div>

                                        <div className="process-flow-indicator">
                                            {ETAPAS.map(e => (
                                                <div
                                                    key={e.id}
                                                    className={`flow-dot ${e.id <= processo.etapaAtual ? 'filled' : ''} ${e.id === processo.etapaAtual ? 'current' : ''}`}
                                                    title={e.titulo}
                                                />
                                            ))}
                                        </div>

                                        <div className="process-status-wrapper">
                                            <span className={`status-badge ${processo.statusTexto.toLowerCase().replace(/ /g, '-')}`}>
                                                {processo.statusTexto}
                                            </span>
                                            <ChevronRight size={20} color="#cbd5e0" />
                                        </div>
                                    </div>

                                    {showActions && (
                                        <div className="process-quick-actions">
                                            {(() => {
                                                const statusUpper = (processo.statusTexto || "").toUpperCase();
                                                return (
                                                    <>
                                                        {(isPcpAwaiting || statusUpper === 'PERITAGEM FINALIZADA') && isAdmin && (
                                                            <button
                                                                className="btn-quick-approve"
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(processo, 'AGUARDANDO APROVAÇÃO DO CLIENTE', { etapa_atual: 'montagem' }); }}
                                                            >
                                                                <Check size={16} />
                                                                <span>Aprovar Peritagem</span>
                                                            </button>
                                                        )}
                                                        {isClientAwaiting && (isAdmin || role === 'perito') && (
                                                            <button
                                                                className="btn-quick-client"
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(processo, 'EM MANUTENÇÃO', { etapa_atual: 'montagem' }); }}
                                                            >
                                                                <ShoppingCart size={16} />
                                                                <span>Liberação do Pedido</span>
                                                            </button>
                                                        )}
                                                        {(isMaintenance || statusUpper === 'CILINDRO EM MANUTENÇÃO') && (isAdmin || (role as string) === 'montagem') && (
                                                            <button
                                                                className="btn-quick-finish"
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(processo, 'AGUARDANDO CONFERÊNCIA FINAL', { etapa_atual: 'teste' }); }}
                                                            >
                                                                <Wrench size={16} />
                                                                <span>Finalizar Manutenção</span>
                                                            </button>
                                                        )}
                                                        {processo.statusTexto === 'AGUARDANDO CONFERÊNCIA FINAL' && (isAdmin || role === 'perito') && (
                                                            <button
                                                                className="btn-quick-finish"
                                                                style={{ background: '#2d3748' }}
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(processo, 'PROCESSO FINALIZADO'); }}
                                                            >
                                                                <CheckCircle2 size={16} />
                                                                <span>Conferir e Finalizar</span>
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredProcessos.length === 0 && (
                            <div className="no-results">Nenhum processo encontrado.</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
