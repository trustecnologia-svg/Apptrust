import React, { useState, useEffect } from 'react';
import { Download, Loader2, Search, FileText, Wrench, CheckCircle, Calendar, ShoppingCart } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { UsiminasReportTemplate } from '../components/UsiminasReportTemplate';
import { ReportTemplate } from '../components/ReportTemplate';
import { supabase } from '../lib/supabase';
import { generateTechnicalOpinion } from '../lib/reportUtils';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import './ClientPortal.css';

interface Peritagem {
    id: string;
    numero_peritagem: string;
    cliente: string;
    data_execucao: string;
    status: string;
    os_interna?: string;
    os?: string;
    numero_pedido?: string;
    created_at: string;
    foto_frontal?: string;
    local_equipamento?: string;
    responsavel_tecnico?: string;
}

import { DatabookPDF } from '../components/DatabookPDFTemplate';


export const ClientPeritagens: React.FC = () => {
    const { user } = useAuth();
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [generatingType, setGeneratingType] = useState<'technical' | 'premium' | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [clienteNome, setClienteNome] = useState<string>('');
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'aprovacao' | 'manutencao' | 'finalizado'>('all');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'finalizados') setActiveFilter('finalizado');
    }, [searchParams]);

    useEffect(() => {
        fetchClienteData();
    }, [user]);

    useEffect(() => {
        if (empresaId) {
            fetchPeritagens();
        }
    }, [empresaId]);

    const fetchClienteData = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('empresa_id, empresas(nome)')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (data?.empresa_id) {
                setEmpresaId(data.empresa_id);
                // @ts-ignore
                setClienteNome(data.empresas?.nome || '');
            }
        } catch (err) {
            console.error('Erro ao buscar dados do cliente:', err);
        }
    };

    const fetchPeritagens = async () => {
        if (!empresaId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('peritagens')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (err) {
            console.error('Erro ao buscar peritagens:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (peritagem: any, type: 'technical' | 'premium' = 'technical') => {
        setGeneratingPdf(true);
        setGeneratingType(type);
        setSelectedId(peritagem.id);

        try {
            const { data: analise } = await supabase
                .from('peritagem_analise_tecnica')
                .select('*')
                .eq('peritagem_id', peritagem.id);

            if (type === 'premium') {
                const blob = await pdf(<DatabookPDF peritagem={peritagem} itens={analise || []} />).toBlob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `DATABOOK_${peritagem.os_interna || peritagem.numero_peritagem}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
                return;
            }

            const parecer = generateTechnicalOpinion(peritagem, analise || []);
            const reportData = {
                laudoNum: String(peritagem.numero_peritagem || ''),
                numero_os: String((peritagem.os && (!peritagem.os.startsWith('S/OS-') || peritagem.os.length < 15)) ? peritagem.os : (peritagem.os_interna || 'NÃO INFORMADA')),
                data: new Date().toLocaleDateString('pt-BR'),
                hora: peritagem.data_execucao ? new Date(peritagem.data_execucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
                local_equipamento: String(peritagem.local_equipamento || 'OFICINA'),
                equipamento: String(peritagem.equipamento || 'CILINDRO HIDRÁULICO'),
                tag: String(peritagem.tag || 'N/A'),
                cliente: String(peritagem.cliente || ''),
                nota_fiscal: String(peritagem.nota_fiscal || ''),
                ni: String(peritagem.ni || ''),
                pedido: String(peritagem.numero_pedido || ''),
                camisa_ext: String(peritagem.camisa_ext || ''),
                haste_comp: String(peritagem.haste_comp || ''),
                camisa_int: String(peritagem.camisa_int || ''),
                camisa_comp: String(peritagem.camisa_comp || ''),
                haste_diam: String(peritagem.haste_diam || ''),
                curso: String(peritagem.curso || ''),
                responsavel_tecnico: String(peritagem.responsavel_tecnico || ''),
                logo_trusteng: '/logo.png',
                itens: (analise || [])
                    .filter((i: any) => i.conformidade === 'não conforme')
                    .map((i: any, idx: number) => ({
                        id: idx + 1,
                        desc: String(i.componente || ''),
                        quantidade: String(i.qtd || '1'),
                        avaria: String(i.anomalias || ''),
                        recuperacao: String(i.solucao || ''),
                        conformidade: String(i.conformidade || 'conforme'),
                        foto: i.fotos && i.fotos.length > 0 ? i.fotos[0] : undefined
                    })),
                items: (analise || [])
                    .filter((i: any) => i.tipo !== 'vedação')
                    .map((i: any, idx: number) => ({
                        id: idx + 1,
                        descricao: String(i.componente || ''),
                        qtd: String(i.qtd || '1'),
                        dimensoes: String(i.dimensoes || '-'),
                        conformidade: String(i.conformidade || ''),
                        selecionado: i.conformidade === 'não conforme',
                        anomalias: i.anomalias,
                        solucao: i.solucao,
                        fotos: i.fotos || []
                    })),
                vedacoes: (analise || [])
                    .filter((i: any) => i.tipo === 'vedação' && i.conformidade === 'não conforme')
                    .map((i: any) => ({
                        descricao: String(i.componente || ''),
                        qtd: String(i.qtd || '1'),
                        unidade: 'UN',
                        observacao: String(i.anomalias || ''),
                        conformidade: String(i.conformidade || 'não conforme'),
                        selecionado: true
                    })),
                parecer_tecnico: String(parecer || ''),
                parecerTecnico: String(parecer || ''),
                foto_frontal: peritagem.foto_frontal,
                desenho_conjunto: String(peritagem.desenho_conjunto || '-'),
                tipo_modelo: String(peritagem.tipo_modelo || '-'),
                fabricante: String(peritagem.fabricante || '-'),
                lubrificante: String(peritagem.lubrificante || '-'),
                volume: String(peritagem.volume || '-'),
                acoplamento_polia: String(peritagem.acoplamento_polia || 'NÃO'),
                sistema_lubrificacao: String(peritagem.sistema_lubrificacao || 'NÃO'),
                outros_especificar: String(peritagem.outros_especificar || '-'),
                observacoes_gerais: String(peritagem.observacoes_gerais || '-'),
                area: String(peritagem.area || '-'),
                linha: String(peritagem.linha || '-')
            };

            const isUsiminas = reportData.cliente.toUpperCase().includes('USIMINAS');
            const template = isUsiminas
                ? <UsiminasReportTemplate data={reportData} />
                : <ReportTemplate data={reportData} />;

            const blob = await pdf(template).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = isUsiminas
                ? `Peritagem Usiminas_${reportData.laudoNum}.pdf`
                : `PERITAGEM_${reportData.laudoNum}.pdf`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao baixar PDF:', err);
            alert('Erro ao gerar o arquivo PDF.');
        } finally {
            setGeneratingPdf(false);
            setGeneratingType(null);
        }
    };

    const filteredPeritagens = peritagens.filter((p: Peritagem) => {
        const matchesSearch =
            p.numero_peritagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.os_interna && p.os_interna.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.numero_pedido && p.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeFilter === 'all') return true;

        const s = p.status?.toUpperCase() || '';
        if (activeFilter === 'finalizado') return s.includes('FINALIZADO');
        if (activeFilter === 'manutencao') return s.includes('MANUTENÇÃO') || s.includes('ABERTO') || s.includes('OFICINA');
        if (activeFilter === 'aprovacao') return s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE');

        return true;
    });

    const statsCounts = {
        total: peritagens.length,
        finalizados: peritagens.filter(p => {
            const s = p.status?.toUpperCase() || '';
            return s.includes('FINALIZADO');
        }).length,
        manutencao: peritagens.filter(p => {
            const s = p.status?.toUpperCase() || '';
            return s.includes('MANUTENÇÃO') || s.includes('ABERTO') || s.includes('OFICINA');
        }).length,
        aguardandoAprovacao: peritagens.filter(p => {
            const s = p.status?.toUpperCase() || '';
            return s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE');
        }).length,
    };

    const getStatusClass = (status: string) => {
        const s = (status || "").toUpperCase();
        if (s.includes('FINALIZADO')) return 'status-finalizado';
        if (s.includes('MANUTENÇÃO') || s.includes('ABERTO') || s.includes('OFICINA')) return 'status-manutencao';
        if (s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE')) return 'status-aprovacao';
        return 'status-aguardando';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
                <Loader2 className="animate-spin" size={48} color="#2563eb" />
            </div>
        );
    }

    return (
        <div className="client-portal-container">
            <header className="welcome-hero">
                <h1>Acompanhamento em Tempo Real — {clienteNome || 'Hidraup'}</h1>
                <p>Transparência total no processo de manutenção e reparo dos seus equipamentos.</p>
            </header>

            <div className="stats-grid">
                <div
                    className={`stat-card ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                        <FileText size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{statsCounts.total}</span>
                        <span className="stat-label">Total de Relatórios</span>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeFilter === 'aprovacao' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('aprovacao')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9' }}>
                        <ShoppingCart size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{statsCounts.aguardandoAprovacao}</span>
                        <span className="stat-label">Aprov. Pedido de Compra</span>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeFilter === 'manutencao' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('manutencao')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(214, 158, 46, 0.1)', color: '#d69e2e' }}>
                        <Wrench size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{statsCounts.manutencao}</span>
                        <span className="stat-label">Em Manutenção</span>
                    </div>
                </div>
                <div
                    className={`stat-card ${activeFilter === 'finalizado' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('finalizado')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(56, 161, 105, 0.1)', color: '#38a169' }}>
                        <CheckCircle size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{statsCounts.finalizados}</span>
                        <span className="stat-label">Finalizados</span>
                    </div>
                </div>
            </div>

            <div className="reports-section-header">
                <h2>Seus Relatórios</h2>
                <div className="search-input-wrapper" style={{ width: '300px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Buscar por Pedido ou O.S..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', background: 'transparent' }}
                    />
                </div>
            </div>

            <div className="client-reports-grid">
                {filteredPeritagens.map((p: Peritagem) => (
                    <div key={p.id} className="report-item-card">
                        <div className="card-header">
                            <div>
                                <span className="os-badge">{p.os_interna || 'SEM O.S'}</span>
                                <span className="ref-text">O.S. Cliente: {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'NÃO INFORMADA')}</span>
                            </div>
                            <span className={`report-status-pill ${getStatusClass(p.status)}`}>
                                {(p.status.toUpperCase().includes('AGUARDANDO APROVAÇÃO') ||
                                    p.status.toUpperCase().includes('AGUARDANDO PEDIDO') ||
                                    p.status.toUpperCase().includes('ORÇAMENTO ENVIADO') ||
                                    p.status.toUpperCase().includes('AGUARDANDO CLIENTE'))
                                    ? 'AGUARDANDO PEDIDO DE COMPRA'
                                    : p.status}
                            </span>
                        </div>

                        <div className="card-body">
                            <div className="info-row">
                                <Calendar size={16} />
                                <span>{new Date(p.data_execucao).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="info-row" style={{ marginTop: '4px' }}>
                                <FileText size={16} />
                                <span>Relatório Técnico Disponível</span>
                            </div>
                        </div>

                        <div className="card-actions-dual">
                            <button
                                className="btn-pdf-peritagem"
                                onClick={() => handleDownloadPdf(p, 'technical')}
                                disabled={generatingPdf && selectedId === p.id}
                            >
                                {generatingPdf && selectedId === p.id && generatingType === 'technical' ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <FileText size={14} />
                                )}
                                PDF PERITAGEM
                            </button>
                            <button
                                className="btn-pdf-cliente"
                                onClick={() => handleDownloadPdf(p, 'premium')}
                                disabled={generatingPdf && selectedId === p.id}
                            >
                                {generatingPdf && selectedId === p.id && generatingType === 'premium' ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <Download size={14} />
                                )}
                                {generatingPdf && selectedId === p.id && generatingType === 'premium' ? 'GERANDO...' : 'BAIXAR EM PDF'}
                            </button>
                        </div>
                    </div>
                ))}

                {filteredPeritagens.length === 0 && (
                    <div className="empty-state" style={{ width: '100%', gridColumn: '1/-1' }}>
                        <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                        <h3>Nenhum relatório encontrado</h3>
                        <p>Tente ajustar sua busca ou aguarde novos registros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
