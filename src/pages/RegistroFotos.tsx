import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Folder, Image as ImageIcon, Plus, ArrowLeft, Trash2, X, Save, Video, Search } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { useAuth } from '../contexts/AuthContext';
import './RegistroFotos.css';

interface PhotoFolder {
    id: string;
    name: string;
    cliente?: string;
    os_interna?: string;
    os_externa?: string;
    data_entrada?: string;
    data_saida?: string;
    pedido_compra?: string;
    responsavel?: string;
    criado_por?: string;
    created_at: string;
}

interface PhotoItem {
    id: string;
    photo_data: string;
    description: string;
    media_type: 'image' | 'video';
    created_at: string;
}

export const RegistroFotos: React.FC = () => {
    const { role, user } = useAuth();
    const [folders, setFolders] = useState<PhotoFolder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<PhotoFolder | null>(null);
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [pendingVideos, setPendingVideos] = useState<File[]>([]);

    // Form inputs state
    const [formData, setFormData] = useState({
        cliente: '',
        os_interna: '',
        os_externa: '',
        data_entrada: '',
        data_saida: '',
        pedido_compra: '',
        responsavel: ''
    });


    const modalFileInputRef = useRef<HTMLInputElement>(null);
    const modalVideoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (currentFolder) {
            fetchPhotos(currentFolder.id);
        } else {
            setPhotos([]);
        }
    }, [currentFolder]);

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('photo_folders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFolders(data || []);
        } catch (error) {
            console.error('Error fetching folders:', error);
            alert('Erro ao carregar pastas.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPhotos = async (folderId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('photo_items')
                .select('*')
                .eq('folder_id', folderId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Error fetching photos:', error);
            alert('Erro ao carregar fotos.');
        } finally {
            setLoading(false);
        }
    };

    const handlePendingFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handlePendingVideosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const videos = Array.from(e.target.files!);
            // Validate size (e.g., max 50MB)
            const validVideos = videos.filter(v => {
                if (v.size > 50 * 1024 * 1024) {
                    alert(`Vídeo ${v.name} é muito grande (max 50MB).`);
                    return false;
                }
                return true;
            });
            setPendingVideos(prev => [...prev, ...validVideos]);
        }
    };

    const removePendingVideo = (index: number) => {
        setPendingVideos(prev => prev.filter((_, i) => i !== index));
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        // Validation: Ensure minimal data is present if needed. Let's make Cliente mandatory.
        if (!formData.cliente) {
            alert('O campo Cliente é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            const folderName = `${formData.cliente} - ${formData.os_interna || 'S/OS'}`;

            // 1. Create Folder
            const { data: folderData, error } = await supabase
                .from('photo_folders')
                .insert([{
                    name: folderName,
                    cliente: formData.cliente,
                    os_interna: formData.os_interna,
                    os_externa: formData.os_externa,
                    data_entrada: formData.data_entrada || null,
                    data_saida: formData.data_saida || null,
                    pedido_compra: formData.pedido_compra,
                    responsavel: formData.responsavel,
                    criado_por: user?.id
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Upload Pending Photos
            if (pendingFiles.length > 0 && folderData) {
                const newPhotos = [];
                for (const file of pendingFiles) {
                    const compressed = await compressImage(file, 1280, 1280, 0.8);
                    const { data: photoData, error: photoError } = await supabase
                        .from('photo_items')
                        .insert([{
                            folder_id: folderData.id,
                            photo_data: compressed,
                            description: file.name
                        }])
                        .select()
                        .single();

                    if (photoError) console.error('Erro ao salvar foto:', file.name, photoError);
                    else newPhotos.push(photoData);
                }
            }

            // 3. Upload Pending Videos
            if (pendingVideos.length > 0 && folderData) {
                for (const file of pendingVideos) {
                    try {
                        const base64Video = await fileToBase64(file);
                        const { error: videoError } = await supabase
                            .from('photo_items')
                            .insert([{
                                folder_id: folderData.id,
                                photo_data: base64Video,
                                description: file.name,
                                media_type: 'video'
                            }]);

                        if (videoError) console.error('Erro ao salvar vídeo:', file.name, videoError);
                    } catch (err) {
                        console.error('Erro ao processar vídeo:', file.name, err);
                    }
                }
            }

            setFolders([folderData, ...folders]);
            setFormData({
                cliente: '',
                os_interna: '',
                os_externa: '',
                data_entrada: '',
                data_saida: '',
                pedido_compra: '',
                responsavel: ''
            });
            setPendingFiles([]);
            setPendingVideos([]);
            setIsCreateModalOpen(false);

            // Auto open new folder
            setCurrentFolder(folderData);

        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Erro ao criar registro.');
        } finally {
            setLoading(false);
        }
    };

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean,
        type: 'folder' | 'photo',
        id: string | null,
        details?: { title: string, subtitle: string }
    }>({
        isOpen: false,
        type: 'folder',
        id: null
    });

    const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (role !== 'gestor') {
            alert('Apenas Gestores podem excluir registros.');
            return;
        }

        const folder = folders.find(f => f.id === folderId);

        setDeleteConfirmation({
            isOpen: true,
            type: 'folder',
            id: folderId,
            details: folder ? {
                title: folder.os_interna || 'S/OS',
                subtitle: folder.cliente || 'Sem Cliente'
            } : undefined
        });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!id) return;

        setLoading(true); // Show loading during delete
        try {
            if (type === 'folder') {
                // 1. Delete all photos in this folder first
                const { error: photosError } = await supabase
                    .from('photo_items')
                    .delete()
                    .eq('folder_id', id);

                if (photosError) throw photosError;

                // 2. Delete the folder
                const { error } = await supabase
                    .from('photo_folders')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setFolders(folders.filter(f => f.id !== id));
                // If we deleted the currently open folder, go back to list
                if (currentFolder?.id === id) setCurrentFolder(null);

            } else if (type === 'photo') {
                const { error } = await supabase
                    .from('photo_items')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setPhotos(photos.filter(p => p.id !== id));
                if (selectedPhoto?.id === id) setSelectedPhoto(null);
            }

            setDeleteConfirmation({ isOpen: false, type: 'folder', id: null });
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Erro ao excluir. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePhoto = (photoId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (role !== 'gestor') {
            alert('Apenas Gestores podem excluir fotos.');
            return;
        }

        setDeleteConfirmation({
            isOpen: true,
            type: 'photo',
            id: photoId
        });
    };



    const canDelete = role === 'gestor';

    const filteredFolders = folders.filter(folder => {
        const query = searchQuery.toLowerCase();
        return (
            (folder.cliente?.toLowerCase() || '').includes(query) ||
            (folder.os_interna?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="registro-fotos-container">
            <header className="page-header">
                {currentFolder ? (
                    <div className="header-navigation">
                        <button className="back-btn" onClick={() => setCurrentFolder(null)}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1>{currentFolder.os_interna || 'S/OS'}</h1>
                            <p className="subtitle">{currentFolder.cliente}</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h1>Armazenamento de Fotos e Vídeos</h1>
                        <p className="subtitle">Organize e armazene fotos e vídeos de equipamentos</p>
                    </div>
                )}

                <div className="header-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {!currentFolder && (
                        <>
                            <div className="search-container" style={{ position: 'relative', minWidth: '280px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente ou OS..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 40px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        fontSize: '0.9rem',
                                        color: '#1a2e63',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                />
                            </div>
                            <button
                                className="btn-primary"
                                onClick={() => setIsCreateModalOpen(true)}
                                disabled={loading}
                            >
                                <Plus size={20} />
                                <span>Novo Arquivo</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="content-area">
                {loading && <div className="loading-overlay">Carregando...</div>}

                {!currentFolder ? (
                    // Folder View
                    <div className="folders-grid">
                        {filteredFolders.length === 0 && !loading && (
                            <div className="empty-state">
                                <Search size={48} opacity={0.3} style={{ marginBottom: '16px' }} />
                                <p>{searchQuery ? 'Nenhum resultado para sua busca.' : 'Nenhum arquivo encontrado.'}</p>
                            </div>
                        )}
                        {filteredFolders.map(folder => (
                            <div key={folder.id} className="folder-card" onClick={() => setCurrentFolder(folder)}>
                                <div className="folder-icon">
                                    <Folder size={40} className="icon-main" />
                                </div>
                                <div className="folder-info">
                                    <h3>{folder.os_interna || 'S/OS'}</h3>
                                    <p style={{ margin: '4px 0 0', color: '#666', fontWeight: 500 }}>{folder.cliente}</p>
                                    <span className="date">Entrada: {folder.data_entrada ? new Date(folder.data_entrada).toLocaleDateString() : '-'}</span>
                                </div>
                                {canDelete && (
                                    <button
                                        className="folder-delete-btn"
                                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                                        title="Excluir Pasta"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    // Photos View
                    <div className="photos-view-container">
                        {/* Folder Details Summary */}
                        <div className="folder-details-card">
                            <div className="detail-item">
                                <label>Cliente</label>
                                <span>{currentFolder.cliente}</span>
                            </div>
                            <div className="detail-item">
                                <label>OS Interna</label>
                                <span>{currentFolder.os_interna || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>OS Externa</label>
                                <span>{currentFolder.os_externa || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Data Entrada</label>
                                <span>{currentFolder.data_entrada ? new Date(currentFolder.data_entrada).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Data Saída</label>
                                <span>{currentFolder.data_saida ? new Date(currentFolder.data_saida).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Pedido Compra</label>
                                <span>{currentFolder.pedido_compra || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Responsável</label>
                                <span>{currentFolder.responsavel || '-'}</span>
                            </div>
                        </div>

                        <div className="photos-grid">
                            {photos.length === 0 && !loading && (
                                <div className="empty-state">
                                    <ImageIcon size={48} opacity={0.3} />
                                    <p>Nenhuma foto neste arquivo.</p>
                                </div>
                            )}
                            {photos.map(photo => (
                                <div key={photo.id} className="photo-card" onClick={() => setSelectedPhoto(photo)}>
                                    {photo.media_type === 'video' ? (
                                        <div className="video-thumbnail-container" style={{ position: 'relative', width: '100%', height: '150px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <video src={photo.photo_data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{ position: 'absolute', zIndex: 5 }}>
                                                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px' }}>
                                                    <Video size={24} color="white" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img src={photo.photo_data} alt={photo.description || 'Foto'} loading="lazy" />
                                    )}
                                    {canDelete && (
                                        <div className="photo-overlay">
                                            <button
                                                className="photo-delete-btn"
                                                onClick={(e) => handleDeletePhoto(photo.id, e)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Folder Modal */}
            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <h3>Novo Arquivo de Fotos</h3>
                            <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <div className="modal-body form-grid">
                                <div className="form-group full-width">
                                    <label>Cliente *</label>
                                    <input
                                        type="text"
                                        value={formData.cliente}
                                        onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                                        required
                                        placeholder="Nome do Cliente"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>OS Interna</label>
                                    <input
                                        type="text"
                                        value={formData.os_interna}
                                        onChange={e => setFormData({ ...formData, os_interna: e.target.value })}
                                        placeholder="OS-1234"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>OS Externa</label>
                                    <input
                                        type="text"
                                        value={formData.os_externa}
                                        onChange={e => setFormData({ ...formData, os_externa: e.target.value })}
                                        placeholder="Ex: 9999"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data de Entrada</label>
                                    <input
                                        type="date"
                                        value={formData.data_entrada}
                                        onChange={e => setFormData({ ...formData, data_entrada: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data de Saída</label>
                                    <input
                                        type="date"
                                        value={formData.data_saida}
                                        onChange={e => setFormData({ ...formData, data_saida: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Pedido de Compra</label>
                                    <input
                                        type="text"
                                        value={formData.pedido_compra}
                                        onChange={e => setFormData({ ...formData, pedido_compra: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Responsável</label>
                                    <input
                                        type="text"
                                        value={formData.responsavel}
                                        onChange={e => setFormData({ ...formData, responsavel: e.target.value })}
                                    />
                                </div>

                                {/* Photo Selection in Modal */}
                                <div className="form-group full-width" style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                    <label style={{ marginBottom: '8px', display: 'block' }}>Fotos Iniciais (Opcional)</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        ref={modalFileInputRef}
                                        onChange={handlePendingFilesChange}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        onClick={() => modalFileInputRef.current?.click()}
                                    >
                                        <Plus size={18} />
                                        Selecionar Fotos ({pendingFiles.length})
                                    </button>

                                    {pendingFiles.length > 0 && (
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
                                            {pendingFiles.map((file, idx) => (
                                                <div key={idx} style={{ position: 'relative', minWidth: '60px', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                    <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePendingFile(idx)}
                                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Video Selection in Modal */}
                                <div className="form-group full-width" style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                    <label style={{ marginBottom: '8px', display: 'block' }}>Vídeos (Opcional - Max 50MB)</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="video/*"
                                        ref={modalVideoInputRef}
                                        onChange={handlePendingVideosChange}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        onClick={() => modalVideoInputRef.current?.click()}
                                    >
                                        <Video size={18} />
                                        Selecionar Vídeos ({pendingVideos.length})
                                    </button>

                                    {pendingVideos.length > 0 && (
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
                                            {pendingVideos.map((file, idx) => (
                                                <div key={idx} style={{ position: 'relative', minWidth: '60px', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd', background: '#000' }}>
                                                    <video src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePendingVideo(idx)}
                                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer', padding: '2px', zIndex: 10 }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={loading}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <div className="loader-mini" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', marginRight: '8px' }}></div>
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            <span>Salvar Tudo</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Photo Viewer Modal */}
            {selectedPhoto && (
                <div className="photo-modal-overlay" onClick={() => setSelectedPhoto(null)}>
                    <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-photo-btn" onClick={() => setSelectedPhoto(null)}>
                            <X size={24} />
                        </button>
                        {selectedPhoto.media_type === 'video' ? (
                            <video src={selectedPhoto.photo_data} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh' }} />
                        ) : (
                            <img src={selectedPhoto.photo_data} alt={selectedPhoto.description} />
                        )}
                        <div className="photo-info-bar">
                            <span>{selectedPhoto.description}</span>
                            <span>{new Date(selectedPhoto.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px', color: '#e74c3c' }}>
                            <div style={{ width: '60px', height: '60px', background: '#fdf0ed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2c3e50', marginBottom: '8px' }}>
                                {deleteConfirmation.type === 'folder' ? 'Excluir Arquivo?' : 'Excluir Foto?'}
                            </h3>
                        </div>

                        {/* Folder Details Warning */}
                        {deleteConfirmation.type === 'folder' && deleteConfirmation.details && (
                            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #eee', textAlign: 'left' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '12px', textTransform: 'uppercase', color: '#e74c3c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Trash2 size={12} />
                                    Você está apagando:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px', borderLeft: '3px solid #e74c3c' }}>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#2c3e50', fontSize: '16px' }}>OS: {deleteConfirmation.details.title}</p>
                                    <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>Cliente: {deleteConfirmation.details.subtitle}</p>
                                </div>
                            </div>
                        )}

                        <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>
                            {deleteConfirmation.type === 'folder'
                                ? 'Tem certeza absoluta? Todas as fotos vinculadas a este registro serão APAGADAS PERMANENTEMENTE e não poderão ser recuperadas.'
                                : 'Tem certeza que deseja excluir esta foto? Ela será APAGADA PERMANENTEMENTE do banco de dados e não poderá ser recuperada.'
                            }
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button
                                className="btn-secondary"
                                style={{ justifyContent: 'center' }}
                                onClick={() => setDeleteConfirmation({ isOpen: false, type: 'folder', id: null })}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-primary"
                                style={{ background: '#e74c3c', justifyContent: 'center' }}
                                onClick={confirmDelete}
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
