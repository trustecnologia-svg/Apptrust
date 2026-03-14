import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Calendar, Trash2, ClipboardSignature } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Peritagens.css';
import './PcpCommon.css';

interface ItemAguardando {
    id: string;
    os_interna: string;
    numero_ordem?: string;
    ni?: string;
    nf?: string;
    numero_laudo?: string;
    cliente: string;
    data_chegada: string;
    status: string;
    descricao_equipamento?: string;
}

export const AguardandoPeritagem: React.FC = () => {
    const { role } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [itens, setItens] = useState<ItemAguardando[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [osInterna, setOsInterna] = useState('');
    const [numeroOrdem, setNumeroOrdem] = useState('');
    const [ni, setNi] = useState('');
    const [nf, setNf] = useState('');
    const [numeroLaudo, setNumeroLaudo] = useState('');
    const [cliente, setCliente] = useState('');
    const [dataChegada, setDataChegada] = useState(new Date().toISOString().split('T')[0]);
    const [descricaoEquipamento, setDescricaoEquipamento] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    useEffect(() => {
        fetchItens();
    }, []);

    const fetchItens = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('aguardando_peritagem')
                .select('*')
                .eq('status', 'AGUARDANDO')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItens(data || []);
        } catch (err) {
            console.error('Erro ao buscar itens:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!osInterna || !cliente || !dataChegada) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('aguardando_peritagem')
                .insert([{
                    os_interna: osInterna,
                    numero_ordem: numeroOrdem,
                    ni: ni,
                    nf: nf,
                    numero_laudo: numeroLaudo,
                    cliente: cliente,
                    data_chegada: dataChegada,
                    descricao_equipamento: descricaoEquipamento,
                    status: 'AGUARDANDO'
                }]);

            if (error) throw error;

            alert('Item adicionado com sucesso!');
            setOsInterna('');
            setNumeroOrdem('');
            setNi('');
            setNf('');
            setNumeroLaudo('');
            setCliente('');
            setDescricaoEquipamento('');
            setShowForm(false);
            fetchItens();
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            alert('Erro ao salvar item: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Deseja realmente excluir este item?')) return;

        try {
            const { error } = await supabase
                .from('aguardando_peritagem')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setItens(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Erro ao deletar:', err);
            alert('Erro ao deletar item.');
        }
    };

    const filtered = itens.filter(item =>
        item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.os_interna.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.numero_ordem || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.numero_laudo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="peritagens-container">
            <div className="header-section">
                <h1 className="page-title">Aguardando Peritagem</h1>
                {role === 'pcp' || role === 'gestor' ? (
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={20} />
                        <span>Novo Item</span>
                    </button>
                ) : null}
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search size={20} color="#718096" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou O.S..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Adicionar Cilindro para Peritagem</h2>
                            <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Numeração da OS</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        value={osInterna}
                                        onChange={(e) => setOsInterna(e.target.value)}
                                        placeholder="Ex: 8450"
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Número da Ordem</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            value={numeroOrdem}
                                            onChange={(e) => setNumeroOrdem(e.target.value)}
                                            placeholder="Nº da Ordem"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Número do Laudo</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            value={numeroLaudo}
                                            onChange={(e) => setNumeroLaudo(e.target.value)}
                                            placeholder="Nº do Laudo"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>NI</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            value={ni}
                                            onChange={(e) => setNi(e.target.value)}
                                            placeholder="NI"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>NF</label>
                                        <input
                                            type="text"
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            value={nf}
                                            onChange={(e) => setNf(e.target.value)}
                                            placeholder="NF"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Cliente</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        value={cliente}
                                        onChange={(e) => setCliente(e.target.value)}
                                        placeholder="Nome do Cliente"
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Data</label>
                                    <input
                                        type="date"
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                        value={dataChegada}
                                        onChange={(e) => setDataChegada(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Descrição do Equipamento</label>
                                    <textarea
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '100px', resize: 'vertical' }}
                                        value={descricaoEquipamento}
                                        onChange={(e) => setDescricaoEquipamento(e.target.value)}
                                        placeholder="Descrição do equipamento..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer" style={{
                                marginTop: '25px',
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '20px'
                            }}>
                                <button type="button" className="btn-report btn-report-outline" onClick={() => setShowForm(false)} style={{ margin: 0 }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-report btn-report-primary" disabled={saving} style={{ margin: 0, minWidth: '120px' }}>
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="pcp-approval-grid">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" size={40} color="#2563eb" />
                        <p>Carregando itens...</p>
                    </div>
                ) : (
                    filtered.map(item => (
                        <div
                            key={item.id}
                            className="pcp-action-card"
                            onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                            style={{ cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                            <div className="pcp-card-header">
                                <div>
                                    <span className="report-id-badge" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                        {item.os_interna}
                                    </span>
                                </div>
                                <span className="status-pill status-aguardando" style={{ padding: '5px 10px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', background: '#f1f5f9', color: '#475569' }}>
                                    AGUARDANDO PERITAGEM
                                </span>
                            </div>

                            <div className="pcp-body">
                                <h3 className="pcp-card-client" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                                    {item.cliente}
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                    {item.numero_ordem && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '5px' }}>
                                            Ordem: {item.numero_ordem}
                                        </span>
                                    )}
                                    {item.ni && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#fefce8', color: '#854d0e', padding: '3px 8px', borderRadius: '5px' }}>
                                            NI: {item.ni}
                                        </span>
                                    )}
                                    {item.nf && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#fef2f2', color: '#991b1b', padding: '3px 8px', borderRadius: '5px' }}>
                                            NF: {item.nf}
                                        </span>
                                    )}
                                    {item.numero_laudo && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#f5f3ff', color: '#5b21b6', padding: '3px 8px', borderRadius: '5px' }}>
                                            Laudo: {item.numero_laudo}
                                        </span>
                                    )}
                                </div>
                                <div className="report-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                                    <Calendar size={16} />
                                    <span style={{ fontSize: '0.85rem' }}>Data: {new Date(item.data_chegada).toLocaleDateString('pt-BR')}</span>
                                </div>

                                {selectedItemId === item.id && item.descricao_equipamento && (
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        animation: 'fadeIn 0.3s ease'
                                    }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Descrição do Equipamento
                                        </label>
                                        <p style={{ fontSize: '0.9rem', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                            {item.descricao_equipamento}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="pcp-footer" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                <button
                                    className="btn-report-primary"
                                    style={{ width: '100%', background: '#21408e', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const params = new URLSearchParams({
                                            os_interna: item.os_interna,
                                            cliente: item.cliente,
                                            ...(item.numero_ordem && { numero_ordem: item.numero_ordem }),
                                            ...(item.ni && { ni: item.ni }),
                                            ...(item.nf && { nf: item.nf }),
                                            ...(item.numero_laudo && { numero_laudo: item.numero_laudo }),
                                            ...(item.descricao_equipamento && { desc_equip: item.descricao_equipamento }),
                                        });
                                        navigate(`/nova-peritagem?${params.toString()}`);
                                    }}
                                >
                                    <ClipboardSignature size={16} />
                                    <span>Iniciar Peritagem</span>
                                </button>
                                {(role === 'pcp' || role === 'gestor') && (
                                    <button
                                        className="btn-report-outline"
                                        style={{ width: 'fit-content', color: '#ef4444', borderColor: '#fee2e2', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: 'white', border: '1px solid #fee2e2' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item.id);
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Nenhum cilindro aguardando peritagem.
                </div>
            )}
        </div>
    );
};
