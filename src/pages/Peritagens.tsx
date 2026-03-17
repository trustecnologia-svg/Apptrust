import React, { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, Loader2, Trash2, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Peritagens.css';

interface Peritagem {
    os?: string;
    id: string;
    numero_peritagem: string;
    cliente: string;
    data_execucao: string;
    status: string;
    prioridade: string;
    criado_por: string;
    os_interna?: string;
    motivo_rejeicao?: string;
}

export const Peritagens: React.FC = () => {
    const { role, user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'recusadas'>('all'); // Filtro para Perito
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const statusParam = searchParams.get('status');

    useEffect(() => {
        if (user) {
            if (role === 'cliente') {
                fetchUserEmpresa();
            } else {
                fetchPeritagens();
            }
        }
    }, [user, role, filterStatus, statusParam]);

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam === 'recusada') {
            setFilterStatus('recusadas');
        } else {
            setFilterStatus('all');
        }
    }, [searchParams]);

    useEffect(() => {
        if (role === 'cliente' && empresaId) {
            fetchPeritagens();
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

    const fetchPeritagens = async () => {
        try {
            let query = supabase
                .from('peritagens')
                .select('id, os, numero_peritagem, cliente, data_execucao, status, prioridade, criado_por, os_interna, motivo_rejeicao, created_at')
                .order('created_at', { ascending: false });

            // Filtro via URL (ex: vindo do Dashboard)
            if (statusParam === 'finalizados') {
                query = query.or('status.eq.PROCESSO FINALIZADO,status.eq.FINALIZADOS,status.eq.FINALIZADO,status.eq.ORÇAMENTO FINALIZADO');
            }

            // Se for PERITO, filtrar apenas as suas
            if (role === 'perito') {
                query = query.eq('criado_por', user.id);

                // Se estiver vendo recusadas
                if (filterStatus === 'recusadas') {
                    query = query.eq('status', 'REVISÃO NECESSÁRIA');
                } else {
                    // Minhas Peritagens: apenas aprovadas ou aguardando (ocultar recusadas)
                    query = query.neq('status', 'REVISÃO NECESSÁRIA');
                }
            }

            // REGRAS PARA APP ANDROID: Qualquer usuário logado no app só vê as suas peritagens
            const isAndroidApp = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            if (isAndroidApp && role !== 'gestor' && role !== 'pcp' && user) {
                query = query.eq('criado_por', user.id);
            }

            if (role === 'cliente') {
                if (empresaId) {
                    query = query.eq('empresa_id', empresaId);
                } else {
                    setPeritagens([]);
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            setPeritagens(data || []);
            setErrorMsg(null);
        } catch (err: any) {
            console.error('Erro ao buscar peritagens:', err);
            setErrorMsg(err.message || 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta peritagem? Esta ação não pode ser desfeita.')) return;

        try {
            const { error } = await supabase
                .from('peritagens')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPeritagens(prev => prev.filter(p => p.id !== id));
            alert('Peritagem excluída com sucesso.');
        } catch (error) {
            console.error('Erro ao excluir peritagem:', error);
            alert('Erro ao excluir peritagem. Verifique se existem registros vinculados.');
        }
    };

    const filteredPeritagens = peritagens.filter(p => {
        const clienteStr = p.cliente || '';
        const numStr = p.numero_peritagem || '';
        const osStr = p.os_interna || '';
        const searchLow = searchTerm.toLowerCase();

        return clienteStr.toLowerCase().includes(searchLow) ||
            numStr.toLowerCase().includes(searchLow) ||
            osStr.toLowerCase().includes(searchLow);
    });

    return (
        <div className="peritagens-container">
            <div className="header-actions">
                <div className="title-section">
                    <h1 className="page-title">
                        {role === 'perito'
                            ? (filterStatus === 'recusadas' ? 'Revisões Pendentes' : 'Controle de Peritagens')
                            : 'Gestão de Ativos'}
                    </h1>
                    <p>{role === 'perito' ? 'Seus laudos e verificações técnicas' : 'Painel administrativo de vistorias industriais'}</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/nova-peritagem')}>
                    <Plus size={20} />
                    <span>Nova Peritagem</span>
                </button>
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou OS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid-container">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" size={40} color="#2563eb" />
                        <p>Carregando peritagens...</p>
                    </div>
                ) : (
                    <div className="peritagens-grid">
                        {filteredPeritagens.map((p) => {
                            const statusUpper = p.status?.trim().toUpperCase() || '';
                            const isRejection = statusUpper === 'REVISÃO NECESSÁRIA';
                            const isApproved = statusUpper === 'APROVADO';
                            const canEdit = role === 'perito' ? !isApproved : true;

                            const getStatusColorClass = (status: string) => {
                                const s = status.toUpperCase();
                                if (s.includes('FINALIZADO')) return 'status-finalizado';
                                if (s.includes('MANUTENÇÃO') || s.includes('ABERTO') || s.includes('OFICINA')) return 'status-manutencao';
                                if (s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE')) return 'status-aprovacao';
                                if (s.includes('REVISÃO')) return 'status-revisao';
                                return 'status-aguardando';
                            };

                            return (
                                <div key={p.id} className="peritagem-card">
                                    <div className="card-top-tag">
                                        <span className="os-label">ID: {p.os_interna || 'P-TAG-00'}</span>
                                        <span className={`status-pill ${getStatusColorClass(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </div>

                                    <div className="card-main-body">
                                        <div className="client-header">
                                            <h3 className="client-name">{p.cliente}</h3>
                                            <span className="client-sub">Setor Técnico / Ativo Hidráulico</span>
                                        </div>

                                        <div className="technical-details">
                                            <div className="detail-item">
                                                <span className="detail-label">Execução</span>
                                                <span className="detail-value">
                                                    <Calendar size={14} />
                                                    {new Date(p.data_execucao).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Prioridade</span>
                                                <span className={`detail-value ${(p.prioridade || '').toLowerCase() === 'urgente' ? 'ind-badge-danger' : 'ind-badge-info'}`} style={{fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px'}}>
                                                    {p.prioridade || 'Normal'}
                                                </span>
                                            </div>
                                            <div className="detail-item" style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                                                <span className="detail-label">O.S. Cliente</span>
                                                <span className="detail-value" style={{fontFamily: 'monospace'}}>
                                                    {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'N/A')}
                                                </span>
                                            </div>
                                        </div>

                                        {isRejection && p.motivo_rejeicao && (
                                            <div className="ind-badge-danger" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.75rem', marginBottom: '16px' }}>
                                                <strong>REPROVADO PCP:</strong> {p.motivo_rejeicao}
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-actions-dock">
                                        <button
                                            className={`btn-ind ${canEdit ? 'btn-ind-primary' : 'btn-ind-outline'}`}
                                            onClick={() => {
                                                if (canEdit) {
                                                    navigate(`/nova-peritagem?id=${p.id}`);
                                                } else {
                                                    navigate(`/monitoramento?id=${p.id}`);
                                                }
                                            }}
                                        >
                                            <ExternalLink size={16} />
                                            {canEdit ? (isRejection ? 'REVISAR' : 'GERENCIAR') : 'VISUALIZAR'}
                                        </button>

                                        {role === 'gestor' && (
                                            <button
                                                className="btn-ind btn-ind-outline btn-ind-danger"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && errorMsg && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444', gridColumn: '1 / -1' }}>
                        Erro ao carregar {errorMsg}.
                    </div>
                )}

                {!loading && !errorMsg && filteredPeritagens.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Nenhuma peritagem encontrada.
                    </div>
                )}
            </div>
        </div>
    );
};
