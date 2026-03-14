import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Clock,
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
                    // Para vídeo, convertemos para base64 diretamente (limite 50MB no Supabase/Profiles geralmente)
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
                updateData.foto_pintura_final = newUrls[0]; // Só uma foto final
            }

            const { error } = await supabase
                .from('peritagens')
                .update(updateData)
                .eq('id', selectedPeritagem.id);

            if (error) throw error;

            // Sincronizar com o Arquivo Geral
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

            // Atualiza estado local
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

        // Qualidade só vê peritagens na etapa 'teste'
        if (role === 'qualidade') return p.etapa_atual === 'teste';
        // Montagem só vê peritagens nas etapas 'peritagem' ou 'montagem'
        if (role === 'montagem') return ['peritagem', 'montagem'].includes(p.etapa_atual);

        return true;
    });

    return (
        <div className="peritagens-container">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Fluxo de QR code</h1>
                    <p className="subtitle">Gerencie as etapas de montagem, testes e pintura</p>
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

                    <div className="pcp-approval-grid">
                        {loading ? (
                            <div className="loading-state"><Loader2 className="animate-spin" /></div>
                        ) : (
                            filtered.map(p => (
                                <div key={p.id} className="pcp-action-card workflow-card" onClick={() => setSelectedPeritagem(p)}>
                                    <div className="pcp-card-header">
                                        <span className="os-badge">{p.os_interna}</span>
                                        <div className={`stage-pill ${p.etapa_atual}`}>
                                            {p.etapa_atual.toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="pcp-body">
                                        <h3 className="client-name">{p.cliente}</h3>
                                        <p className="tag-info">TAG: {p.tag}</p>

                                        <div className="workflow-progress">
                                            <div className={`step ${p.etapa_atual === 'peritagem' ? 'active' : 'completed'}`}>1</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'montagem' ? 'active' : (['teste', 'pintura', 'finalizado'].includes(p.etapa_atual) ? 'completed' : '')}`}>2</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'teste' ? 'active' : (['pintura', 'finalizado'].includes(p.etapa_atual) ? 'completed' : '')}`}>3</div>
                                            <div className="line"></div>
                                            <div className={`step ${p.etapa_atual === 'pintura' ? 'active' : (p.etapa_atual === 'finalizado' ? 'completed' : '')}`}>4</div>
                                        </div>
                                    </div>
                                    <div className="pcp-footer">
                                        <button className="btn-manage-workflow">
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
                    <button className="btn-back-workflow" onClick={() => setSelectedPeritagem(null)}>
                        <ArrowRight style={{ transform: 'rotate(180deg)' }} /> Voltar para Lista
                    </button>

                    <div className="workflow-header-detail">
                        <div className="peritagem-info-main">
                            <h2>{selectedPeritagem.os_interna}</h2>
                            <p>{selectedPeritagem.cliente} • TAG: {selectedPeritagem.tag}</p>
                        </div>
                        <div className="current-stage-display">
                            <Clock size={20} />
                            <span>Etapa Atual: <strong>{selectedPeritagem.etapa_atual.toUpperCase()}</strong></span>
                            {role === 'gestor' && (
                                <button className="btn-regress" onClick={regressStage} title="Voltar para Etapa Anterior" style={{ marginLeft: '15px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <RotateCcw size={14} /> Voltar Etapa
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="workflow-steps-content">
                        {/* Passo 1: Peritagem (Início do Fluxo de Produção) */}
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
                                        <button className="btn-next-stage" onClick={advanceStage} disabled={uploading}>
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
                                            className="btn-next-stage"
                                            onClick={advanceStage}
                                            disabled={uploading || !selectedPeritagem.fotos_montagem || selectedPeritagem.fotos_montagem.length === 0}
                                            title={(!selectedPeritagem.fotos_montagem || selectedPeritagem.fotos_montagem.length === 0) ? 'Adicione pelo menos uma foto para prosseguir' : ''}
                                        >
                                            Concluir Montagem e Ir para Testes <ArrowRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Passo 3: Testes - visível para qualidade, gestor, pcp */}
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
                                            className="btn-next-stage"
                                            onClick={advanceStage}
                                            disabled={uploading || !selectedPeritagem.fotos_videos_teste || selectedPeritagem.fotos_videos_teste.length === 0}
                                            title={(!selectedPeritagem.fotos_videos_teste || selectedPeritagem.fotos_videos_teste.length === 0) ? 'Adicione pelo menos uma foto ou vídeo para prosseguir' : ''}
                                        >
                                            Concluir Testes e Ir para Pintura <ArrowRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Passo 4: Pintura - não visível para qualidade nem montagem */}
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
                                                {selectedPeritagem.foto_pintura_final ? 'Trocar Foto Final' : 'Foto da Pintura Final'}
                                            </label>
                                        </div>
                                        {selectedPeritagem.foto_pintura_final && (
                                            <div className="preview-grid-mini">
                                                <div className="preview-thumb-container">
                                                    <img src={selectedPeritagem.foto_pintura_final} alt="Pintura Final" />
                                                    <button className="btn-delete-file" onClick={() => handleDeleteFile(0, 'pintura')}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        )}
                                        <button className="btn-finalize-workflow" onClick={advanceStage} disabled={uploading || !selectedPeritagem.foto_pintura_final}>
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
                .workflow-card {
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid #e2e8f0;
                }
                .workflow-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .os-badge {
                    background: #f1f5f9;
                    color: #475569;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                .stage-pill {
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 0.65rem;
                    font-weight: 800;
                    background: #e0f2fe;
                    color: #0369a1;
                }
                .stage-pill.peritagem { background: #fef3c7; color: #92400e; }
                .stage-pill.montagem { background: #dcfce7; color: #166534; }
                .stage-pill.teste { background: #fee2e2; color: #991b1b; }
                .stage-pill.pintura { background: #f3e8ff; color: #6b21a8; }

                .workflow-progress {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 1rem;
                }
                .step {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6rem;
                    font-weight: bold;
                }
                .step.active { background: #2563eb; }
                .step.completed { background: #22c55e; }
                .line { flex: 1; height: 2px; background: #e2e8f0; }

                .workflow-step-section {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    opacity: 0.6;
                }
                .workflow-step-section.active {
                    opacity: 1;
                    border: 2px solid #2563eb;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .step-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 1rem;
                }
                .step-number {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #1e293b;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                }
                .upload-zone { margin: 1.5rem 0; }
                .upload-zone input { display: none; }
                .btn-upload-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 1rem;
                    border: 2px dashed #cbd5e1;
                    border-radius: 8px;
                    cursor: pointer;
                    color: #64748b;
                    font-weight: 600;
                }
                .preview-grid-mini {
                    display: flex;
                    gap: 10px;
                    overflow-x: auto;
                    padding-bottom: 1rem;
                }
                .preview-grid-mini img {
                    width: 80px;
                    height: 80px;
                    object-fit: cover;
                    border-radius: 6px;
                }
                .video-thumb {
                    width: 80px;
                    height: 80px;
                    background: #000;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .preview-thumb-container {
                    position: relative;
                }
                .btn-delete-file {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .btn-next-stage, .btn-finalize-workflow {
                    width: 100%;
                    margin-top: 2rem;
                    padding: 1rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-next-stage {
                    background: #2563eb;
                    color: white;
                }
                .btn-next-stage:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }
                .btn-next-stage:disabled {
                    background: #e2e8f0;
                    color: #94a3b8;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-finalize-workflow {
                    background: #059669;
                    color: white;
                }
                .btn-finalize-workflow:hover {
                    background: #047857;
                    transform: translateY(-2px);
                }
                .btn-finalize-workflow:disabled {
                    background: #e2e8f0;
                    color: #94a3b8;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-back-workflow {
                    background: none;
                    border: none;
                    color: #64748b;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-bottom: 2rem;
                    cursor: pointer;
                }
                .step-description {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 8px;
                    border-left: 4px solid #2563eb;
                    margin-bottom: 1.5rem;
                }
                .step-description p {
                    font-size: 0.9rem;
                    color: #475569;
                    line-height: 1.5;
                }
                .action-hint {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin-bottom: 1rem;
                }
            `}</style>
        </div>
    );
};
