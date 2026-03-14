import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword,
            });

            if (authError) throw authError;

            if (data.user) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <header className="login-header">
                    <div className="logo-placeholder">
                        <img src="/logo.png" alt="HIDRAUP Logo" style={{ maxWidth: '180px' }} />
                    </div>
                    <h1>ACESSO AO SISTEMA DE PERITAGEM</h1>
                </header>

                <form className="login-form" onSubmit={handleLogin}>
                    {error && <div className="login-error">{error}</div>}

                    <div className="input-group">
                        <label htmlFor="email">E-mail</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Seu e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Senha</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#718096'
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <footer className="login-footer">
                    <a href="#forgot" className="forgot-link">Esqueci a senha</a>
                    <p className="no-account">
                        Não tem uma conta? <Link to="/register" className="create-account">Criar conta</Link>
                    </p>
                    <div className="dev-signature">
                        <p>Desenvolvido por <strong>Trust Tecnologia</strong></p>
                        <small>Soluções inteligentes para gestão industrial</small>
                    </div>
                </footer>
            </div>
        </div>
    );
};
