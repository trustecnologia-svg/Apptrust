import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { UsiminasReportTemplate } from '../components/UsiminasReportTemplate';
import { ReportTemplate } from '../components/ReportTemplate';
import { supabase } from '../lib/supabase';
import { generateTechnicalOpinion } from '../lib/reportUtils';
import './Relatorios.css';

interface Peritagem {
    id: string;
    numero_peritagem: string;
    cliente: string;
    data_execucao: string;
    status: string;
    // Dados completos para o relatório
    os?: string;
    ordem_servico?: string;
    nota_fiscal?: string;
    equipamento?: string;
    tag?: string;
    tipo_cilindro?: string;
    camisa_int?: string;
    haste_diam?: string;
    curso?: string;
    camisa_comp?: string;
    setor?: string;
    local_equipamento?: string;
    responsavel_tecnico?: string;
    ni?: string;
    numero_pedido?: string;
    camisa_ext?: string;
    haste_comp?: string;
    foto_frontal?: string;
    desenho_conjunto?: string;
    tipo_modelo?: string;
    fabricante?: string;
    lubrificante?: string;
    volume?: string;
    acoplamento_polia?: string;
    sistema_lubrificacao?: string;
    outros_especificar?: string;
    observacoes_gerais?: string;
    area?: string;
    linha?: string;
    itens?: any[];
    os_interna?: string;
}

