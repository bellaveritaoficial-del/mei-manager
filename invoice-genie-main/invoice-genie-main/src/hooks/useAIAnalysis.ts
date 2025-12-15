import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCompany } from './useCompany';

type AnalysisHistory = Database['public']['Tables']['ai_analysis_history']['Row'];
type BottleneckReport = Database['public']['Tables']['bottleneck_reports']['Row'];

interface AnalysisResult {
    insights: Array<{
        tipo: string;
        titulo: string;
        descricao: string;
        severidade: 'baixa' | 'media' | 'alta' | 'critica';
        recomendacao: string;
        valor_impacto?: number;
    }>;
    resumo: string;
}

export function useAIAnalysis() {
    const queryClient = useQueryClient();
    const { company } = useCompany();

    // Analysis history
    const { data: history = [], isLoading: loadingHistory } = useQuery({
        queryKey: ['ai-analysis', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('ai_analysis_history')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data as AnalysisHistory[];
        },
        enabled: !!company?.id,
    });

    // Bottleneck reports
    const { data: bottlenecks = [], isLoading: loadingBottlenecks } = useQuery({
        queryKey: ['bottlenecks', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('bottleneck_reports')
                .select('*')
                .eq('company_id', company.id)
                .eq('resolvido', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as BottleneckReport[];
        },
        enabled: !!company?.id,
    });

    // Run analysis using DeepSeek
    const runAnalysis = useMutation({
        mutationFn: async (tipo: string) => {
            if (!company?.id) throw new Error('Empresa não configurada');

            // Call Edge Function (to be deployed)
            const { data, error } = await supabase.functions.invoke('analyze-business', {
                body: {
                    company_id: company.id,
                    tipo,
                },
            });

            if (error) throw error;
            return data as AnalysisResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-analysis'] });
            queryClient.invalidateQueries({ queryKey: ['bottlenecks'] });
        },
    });

    // Mark bottleneck as resolved
    const resolveBottleneck = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('bottleneck_reports')
                .update({ resolvido: true })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bottlenecks'] });
        },
    });

    // Summary
    const bottleneckSummary = {
        total: bottlenecks.length,
        criticos: bottlenecks.filter(b => b.severidade === 'critica').length,
        altos: bottlenecks.filter(b => b.severidade === 'alta').length,
        medios: bottlenecks.filter(b => b.severidade === 'media').length,
        baixos: bottlenecks.filter(b => b.severidade === 'baixa').length,
    };

    return {
        history,
        bottlenecks,
        isLoading: loadingHistory || loadingBottlenecks,
        runAnalysis,
        resolveBottleneck,
        bottleneckSummary,
    };
}
