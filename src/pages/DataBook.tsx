import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft,
    Book,
    Download,
    FileText,
    Plus,
    Search,
    Trash2,
    Upload,
    Video,
    X,
} from 'lucide-react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { useAuth } from '../contexts/AuthContext';
import { s, ImageCard } from '../components/DatabookPDFTemplate';
import './DataBookPremium.css';

interface DataBookFolder {
    id: string;
    name: string;
    cliente?: string;
    os_interna?: string;
    os_externa?: string;
    data_entrega?: string;
    pedido_compra?: string;
    nota_fiscal?: string;
    responsavel?: string;
    criado_por?: string;
    empresa_id?: string;
    created_at: string;
    is_peritagem?: boolean;
    peritagem_id?: string;
}

interface DataBookItem {
    id: string;
    file_data: string;
    description: string;
    file_type: string;
    created_at: string;
    processo?: string;
}

const DataBookPremiumPDF = ({ folder, items }: { folder: DataBookFolder, items: DataBookItem[] }) => (
    <Document>
        <Page size="A4" style={s.page} wrap>
            {/* Header fixo */}
            <View style={s.header} fixed>
                <View>
                    <Text style={s.headerTitle}>Databook Técnico</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.headerSubtitle}>OS: {folder.os_interna || '-'}</Text>
                    <Text style={s.headerSubtitle}>{folder.cliente?.toUpperCase()}</Text>
                </View>
            </View>

            {/* Body */}
            <View style={s.body}>
                {/* Dados Gerais */}
                <View style={s.dataBox}>
                    <View style={s.dataRow}>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Cliente</Text>
                            <Text style={s.dataValue}>{folder.cliente}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>O.S Interna</Text>
                            <Text style={s.dataValue}>{folder.os_interna || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>O.S Externa</Text>
                            <Text style={s.dataValue}>{folder.os_externa || '-'}</Text>
                        </View>
                    </View>
                    <View style={s.dataRow}>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Pedido</Text>
                            <Text style={s.dataValue}>{folder.pedido_compra || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>NF</Text>
                            <Text style={s.dataValue}>{folder.nota_fiscal || '-'}</Text>
                        </View>
                        <View style={s.dataField}>
                            <Text style={s.dataLabel}>Data Entrega</Text>
                            <Text style={s.dataValue}>{folder.data_entrega ? new Date(folder.data_entrega).toLocaleDateString('pt-BR') : '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Processos */}
                {['Peritagem', 'Montagem', 'Pintura', 'Liberação', 'Informações Complementares'].map((proc, index) => {
                    const procItems = items.filter(i => (i.processo === proc || (!i.processo && proc === 'Peritagem')) && (i.file_type === 'image' || (i.file_type === 'other' && !i.file_data.includes('video'))));
                    if (procItems.length === 0) return null;

                    return (
                        <View key={proc} style={s.sectionContainer} break={index > 0}>
                            <View style={s.sectionHeader}>
                                <Text style={s.sectionNumber}>{index + 1}</Text>
                                <Text style={s.sectionTitle}>{proc}</Text>
                            </View>
                            <View style={s.imageGrid}>
                                {procItems.map((item, idc) => (
                                    <ImageCard key={item.id} src={item.file_data} label={`${proc} ${idc + 1}`} />
                                ))}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Footer fixo */}
            <View style={s.footer} fixed>
                <Text style={s.footerText}>Databook Digital</Text>
                <Text style={s.footerText}>www.trusttecnologia.com.br</Text>
            </View>
        </Page>
    </Document>
);

export const DataBook: React.FC = () => {
    const { role, user } = useAuth();
    const [folders, setFolders] = useState<DataBookFolder[]>([]);
    const [currentFolder, setCurrentFolder] = useState<DataBookFolder | null>(null);
    const [items, setItems] = useState<DataBookItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DataBookItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState('Peritagem');

    const [pendingFilesByProcess, setPendingFilesByProcess] = useState<Record<string, File[]>>({
        'Peritagem': [],
        'Montagem': [],
        'Pintura': [],
        'Liberação': [],
        'Informações Complementares': []
    });
    const [empresas, setEmpresas] = useState<{ id: string, nome: string }[]>([]);

    const [formData, setFormData] = useState({
        cliente: '',
        os_interna: '',
        os_externa: '',
        data_entrega: '',
        pedido_compra: '',
        nota_fiscal: '',
        responsavel: '',
        empresa_id: ''
    });



    useEffect(() => {
        fetchFolders();
        fetchEmpresas();
    }, []);

    useEffect(() => {
        if (currentFolder) {
            fetchItems(currentFolder.id);
        } else {
            setItems([]);
        }
    }, [currentFolder]);

    const fetchEmpresas = async () => {
        try {
            // Fetch official empresas directly from the database
            // Only companies added in "Gestão de Clientes" will appear here
            const { data, error } = await supabase
                .from('empresas')
                .select('id, nome')
                .order('nome');

            if (error) throw error;
            setEmpresas(data || []);
        } catch (error) {
            console.error('Error fetching empresas:', error);
        }
    };

    const fetchFolders = async () => {
        setLoading(true);
        try {
            let empresa_id: string | null = null;
            if (role === 'cliente') {
                const { data: profile } = await supabase.from('profiles').select('empresa_id').eq('id', user.id).single();
                empresa_id = profile?.empresa_id || null;
            }

            // Fetch actual databook folders
            let foldersQuery = supabase.from('databook_folders').select('*').order('created_at', { ascending: false });
            if (empresa_id) {
                foldersQuery = foldersQuery.eq('empresa_id', empresa_id);
            }
            const { data: foldersData } = await foldersQuery;

            setFolders(foldersData || []);
        } catch (error) {
            console.error('Error fetching databooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async (folderId: string) => {
        setLoading(true);
        try {
            if (currentFolder?.is_peritagem && currentFolder.peritagem_id) {
                // Fetch from peritagens table
                const { data, error } = await supabase
                    .from('peritagens')
                    .select('foto_frontal, fotos_montagem, fotos_videos_teste, foto_pintura_final')
                    .eq('id', currentFolder.peritagem_id)
                    .single();

                if (error) throw error;

                const peritagemItems: DataBookItem[] = [];
                if (data.foto_frontal) peritagemItems.push({ id: 'frontal', file_data: data.foto_frontal, description: 'Foto Frontal', file_type: 'image', created_at: '', processo: 'Peritagem' });

                (data.fotos_montagem || []).forEach((url: string, idx: number) => {
                    peritagemItems.push({ id: `montagem_${idx}`, file_data: url, description: `Montagem / Recuperação ${idx + 1}`, file_type: 'image', created_at: '', processo: 'Montagem' });
                });

                (data.fotos_videos_teste || []).forEach((url: string, idx: number) => {
                    const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().startsWith('data:video');
                    peritagemItems.push({ id: `teste_${idx}`, file_data: url, description: `Teste de Qualidade ${idx + 1}`, file_type: isVideo ? 'video' : 'image', created_at: '', processo: 'Pintura' });
                });

                if (data.foto_pintura_final) peritagemItems.push({ id: 'pintura', file_data: data.foto_pintura_final, description: 'Pintura/Acabamento Final', file_type: 'image', created_at: '', processo: 'Pintura' });

                setItems(peritagemItems);
            } else {
                // Fetch from databook_items table (standard behavior)
                const { data, error } = await supabase
                    .from('databook_items')
                    .select('*')
                    .eq('folder_id', folderId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setItems(data || []);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePendingFilesChange = (processo: string, files: FileList | null) => {
        if (files && files.length > 0) {
            setPendingFilesByProcess(prev => ({
                ...prev,
                [processo]: [...(prev[processo] || []), ...Array.from(files)]
            }));
        }
    };

    const removePendingFile = (processo: string, index: number) => {
        setPendingFilesByProcess(prev => ({
            ...prev,
            [processo]: prev[processo].filter((_, i) => i !== index)
        }));
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

        if (!formData.cliente) {
            alert('O campo Cliente é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            const folderName = `Data Book - ${formData.cliente} - ${formData.os_interna || 'S/OS'}`;

            const { data: folderData, error } = await supabase
                .from('databook_folders')
                .insert([{
                    name: folderName,
                    cliente: formData.cliente,
                    os_interna: formData.os_interna,
                    os_externa: formData.os_externa,
                    data_entrega: formData.data_entrega || null,
                    pedido_compra: formData.pedido_compra,
                    nota_fiscal: formData.nota_fiscal,
                    responsavel: formData.responsavel,
                    empresa_id: formData.empresa_id || null,
                    criado_por: user?.id
                }])
                .select()
                .single();

            if (error) throw error;

            const totalFiles = Object.values(pendingFilesByProcess).flat().length;

            if (totalFiles > 0 && folderData) {
                for (const processo of Object.keys(pendingFilesByProcess)) {
                    const stageFiles = pendingFilesByProcess[processo];
                    for (const file of stageFiles) {
                        const base64 = await fileToBase64(file);
                        const fileType = file.type.includes('pdf') ? 'pdf' : (file.type.includes('image') ? 'image' : 'other');

                        const { error: itemError } = await supabase
                            .from('databook_items')
                            .insert([{
                                folder_id: folderData.id,
                                file_data: base64,
                                description: file.name,
                                file_type: fileType,
                                processo: processo
                            }]);

                        if (itemError) console.error(`Erro ao salvar item(${processo}): `, file.name, itemError);
                    }
                }
            }

            setFolders([folderData, ...folders]);
            setFormData({
                cliente: '',
                os_interna: '',
                os_externa: '',
                data_entrega: '',
                pedido_compra: '',
                nota_fiscal: '',
                responsavel: '',
                empresa_id: ''
            });
            setPendingFilesByProcess({
                'Peritagem': [],
                'Montagem': [],
                'Pintura': [],
                'Liberação': [],
                'Informações Complementares': []
            });
            setIsCreateModalOpen(false);
            setCurrentFolder(folderData);

        } catch (error) {
            console.error('Error creating databook:', error);
            alert('Erro ao criar Data Book.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (role !== 'gestor') return;
        if (!confirm('Excluir este Data Book e todos os seus arquivos?')) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('databook_folders').delete().eq('id', folderId);
            if (error) throw error;
            setFolders(folders.filter(f => f.id !== folderId));
            if (currentFolder?.id === folderId) setCurrentFolder(null);
        } catch (error) {
            console.error('Error deleting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDatabookPDF = async () => {
        if (!currentFolder || items.length === 0) return;
        setGeneratingPdf(true);
        try {
            const blob = await pdf(<DataBookPremiumPDF folder={currentFolder} items={items} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `DATABOOK_${currentFolder.os_interna || currentFolder.cliente}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao baixar PDF:', error);
            alert('Erro ao gerar a apresentação em PDF.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleUploadToFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentFolder || !e.target.files || e.target.files.length === 0) return;

        setLoading(true);
        try {
            for (const file of Array.from(e.target.files)) {
                const base64 = await fileToBase64(file);
                const isVideo = file.type.includes('video');
                const fileType = isVideo ? 'video' : (file.type.includes('image') ? 'image' : 'other');

                const { error } = await supabase
                    .from('databook_items')
                    .insert([{
                        folder_id: currentFolder.id,
                        file_data: base64,
                        description: file.name,
                        file_type: fileType,
                        processo: selectedProcess
                    }]);

                if (error) throw error;
            }
            fetchItems(currentFolder.id);
            alert('Arquivos adicionados com sucesso!');
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Erro ao enviar arquivos.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canManage) return;
        if (!confirm('Excluir este arquivo?')) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('databook_items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(items.filter(i => i.id !== itemId));
            setSelectedItem(null);
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setLoading(false);
        }
    };

    const canManage = role === 'gestor' || role === 'pcp';


    const filteredFolders = folders.filter(f =>
        f.os_interna?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="databook-container">
            {!currentFolder ? (
                <>
                    <header className="page-hero">
                        <h1>Databook do Cliente</h1>
                        <p className="subtitle">Documentação técnica, fotos e vídeos que o cliente terá acesso.</p>
                    </header>

                    <div className="reports-section-header">
                        <h2>Sua Biblioteca</h2>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="search-input-wrapper" style={{ width: '300px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                <Search size={18} color="#94a3b8" />
                                <input
                                    type="text"
                                    placeholder="Buscar por O.S ou Cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ border: 'none', background: 'transparent' }}
                                />
                            </div>
                            {canManage && (
                                <button className="btn-add-databook" onClick={() => setIsCreateModalOpen(true)}>
                                    <Plus size={20} />
                                    <span>Novo</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="folders-grid">
                        {filteredFolders.length === 0 && !loading && (
                            <div className="empty-state" style={{ padding: '80px', background: 'white', borderRadius: '16px', gridColumn: '1/-1', textAlign: 'center' }}>
                                <Book size={64} color="#e2e8f0" style={{ marginBottom: '16px' }} />
                                <p style={{ color: '#64748b' }}>Nenhum Data Book encontrado.</p>
                            </div>
                        )}
                        {filteredFolders.map(folder => (
                            <div key={folder.id} className="folder-card" onClick={() => setCurrentFolder(folder)}>
                                <div className="folder-icon">
                                    <Book size={32} color="#10b981" />
                                </div>
                                <div className="folder-info">
                                    <h3>{folder.os_interna || 'S/OS'}</h3>
                                    <p>{folder.cliente}</p>
                                    <span className="date">Data: {folder.created_at ? new Date(folder.created_at).toLocaleDateString() : '-'}</span>
                                </div>
                                {role === 'gestor' && (
                                    <button className="folder-delete-btn" onClick={(e) => handleDeleteFolder(folder.id, e)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="items-view-container">
                    <header style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '24px',
                        marginBottom: '32px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto' }}>
                            <button className="back-btn-pill" onClick={() => setCurrentFolder(null)}>
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{currentFolder.os_interna || 'Pasta'}</h1>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{currentFolder.cliente} • Data Book</p>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            alignItems: 'flex-end',
                            flex: '1 1 auto'
                        }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleDownloadDatabookPDF}
                                    className="btn-primary"
                                    disabled={generatingPdf}
                                    style={{ padding: '0 24px', whiteSpace: 'nowrap' }}
                                >
                                    <Download size={18} />
                                    {generatingPdf ? 'GERANDO PDF...' : 'BAIXAR DATA BOOK'}
                                </button>

                                {canManage && (
                                    <>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleUploadToFolder}
                                            style={{ display: 'none' }}
                                            id="inner-folder-upload"
                                        />
                                        <button
                                            className="btn-add-item-inner"
                                            onClick={() => document.getElementById('inner-folder-upload')?.click()}
                                            title="Anexar Arquivos nesta pasta"
                                            style={{
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Upload size={20} /> ANEXAR FOTOS / DOCUMENTOS
                                        </button>
                                    </>
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                background: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '14px',
                                width: 'fit-content'
                            }}>
                                {['Peritagem', 'Montagem', 'Pintura', 'Liberação', 'Informações Complementares'].map(proc => (
                                    <button
                                        key={proc}
                                        onClick={() => setSelectedProcess(proc)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            background: selectedProcess === proc ? '#21408e' : 'transparent',
                                            color: selectedProcess === proc ? 'white' : '#64748b',
                                            transition: 'all 0.2s',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {proc}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>
                    <div className="folder-details-hero">
                        <div className="detail-block">
                            <label>Ordem de Serviço</label>
                            <span>{currentFolder.os_interna || '-'}</span>
                        </div>
                        <div className="detail-block">
                            <label>Cliente</label>
                            <span>{currentFolder.cliente}</span>
                        </div>
                        <div className="detail-block">
                            <label>Pedido de Compra</label>
                            <span>{currentFolder.pedido_compra || '-'}</span>
                        </div>
                        <div className="detail-block">
                            <label>Data de Registro</label>
                            <span>{new Date(currentFolder.created_at).toLocaleDateString()}</span>
                        </div>
                        {currentFolder.nota_fiscal && (
                            <div className="detail-block">
                                <label>NF</label>
                                <span>{currentFolder.nota_fiscal}</span>
                            </div>
                        )}
                    </div>

                    <div className="items-view-content">
                        {(() => {
                            const processName = selectedProcess;
                            const processItems = items.filter(item => item.processo === processName || (!item.processo && processName === 'Peritagem'));

                            if (processItems.length === 0) {
                                return (
                                    <div className="empty-state" style={{ padding: '60px', textAlign: 'center' }}>
                                        <FileText size={48} color="#e2e8f0" style={{ margin: '0 auto 16px' }} />
                                        <p style={{ color: '#94a3b8' }}>Nenhum documento anexado em {processName}.</p>
                                    </div>
                                );
                            }

                            return (
                                <div key={processName} className="process-group" style={{ marginBottom: '40px' }}>
                                    <div className="process-header" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '20px',
                                        borderBottom: '2px solid #f1f5f9',
                                        paddingBottom: '10px'
                                    }}>
                                        <div style={{ width: '4px', height: '20px', background: '#21408e', borderRadius: '2px' }}></div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {processName}
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px' }}>
                                            {processItems.length} {processItems.length === 1 ? 'item' : 'itens'}
                                        </span>
                                    </div>
                                    <div className="items-grid">
                                        {processItems.map(item => (
                                            <div key={item.id} className="item-card" onClick={() => setSelectedItem(item)}>
                                                {item.file_type === 'image' || (item.file_type === 'other' && item.file_data.startsWith('data:image')) ? (
                                                    <div className="item-thumbnail">
                                                        <img src={item.file_data} alt={item.description} />
                                                    </div>
                                                ) : (
                                                    <div className="file-preview-icon">
                                                        {item.file_type === 'pdf' ? <FileText size={40} color="#ef4444" /> :
                                                            item.file_type === 'video' ? <Video size={40} color="#3b82f6" /> :
                                                                <Book size={40} color="#3b82f6" />}
                                                    </div>
                                                )}
                                                {canManage && (
                                                    <button
                                                        className="item-delete-btn"
                                                        onClick={(e) => handleDeleteItem(item.id, e)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            right: '8px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#ef4444',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '4px',
                                                            cursor: 'pointer',
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}


                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)',
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        animation: 'modalFadeIn 0.3s ease-out'
                    }}>
                        <div className="modal-header" style={{
                            padding: '24px 32px',
                            background: '#21408e',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}>
                                    <Book size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Novo Databook do Cliente</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>Preencha os dados e anexe os arquivos por etapa.</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsCreateModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            <div className="modal-body" style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                                <div className="form-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Cliente / Empresa Vinculada *</label>
                                        <select
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            value={formData.empresa_id}
                                            onChange={e => {
                                                const emp = empresas.find(em => em.id === e.target.value);
                                                setFormData({ ...formData, empresa_id: e.target.value, cliente: emp?.nome || '' });
                                            }}
                                            required
                                        >
                                            <option value="">Selecione uma empresa</option>
                                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>OS Interna</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="text"
                                            value={formData.os_interna}
                                            onChange={e => setFormData({ ...formData, os_interna: e.target.value })}
                                            placeholder="Ex: OS-1234"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>OS Externa</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="text"
                                            value={formData.os_externa}
                                            onChange={e => setFormData({ ...formData, os_externa: e.target.value })}
                                            placeholder="Ex: OS-EXT-5678"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Pedido de Compra</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="text"
                                            value={formData.pedido_compra}
                                            onChange={e => setFormData({ ...formData, pedido_compra: e.target.value })}
                                            placeholder="Número do pedido"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Nota Fiscal (NF)</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="text"
                                            value={formData.nota_fiscal}
                                            onChange={e => setFormData({ ...formData, nota_fiscal: e.target.value })}
                                            placeholder="Número da nota fiscal"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Responsável Técnico</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="text"
                                            value={formData.responsavel}
                                            onChange={e => setFormData({ ...formData, responsavel: e.target.value })}
                                            placeholder="Nome do responsável"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Data de Entrega</label>
                                        <input
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1a2e63', outline: 'none' }}
                                            type="date"
                                            value={formData.data_entrega}
                                            onChange={e => setFormData({ ...formData, data_entrega: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="stages-form" style={{ marginTop: '32px' }}>
                                    <h4 style={{ fontSize: '1.1rem', color: '#1a2e63', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Upload size={20} color="#21408e" />
                                        Documentação por Etapa
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {['Peritagem', 'Montagem', 'Pintura', 'Liberação', 'Informações Complementares'].map(stage => (
                                            <div key={stage} className="stage-upload-row" style={{ padding: '20px', background: '#f1f5f9', borderRadius: '16px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '4px', height: '24px', background: '#21408e', borderRadius: '2px' }}></div>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{stage}</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={(e) => handlePendingFilesChange(stage, e.target.files)}
                                                        id={`file-upload-${stage}`}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById(`file-upload-${stage}`)?.click()}
                                                        style={{
                                                            background: 'white',
                                                            color: '#21408e',
                                                            border: '2px solid #21408e',
                                                            padding: '8px 16px',
                                                            borderRadius: '10px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 800,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Plus size={16} /> ANEXAR ARQUIVOS
                                                    </button>
                                                </div>

                                                {pendingFilesByProcess[stage]?.length > 0 ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                        {pendingFilesByProcess[stage].map((file, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                background: 'white',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0',
                                                                fontSize: '0.8rem',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}>
                                                                <FileText size={14} color="#64748b" />
                                                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{file.name}</span>
                                                                <button type="button" onClick={() => removePendingFile(stage, idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }}></div>
                                                        Nenhum arquivo anexado nesta etapa.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '24px 32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: '#f8fafc' }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#10b981', border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: 800, color: 'white', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}>
                                    {loading ? 'SALVANDO...' : 'CRIAR DATA BOOK'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div className="item-modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="item-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setSelectedItem(null)}><X size={24} /></button>
                        {selectedItem.file_type === 'pdf' ? (
                            <iframe src={selectedItem.file_data} title={selectedItem.description} style={{ width: '100%', height: '80vh', border: 'none' }} />
                        ) : selectedItem.file_type === 'video' ? (
                            <video src={selectedItem.file_data} controls style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px' }} />
                        ) : (
                            <img src={selectedItem.file_data} alt={selectedItem.description} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px' }} />
                        )}
                        <div className="item-info-bar" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                            <a href={selectedItem.file_data} download={selectedItem.description} className="btn-download" style={{ background: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download size={20} /> Baixar Arquivo
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
