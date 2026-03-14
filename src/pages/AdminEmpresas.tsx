import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './AdminEmpresas.css';

interface Empresa {
    id: string;
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    ativo: boolean;
    created_at: string;
}

export const AdminEmpresas: React.FC = () => {
    const { role, loading: authLoading } = useAuth();
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        email: '',
        ativo: true
    });

    if (authLoading) return <div>Carregando permissões...</div>;

    if (role !== 'gestor') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .order('nome');

            if (error) throw error;
            setEmpresas(data || []);
        } catch (error: any) {
            console.error('Erro ao buscar empresas:', error);
            alert('Não foi possível carregar as empresas.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (empresa?: Empresa) => {
        if (empresa) {
            setEditingEmpresa(empresa);
            setFormData({
                nome: empresa.nome,
                cnpj: empresa.cnpj || '',
                endereco: empresa.endereco || '',
                telefone: empresa.telefone || '',
                email: empresa.email || '',
                ativo: empresa.ativo
            });
        } else {
            setEditingEmpresa(null);
            setFormData({
                nome: '',
                cnpj: '',
                endereco: '',
                telefone: '',
                email: '',
                ativo: true
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmpresa(null);
        setFormData({
            nome: '',
            cnpj: '',
            endereco: '',
            telefone: '',
            email: '',
            ativo: true
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingEmpresa) {
                // Atualizar empresa existente
                const { error } = await supabase
                    .from('empresas')
                    .update({
                        nome: formData.nome,
                        cnpj: formData.cnpj || null,
                        endereco: formData.endereco || null,
                        telefone: formData.telefone || null,
                        email: formData.email || null,
                        ativo: formData.ativo,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingEmpresa.id);

                if (error) throw error;
                alert('Empresa atualizada com sucesso!');
            } else {
                // Criar nova empresa
                const { error } = await supabase
                    .from('empresas')
                    .insert([{
                        nome: formData.nome,
                        cnpj: formData.cnpj || null,
                        endereco: formData.endereco || null,
                        telefone: formData.telefone || null,
                        email: formData.email || null,
                        ativo: formData.ativo
                    }]);

                if (error) throw error;
                alert('Empresa criada com sucesso!');
            }

            handleCloseModal();
            fetchEmpresas();
        } catch (error: any) {
            console.error('Erro ao salvar empresa:', error);
            alert('Erro ao salvar empresa: ' + error.message);
        }
    };

    const handleDelete = async (id: string, nome: string) => {
        if (!window.confirm(`ATENÇÃO: Excluir a empresa ${nome} irá apagar permanentemente TODOS os usuários e dados vinculados a ela. Deseja continuar?`)) return;

        try {
            const { error } = await supabase
                .from('empresas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            alert('Empresa excluída com sucesso!');
            fetchEmpresas();
        } catch (error: any) {
            console.error('Erro ao excluir empresa:', error);
            alert('Erro ao excluir empresa: ' + error.message);
        }
    };

    return (
        <div className="admin-empresas-container">
            <div className="page-header">
                <h1 className="page-title">
                    <Building2 size={32} />
                    Gestão de Clientes
                </h1>
                <button className="btn-add-empresa" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Carregando clientes...</p>
                </div>
            )}

            {!loading && empresas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Nenhum cliente cadastrado.</p>
                </div>
            )}

            {!loading && empresas.length > 0 && (
                <div className="empresas-grid">
                    {empresas.map(empresa => (
                        <div key={empresa.id} className={`empresa-card ${!empresa.ativo ? 'inativa' : ''}`}>
                            <div className="empresa-header">
                                <h3>{empresa.nome}</h3>
                                <span className={`status-badge ${empresa.ativo ? 'ativo' : 'inativo'}`}>
                                    {empresa.ativo ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                            <div className="empresa-info">
                                {empresa.cnpj && <p><strong>CNPJ:</strong> {empresa.cnpj}</p>}
                                {empresa.endereco && <p><strong>Endereço:</strong> {empresa.endereco}</p>}
                                {empresa.telefone && <p><strong>Telefone:</strong> {empresa.telefone}</p>}
                                {empresa.email && <p><strong>Email:</strong> {empresa.email}</p>}
                            </div>
                            <div className="empresa-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => handleOpenModal(empresa)}
                                    title="Editar"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDelete(empresa.id, empresa.nome)}
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingEmpresa ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="nome">Nome do Cliente *</label>
                                <input
                                    type="text"
                                    id="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="cnpj">CNPJ</label>
                                <input
                                    type="text"
                                    id="cnpj"
                                    value={formData.cnpj}
                                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="endereco">Endereço</label>
                                <input
                                    type="text"
                                    id="endereco"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="telefone">Telefone</label>
                                <input
                                    type="text"
                                    id="telefone"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                    placeholder="(00) 0000-0000"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.ativo}
                                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                    />
                                    Cliente Ativo
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-save">
                                    {editingEmpresa ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
