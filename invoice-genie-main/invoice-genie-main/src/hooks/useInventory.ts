import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useCompany } from './useCompany';

type Product = Database['public']['Tables']['inventory_products']['Row'];
type ProductInsert = Database['public']['Tables']['inventory_products']['Insert'];
type ProductUpdate = Database['public']['Tables']['inventory_products']['Update'];
type Movement = Database['public']['Tables']['inventory_movements']['Row'];
type MovementInsert = Database['public']['Tables']['inventory_movements']['Insert'];

export interface ProductWithMovements extends Product {
    inventory_movements?: Movement[];
}

export function useInventory() {
    const queryClient = useQueryClient();
    const { company } = useCompany();

    const { data: products = [], isLoading, error } = useQuery({
        queryKey: ['inventory', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];

            const { data, error } = await supabase
                .from('inventory_products')
                .select('*')
                .eq('company_id', company.id)
                .order('descricao');

            if (error) throw error;
            return data as Product[];
        },
        enabled: !!company?.id,
    });

    const getProduct = async (id: string) => {
        const { data, error } = await supabase
            .from('inventory_products')
            .select('*, inventory_movements(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as ProductWithMovements;
    };

    const createProduct = useMutation({
        mutationFn: async (product: Omit<ProductInsert, 'company_id'>) => {
            if (!company?.id) throw new Error('Empresa não configurada');

            const { data, error } = await supabase
                .from('inventory_products')
                .insert({ ...product, company_id: company.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const updateProduct = useMutation({
        mutationFn: async ({ id, ...updateData }: ProductUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('inventory_products')
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const deleteProduct = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('inventory_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    const addMovement = useMutation({
        mutationFn: async (movement: Omit<MovementInsert, 'quantidade_anterior' | 'quantidade_posterior'> & { product_id: string }) => {
            // Get current quantity
            const { data: product, error: productError } = await supabase
                .from('inventory_products')
                .select('quantidade_atual')
                .eq('id', movement.product_id)
                .single();

            if (productError) throw productError;

            const quantidadeAnterior = product?.quantidade_atual || 0;
            let quantidadePosterior = quantidadeAnterior;

            if (movement.tipo === 'entrada') {
                quantidadePosterior = quantidadeAnterior + movement.quantidade;
            } else if (movement.tipo === 'saida') {
                quantidadePosterior = quantidadeAnterior - movement.quantidade;
            } else {
                quantidadePosterior = movement.quantidade; // ajuste
            }

            const { data, error } = await supabase
                .from('inventory_movements')
                .insert({
                    ...movement,
                    quantidade_anterior: quantidadeAnterior,
                    quantidade_posterior: quantidadePosterior,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });

    // Summary calculations
    const summary = {
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + (p.quantidade_atual || 0) * (p.preco_custo || 0), 0),
        lowStockCount: products.filter(p => (p.quantidade_atual || 0) <= (p.quantidade_minima || 0)).length,
        activeProducts: products.filter(p => p.ativo).length,
    };

    const lowStockProducts = products.filter(p =>
        p.ativo && (p.quantidade_atual || 0) <= (p.quantidade_minima || 0)
    );

    return {
        products,
        isLoading,
        error,
        getProduct,
        createProduct,
        updateProduct,
        deleteProduct,
        addMovement,
        summary,
        lowStockProducts,
    };
}
