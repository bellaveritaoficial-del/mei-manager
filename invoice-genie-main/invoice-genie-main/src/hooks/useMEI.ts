import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { toast } from 'sonner';

type MEIConfig = Database['public']['Tables']['mei_config']['Row'];

export const useMEI = () => {
    const queryClient = useQueryClient();

    const fetchConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('mei_config')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'

        // If config doesn't exist, create default
        if (!data) {
            const { data: newData, error: createError } = await supabase
                .from('mei_config')
                // @ts-ignore
                .insert([{
                    user_id: user.id,
                    annual_limit: 81000,
                    alert_threshold: 80
                }])
                .select()
                .single();

            if (createError) throw createError;
            return newData;
        }

        return data;
    };

    const { data: config, isLoading } = useQuery({
        queryKey: ['mei_config'],
        queryFn: fetchConfig,
    });

    const updateConfig = useMutation({
        mutationFn: async (newConfig: Partial<MEIConfig>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('mei_config')
                // @ts-ignore
                .update(newConfig)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mei_config'] });
            toast.success('Configurações MEI atualizadas');
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar configurações: ${error.message}`);
        }
    });

    return {
        config,
        isLoading,
        updateConfig,
    };
};
