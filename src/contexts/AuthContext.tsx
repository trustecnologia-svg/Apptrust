
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

type UserRole = 'perito' | 'pcp' | 'gestor' | 'cliente' | 'montagem' | 'qualidade' | 'comercial' | null;

interface AuthContextType {
    session: Session | null;
    user: any | null;
    role: UserRole;
    status: string;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    status: '',
    loading: true,
    isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchRole(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchRole(session.user.id, session.user.email);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchRole = async (userId: string, userEmail?: string) => {
        console.log('🔍 Fetching role for user:', userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', userId)
                .single();

            console.log('📊 Role query result:', { data, error });

            if (error) {
                console.error('❌ Error fetching role:', error);
            }

            if (data) {
                console.log('✅ Role loaded:', data.role, 'Status:', data.status);
                setRole(data.role as UserRole);

                const isSuperAdmin = userEmail === 'matheus.stanley12@gmail.com';
                setStatus(isSuperAdmin ? 'APROVADO' : (data.status || 'PENDENTE'));
            } else {
                console.warn('⚠️ No role data found for user');
            }
        } catch (error) {
            console.error('💥 Exception fetching role:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        session,
        user: session?.user ?? null,
        role,
        status,
        loading,
        isAdmin: ['gestor', 'pcp', 'perito', 'montagem', 'qualidade', 'comercial'].includes(role || '')
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