export const Relatorios: React.FC = () => {
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fullReportData, setFullReportData] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);


    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, os, numero_peritagem, cliente, data_execucao, status, os_interna, area, linha')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (err) {
            console.error('Erro ao buscar peritagens:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateData = async (peritagem: Peritagem) => {
        if (selectedId === peritagem.id && fullReportData) return; // Já carregado

        try {
            // 0. Buscar dados completos da peritagem (caso a lista esteja otimizada)
            const { data: pData, error: pError } = await supabase
                .from('peritagens')
                .select('*')
                .eq('id', peritagem.id)
                .single();

            if (pError) throw pError;
            const fullPeritagem = pData;

            // 1. Buscar Análise Técnica (Checklist para o PDF)
            const { data: analise } = await supabase
                .from('peritagem_analise_tecnica')
                .select('*')
                .eq('peritagem_id', peritagem.id);

            const parecer = generateTechnicalOpinion(fullPeritagem as any, analise || []);

            const reportData = {
                laudoNum: String(fullPeritagem.numero_peritagem || ''),
                numero_os: String((fullPeritagem.os && (!fullPeritagem.os.startsWith('S/OS-') || fullPeritagem.os.length < 15)) ? fullPeritagem.os : (fullPeritagem.os_interna || 'NÃO INFORMADA')),
                data: new Date().toLocaleDateString('pt-BR'),
                hora: fullPeritagem.data_execucao ? new Date(fullPeritagem.data_execucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
                area: String(fullPeritagem.area || '-'),
                linha: String(fullPeritagem.linha || '-'),
                local_equipamento: String(fullPeritagem.local_equipamento || 'OFICINA'),
                equipamento: String(fullPeritagem.equipamento || 'CILINDRO HIDRÁULICO'),
                tag: String(fullPeritagem.tag || 'N/A'),
                material: 'AÇO INDUSTRIAL',
                desenho: 'N/A',
                cliente: String(fullPeritagem.cliente || ''),
                nota_fiscal: String(fullPeritagem.nota_fiscal || ''),
                ni: String(fullPeritagem.ni || ''),
                pedido: String(fullPeritagem.numero_pedido || ''),
                camisa_ext: String(fullPeritagem.camisa_ext || ''),
                haste_comp: String(fullPeritagem.haste_comp || ''),
                camisa_int: String(fullPeritagem.camisa_int || ''),
                camisa_comp: String(fullPeritagem.camisa_comp || ''),
                haste_diam: String(fullPeritagem.haste_diam || ''),
                curso: String(fullPeritagem.curso || ''),
                responsavel_tecnico: String(fullPeritagem.responsavel_tecnico || ''),
                logo_trusteng: '/logo.png',
                itens: (analise || [])
                    .filter((i: any) => i.conformidade === 'não conforme')
                    .map((i: any, idx: number) => ({
                        id: idx + 1,
                        desc: String(i.componente || ''),
                        especificacao: '-',
                        quantidade: String(i.qtd || '1'),
                        avaria: String(i.anomalias || ''),
                        recuperacao: String(i.solucao || ''),
                        conformidade: String(i.conformidade || 'conforme'),
                        diametro_encontrado: i.diametro_encontrado,
                        diametro_ideal: i.diametro_ideal,
                        material_faltante: i.material_faltante,
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
                        diametro_encontrado: i.diametro_encontrado,
                        diametro_ideal: i.diametro_ideal,
                        material_faltante: i.material_faltante,

                        // Novos campos dimensionais
                        diametro_externo_encontrado: i.diametro_externo_encontrado,
                        diametro_externo_especificado: i.diametro_externo_especificado,
                        desvio_externo: i.desvio_externo,
                        diametro_interno_encontrado: i.diametro_interno_encontrado,
                        diametro_interno_especificado: i.diametro_interno_especificado,
                        desvio_interno: i.desvio_interno,
                        comprimento_encontrado: i.comprimento_encontrado,
                        comprimento_especificado: i.comprimento_especificado,
                        desvio_comprimento: i.desvio_comprimento,

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
                foto_frontal: fullPeritagem.foto_frontal,
                desenho_conjunto: String(fullPeritagem.desenho_conjunto || '-'),
                tipo_modelo: String(fullPeritagem.tipo_modelo || '-'),
                fabricante: String(fullPeritagem.fabricante || '-'),
                lubrificante: String(fullPeritagem.lubrificante || '-'),
                volume: String(fullPeritagem.volume || '-'),
                acoplamento_polia: String(fullPeritagem.acoplamento_polia || 'NÃO'),
                sistema_lubrificacao: String(fullPeritagem.sistema_lubrificacao || 'NÃO'),
                outros_especificar: String(fullPeritagem.outros_especificar || '-'),
                observacoes_gerais: String(fullPeritagem.observacoes_gerais || '-')
            };

            setFullReportData(reportData);
            return reportData;
        } catch (err) {
            console.error('Erro ao preparar dados do relatório:', err);
            alert('Erro ao buscar dados da peritagem. Verifique sua conexão ou contate o suporte.');
            return null;
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleDownloadPdf = async (peritagem: Peritagem, type: 'peritagem' | 'laudo') => {
        setGeneratingPdf(true);
        setSelectedId(peritagem.id);

        try {
            const data = await handleGenerateData(peritagem);
            if (!data) return;

            const isUsiminas = data.cliente && data.cliente.toUpperCase().includes('USIMINAS');
            const template = isUsiminas
                ? <UsiminasReportTemplate data={data} />
                : <ReportTemplate data={data} />;

            const blob = await pdf(template).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            let fileName = '';
            // Se for Usiminas, usa prefixo específico. Caso contrário, padrão.
            // O usuário pediu "Peritagem Usiminas" para o relatório Usiminas.
            if (isUsiminas) {
                fileName = `Peritagem Usiminas_${data.laudoNum}.pdf`;
            } else {
                fileName = type === 'peritagem'
                    ? `PERITAGEM_${data.laudoNum}.pdf`
                    : `LAUDO_${data.laudoNum}.pdf`;
            }

            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao baixar PDF:', err);
            alert('Erro ao gerar o arquivo PDF. Tente novamente.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const filteredPeritagens = peritagens.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_peritagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.os_interna && p.os_interna.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="ind-container">
            <div className="ind-page-header">
                <div className="ind-title-group">
                    <h1>Central de Relatórios</h1>
                    <p>Emissão de laudos de peritagem e documentos técnicos em PDF</p>
                </div>
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Filtrar por ativação, cliente ou número de OS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="ind-grid">
                {loading ? (
                    <div className="loading-state" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={40} color="#3182ce" />
                        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Localizando arquivos técnicos...</p>
                    </div>
                ) : (
                    filteredPeritagens.map(p => {
                        const getStatusColorClass = (status: string) => {
                            const s = status.toUpperCase();
                            if (s.includes('FINALIZADO')) return 'status-finalizado';
                            if (s.includes('MANUTENÇÃO') || s.includes('ABERTO') || s.includes('OFICINA')) return 'status-manutencao';
                            if (s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE')) return 'status-aprovacao';
                            return 'status-aguardando';
                        };

                        const displayStatus = (status: string) => {
                            const s = status.toUpperCase();
                            if (s.includes('AGUARDANDO APROVAÇÃO') || s.includes('AGUARDANDO PEDIDO') || s.includes('ORÇAMENTO ENVIADO') || s.includes('AGUARDANDO CLIENTE')) {
                                return 'AGUARDANDO PEDIDO';
                            }
                            return status;
                        };

                        return (
                            <div key={p.id} className="ind-card">
                                <div className="ind-card-tag">
                                    <span className="os-label">ID: {p.os_interna || 'P-TAG-00'}</span>
                                    <span className={`ind-badge ${getStatusColorClass(p.status)}`} style={{fontSize: '0.6rem'}}>
                                        {displayStatus(p.status)}
                                    </span>
                                </div>

                                <div className="ind-card-body">
                                    <div className="client-header">
                                        <h3 className="ind-card-title">{p.cliente}</h3>
                                        <span className="ind-card-subtitle">Peritagem realizada em {new Date(p.data_execucao).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    
                                    <div className="ind-data-mini-grid" style={{ marginBottom: 0 }}>
                                        <div className="ind-data-item">
                                            <span className="ind-data-label">Área / Linha</span>
                                            <span className="ind-data-value">{p.area || '-'}/{p.linha || '-'}</span>
                                        </div>
                                        <div className="ind-data-item">
                                            <span className="ind-data-label">O.S. Cliente</span>
                                            <span className="ind-data-value" style={{fontFamily: 'monospace'}}>
                                                {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'N/A')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ind-card-footer">
                                    <button
                                        className="ind-btn ind-btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => handleDownloadPdf(p, 'peritagem')}
                                        disabled={generatingPdf && selectedId === p.id}
                                    >
                                        {generatingPdf && selectedId === p.id ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                        <span>Peritagem</span>
                                    </button>

                                    <button
                                        className="ind-btn ind-btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={() => handleDownloadPdf(p, 'laudo')}
                                        disabled={generatingPdf && selectedId === p.id}
                                    >
                                        {generatingPdf && selectedId === p.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                        <span>{generatingPdf && selectedId === p.id ? 'Gerando...' : 'Laudo Final'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
                {!loading && filteredPeritagens.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#718096', gridColumn: '1 / -1', padding: '3rem' }}>Nenhum laudo disponível para os filtros aplicados.</div>
                )}
            </div>


        </div>
    );
};
