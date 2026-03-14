import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    FileText,
    PlusCircle,
    Wrench,
    FileSpreadsheet,
    Settings,
    LogOut,
    CheckCircle,
    ShoppingCart,
    ClipboardSignature,
    QrCode,
    Building2,
    Book,
    Clock,
    RefreshCcw,
    Folder
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role, user } = useAuth();

    // Notificações de Aguardando Peritagem
    const [aguardandoIds, setAguardandoIds] = useState<string[]>([]);
    const [seenIds, setSeenIds] = useState<string[]>([]);

    useEffect(() => {
        if (!['pcp', 'gestor', 'perito'].includes(role || '')) return;

        // Carregar do storage
        const stored = localStorage.getItem('seenAguardandoIds');
        if (stored) {
            try { setSeenIds(JSON.parse(stored)); } catch (e) { }
        }

        const fetchAguardando = async () => {
            const { data } = await supabase.from('aguardando_peritagem').select('id').eq('status', 'AGUARDANDO');
            if (data) setAguardandoIds(data.map(d => d.id));
        };

        fetchAguardando();

        // Inscrever-se para tempo real
        const channel = supabase.channel('aguardando_sidebar_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'aguardando_peritagem' }, () => {
                fetchAguardando();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role]);

    // Atualiza ids vistos quando entra na página
    useEffect(() => {
        if (location.pathname === '/pcp/aguardando') {
            setSeenIds(prev => {
                const newSeen = Array.from(new Set([...prev, ...aguardandoIds]));
                localStorage.setItem('seenAguardandoIds', JSON.stringify(newSeen));
                return newSeen;
            });
        }
    }, [location.pathname, aguardandoIds]);

    const newAguardandoCount = aguardandoIds.filter(id => !seenIds.includes(id)).length;

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            // Limpa o estado local redirecionando e recarregando para garantir
            navigate('/login');
            window.location.href = '/login';
        } catch (error) {
            console.error('Erro ao sair:', error);
            window.location.href = '/login';
        }
    };

    const handleLinkClick = () => {
        if (onClose && window.innerWidth <= 768) {
            onClose();
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <img src="/logo.png" alt="HIDRAUP Logo" style={{ maxWidth: '100%', height: 'auto' }} />
            </div>

            <nav className="sidebar-nav">
                {/* ACESSO COMUM: Painel visível para PCP e Gestor, ou todos no WEB se não for cliente */}
                {['gestor', 'pcp'].includes(role || '') && (
                    <NavLink to="/dashboard" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <LayoutDashboard size={20} />
                        <span>Painel</span>
                    </NavLink>
                )}

                {/* ACESSO ESPECÃFICO POR CARGO */}

                {/* 1. PERITO */}
                {role === 'perito' && (
                    <>
                        <NavLink to="/nova-peritagem" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <PlusCircle size={20} />
                            <span>Nova Peritagem</span>
                        </NavLink>
                        <NavLink to="/pcp/aguardando" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Clock size={20} />
                            <span>Aguardando Peritagem</span>
                            {newAguardandoCount > 0 && <div className="notification-badge">{newAguardandoCount}</div>}
                        </NavLink>
                        <NavLink to="/peritagens" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileText size={20} />
                            <span>Minhas Peritagens</span>
                        </NavLink>
                        <NavLink to="/peritagens?filter=recusada" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <RefreshCcw size={20} />
                            <span>Peritagens Recusadas</span>
                        </NavLink>
                    </>
                )}

                {/* 2. PCP */}
                {role === 'pcp' && (
                    <>
                        <NavLink to="/nova-peritagem" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <PlusCircle size={20} />
                            <span>Nova Peritagem</span>
                        </NavLink>
                        <NavLink to="/peritagens" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileText size={20} />
                            <span>Peritagens</span>
                        </NavLink>
                        <NavLink to="/relatorios" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileSpreadsheet size={20} />
                            <span>Relatórios</span>
                        </NavLink>
                        <NavLink to="/pcp/aguardando" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Clock size={20} />
                            <span>Aguardando Peritagem</span>
                            {newAguardandoCount > 0 && <div className="notification-badge">{newAguardandoCount}</div>}
                        </NavLink>
                        <NavLink to="/pcp/aprovar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <ClipboardSignature size={20} />
                            <span>1. Aprovação de Peritagem</span>
                        </NavLink>
                        <NavLink to="/pcp/liberar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <ShoppingCart size={20} />
                            <span>2. Liberação do Pedido</span>
                        </NavLink>
                        <NavLink to="/manutencao" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Wrench size={20} />
                            <span>3. Cilindros em Manutenção</span>
                        </NavLink>
                        <NavLink to="/pcp/finalizar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <CheckCircle size={20} />
                            <span>4. Conferência Final</span>
                        </NavLink>

                        <div className="sidebar-divider"></div>

                        <NavLink to="/registro-fotos" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Folder size={20} />
                            <span>Arquivo Geral (Fotos/Vídeos)</span>
                        </NavLink>
                        <NavLink to="/databook" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Book size={20} />
                            <span>Databook</span>
                        </NavLink>
                        <NavLink to="/workflow" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <RefreshCcw size={20} />
                            <span>Fluxo de QR code</span>
                        </NavLink>
                        <NavLink to="/qrcode" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <QrCode size={20} />
                            <span>Gerar QR code</span>
                        </NavLink>
                    </>
                )}

                {/* 3. MONTAGEM */}
                {role === 'montagem' && (
                    <>
                        <NavLink to="/nova-peritagem" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <PlusCircle size={20} />
                            <span>Nova Peritagem</span>
                        </NavLink>
                        <NavLink to="/peritagens" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileText size={20} />
                            <span>Minhas Peritagens</span>
                        </NavLink>
                        <NavLink to="/manutencao" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Wrench size={20} />
                            <span>Cilindros em Manutenção</span>
                        </NavLink>
                        <NavLink to="/workflow#etapa2" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <RefreshCcw size={20} />
                            <span>2. Montagem & Recuperação</span>
                        </NavLink>
                    </>
                )}

                {/* 4. COMERCIAL */}
                {role === 'comercial' && (
                    <>
                        <NavLink to="/nova-peritagem" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <PlusCircle size={20} />
                            <span>Nova Peritagem</span>
                        </NavLink>
                        <NavLink to="/peritagens" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileText size={20} />
                            <span>Minhas Peritagens</span>
                        </NavLink>
                        <NavLink to="/pcp/liberar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <ShoppingCart size={20} />
                            <span>Liberar Pedido</span>
                        </NavLink>
                    </>
                )}

                {/* 5. QUALIDADE */}
                {role === 'qualidade' && (
                    <>
                        <NavLink to="/workflow" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <RefreshCcw size={20} />
                            <span>Teste de Qualidade</span>
                        </NavLink>
                        <NavLink to="/pcp/finalizar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <CheckCircle size={20} />
                            <span>Conferência Final</span>
                        </NavLink>
                    </>
                )}

                {/* 6. CLIENTE */}
                {role === 'cliente' && (
                    <>
                        <NavLink to="/meus-relatorios" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileSpreadsheet size={20} />
                            <span>Relatórios</span>
                        </NavLink>
                        <NavLink to="/databook" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Book size={20} />
                            <span>Databook</span>
                        </NavLink>
                    </>
                )}

                {/* 7. GESTOR */}
                {role === 'gestor' && (
                    <>
                        <NavLink to="/nova-peritagem" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <PlusCircle size={20} />
                            <span>Nova Peritagem</span>
                        </NavLink>
                        <NavLink to="/peritagens" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileText size={20} />
                            <span>Peritagens</span>
                        </NavLink>
                        <NavLink to="/relatorios" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <FileSpreadsheet size={20} />
                            <span>Relatórios</span>
                        </NavLink>
                        <NavLink to="/pcp/aguardando" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Clock size={20} />
                            <span>Aguardando Peritagem</span>
                            {newAguardandoCount > 0 && <div className="notification-badge">{newAguardandoCount}</div>}
                        </NavLink>
                        <NavLink to="/pcp/aprovar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <ClipboardSignature size={20} />
                            <span>1. Aprovação de Peritagem</span>
                        </NavLink>
                        <NavLink to="/pcp/liberar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <ShoppingCart size={20} />
                            <span>2. Liberação do Pedido</span>
                        </NavLink>
                        <NavLink to="/manutencao" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Wrench size={20} />
                            <span>3. Cilindros em Manutenção</span>
                        </NavLink>
                        <NavLink to="/pcp/finalizar" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <CheckCircle size={20} />
                            <span>4. Conferência Final</span>
                        </NavLink>

                        <div className="sidebar-divider"></div>

                        <NavLink to="/registro-fotos" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Folder size={20} />
                            <span>Arquivo Geral (Fotos/Vídeos)</span>
                        </NavLink>
                        <NavLink to="/databook" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Book size={20} />
                            <span>Databook</span>
                        </NavLink>
                        <NavLink to="/workflow" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <RefreshCcw size={20} />
                            <span>Fluxo de QR code</span>
                        </NavLink>
                        <NavLink to="/qrcode" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <QrCode size={20} />
                            <span>Gerar QR code</span>
                        </NavLink>
                        <NavLink to="/admin/usuarios" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Settings size={20} />
                            <span>Gestão de Usuários</span>
                        </NavLink>
                        <NavLink to="/admin/empresas" onClick={handleLinkClick} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Building2 size={20} />
                            <span>Gestão de Clientes</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">
                        {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user?.email?.split('@')[0] || 'Usuário'}</span>
                        <span className="user-role">{role?.toUpperCase() || 'CARREGANDO...'}</span>
                    </div>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Sair</span>
                </button>
            </div>
        </aside >
    );
};

