import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export function useCompany() {
    const queryClient = useQueryClient();

    console.log('[useCompany] Hook inicializado');

    const { data: company, isLoading, error } = useQuery({
        queryKey: ['company'],
        queryFn: async () => {
            console.log('[useCompany] Buscando empresa do usuário...');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('[useCompany] Usuário não autenticado');
                return null;
            }

            console.log('[useCompany] Usuário:', user.id);
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[useCompany] Erro ao buscar empresa:', error);
                throw error;
            }

            console.log('[useCompany] Empresa encontrada:', data?.razao_social || 'Nenhuma');
            return data as Company | null;
        },
    });

    const createCompany = useMutation({
        mutationFn: async (companyData: Omit<CompanyInsert, 'user_id'>) => {
            console.log('[useCompany] Criando empresa...', companyData.razao_social);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data, error } = await supabase
                .from('companies')
                .insert({ ...companyData, user_id: user.id })
                .select()
                .single();

            if (error) {
                console.error('[useCompany] Erro ao criar empresa:', error);
                throw error;
            }

            console.log('[useCompany] Empresa criada:', data.id);
            return data;
        },
        onSuccess: () => {
            console.log('[useCompany] Invalidando cache...');
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
    });

    const updateCompany = useMutation({
        mutationFn: async ({ id, ...updateData }: CompanyUpdate & { id: string }) => {
            console.log('[useCompany] Atualizando empresa:', id);
            const { data, error } = await supabase
                .from('companies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[useCompany] Erro ao atualizar:', error);
                throw error;
            }

            console.log('[useCompany] Empresa atualizada');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
    });

    console.log('[useCompany] Estado atual:', { hasCompany: !!company, isLoading });

    return {
        company,
        isLoading,
        error,
        createCompany,
        updateCompany,
        hasCompany: !!company,
    };
}
