import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCompany } from './useCompany';

type Transaction = Database['public']['Tables']['financial_transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['financial_transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['financial_transactions']['Update'];
type Category = Database['public']['Tables']['financial_categories']['Row'];
type CategoryInsert = Database['public']['Tables']['financial_categories']['Insert'];

export function useFinancial() {
    const queryClient = useQueryClient();
    const { company } = useCompany();

    // Transactions
    const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
        queryKey: ['transactions', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('company_id', company.id)
                .order('data_vencimento', { ascending: false });

            if (error) throw error;
            return data as Transaction[];
        },
        enabled: !!company?.id,
    });

    // Categories
    const { data: categories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['categories', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('financial_categories')
                .select('*')
                .eq('company_id', company.id)
                .order('nome');

            if (error) throw error;
            return data as Category[];
        },
        enabled: !!company?.id,
    });

    const createTransaction = useMutation({
        mutationFn: async (transaction: Omit<TransactionInsert, 'company_id'>) => {
            if (!company?.id) throw new Error('Empresa não configurada');

            const { data, error } = await supabase
                .from('financial_transactions')
                .insert({ ...transaction, company_id: company.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const updateTransaction = useMutation({
        mutationFn: async ({ id, ...updateData }: TransactionUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('financial_transactions')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const deleteTransaction = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const createCategory = useMutation({
        mutationFn: async (category: Omit<CategoryInsert, 'company_id'>) => {
            if (!company?.id) throw new Error('Empresa não configurada');

            const { data, error } = await supabase
                .from('financial_categories')
                .insert({ ...category, company_id: company.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });

    // Summary calculations
    const summary = {
        totalReceitas: transactions
            .filter(t => t.tipo === 'receita')
            .reduce((sum, t) => sum + (t.valor || 0), 0),
        totalDespesas: transactions
            .filter(t => t.tipo === 'despesa')
            .reduce((sum, t) => sum + (t.valor || 0), 0),
        saldo: 0,
        pendentes: transactions.filter(t => t.status === 'pendente').length,
        pagos: transactions.filter(t => t.status === 'pago').length,
        vencidos: transactions.filter(t => t.status === 'vencido').length,
    };
    summary.saldo = summary.totalReceitas - summary.totalDespesas;

    // Aging report
    const today = new Date();
    const aging = {
        aVencer: transactions.filter(t =>
            t.status === 'pendente' &&
            t.data_vencimento &&
            new Date(t.data_vencimento) >= today
        ),
        vencido1_30: transactions.filter(t => {
            if (t.status !== 'pendente' || !t.data_vencimento) return false;
            const dueDate = new Date(t.data_vencimento);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 30;
        }),
        vencido31_60: transactions.filter(t => {
            if (t.status !== 'pendente' || !t.data_vencimento) return false;
            const dueDate = new Date(t.data_vencimento);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays > 30 && diffDays <= 60;
        }),
        vencidoMais60: transactions.filter(t => {
            if (t.status !== 'pendente' || !t.data_vencimento) return false;
            const dueDate = new Date(t.data_vencimento);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays > 60;
        }),
    };

    return {
        transactions,
        categories,
        isLoading: loadingTransactions || loadingCategories,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        createCategory,
        summary,
        aging,
    };
}
