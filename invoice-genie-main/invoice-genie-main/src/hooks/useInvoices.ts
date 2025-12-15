import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCompany } from './useCompany';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

export interface InvoiceWithItems extends Invoice {
    invoice_items: InvoiceItem[];
}

export function useInvoices() {
    const queryClient = useQueryClient();
    const { company } = useCompany();

    console.log('[useInvoices] Hook inicializado, company:', company?.id);

    const { data: invoices = [], isLoading, error } = useQuery({
        queryKey: ['invoices', company?.id],
        queryFn: async () => {
            if (!company?.id) {
                console.log('[useInvoices] Sem company_id, retornando vazio');
                return [];
            }

            console.log('[useInvoices] Buscando notas fiscais...');
            const { data, error } = await supabase
                .from('invoices')
                .select('*, invoice_items(*)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[useInvoices] Erro ao buscar:', error);
                throw error;
            }

            console.log('[useInvoices] Notas encontradas:', data?.length || 0);
            return data as InvoiceWithItems[];
        },
        enabled: !!company?.id,
    });

    const getInvoice = async (id: string) => {
        console.log('[useInvoices] Buscando nota:', id);
        const { data, error } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('[useInvoices] Erro ao buscar nota:', error);
            throw error;
        }
        console.log('[useInvoices] Nota encontrada:', data?.numero);
        return data as InvoiceWithItems;
    };

    const createInvoice = useMutation({
        mutationFn: async ({ invoice, items }: { invoice: Omit<InvoiceInsert, 'company_id'>; items?: Omit<InvoiceItemInsert, 'invoice_id'>[] }) => {
            if (!company?.id) throw new Error('Empresa não configurada');

            console.log('[useInvoices] Criando nota fiscal...', { numero: invoice.numero, items: items?.length });

            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert({ ...invoice, company_id: company.id })
                .select()
                .single();

            if (invoiceError) {
                console.error('[useInvoices] Erro ao criar nota:', invoiceError);
                throw invoiceError;
            }

            console.log('[useInvoices] Nota criada:', invoiceData.id);

            if (items && items.length > 0) {
                const itemsWithInvoiceId = items.map(item => ({
                    ...item,
                    invoice_id: invoiceData.id,
                }));

                console.log('[useInvoices] Inserindo itens:', itemsWithInvoiceId.length);
                const { error: itemsError } = await supabase
                    .from('invoice_items')
                    .insert(itemsWithInvoiceId);

                if (itemsError) {
                    console.error('[useInvoices] Erro ao inserir itens:', itemsError);
                    throw itemsError;
                }
            }

            return invoiceData;
        },
        onSuccess: () => {
            console.log('[useInvoices] Invalidando cache...');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        },
    });

    const updateInvoice = useMutation({
        mutationFn: async ({ id, ...updateData }: InvoiceUpdate & { id: string }) => {
            console.log('[useInvoices] Atualizando nota:', id);
            const { data, error } = await supabase
                .from('invoices')
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[useInvoices] Erro ao atualizar:', error);
                throw error;
            }
            console.log('[useInvoices] Nota atualizada');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        },
    });

    const deleteInvoice = useMutation({
        mutationFn: async (id: string) => {
            console.log('[useInvoices] Deletando nota:', id);
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('[useInvoices] Erro ao deletar:', error);
                throw error;
            }
            console.log('[useInvoices] Nota deletada');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        },
    });

    // Calculate financial summary from real data
    const financialSummary = {
        totalReceitas: invoices
            .filter(inv => inv.tipo_operacao === 1)
            .reduce((sum, inv) => sum + (inv.valor_total_nota || 0), 0),
        totalDespesas: invoices
            .filter(inv => inv.tipo_operacao === 0)
            .reduce((sum, inv) => sum + (inv.valor_total_nota || 0), 0),
        saldo: 0,
        notasPendentes: invoices.filter(inv => inv.status === 'pendente').length,
        notasPagas: invoices.filter(inv => inv.status === 'pago').length,
        notasVencidas: invoices.filter(inv => inv.status === 'vencido').length,
    };
    financialSummary.saldo = financialSummary.totalReceitas - financialSummary.totalDespesas;

    console.log('[useInvoices] Resumo financeiro:', financialSummary);

    return {
        invoices,
        isLoading,
        error,
        getInvoice,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        financialSummary,
    };
}
