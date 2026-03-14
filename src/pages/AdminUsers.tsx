
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './AdminUsers.css';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    created_at: string;
    empresa_id: string | null;
}

interface Empresa {
    id: string;
    nome: string;
}

export const AdminUsers: React.FC = () => {
    const { role, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);

    if (authLoading) return <div>Carregando permissões...</div>;

    // Trava de segurança extra: Apenas Gestor pode acessar
    if (role !== 'gestor') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        fetchUsers();
        fetchEmpresas();
    }, []);

    const HIDDEN_EMAILS = ['matheus.stanley12@gmail.com'];

    const fetchEmpresas = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            setEmpresas(data || []);
        } catch (error: any) {
            console.error('Erro ao buscar empresas:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            // Filtra usuários ocultos
            const visibleUsers = (data || []).filter(u => !HIDDEN_EMAILS.includes(u.email));
            setUsers(visibleUsers);
        } catch (error: any) {
            console.error('Erro ao buscar usuários:', error);
            alert('Não foi possível carregar os usuários.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const user = users.find(u => u.id === id);
        if (!user) return;

        // Se estiver aprovando um cliente, deve ter empresa_id selecionado
        if (newStatus === 'APROVADO' && user.role === 'cliente' && !user.empresa_id) {
            alert('Para aprovar um CLIENTE, você deve primeiro selecionar a EMPRESA na coluna correspondente.');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            setUsers(prevUsers => prevUsers.map(u =>
                u.id === id ? { ...u, status: newStatus } : u
            ));

            if (newStatus === 'APROVADO') {
                const empresaNome = empresas.find(e => e.id === user.empresa_id)?.nome;
                const msg = user.role === 'cliente'
                    ? `Cliente ${user.full_name} aprovado e vinculado à ${empresaNome}!`
                    : `Usuário ${user.full_name || user.email} aprovado com sucesso!`;
                alert(msg);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status do usuário.');
        }
    };

    const handleUpdateRole = async (id: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', id);

            if (error) throw error;
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (error) {
            alert('Erro ao atualizar função.');
        }
    };

    const handleUpdateEmpresa = async (id: string, empresaId: string | null) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ empresa_id: empresaId })
                .eq('id', id);

            if (error) throw error;
            setUsers(users.map(u => u.id === id ? { ...u, empresa_id: empresaId } : u));
        } catch (error) {
            alert('Erro ao atualizar empresa.');
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário ${name || 'este usuário'}?`)) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
            alert('Usuário excluído com sucesso!');
        } catch (error: any) {
            console.error('Erro ao excluir usuário:', error);
            alert('Erro ao excluir usuário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-users-container">
            <h1 className="page-title">Gestão de Usuários</h1>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Carregando usuários...</p>
                </div>
            )}

            {!loading && users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Nenhum usuário encontrado.</p>
                </div>
            )}

            {!loading && users.length > 0 && (
                <div className="users-list">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Função</th>
                                <th>Empresa</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const empresaAtual = empresas.find(e => e.id === user.empresa_id);
                                return (
                                    <tr key={user.id}>
                                        <td>{user.full_name || 'Sem nome'}</td>
                                        <td>{user.email || 'N/A'}</td>
                                        <td>
                                            <select
                                                value={user.role || 'perito'}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className="role-select"
                                            >
                                                <option value="perito">Perito</option>
                                                <option value="pcp">PCP</option>
                                                <option value="montagem">Montagem</option>
                                                <option value="qualidade">Qualidade</option>
                                                <option value="comercial">Comercial</option>
                                                <option value="gestor">Gestor</option>
                                                <option value="cliente">Cliente</option>
                                            </select>
                                        </td>
                                        <td>
                                            {user.role === 'cliente' ? (
                                                <select
                                                    value={user.empresa_id || ''}
                                                    onChange={(e) => handleUpdateEmpresa(user.id, e.target.value || null)}
                                                    className="role-select"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {empresas.map(empresa => (
                                                        <option key={empresa.id} value={empresa.id}>
                                                            {empresa.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span style={{ color: '#999', fontStyle: 'italic' }}>
                                                    {empresaAtual ? empresaAtual.nome : 'N/A'}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.status?.toLowerCase()}`}>
                                                {user.status || 'PENDENTE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {user.status !== 'APROVADO' && (
                                                    <button className="btn-approve-user" onClick={() => handleUpdateStatus(user.id, 'APROVADO')} title="Aprovar">
                                                        <Check size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-delete-user"
                                                    title="Excluir Usuário"
                                                    onClick={() => handleDeleteUser(user.id, user.full_name)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
