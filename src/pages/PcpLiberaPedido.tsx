import React, { useState, useEffect } from 'react';
import { Search, Loader2, ShoppingCart } from 'lucide-react';
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
}

export const PcpLiberaPedido: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderInputs, setOrderInputs] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('id, os, numero_peritagem, cliente, status, numero_pedido, os_interna, created_at')
                .or('status.eq.AGUARDANDO APROVAÇÃO DO CLIENTE,status.eq.Aguardando Clientes')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRelease = async (id: string) => {
        const orderNum = orderInputs[id];
        if (!orderNum || !user) {
            alert('Por favor, informe o número do pedido.');
            return;
        }

        try {
            const { error } = await supabase
                .from('peritagens')
                .update({
                    status: 'EM MANUTENÇÃO',
                    numero_pedido: orderNum,
                    etapa_atual: 'montagem'
                })
                .eq('id', id);

            if (error) throw error;

            await supabase.from('peritagem_historico').insert([{
                peritagem_id: id,
                status_antigo: 'AGUARDANDO APROVAÇÃO DO CLIENTE',
                status_novo: 'EM MANUTENÇÃO',
                alterado_por: user.id
            }]);

            setPeritagens(prev => prev.filter(p => p.id !== id));
            alert('Pedido liberado para manutenção!');
        } catch (err) {
            alert('Erro ao liberar pedido.');
        }
    };

    const handleInputChange = (id: string, value: string) => {
        setOrderInputs(prev => ({ ...prev, [id]: value }));
    };

    const filtered = peritagens.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_peritagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.os_interna && p.os_interna.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="peritagens-container">
            <h1 className="page-title">2. Liberação do Pedido</h1>

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
                        <div key={p.id} className="pcp-action-card">
                            <div className="pcp-card-header">
                                <div>
                                    <span className="report-id-badge" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                        {p.os_interna || 'SEM O.S'}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                                        O.S. Cliente: {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'NÃO INFORMADA')}
                                    </span>
                                </div>
                                <span className="status-pill status-aprovacao" style={{ padding: '5px 10px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', background: '#fef3c7', color: '#92400e' }}>
                                    AGUARDANDO PEDIDO
                                </span>
                            </div>

                            <div className="pcp-body">
                                <h3 className="pcp-card-client" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                                    {p.cliente}
                                </h3>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                                        Número do Pedido do Cliente:
                                    </label>
                                    <input
                                        type="text"
                                        className="pcp-input"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '2px solid #f1f5f9',
                                            background: '#f8fafc',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        placeholder="Ex: 4500123456"
                                        value={orderInputs[p.id] || ''}
                                        onChange={(e) => handleInputChange(p.id, e.target.value)}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
                                    />
                                </div>
                            </div>

                            <div className="pcp-footer">
                                <button
                                    className="btn-pcp-action"
                                    onClick={() => handleRelease(p.id)}
                                    disabled={!orderInputs[p.id]}
                                    style={{
                                        background: orderInputs[p.id] ? '#2563eb' : '#f1f5f9',
                                        color: orderInputs[p.id] ? 'white' : '#94a3b8',
                                        cursor: orderInputs[p.id] ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    <ShoppingCart size={18} /> Liberar Manutenção
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {!loading && filtered.length === 0 && <p style={{ textAlign: 'center', color: '#718096' }}>Nada para liberar.</p>}
            </div>
        </div>
    );
};
