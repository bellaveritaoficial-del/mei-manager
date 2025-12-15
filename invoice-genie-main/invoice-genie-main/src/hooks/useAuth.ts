import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    console.log('[useAuth] Hook inicializado');

    useEffect(() => {
        // Get initial session
        console.log('[useAuth] Verificando sessão inicial...');
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[useAuth] Sessão inicial:', session ? 'Autenticado' : 'Não autenticado');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[useAuth] Mudança de estado:', event, session?.user?.email);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            console.log('[useAuth] Cancelando subscription');
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        console.log('[useAuth] Tentando login:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            console.error('[useAuth] Erro no login:', error);
            throw error;
        }
        console.log('[useAuth] Login bem-sucedido:', data.user?.email);
        return data;
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        console.log('[useAuth] Tentando cadastro:', email, fullName);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });
        if (error) {
            console.error('[useAuth] Erro no cadastro:', error);
            throw error;
        }
        console.log('[useAuth] Cadastro bem-sucedido:', data.user?.email);
        return data;
    };

    const signOut = async () => {
        console.log('[useAuth] Fazendo logout...');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('[useAuth] Erro no logout:', error);
            throw error;
        }
        console.log('[useAuth] Logout bem-sucedido');
        navigate('/auth');
    };

    console.log('[useAuth] Estado:', { isAuthenticated: !!session, loading, user: user?.email });

    return {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!session,
    };
}
