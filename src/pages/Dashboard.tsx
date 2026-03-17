import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
    FileText,
    Wrench,
    CheckCircle2,
    Truck,
    ClipboardCheck,
    Activity,
    Users,
    PlusCircle,
    BarChart3,
    ShieldCheck
} from 'lucide-react';
import './Dashboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
);

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, role } = useAuth();

    const [counts, setCounts] = useState({
        total: 0,
        aguardandoPeritagem: 0,
        emPeritagem: 0,
        pendentePcp: 0,
        aguardandoCliente: 0,
        manutencao: 0,
        conferenciaFinal: 0,
        finalizados: 0,
        avgLeadTime: 0
    });
    const [clientStats, setClientStats] = useState<{ name: string; count: number }[]>([]);
    const [monthlyAvgData, setMonthlyAvgData] = useState<{ month: string; avg: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [empresaId, setEmpresaId] = useState<string | null>(null);

    useEffect(() => {
        if (user && role) {
            if (role === 'cliente') {
                fetchUserEmpresa();
            } else {
                fetchCounts();
            }
        }
    }, [user, role]);

    useEffect(() => {
        if (role === 'cliente' && empresaId) {
            fetchCounts();
        }
    }, [empresaId]);

    const fetchUserEmpresa = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('empresa_id')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setEmpresaId(data?.empresa_id || null);
        } catch (err) {
            console.error('Erro ao buscar empresa do usuário:', err);
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        if (!role) return;
        try {
            setLoading(true);
            let query = supabase.from('peritagens').select('status, created_at, data_execucao, data_finalizacao, cliente, empresa_id');

            if (role === 'cliente' && empresaId) {
                query = query.eq('empresa_id', empresaId);
            }

            let countAguardandoPeritagem = 0;
            if (role !== 'cliente') {
                const { count } = await supabase
                    .from('aguardando_peritagem')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'AGUARDANDO');
                countAguardandoPeritagem = count || 0;
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                const total = data.length;
                const normalizedData = data.map((p: any) => ({
                    ...p,
                    status: (p.status || "").toUpperCase().trim()
                }));

                const emPeritagem = normalizedData.filter((p: any) => p.status === 'PERITAGEM CRIADA' || p.status === 'EM PERITAGEM' || p.status === 'PERITAGEM EM ANDAMENTO').length;
                const pendentePcp = normalizedData.filter((p: any) => p.status === 'AGUARDANDO APROVAÇÃO DO PCP' || p.status === 'PERITAGEM FINALIZADA' || p.status === 'REVISÃO NECESSÁRIA').length;
                const aguardandoCliente = normalizedData.filter((p: any) => p.status === 'AGUARDANDO APROVAÇÃO DO CLIENTE' || p.status === 'AGUARDANDO ORÇAMENTO' || p.status === 'ORÇAMENTO ENVIADO' || p.status === 'AGUARDANDO CLIENTE').length;
                const manutencao = normalizedData.filter((p: any) => p.status === 'EM MANUTENÇÃO' || p.status === 'CILINDROS EM MANUTENÇÃO' || p.status === 'OS EM ABERTO' || p.status === 'AGUARDANDO COMPRAS' || p.status === 'CILINDRO EM MANUTENÇÃO').length;
                const conferenciaFinal = normalizedData.filter((p: any) => p.status === 'AGUARDANDO CONFERÊNCIA FINAL' || p.status === 'CONFERÊNCIA FINAL').length;

                const finishedItems = normalizedData.filter((p: any) =>
                    ['PROCESSO FINALIZADO', 'FINALIZADO', 'FINALIZADOS', 'PROCESSO CONCLUÍDO', 'CONCLUÍDO', 'ORÇAMENTO FINALIZADO'].includes(p.status)
                );
                const finalizados = finishedItems.length;

                let totalDays = 0;
                let validItems = 0;
                const monthGroups: { [key: string]: { total: number, count: number } } = {};

                finishedItems.forEach((item: any) => {
                    if (item.created_at) {
                        const start = new Date(item.created_at);
                        const end = item.data_finalizacao ? new Date(item.data_finalizacao) :
                            (item.data_execucao ? new Date(item.data_execucao) : new Date(item.created_at));

                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        totalDays += diffDays;
                        validItems++;

                        const monthKey = end.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                        if (!monthGroups[monthKey]) monthGroups[monthKey] = { total: 0, count: 0 };
                        monthGroups[monthKey].total += diffDays;
                        monthGroups[monthKey].count += 1;
                    }
                });

                const avgLeadTime = validItems > 0 ? Math.round(totalDays / validItems) : 0;
                const sortedMonths = Object.keys(monthGroups).sort().map(month => ({
                    month,
                    avg: Math.round(monthGroups[month].total / monthGroups[month].count)
                }));

                const clientCounts: { [key: string]: number } = {};
                normalizedData.forEach((p: any) => {
                    const clientName = p.cliente?.trim().toUpperCase() || 'SEM CLIENTE';
                    clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
                });

                const sortedClients = Object.entries(clientCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                setMonthlyAvgData(sortedMonths);
                setCounts({ 
                    total, 
                    aguardandoPeritagem: countAguardandoPeritagem, 
                    emPeritagem,
                    pendentePcp, 
                    aguardandoCliente, 
                    manutencao, 
                    conferenciaFinal, 
                    finalizados, 
                    avgLeadTime 
                });
                setClientStats(sortedClients);
            }
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { label: 'Recebimento', subLabel: 'Portaria / Entrada', value: counts.aguardandoPeritagem, icon: <Truck size={22} />, color: '#3b82f6', link: '/pcp/aguardando' },
        { label: 'Peritagem', subLabel: 'Análise Técnica', value: counts.emPeritagem, icon: <ClipboardCheck size={22} />, color: '#8b5cf6', link: '/peritagens?status=peritagem' },
        { label: 'Orçamento', subLabel: 'Aprovação Cliente', value: counts.aguardandoCliente, icon: <FileText size={22} />, color: '#f59e0b', link: '/pcp/liberar' },
        { label: 'Oficina', subLabel: 'Em Manutenção', value: counts.manutencao, icon: <Wrench size={22} />, color: '#10b981', link: '/manutencao' },
        { label: 'Logística', subLabel: 'Pronto p/ Entrega', value: counts.finalizados, icon: <CheckCircle2 size={22} />, color: '#059669', link: '/peritagens?status=finalizados' },
    ];

    return (
        <div className="dashboard-container industrial-theme" id="dashboard-page">
            <header className="dashboard-header-v4">
                <div className="header-main">
                    <div className="brand-pill">CENTRO DE OPERAÇÕES</div>
                    <h1>Painel de Controle de Peritagem</h1>
                    <p>Trust Tecnologia - Monitoramento Inteligente de Manutenção Industrial</p>
                </div>
                <div className="header-actions">
                    <button className="btn-new-peritagem" onClick={() => navigate('/nova-peritagem')}>
                        <PlusCircle size={20} />
                        Nova Peritagem
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="industrial-loading-screen">
                    <div className="loading-orbit"></div>
                    <p>CARREGANDO FLUXO OPERACIONAL...</p>
                </div>
            ) : (
                <div className="dashboard-content-v4">
                    <section className="pipeline-container">
                        <div className="pipeline-header">
                            <Activity size={18} />
                            <h3>Fluxo de Trabalho em Tempo Real</h3>
                        </div>
                        <div className="pipeline-steps">
                            {stats.map((s, i) => (
                                <div key={i} className="pipeline-card" onClick={() => navigate(s.link)}>
                                    <div className="card-top">
                                        <div className="icon-box" style={{ background: `${s.color}15`, color: s.color }}>
                                            {s.icon}
                                        </div>
                                        <span className="step-count">{s.value}</span>
                                    </div>
                                    <div className="card-bottom">
                                        <span className="step-label">{s.label}</span>
                                        <span className="step-sub">{s.subLabel}</span>
                                    </div>
                                    <div className="card-progress">
                                        <div className="progress-fill" style={{ width: `${Math.min(100, (s.value / (counts.total || 1)) * 100)}%`, background: s.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="secondary-grid-v4">
                        <div className="data-card-v4 ranking">
                            <div className="card-header-v4">
                                <Users size={18} />
                                <h3>Principais Clientes (Volume)</h3>
                            </div>
                            <div className="ranking-body">
                                {clientStats.slice(0, 5).map((c, i) => (
                                    <div key={i} className="ranking-row">
                                        <div className="client-name">
                                            <span className="row-num">{i + 1}</span>
                                            {c.name}
                                        </div>
                                        <span className="row-val">{c.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="data-card-v4 analytics">
                            <div className="card-header-v4">
                                <BarChart3 size={18} />
                                <h3>Tempo Médio de Ciclo</h3>
                            </div>
                            <div className="analytics-body">
                                <div className="lead-time-display">
                                    <span className="lt-val">{counts.avgLeadTime}</span>
                                    <span className="lt-unit">DIAS</span>
                                </div>
                                <div className="lt-chart-placeholder">
                                    <Line 
                                        data={{
                                            labels: monthlyAvgData.map(d => d.month),
                                            datasets: [{
                                                data: monthlyAvgData.map(d => d.avg),
                                                borderColor: '#21408e',
                                                backgroundColor: 'rgba(33, 64, 142, 0.05)',
                                                tension: 0.4,
                                                fill: true,
                                                pointRadius: 4,
                                                pointBackgroundColor: '#21408e'
                                            }]
                                        }}
                                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="data-card-v4 summary">
                            <div className="card-header-v4">
                                <ShieldCheck size={18} />
                                <h3>Resumo Operacional</h3>
                            </div>
                            <div className="summary-body">
                                <div className="summary-item">
                                    <span>Eficiência Global</span>
                                    <strong>{Math.round((counts.finalizados / (counts.total || 1)) * 100)}%</strong>
                                </div>
                                <div className="summary-item">
                                    <span>Total de Ordens</span>
                                    <strong>{counts.total}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>Em Manutenção</span>
                                    <strong>{counts.manutencao}</strong>
                                </div>
                                <div className="summary-progress-bar">
                                    <div className="progress-done" style={{ width: `${(counts.finalizados / (counts.total || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="dashboard-footer-v4">
                        <div className="footer-links">
                            <div className="f-link" onClick={() => navigate('/peritagens')}>
                                <FileText size={16} />
                                Peritagens Ativas
                            </div>
                            <div className="f-link" onClick={() => navigate('/pcp/finalizar')}>
                                <ClipboardCheck size={16} />
                                Controle de Qualidade
                            </div>
                        </div>
                        <div className="system-status">
                            <div className="status-indicator"></div>
                            CONEXÃO ESTÁVEL - BANCO DE DADOS SINCRONIZADO
                        </div>
                    </footer>
                </div>
            )}
        </div>
    );
};
