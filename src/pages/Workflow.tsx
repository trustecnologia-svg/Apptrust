import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    CheckCircle2,
    Camera,
    Video,
    ArrowRight,
    Loader2,
    Search,
    CheckCircle,
    ChevronRight,
    PlayCircle,
    Trash2,
    RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../lib/imageUtils';
import { syncPhotosToGallery } from '../lib/photoSync';
import type { SyncPhoto } from '../lib/photoSync';
import './PcpCommon.css';
import './Peritagens.css';

interface PeritagemWorkflow {
    id: string;
    tag: string;
    cliente: string;
    os_interna: string;
    etapa_atual: 'peritagem' | 'montagem' | 'teste' | 'pintura' | 'finalizado';
    databook_pronto: boolean;
    fotos_montagem?: string[];
    fotos_videos_teste?: string[];
    foto_pintura_final?: string;
}

export const WorkflowPage: React.FC = () => {
    const { role } = useAuth();
    const [peritagens, setPeritagens] = useState<PeritagemWorkflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeritagem, setSelectedPeritagem] = useState<PeritagemWorkflow | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, tag, cliente, os_interna, etapa_atual, databook_pronto, fotos_montagem, fotos_videos_teste, foto_pintura_final')
                .neq('etapa_atual', 'finalizado')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (error) {
            console.error('Erro ao buscar peritagens:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'montagem' | 'teste' | 'pintura') => {
        const files = e.target.files;
        if (!files || !selectedPeritagem) return;

        setUploading(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let processedData = '';

                if (file.type.startsWith('image/')) {
                    processedData = await compressImage(file, 1280, 1280, 0.8);
                } else if (file.type.startsWith('video/')) {
                    processedData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => resolve(reader.result as string);
                    });
                }

                newUrls.push(processedData);
            }

            let updateData: any = {};
            if (type === 'montagem') {
                updateData.fotos_montagem = [...(selectedPeritagem.fotos_montagem || []), ...newUrls];
            } else if (type === 'teste') {
                updateData.fotos_videos_teste = [...(selectedPeritagem.fotos_videos_teste || []), ...newUrls];
            } else if (type === 'pintura') {
                updateData.foto_pintura_final = newUrls[0];
            }

            const { error } = await supabase
                .from('peritagens')
                .update(updateData)
                .eq('id', selectedPeritagem.id);

            if (error) throw error;

            const syncItems: SyncPhoto[] = newUrls.map((data, idx) => ({
                data,
                description: `Foto Workflow (${type}) - ${new Date().toLocaleString()}`,
                type: files[idx].type.startsWith('video/') ? 'video' : 'image'
            }));

            syncPhotosToGallery(
                selectedPeritagem.os_interna,
                selectedPeritagem.cliente,
                syncItems
            );

            setSelectedPeritagem({ ...selectedPeritagem, ...updateData });
            fetchPeritagens();
            alert('Arquivos enviados com sucesso!');

        } catch (error: any) {
            console.error('Erro upload:', error);
            alert('Erro ao enviar arquivos: ' + error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDeleteFile = async (idx: number, type: 'montagem' | 'teste' | 'pintura') => {
        if (!selectedPeritagem || !confirm('Deseja realmente excluir este arquivo?')) return;

        try {
            setUploading(true);
            let updateData: any = {};
            if (type === 'montagem') {
                const updated = [...(selectedPeritagem.fotos_montagem || [])];
                updated.splice(idx, 1);
                updateData.fotos_montagem = updated;
            } else if (type === 'teste') {
                const updated = [...(selectedPeritagem.fotos_videos_teste || [])];
                updated.splice(idx, 1);
                updateData.fotos_videos_teste = updated;
            } else if (type === 'pintura') {
                updateData.foto_pintura_final = null;
            }

            const { error } = await supabase
                .from('peritagens')
                .update(updateData)
                .eq('id', selectedPeritagem.id);

            if (error) throw error;

            setSelectedPeritagem({ ...selectedPeritagem, ...updateData });
            fetchPeritagens();
        } catch (error) {
            alert('Erro ao excluir arquivo.');
        } finally {
            setUploading(false);
        }
    };

    const changeStage = async (targetStage: PeritagemWorkflow['etapa_atual']) => {
        if (!selectedPeritagem) return;

        try {
            setUploading(true);
            const updateData: any = { etapa_atual: targetStage };
            if (targetStage === 'finalizado') {
                updateData.databook_pronto = true;
            } else {
                updateData.databook_pronto = false;
            }

            const { error } = await supabase
                .from('peritagens')
                .update(updateData)
                .eq('id', selectedPeritagem.id);

            if (error) throw error;

            alert(`Etapa alterada para: ${targetStage.toUpperCase()}`);
            if (targetStage === 'finalizado') {
                setSelectedPeritagem(null);
            } else {
                setSelectedPeritagem({ ...selectedPeritagem, ...updateData });
            }
            fetchPeritagens();
        } catch (error) {
            alert('Erro ao alterar etapa.');
        } finally {
            setUploading(false);
        }
    };

    const advanceStage = () => {
        if (!selectedPeritagem) return;
        let nextStage: PeritagemWorkflow['etapa_atual'] = 'montagem';
        if (selectedPeritagem.etapa_atual === 'peritagem') nextStage = 'montagem';
        else if (selectedPeritagem.etapa_atual === 'montagem') nextStage = 'teste';
        else if (selectedPeritagem.etapa_atual === 'teste') nextStage = 'pintura';
        else if (selectedPeritagem.etapa_atual === 'pintura') nextStage = 'finalizado';
        changeStage(nextStage);
    };

    const regressStage = () => {
        if (!selectedPeritagem) return;
        let prevStage: PeritagemWorkflow['etapa_atual'] = 'peritagem';
        if (selectedPeritagem.etapa_atual === 'finalizado') prevStage = 'pintura';
        else if (selectedPeritagem.etapa_atual === 'pintura') prevStage = 'teste';
        else if (selectedPeritagem.etapa_atual === 'teste') prevStage = 'montagem';
        else if (selectedPeritagem.etapa_atual === 'montagem') prevStage = 'peritagem';
        changeStage(prevStage);
    };

    const filtered = peritagens.filter(p => {
        const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.os_interna.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (role === 'qualidade') return p.etapa_atual === 'teste';
        if (role === 'montagem') return ['peritagem', 'montagem'].includes(p.etapa_atual);

        return true;
    });

    return (
        <div className="ind-container">
            <header className="ind-page-header">
                <div className="ind-title-group">
                    <h1>Fluxo de Produção</h1>
                    <p>Controle de montagem, testes de qualidade e acabamento</p>
                </div>
            </header>

            {!selectedPeritagem ? (
                <>
                    <div className="search-bar" style={{ marginBottom: '2rem' }}>
                        <div className="search-input-wrapper">
                            <Search size={20} color="#94a3b8" />
                            <input
                                type="text"
                                placeholder="Buscar O.S ou Cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="ind-grid">
                        {loading ? (
                            <div className="loading-state" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center' }}>
                                <Loader2 className="animate-spin" size={40} color="#2563eb" />
                                <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Sincronizando fluxo industrial...</p>
                            </div>
                        ) : (
                            filtered.map(p => (
                                <div key={p.id} className="ind-card" onClick={() => setSelectedPeritagem(p)} style={{ cursor: 'pointer' }}>
                                    <div className="ind-card-tag">
                                        <span className="os-label">{p.os_interna}</span>
                                        <span className={`ind-badge ${p.etapa_atual === 'peritagem' ? 'ind-badge-warning' : (p.etapa_atual === 'finalizado' ? 'ind-badge-success' : 'ind-badge-info')}`}>
                                            {p.etapa_atual.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="ind-card-body">
                                        <h3 className="ind-card-title">{p.cliente}</h3>
                                        <span className="ind-card-subtitle">Ativo Hidráulico • TAG: {p.tag}</span>

                                        <div className="workflow-progress" style={{ marginTop: '2rem' }}>
                                            <div className={`step ${p.etapa_atual === 'peritagem' ? 'active' : 'completed'}`}>1</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'montagem' ? 'active' : (['teste', 'pintura', 'finalizado'].includes(p.etapa_atual) ? 'completed' : '')}`}>2</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'teste' ? 'active' : (['pintura', 'finalizado'].includes(p.etapa_atual) ? 'completed' : '')}`}>3</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'pintura' ? 'active' : (p.etapa_atual === 'finalizado' ? 'completed' : '')}`}>4</div>
                                        </div>
                                    </div>
                                    <div className="ind-card-footer">
                                        <button className="ind-btn ind-btn-secondary" style={{ width: '100%' }}>
                                            Gerenciar Etapa <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="workflow-detail-view slide-in">
                    <button className="ind-btn ind-btn-secondary" onClick={() => setSelectedPeritagem(null)} style={{ marginBottom: '2rem' }}>
                        <ArrowRight style={{ transform: 'rotate(180deg)' }} /> Voltar para Lista
                    </button>

                    <div className="workflow-header-detail" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>{selectedPeritagem.os_interna}</h2>
                            <p style={{ color: '#64748b', fontWeight: 600 }}>{selectedPeritagem.cliente} • TAG: {selectedPeritagem.tag}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className={`ind-badge ind-badge-info`}>{selectedPeritagem.etapa_atual.toUpperCase()}</span>
                            {(role === 'gestor' || role === 'Programador') && (
                                <button className="ind-btn ind-btn-secondary" onClick={regressStage} style={{ padding: '8px 12px' }}>
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="workflow-steps-content">
                        {/* Passo 1: Peritagem */}
                        {role !== 'qualidade' && (
                            <div className={`workflow-step-section ${selectedPeritagem.etapa_atual === 'peritagem' ? 'active' : 'completed'}`}>
                                <div className="step-header">
                                    <div className="step-number">1</div>
                                    <h3>Peritagem Inicial</h3>
                                    {selectedPeritagem.etapa_atual !== 'peritagem' && <CheckCircle color="#27ae60" size={20} />}
                                </div>
                                {selectedPeritagem.etapa_atual === 'peritagem' && (
                                    <div className="step-content">
                                        <div className="step-description">
                                            <p>A peritagem inicial foi concluída e aprovada. Agora você pode iniciar o processo de montagem e recuperação do equipamento.</p>
                                        </div>
                                        <button className="ind-btn ind-btn-primary" onClick={advanceStage} disabled={uploading} style={{ width: '100%' }}>
                                            Iniciar Montagem e Recuperação <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Passo 2: Montagem */}
                        {role !== 'qualidade' && (
                            <div className={`workflow-step-section ${selectedPeritagem.etapa_atual === 'montagem' ? 'active' : ''}`}>
                                <div className="step-header">
                                    <div className="step-number">2</div>
                                    <h3>Montagem e Recuperação</h3>
                                    {['teste', 'pintura', 'finalizado'].includes(selectedPeritagem.etapa_atual) && <CheckCircle color="#27ae60" size={20} />}
                                </div>

                                {selectedPeritagem.etapa_atual === 'montagem' && (
                                    <div className="step-actions">
                                        <p className="action-hint">Adicione fotos do processo de montagem e das peças recuperadas.</p>
                                        <div className="upload-zone">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                id="upload-montagem"
                                                onChange={e => handleFileUpload(e, 'montagem')}
                                                disabled={uploading}
                                            />
                                            <label htmlFor="upload-montagem" className="btn-upload-label">
                                                {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
                                                Adicionar Fotos da Montagem ({selectedPeritagem.fotos_montagem?.length || 0})
                                            </label>
                                        </div>
                                        <div className="preview-grid-mini">
                                            {selectedPeritagem.fotos_montagem?.map((url, idx) => (
                                                <div key={idx} className="preview-thumb-container">
                                                    <img src={url} alt="Montagem" />
                                                    <button className="btn-delete-file" onClick={() => handleDeleteFile(idx, 'montagem')}><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="ind-btn ind-btn-primary"
                                            style={{ width: '100%', marginTop: '2rem' }}
                                            onClick={advanceStage}
                                            disabled={uploading || !selectedPeritagem.fotos_montagem || selectedPeritagem.fotos_montagem.length === 0}
                                        >
                                            Concluir Montagem e Ir para Testes <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Passo 3: Testes */}
                        {role !== 'montagem' && (
                            <div className={`workflow-step-section ${selectedPeritagem.etapa_atual === 'teste' ? 'active' : ''}`}>
                                <div className="step-header">
                                    <div className="step-number">3</div>
                                    <h3>Testes de Qualidade (Pressão/Vazamento)</h3>
                                    {['pintura', 'finalizado'].includes(selectedPeritagem.etapa_atual) && <CheckCircle color="#27ae60" size={20} />}
                                </div>

                                {selectedPeritagem.etapa_atual === 'teste' && (
                                    <div className="step-actions">
                                        <p className="action-hint">Adicione fotos e vídeos comprovando os testes de pressão.</p>
                                        <div className="upload-zone">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,video/*"
                                                id="upload-teste"
                                                onChange={e => handleFileUpload(e, 'teste')}
                                                disabled={uploading}
                                            />
                                            <label htmlFor="upload-teste" className="btn-upload-label">
                                                {uploading ? <Loader2 className="animate-spin" /> : <Video />}
                                                Fotos/Vídeos de Teste ({selectedPeritagem.fotos_videos_teste?.length || 0})
                                            </label>
                                        </div>
                                        <div className="preview-grid-mini">
                                            {selectedPeritagem.fotos_videos_teste?.map((url, idx) => (
                                                <div key={idx} className="preview-thumb-container">
                                                    {url.toLowerCase().endsWith('.mp4') || url.toLowerCase().startsWith('data:video') ? (
                                                        <div className="video-thumb"><PlayCircle size={24} color="white" /></div>
                                                    ) : (
                                                        <img src={url} alt="Teste" />
                                                    )}
                                                    <button className="btn-delete-file" onClick={() => handleDeleteFile(idx, 'teste')}><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            className="ind-btn ind-btn-primary"
                                            style={{ width: '100%', marginTop: '2rem' }}
                                            onClick={advanceStage}
                                            disabled={uploading || !selectedPeritagem.fotos_videos_teste || selectedPeritagem.fotos_videos_teste.length === 0}
                                        >
                                            Concluir Testes e Ir para Pintura <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Passo 4: Pintura */}
                        {role !== 'qualidade' && role !== 'montagem' && (
                            <div className={`workflow-step-section ${selectedPeritagem.etapa_atual === 'pintura' ? 'active' : ''}`}>
                                <div className="step-header">
                                    <div className="step-number">4</div>
                                    <h3>Acabamento e Pintura Final</h3>
                                    {selectedPeritagem.etapa_atual === 'finalizado' && <CheckCircle color="#27ae60" size={20} />}
                                </div>

                                {selectedPeritagem.etapa_atual === 'pintura' && (
                                    <div className="step-actions">
                                        <p className="action-hint">Adicione a foto final do equipamento pronto para entrega.</p>
                                        <div className="upload-zone">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="upload-pintura"
                                                onChange={e => handleFileUpload(e, 'pintura')}
                                                disabled={uploading}
                                            />
                                            <label htmlFor="upload-pintura" className="btn-upload-label">
                                                {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
                                                {selectedPeritagem?.foto_pintura_final ? 'Trocar Foto Final' : 'Foto da Pintura Final'}
                                            </label>
                                        </div>
                                        {selectedPeritagem?.foto_pintura_final && (
                                            <div className="preview-grid-mini">
                                                <div className="preview-thumb-container">
                                                    <img src={selectedPeritagem.foto_pintura_final} alt="Pintura Final" />
                                                    <button className="btn-delete-file" onClick={() => handleDeleteFile(0, 'pintura')}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            className="ind-btn ind-btn-primary"
                                            style={{ width: '100%', marginTop: '2rem', background: '#059669' }}
                                            onClick={advanceStage}
                                            disabled={uploading || !selectedPeritagem?.foto_pintura_final}
                                        >
                                            FINALIZAR PROCESSO E GERAR DATABOOK <CheckCircle2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .workflow-progress {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .step {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    font-weight: 900;
                    flex-shrink: 0;
                }
                .step.active { background: #21408e; box-shadow: 0 0 10px rgba(33, 64, 142, 0.3); }
                .step.completed { background: #059669; }
                .line { flex: 1; height: 3px; background: #f1f5f9; border-radius: 2px; }

                .workflow-step-section {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 2rem;
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                    transition: all 0.3s ease;
                }
                .workflow-step-section.active {
                    opacity: 1;
                    border-color: #21408e;
                    box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.05);
                }
                .workflow-step-section.completed {
                    opacity: 0.8;
                    border-color: #d1fae5;
                    background: #f0fdf4;
                }
                .step-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 1.5rem;
                }
                .step-header h3 {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                }
                .step-number {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: #1e293b;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 1.1rem;
                }
                .upload-zone input { display: none; }
                .btn-upload-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 2rem;
                    border: 2px dashed #e2e8f0;
                    border-radius: 16px;
                    cursor: pointer;
                    color: #64748b;
                    font-weight: 700;
                    transition: all 0.2s;
                }
                .btn-upload-label:hover {
                    border-color: #21408e;
                    background: #f8fafc;
                    color: #21408e;
                }
                .preview-grid-mini {
                    display: flex;
                    gap: 12px;
                    overflow-x: auto;
                    padding: 1rem 0;
                }
                .preview-thumb-container {
                    position: relative;
                    flex-shrink: 0;
                }
                .preview-thumb-container img {
                    width: 100px;
                    height: 100px;
                    object-fit: cover;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .video-thumb {
                    width: 100px;
                    height: 100px;
                    background: #0f172a;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-delete-file {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    z-index: 10;
                }
                .step-description {
                    background: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 12px;
                    border-left: 4px solid #21408e;
                    margin-bottom: 2rem;
                }
                .action-hint {
                    font-size: 0.85rem;
                    color: #64748b;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </div>
    );
};
