import React from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';

export const PendingApproval: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    color: '#D97706',
                    marginBottom: '24px'
                }}>
                    <Clock size={40} />
                </div>

                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    marginBottom: '16px'
                }}>
                    Cadastro em Análise
                </h1>

                <p style={{
                    fontSize: '1.1rem',
                    color: '#64748b',
                    lineHeight: '1.6',
                    marginBottom: '32px'
                }}>
                    Sua solicitação de acesso foi recebida e está aguardando aprovação de um administrador.
                    <br /><br />
                    Você receberá uma confirmação ou poderá tentar acessar novamente mais tarde.
                </p>

                <div style={{
                    padding: '16px',
                    background: '#EFF6FF',
                    borderRadius: '12px',
                    border: '1px solid #BFDBFE',
                    marginBottom: '32px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    textAlign: 'left'
                }}>
                    <ShieldAlert size={24} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.9rem', color: '#1E40AF' }}>
                        <strong>Atenção:</strong> Por motivos de segurança, você não poderá acessar o sistema até que seu cadastro seja validado.
                    </span>
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '14px',
                        background: '#ffffff',
                        color: '#64748b',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.color = '#334155';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#64748b';
                    }}
                >
                    <LogOut size={20} />
                    Voltar para Login
                </button>
            </div>

            <p style={{ marginTop: '24px', color: '#94a3b8', fontSize: '0.9rem' }}>
                &copy; {new Date().getFullYear()} Hidraup. Todos os direitos reservados.
            </p>
        </div>
    );
};
