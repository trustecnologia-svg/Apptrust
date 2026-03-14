import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2, Wrench, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Peritagens.css'; // Reutilizando estilos

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

export const Manutencao: React.FC = () => {
    const { user, role } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peritagens, setPeritagens] = useState<Peritagem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPeritagens();
    }, []);

    const fetchPeritagens = async () => {
        try {
            let query = supabase
                .from('peritagens')
                .select('*')
                .or('status.eq.EM MANUTENÇÃO,status.eq.MANUTENÇÃO,status.eq.OFICINA')
                .order('created_at', { ascending: false });

            // Filtro para APP Android
            const isAndroidApp = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            if (isAndroidApp && role !== 'gestor' && role !== 'pcp' && user) {
                query = query.eq('criado_por', user.id);
            }

            const { data, error } = await query;

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
                <h1 className="page-title">Cilindros em Manutenção</h1>
                <div className="summary-badge maintenance">
                    <Wrench size={20} />
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

            <div className="grid-container">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" size={40} color="#3182ce" />
                        <p>Carregando...</p>
                    </div>
                ) : (
                    <div className="peritagens-grid">
                        {filteredPeritagens.map((p) => (
                            <div key={p.id} className="peritagem-card">
                                <div className="card-header">
                                    <div>
                                        <span className="os-badge">{p.os_interna || 'SEM O.S'}</span>
                                        <span className="ref-text">O.S. Cliente: {(p.os && (!p.os.startsWith('S/OS-') || p.os.length < 15)) ? p.os : (p.numero_peritagem && (!p.numero_peritagem.startsWith('S/OS-') || p.numero_peritagem.length < 15) ? p.numero_peritagem : 'NÃO INFORMADA')}</span>
                                    </div>
                                    <span className="status-pill status-manutencao">
                                        {p.status}
                                    </span>
                                </div>

                                <div className="card-body">
                                    <h3 className="client-name">{p.cliente}</h3>

                                    <div className="info-row">
                                        <Calendar size={16} />
                                        <span>{new Date(p.data_execucao).toLocaleDateString('pt-BR')}</span>
                                    </div>

                                    <div className="info-row">
                                        <AlertCircle size={16} />
                                        <span className={`priority-badge ${p.prioridade?.toLowerCase() === 'urgente' ? 'priority-urgente' : 'priority-normal'}`}>
                                            Prioridade: {p.prioridade || 'Normal'}
                                        </span>
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button
                                        className="btn-main-action btn-main-view"
                                        onClick={() => navigate(`/monitoramento?id=${p.id}`)}
                                    >
                                        STATUS <ExternalLink size={16} />
                                    </button>
                                    <button
                                        className="btn-main-action"
                                        style={{ background: '#38a169', color: 'white' }}
                                        onClick={async () => {
                                            if (!window.confirm('Confirma a finalização da manutenção deste cilindro?')) return;

                                            const { error } = await supabase
                                                .from('peritagens')
                                                .update({ status: 'AGUARDANDO CONFERÊNCIA FINAL', etapa_atual: 'teste' })
                                                .eq('id', p.id);

                                            if (!error) {
                                                alert('Finalizado e enviado para conferência do PCP!');
                                                fetchPeritagens();
                                            } else {
                                                alert('Erro ao finalizar.');
                                            }
                                        }}
                                    >
                                        FINALIZAR <Wrench size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredPeritagens.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', width: '100%', gridColumn: '1/-1', color: '#64748b' }}>
                                Nenhum cilindro em manutenção no momento.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
