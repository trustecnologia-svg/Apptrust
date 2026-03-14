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
    LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    FileText,
    DollarSign,
    Wrench,
    CheckCircle2,
    Timer,
    ArrowRight,
    Clock
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
    LineElement
);



export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, user, role } = useAuth();

    const [counts, setCounts] = useState({
        total: 0,
        aguardando: 0,
        manutencao: 0,
        finalizados: 0,
        pendentePcp: 0,
        aguardandoCliente: 0,
        conferenciaFinal: 0,
        avgLeadTime: 0,
        aguardandoPeritagem: 0
    });
    const [clientStats, setClientStats] = useState<{ name: string; count: number }[]>([]);
    const [monthlyAvgData, setMonthlyAvgData] = useState<{ month: string; avg: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [clienteNome, setClienteNome] = useState<string>('');

    useEffect(() => {
        if (user && role) {
            console.log('🔄 Dashboard: Role detectada:', role);
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
                .select('empresa_id, empresas(nome)')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            setEmpresaId(data?.empresa_id || null);
            // @ts-ignore
            setClienteNome(data?.empresas?.nome || '');
        } catch (err) {
            console.error('Erro ao buscar empresa do usuário:', err);
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        if (!role) return;

        try {
            setLoading(true);
            console.log('📊 Dashboard: Iniciando busca de dados para role:', role);

            // Selecionar apenas colunas necessárias para contagem e dashboard (evita carregar fotos pesadas)
            let query = supabase.from('peritagens').select('status, created_at, data_execucao, data_finalizacao, cliente, empresa_id');

            if (role === 'cliente') {
                if (empresaId) {
                    query = query.eq('empresa_id', empresaId);
                } else {
                    console.log('⚠️ Dashboard: Cliente sem empresa_id mapeado.');
                    setCounts({ total: 0, aguardando: 0, manutencao: 0, finalizados: 0, pendentePcp: 0, aguardandoCliente: 0, conferenciaFinal: 0, avgLeadTime: 0, aguardandoPeritagem: 0 });
                    setClientStats([]);
                    setMonthlyAvgData([]);
                    setLoading(false);
                    return;
                }
            }

            // 2. Buscar contagem de Aguardando Peritagem (Tabela separada)
            let countAguardandoPeritagem = 0;
            if (role !== 'cliente') {
                const { count } = await supabase
                    .from('aguardando_peritagem')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'AGUARDANDO');
                countAguardandoPeritagem = count || 0;
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro na consulta do Dashboard:', error);
                throw error;
            }

            if (data) {
                console.log(`✅ Dashboard: ${data.length} peritagens encontradas.`);
                const total = data.length;

                // Normalizar status para facilitar o filtro
                const normalizedData = data.map((p: any) => ({
                    ...p,
                    status: (p.status || "").toUpperCase().trim()
                }));

                const pendentePcp = normalizedData.filter((p: any) => p.status === 'AGUARDANDO APROVAÇÃO DO PCP' || p.status === 'PERITAGEM CRIADA' || p.status === 'PERITAGEM FINALIZADA').length;
                const aguardandoCliente = normalizedData.filter((p: any) => p.status === 'AGUARDANDO APROVAÇÃO DO CLIENTE' || p.status === 'AGUARDANDO CLIENTES' || p.status === 'AGUARDANDO ORÇAMENTO' || p.status === 'ORÇAMENTO ENVIADO').length;
                const manutencao = normalizedData.filter((p: any) => p.status === 'EM MANUTENÇÃO' || p.status === 'CILINDROS EM MANUTENÇÃO' || p.status === 'OS EM ABERTO').length;
                const conferenciaFinal = normalizedData.filter((p: any) => p.status === 'AGUARDANDO CONFERÊNCIA FINAL').length;

                const finishedItems = normalizedData.filter((p: any) =>
                    p.status === 'PROCESSO FINALIZADO' ||
                    p.status === 'FINALIZADO' ||
                    p.status === 'FINALIZADOS' ||
                    p.status === 'PROCESSO CONCLUÍDO' ||
                    p.status === 'CONCLUÍDO' ||
                    p.status === 'ORÇAMENTO FINALIZADO'
                );
                const finalizados = finishedItems.length;

                let totalDays = 0;
                let validItems = 0;
                const monthGroups: { [key: string]: { total: number, count: number } } = {};

                finishedItems.forEach((item: any) => {
                    // Como não temos updated_at, usamos data_execucao se disponível, senão usamos created_at (o que dará lead time 0 mas evita erro)
                    if (item.created_at) {
                        const start = new Date(item.created_at);
                        // Usar data_finalizacao se disponível, senão data_execucao, senão created_at
                        const end = item.data_finalizacao ? new Date(item.data_finalizacao) :
                            (item.data_execucao ? new Date(item.data_execucao) : new Date(item.created_at));

                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        totalDays += diffDays;
                        validItems++;

                        const monthKey = end.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                        if (!monthGroups[monthKey]) {
                            monthGroups[monthKey] = { total: 0, count: 0 };
                        }
                        monthGroups[monthKey].total += diffDays;
                        monthGroups[monthKey].count += 1;
                    }
                });

                const avgLeadTime = validItems > 0 ? Math.round(totalDays / validItems) : 0;

                const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
                    const [ma, ya] = a.split('/').map(Number);
                    const [mb, yb] = b.split('/').map(Number);
                    return new Date(ya, ma - 1).getTime() - new Date(yb, mb - 1).getTime();
                }).map(month => ({
                    month,
                    avg: Math.round(monthGroups[month].total / monthGroups[month].count)
                }));

                setMonthlyAvgData(sortedMonths);
                setMonthlyAvgData(sortedMonths);
                setCounts({ total, aguardando: aguardandoCliente, manutencao, finalizados, pendentePcp, aguardandoCliente, conferenciaFinal, avgLeadTime, aguardandoPeritagem: countAguardandoPeritagem });

                const clientCounts: { [key: string]: number } = {};
                normalizedData.forEach((p: any) => {
                    const clientName = p.cliente?.trim().toUpperCase() || 'SEM CLIENTE';
                    clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
                });

                const sortedClients = Object.entries(clientCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                setClientStats(sortedClients);
            } else {
                console.log('⚠️ Dashboard: Nenhum dado retornado da consulta.');
            }
        } catch (err) {
            console.error('💥 Erro ao buscar estatísticas do Dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            label: 'Aguardando Peritagem',
            value: counts.aguardandoPeritagem,
            icon: <Clock size={24} />,
            color: 'linear-gradient(135deg, #21408e 0%, #3b82f6 100%)',
            iconColor: '#ffffff',
            link: '/pcp/aguardando',
            show: isAdmin && role !== 'cliente'
        },
        {
            label: '1. Aprovação de Peritagem',
            value: counts.pendentePcp,
            icon: <FileText size={24} />,
            color: 'rgba(59, 130, 246, 0.15)',
            iconColor: '#3b82f6',
            link: '/pcp/aprovar',
            show: isAdmin && role !== 'cliente' && ['gestor', 'pcp'].includes(role || '')
        },
        {
            label: '2. Liberação do Pedido',
            value: counts.aguardandoCliente,
            icon: <DollarSign size={24} />,
            color: 'rgba(245, 158, 11, 0.15)',
            iconColor: '#f59e0b',
            link: '/pcp/liberar',
            show: isAdmin && role !== 'cliente' && ['gestor', 'pcp'].includes(role || '')
        },
        {
            label: '3. Cilindros em Manutenção',
            value: counts.manutencao,
            icon: <Wrench size={24} />,
            color: 'rgba(16, 185, 129, 0.15)',
            iconColor: '#10b981',
            link: '/manutencao',
            show: isAdmin && role !== 'cliente'
        },
        {
            label: '4. Conferência Final',
            value: counts.conferenciaFinal,
            icon: <CheckCircle2 size={24} />,
            color: 'rgba(15, 17, 42, 0.1)',
            iconColor: '#0f172a',
            link: '/pcp/finalizar',
            show: isAdmin && role !== 'cliente' && ['gestor', 'pcp'].includes(role || '')
        },
        {
            label: 'Finalizados',
            value: counts.finalizados,
            icon: <CheckCircle2 size={24} />,
            color: 'rgba(16, 185, 129, 0.15)',
            iconColor: '#10b981',
            link: role === 'cliente' ? '/meus-relatorios?status=finalizados' : '/peritagens?status=finalizados',
            show: true
        },
        {
            label: 'Tempo Médio (Dias)',
            value: counts.avgLeadTime,
            icon: <Timer size={24} />,
            color: 'rgba(99, 102, 241, 0.15)',
            iconColor: '#6366f1',
            link: '#',
            show: true
        },
    ];

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: (chart: any) => {
            const { ctx, chartArea: { width, height } } = chart;
            ctx.save();
            const total = chart.config.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);

            ctx.font = '800 2.5rem sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#334155';
            ctx.fillText(total.toString(), width / 2, height / 2 + 10);

            ctx.font = 'bold 0.7rem sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('TOTAL PERITAGENS', width / 2, height / 2 + 35);
            ctx.restore();
        }
    };

    const valueAtEndPlugin = {
        id: 'valueAtEnd',
        afterDatasetsDraw: (chart: any) => {
            const { ctx } = chart;
            const isHorizontal = chart.config.options.indexAxis === 'y';

            chart.data.datasets.forEach((dataset: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar: any, index: number) => {
                    const value = dataset.data[index];
                    if (value === 0) return;

                    ctx.save();
                    ctx.fillStyle = '#64748b';
                    ctx.font = 'bold 11px sans-serif';

                    if (isHorizontal) {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(value, bar.x + 8, bar.y);
                    } else {
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(value, bar.x, bar.y - 5);
                    }
                    ctx.restore();
                });
            });
        }
    };

    const barData = {
        labels: clientStats.length > 0 ? clientStats.map(s => s.name) : ['Sem dados'],
        datasets: [
            {
                label: 'Peritagens',
                data: clientStats.length > 0 ? clientStats.map(s => s.count) : [0],
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
                    gradient.addColorStop(0, '#3b82f6');
                    gradient.addColorStop(1, '#60a5fa');
                    return gradient;
                },
                borderRadius: 6,
                borderWidth: 0,
                barPercentage: 0.7,
                categoryPercentage: 0.8,
            },
        ],
    };

    const doughnutData = {
        labels: ['Finalizados', 'PCP Aprovação', 'Liberação Pedido', 'Oficina', 'Conferência'],
        datasets: [
            {
                data: [counts.finalizados, counts.pendentePcp, counts.aguardandoCliente, counts.manutencao, counts.conferenciaFinal],
                backgroundColor: [
                    '#059669',
                    '#2563eb',
                    '#d97706',
                    '#db2777',
                    '#1e293b'
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10,
                spacing: 2,
                borderRadius: 2
            },
        ],
    };

    const lineData = {
        labels: monthlyAvgData.length > 0 ? monthlyAvgData.map(d => d.month) : ['Sem dados'],
        datasets: [
            {
                label: 'Tempo Médio (Dias)',
                data: monthlyAvgData.length > 0 ? monthlyAvgData.map(d => d.avg) : [0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.4,
                fill: true,
                pointStyle: 'circle',
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const barOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                right: 40,
                bottom: 10,
                top: 10
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#ffffff',
                bodyColor: '#cbd5e1',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                titleFont: { size: 13, weight: 'bold' as any },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: '#f1f5f9',
                    drawTicks: false
                },
                ticks: {
                    stepSize: 5,
                    maxTicksLimit: 12,
                    font: { size: 10, weight: 'bold' as any },
                    color: '#64748b'
                },
                border: { display: false }
            },
            y: {
                grid: { display: false },
                ticks: {
                    font: { size: 10, weight: '600' as any },
                    color: '#475569',
                    autoSkip: false
                },
                border: { display: false }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart' as any
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: {
                position: 'right' as any,
                labels: {
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    padding: 15,
                    font: {
                        size: 11,
                        weight: '600' as any
                    },
                    color: '#475569'
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8,
                titleFont: { weight: 'bold' as any }
            }
        },
        animation: {
            animateRotate: true,
            animateScale: false,
            duration: 1000
        }
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8,
                titleFont: { weight: 'bold' as any }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { color: '#64748b' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#475569' }
            }
        }
    };

    return (
        <div className="dashboard-container" id="dashboard-page">
            <header className="dashboard-hero">
                <h1>{role === 'cliente' ? (clienteNome ? `Olá, ${clienteNome}` : 'Olá, Bem-vindo!') : 'Painel de Controle'}</h1>
                <p>
                    {role === 'cliente'
                        ? 'Acompanhe em tempo real o status das suas manutenções e o histórico de relatórios técnicos.'
                        : 'Gerenciamento centralizado de peritagens, orçamentos e fluxo de oficina.'}
                </p>
            </header>

            {loading ? (
                <div style={{ padding: '80px', textAlign: 'center', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="loader" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: '#64748b', fontWeight: 600 }}>Sincronizando estatísticas...</p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {stats.filter(s => s.show).map((stat, index) => (
                            <div
                                key={index}
                                className="stat-card clickable"
                                onClick={() => stat.link !== '#' && navigate(stat.link)}
                            >
                                <div className="stat-content">
                                    <div className="stat-icon-wrapper" style={{ background: stat.color, color: stat.iconColor }}>
                                        {stat.icon}
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">{stat.label}</span>
                                        <span className="stat-value">{stat.value}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="charts-grid">
                        {role !== 'cliente' ? (
                            <>
                                <div className="chart-card">
                                    <h3>Volume de Peritagens por Cliente</h3>
                                    <div className="chart-wrapper" style={{ height: `${Math.max(400, clientStats.length * 45)}px` }}>
                                        <Bar
                                            data={barData}
                                            options={barOptions}
                                            plugins={[valueAtEndPlugin]}
                                        />
                                    </div>
                                </div>
                                <div className="chart-card">
                                    <h3>Tempo Médio de Liberação (Mensal)</h3>
                                    <div style={{ height: '300px' }}>
                                        <Line data={lineData} options={lineOptions} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="chart-card">
                                <h3>Resumo de Processos</h3>
                                <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#059669' }}></div>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Finalizados</span>
                                        </div>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{counts.finalizados}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d97706' }}></div>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Em Andamento</span>
                                        </div>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{counts.manutencao + counts.aguardandoCliente}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb' }}></div>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Pendente Aprovação</span>
                                        </div>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{counts.pendentePcp}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="chart-card">
                            <h3>Distribuição de Status</h3>
                            <div style={{ height: '300px' }}>
                                <Doughnut
                                    data={doughnutData}
                                    options={doughnutOptions}
                                    plugins={[centerTextPlugin]}
                                />
                            </div>
                        </div>
                    </div>

                    {role === 'cliente' && (
                        <div className="action-grid">
                            <div className="action-card" onClick={() => navigate('/meus-relatorios')}>
                                <div>
                                    <h4>Meus Relatórios</h4>
                                    <p>Acesse o histórico completo de laudos técnicos.</p>
                                </div>
                                <ArrowRight size={24} color="#3b82f6" />
                            </div>
                            <div className="action-card" onClick={() => navigate('/databook')}>
                                <div>
                                    <h4>Data Books</h4>
                                    <p>Visualize certificados e documentação técnica.</p>
                                </div>
                                <ArrowRight size={24} color="#10b981" />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

