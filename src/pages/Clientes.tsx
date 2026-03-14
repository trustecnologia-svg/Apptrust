import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Peritagens.css';

interface Peritagem {
    os?: string;
    id: string;
    numero_peritagem: string;
    cliente: string;
    data_execucao: string;
    status: string;
    prioridade: string;
    os_interna?: string;
}

export const Clientes: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            const { data, error } = await supabase
                .from('peritagens')
                .select('*')
                .eq('status', 'Aguardando Clientes')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPeritagens(data || []);
        } catch (err) {
            console.error('Erro ao buscar peritagens:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPeritagens = peritagens.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_peritagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.os_interna && p.os_interna.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="peritagens-container">
            <div className="header-actions">
                <h1 className="page-title">Aguardando Aprovação do Cliente</h1>
                <div className="summary-badge warning">
                    <DollarSign size={20} />
                    <span>Total: {peritagens.length}</span>
                </div>
            </div>

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

            <div className="table-card">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" size={40} color="#3182ce" />
                        <p>Carregando...</p>
                    </div>
                ) : (
                    <table className="peritagens-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Cliente</th>
                                <th>Data</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPeritagens.map((p) => (
                                <tr key={p.id}>
                                    <td className="peritagem-id">{p.numero_peritagem}</td>
                                    <td>{p.cliente}</td>
                                    <td>{new Date(p.data_execucao).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <span className={`status-badge aguardando-clientes`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-action" onClick={() => navigate(`/monitoramento?id=${p.id}`)}>
                                            <span>VER STATUS</span>
                                            <ExternalLink size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPeritagens.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                        Nenhuma peritagem aguardando cliente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
