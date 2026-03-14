import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, X, Eye, ArrowLeft, CheckCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Peritagens.css';
import './PcpCommon.css';

interface Peritagem {
    os?: string;
    id: string;
    numero_peritagem: string;
    cliente: string;
    status: string;
    numero_pedido?: string;
    os_interna?: string;
    tag?: string;
    foto_frontal?: string;
    fotos_montagem?: string[];
    fotos_videos_teste?: string[];
    foto_pintura_final?: string;
    etapa_atual?: string;
    responsavel_tecnico?: string;
    created_at?: string;
}

interface AnaliseItem {
    id: string;
    componente: string;
    anomalias: string;
    solucao: string;
    fotos: string[];
    conformidade: string;
}

export const PcpFinalizaProcesso: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Peritagem | null>(null);
    const [analiseItens, setAnaliseItens] = useState<AnaliseItem[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, os, numero_peritagem, cliente, status, numero_pedido, os_interna, tag, foto_frontal, fotos_montagem, fotos_videos_teste, foto_pintura_final, etapa_atual, responsavel_tecnico, created_at')
                .eq('status', 'AGUARDANDO CONFERÊNCIA FINAL')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = async (p: Peritagem) => {
        setSelectedItem(p);
        setLoadingDetail(true);
        try {
            const { data, error } = await supabase
                .from('peritagem_analise_tecnica')
                .select('*')
                .eq('peritagem_id', p.id);

            if (error) throw error;
            const compItems = data ? data.filter(i => i.tipo === 'componente' || !i.tipo) : [];
            setAnaliseItens(compItems);
        } catch (err) {
            console.error('Erro ao buscar análise:', err);
            setAnaliseItens([]);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleFinalize = async (id: string) => {
        if (!user) return;
        if (!confirm('Tem certeza que deseja finalizar este processo? Esta ação é irreversível.')) return;
        try {
            const { error } = await supabase
                .from('peritagens')
                .update({
                    status: 'PROCESSO FINALIZADO',
                    data_finalizacao: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            await supabase.from('peritagem_historico').insert([{
                peritagem_id: id,
                status_antigo: 'AGUARDANDO CONFERÊNCIA FINAL',
                status_novo: 'PROCESSO FINALIZADO',
                alterado_por: user.id
            }]);

            setPeritagens(prev => prev.filter(p => p.id !== id));
            setSelectedItem(null);
            alert('Processo finalizado e enviado para expedição!');
        } catch (err) {
            alert('Erro ao finalizar processo.');
        }
    };

    const filtered = peritagens.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_peritagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.os_interna && p.os_interna.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const hasPhotos = (arr?: string[]) => arr && arr.length > 0;
    const isVideo = (url: string) => url.toLowerCase().endsWith('.mp4') || url.toLowerCase().startsWith('data:video');

    return (
        <div className="peritagens-container">
            <h1 className="page-title">3. Conferência Final</h1>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="pcp-approval-grid">
                {loading ? (
                    <div className="loading-state"><Loader2 className="animate-spin" /></div>
                ) : (
                    filtered.map(p => (
                        <div key={p.id} className="pcp-action-card" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(p)}>
                            <div className="pcp-card-header">
                                <div>
                                    <span className="report-id-badge" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                        {p.os_interna || 'SEM O.S'}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                                        O.S. Cliente: {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'NÃO INFORMADA')}
                                    </span>
                                </div>
                                <span className="status-pill" style={{ padding: '5px 10px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1' }}>
                                    AGUARDANDO PCP
                                </span>
                            </div>

                            <div className="pcp-body">
                                <h3 className="pcp-card-client" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                                    {p.cliente}
                                </h3>

                                <div style={{
                                    padding: '12px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    marginBottom: '1rem',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Pedido Liberado:</span>
                                    <h2 style={{ margin: '4px 0', color: '#2563eb', fontSize: '1.2rem', fontWeight: '800' }}>#{p.numero_pedido || '---'}</h2>
                                </div>

                                {/* Mini indicadores de etapas concluídas */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {p.foto_frontal && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                            <CheckCircle size={12} /> Peritagem
                                        </span>
                                    )}
                                    {hasPhotos(p.fotos_montagem) && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                            <CheckCircle size={12} /> Montagem
                                        </span>
                                    )}
                                    {hasPhotos(p.fotos_videos_teste) && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                            <CheckCircle size={12} /> Testes
                                        </span>
                                    )}
                                    {p.foto_pintura_final && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                            <CheckCircle size={12} /> Pintura
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pcp-footer">
                                <button
                                    className="btn-pcp-action"
                                    onClick={(e) => { e.stopPropagation(); handleOpenDetail(p); }}
                                    style={{ background: '#2563eb' }}
                                >
                                    <Eye size={18} /> Conferir e Validar
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {!loading && filtered.length === 0 && <p style={{ textAlign: 'center', color: '#718096' }}>Nenhum processo aguardando sua conferência.</p>}
            </div>

            {/* Modal de Detalhes Completo */}
            {selectedItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white', width: '100%', maxWidth: '900px', maxHeight: '90vh',
                        borderRadius: '20px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px', background: '#1a2e63', color: 'white',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Eye size={22} />
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>Conferência Final</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                                        {selectedItem.os_interna} • {selectedItem.cliente} • TAG: {selectedItem.tag}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            {loadingDetail ? (
                                <div style={{ textAlign: 'center', padding: '60px' }}>
                                    <Loader2 className="animate-spin" size={32} color="#2563eb" />
                                    <p style={{ color: '#64748b', marginTop: '12px' }}>Carregando dados...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Informações Gerais */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>O.S</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#1e293b' }}>{selectedItem.os_interna || '-'}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Cliente</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#1e293b' }}>{selectedItem.cliente}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TAG</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#1e293b' }}>{selectedItem.tag || '-'}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Pedido</span>
                                            <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#2563eb' }}>#{selectedItem.numero_pedido || '---'}</p>
                                        </div>
                                    </div>

                                    {/* Seção 1: Peritagem */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedItem.foto_frontal ? '#16a34a' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</div>
                                            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Peritagem Inicial</h4>
                                            {selectedItem.foto_frontal && <CheckCircle size={16} color="#16a34a" />}
                                        </div>
                                        {selectedItem.foto_frontal ? (
                                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                <img src={selectedItem.foto_frontal} alt="Peritagem" onClick={() => setPreviewImage(selectedItem.foto_frontal!)} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                                                {analiseItens.map(item => item.fotos?.slice(0, 1).map((foto, idx) => (
                                                    <img key={`${item.id}-${idx}`} src={foto} alt={item.componente} onClick={() => setPreviewImage(foto)} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                                                )))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma foto de peritagem registrada.</p>
                                        )}
                                        {/* Componentes analisados */}
                                        {analiseItens.length > 0 && (
                                            <div style={{ marginTop: '12px' }}>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Componentes analisados:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {analiseItens.map(item => (
                                                        <span key={item.id} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                                                            {item.componente} - {item.conformidade === 'CONFORME' ? '✅' : '⚠️'} {item.solucao}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Seção 2: Montagem */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: hasPhotos(selectedItem.fotos_montagem) ? '#16a34a' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</div>
                                            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Montagem e Recuperação</h4>
                                            {hasPhotos(selectedItem.fotos_montagem) && <CheckCircle size={16} color="#16a34a" />}
                                        </div>
                                        {hasPhotos(selectedItem.fotos_montagem) ? (
                                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                {selectedItem.fotos_montagem!.map((url, idx) => (
                                                    <img key={idx} src={url} alt={`Montagem ${idx + 1}`} onClick={() => setPreviewImage(url)} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma foto de montagem registrada.</p>
                                        )}
                                    </div>

                                    {/* Seção 3: Testes */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: hasPhotos(selectedItem.fotos_videos_teste) ? '#16a34a' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</div>
                                            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Testes de Qualidade</h4>
                                            {hasPhotos(selectedItem.fotos_videos_teste) && <CheckCircle size={16} color="#16a34a" />}
                                        </div>
                                        {hasPhotos(selectedItem.fotos_videos_teste) ? (
                                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                {selectedItem.fotos_videos_teste!.map((url, idx) => (
                                                    isVideo(url) ? (
                                                        <div key={idx} style={{ width: '120px', height: '90px', background: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #e2e8f0', flexShrink: 0 }} onClick={() => setPreviewImage(url)}>
                                                            <PlayCircle size={28} color="white" />
                                                        </div>
                                                    ) : (
                                                        <img key={idx} src={url} alt={`Teste ${idx + 1}`} onClick={() => setPreviewImage(url)} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                                                    )
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma foto/vídeo de teste registrado.</p>
                                        )}
                                    </div>

                                    {/* Seção 4: Pintura */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedItem.foto_pintura_final ? '#16a34a' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>4</div>
                                            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Pintura e Acabamento Final</h4>
                                            {selectedItem.foto_pintura_final && <CheckCircle size={16} color="#16a34a" />}
                                        </div>
                                        {selectedItem.foto_pintura_final ? (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <img src={selectedItem.foto_pintura_final} alt="Pintura Final" onClick={() => setPreviewImage(selectedItem.foto_pintura_final!)} style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                                            </div>
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma foto de pintura registrada.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer com botão */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <button onClick={() => setSelectedItem(null)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeft size={18} /> Voltar
                            </button>
                            <button
                                onClick={() => handleFinalize(selectedItem.id)}
                                style={{ background: '#16a34a', border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.25)', fontSize: '0.95rem' }}
                            >
                                <CheckCircle2 size={20} /> VALIDAR E FINALIZAR PROCESSO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview de imagem/vídeo em tela cheia */}
            {previewImage && (
                <div onClick={() => setPreviewImage(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                }}>
                    <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                    {isVideo(previewImage) ? (
                        <video src={previewImage} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px' }} />
                    ) : (
                        <img src={previewImage} alt="Preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
                    )}
                </div>
            )}
        </div>
    );
};
