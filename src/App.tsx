import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// Lazy Load Pages
const LoginPage = React.lazy(() => import('./pages/Login').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/Register').then(module => ({ default: module.RegisterPage })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Peritagens = React.lazy(() => import('./pages/Peritagens').then(module => ({ default: module.Peritagens })));
const Relatorios = React.lazy(() => import('./pages/Relatorios').then(module => ({ default: module.Relatorios })));
const NovaPeritagem = React.lazy(() => import('./pages/NovaPeritagem').then(module => ({ default: module.NovaPeritagem })));
const Clientes = React.lazy(() => import('./pages/Clientes').then(module => ({ default: module.Clientes })));
const Manutencao = React.lazy(() => import('./pages/Manutencao').then(module => ({ default: module.Manutencao })));
const PcpAprovaPeritagem = React.lazy(() => import('./pages/PcpAprovaPeritagem').then(module => ({ default: module.PcpAprovaPeritagem })));
const PcpLiberaPedido = React.lazy(() => import('./pages/PcpLiberaPedido').then(module => ({ default: module.PcpLiberaPedido })));
const PcpFinalizaProcesso = React.lazy(() => import('./pages/PcpFinalizaProcesso').then(module => ({ default: module.PcpFinalizaProcesso })));
const RegistroFotos = React.lazy(() => import('./pages/RegistroFotos').then(module => ({ default: module.RegistroFotos })));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminEmpresas = React.lazy(() => import('./pages/AdminEmpresas').then(module => ({ default: module.AdminEmpresas })));
const ClientPeritagens = React.lazy(() => import('./pages/ClientPeritagens').then(module => ({ default: module.ClientPeritagens })));
const DataBook = React.lazy(() => import('./pages/DataBook').then(module => ({ default: module.DataBook })));
const AguardandoPeritagem = React.lazy(() => import('./pages/AguardandoPeritagem').then(module => ({ default: module.AguardandoPeritagem })));
const PendingApproval = React.lazy(() => import('./pages/PendingApproval').then(module => ({ default: module.PendingApproval })));
const WorkflowPage = React.lazy(() => import('./pages/Workflow').then(module => ({ default: module.WorkflowPage })));

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="loader" style={{
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #3498db',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { session, role, status, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Carregando...</div>;

  if (!session) return <Navigate to="/login" />;

  const currentPath = window.location.pathname;

  // Verificação de Status (Bloqueia acesso se não estiver APROVADO)
  if (status !== 'APROVADO') {
    return <Navigate to="/pending-approval" />;
  }

  // Se for cliente, redireciona se tentar acessar rotas internas
  if (role === 'cliente' && currentPath !== '/meus-relatorios' && currentPath !== '/databook' && !currentPath.startsWith('/view-report')) {
    return <Navigate to="/meus-relatorios" />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirecionamento padrão baseado no cargo se não tiver permissão
    const redirectMap: Record<string, string> = {
      perito: '/pcp/aguardando',
      montagem: '/nova-peritagem',
      comercial: '/nova-peritagem',
      qualidade: '/pcp/finalizar',
      cliente: '/meus-relatorios',
      pcp: '/dashboard',
      gestor: '/dashboard'
    };
    return <Navigate to={redirectMap[role] || "/login"} />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { session, loading, role, status } = useAuth();

  if (loading) return null;

  const rolePaths: Record<string, string> = {
    gestor: "/dashboard",
    pcp: "/dashboard",
    perito: "/pcp/aguardando",
    montagem: "/nova-peritagem",
    comercial: "/nova-peritagem",
    qualidade: "/pcp/finalizar",
    cliente: "/meus-relatorios"
  };

  const defaultPath = role ? (rolePaths[role] || "/login") : (session ? "/pending-approval" : "/login");

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to={defaultPath} /> : <LoginPage />} />
        <Route path="/register" element={session ? <Navigate to={defaultPath} /> : <RegisterPage />} />
        <Route path="/pending-approval" element={session ? (status === 'APROVADO' ? <Navigate to={defaultPath} /> : <PendingApproval />) : <Navigate to="/login" />} />


        <Route path="/" element={<Navigate to={session ? defaultPath : "/login"} replace />} />

        {/* Rotas Protegidas */}
        <Route path="/dashboard" element={<PrivateRoute allowedRoles={['gestor', 'pcp']}><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/peritagens" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'perito', 'montagem', 'comercial']}><Layout><Peritagens /></Layout></PrivateRoute>} />
        <Route path="/clientes" element={<PrivateRoute allowedRoles={['gestor', 'pcp']}><Layout><Clientes /></Layout></PrivateRoute>} />
        <Route path="/manutencao" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'montagem']}><Layout><Manutencao /></Layout></PrivateRoute>} />
        <Route path="/relatorios" element={<PrivateRoute allowedRoles={['gestor', 'pcp']}><Layout><Relatorios /></Layout></PrivateRoute>} />
        <Route path="/registro-fotos" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'perito', 'montagem', 'qualidade', 'comercial']}><Layout><RegistroFotos /></Layout></PrivateRoute>} />
        <Route path="/workflow" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'montagem', 'qualidade']}><Layout><WorkflowPage /></Layout></PrivateRoute>} />
        <Route path="/nova-peritagem" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'perito', 'montagem', 'comercial']}><Layout><NovaPeritagem /></Layout></PrivateRoute>} />
        <Route path="/databook" element={<PrivateRoute allowedRoles={['gestor', 'pcp', 'perito', 'cliente', 'montagem', 'qualidade', 'comercial']}><Layout><DataBook /></Layout></PrivateRoute>} />

        {/* Rota Exclusiva Cliente */}
        <Route path="/meus-relatorios" element={<PrivateRoute allowedRoles={['cliente']}><Layout><ClientPeritagens /></Layout></PrivateRoute>} />

        {/* Rotas de Fluxo PCP */}
        <Route path="/pcp/aguardando" element={<PrivateRoute allowedRoles={['pcp', 'gestor', 'perito']}><Layout><AguardandoPeritagem /></Layout></PrivateRoute>} />
        <Route path="/pcp/aprovar" element={<PrivateRoute allowedRoles={['pcp', 'gestor']}><Layout><PcpAprovaPeritagem /></Layout></PrivateRoute>} />
        <Route path="/pcp/liberar" element={<PrivateRoute allowedRoles={['pcp', 'gestor', 'comercial']}><Layout><PcpLiberaPedido /></Layout></PrivateRoute>} />
        <Route path="/pcp/finalizar" element={<PrivateRoute allowedRoles={['pcp', 'gestor', 'qualidade']}><Layout><PcpFinalizaProcesso /></Layout></PrivateRoute>} />

        {/* Rota Exclusiva Gestor */}
        <Route path="/admin/usuarios" element={
          <PrivateRoute allowedRoles={['gestor']}>
            <Layout><AdminUsers /></Layout>
          </PrivateRoute>
        } />
        <Route path="/admin/empresas" element={
          <PrivateRoute allowedRoles={['gestor']}>
            <Layout><AdminEmpresas /></Layout>
          </PrivateRoute>
        } />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
