import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X, ArrowLeft } from 'lucide-react';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Hide back button on main landing pages to avoid confusion
    const isMainPage = ['/dashboard', '/meus-relatorios', '/pcp/aguardando'].includes(location.pathname);

    return (
        <div className="layout-root">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn">
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    {!isMainPage && (
                        <button className="back-btn-pill mobile-back" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                </div>
                <img src="/logo.png" alt="Logo" className="mobile-logo" />
            </header>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="main-content">
                {!isMainPage && (
                    <div className="layout-back-container desktop-only">
                        <button className="back-btn-pill" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                )}
                {children}
            </main>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};
