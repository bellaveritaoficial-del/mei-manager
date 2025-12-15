export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string | null
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string | null
                }
            }
            companies: {
                Row: {
                    id: string
                    user_id: string | null
                    razao_social: string
                    nome_fantasia: string | null
                    cnpj: string
                    inscricao_estadual: string | null
                    inscricao_municipal: string | null
                    endereco: string | null
                    numero: string | null
                    bairro: string | null
                    municipio: string
                    uf: string
                    cep: string | null
                    telefone: string | null
                    email: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    razao_social: string
                    nome_fantasia?: string | null
                    cnpj: string
                    inscricao_estadual?: string | null
                    inscricao_municipal?: string | null
                    endereco?: string | null
                    numero?: string | null
                    bairro?: string | null
                    municipio: string
                    uf: string
                    cep?: string | null
                    telefone?: string | null
                    email?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    razao_social?: string
                    nome_fantasia?: string | null
                    cnpj?: string
                    inscricao_estadual?: string | null
                    inscricao_municipal?: string | null
                    endereco?: string | null
                    numero?: string | null
                    bairro?: string | null
                    municipio?: string
                    uf?: string
                    cep?: string | null
                    telefone?: string | null
                    email?: string | null
                    created_at?: string | null
                }
            }
            invoices: {
                Row: {
                    id: string
                    company_id: string | null
                    numero: string
                    serie: string | null
                    chave_acesso: string | null
                    protocolo_autorizacao: string | null
                    data_hora_autorizacao: string | null
                    natureza_operacao: string | null
                    tipo_operacao: number | null
                    finalidade: number | null
                    data_emissao: string
                    hora_emissao: string | null
                    data_saida: string | null
                    hora_saida: string | null
                    dest_razao_social: string | null
                    dest_cnpj: string | null
                    dest_inscricao_estadual: string | null
                    dest_endereco: string | null
                    dest_municipio: string | null
                    dest_uf: string | null
                    dest_cep: string | null
                    dest_telefone: string | null
                    dest_email: string | null
                    base_calculo_icms: number | null
                    valor_icms: number | null
                    bc_icms: number | null
                    bc_icms_st: number | null
                    valor_icms_st: number | null
                    valor_total_produtos: number | null
                    valor_frete: number | null
                    valor_seguro: number | null
                    desconto: number | null
                    outras_despesas: number | null
                    valor_ipi: number | null
                    valor_pis: number | null
                    valor_cofins: number | null
                    valor_ii: number | null
                    valor_issqn: number | null
                    valor_aproximado_tributos: number | null
                    valor_total_nota: number
                    informacoes_adicionais: string | null
                    informacoes_fisco: string | null
                    status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    image_url: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    numero: string
                    serie?: string | null
                    chave_acesso?: string | null
                    protocolo_autorizacao?: string | null
                    data_hora_autorizacao?: string | null
                    natureza_operacao?: string | null
                    tipo_operacao?: number | null
                    finalidade?: number | null
                    data_emissao: string
                    hora_emissao?: string | null
                    data_saida?: string | null
                    hora_saida?: string | null
                    dest_razao_social?: string | null
                    dest_cnpj?: string | null
                    dest_inscricao_estadual?: string | null
                    dest_endereco?: string | null
                    dest_municipio?: string | null
                    dest_uf?: string | null
                    dest_cep?: string | null
                    dest_telefone?: string | null
                    dest_email?: string | null
                    base_calculo_icms?: number | null
                    valor_icms?: number | null
                    valor_total_produtos?: number | null
                    valor_frete?: number | null
                    valor_seguro?: number | null
                    desconto?: number | null
                    valor_ipi?: number | null
                    valor_pis?: number | null
                    valor_cofins?: number | null
                    valor_total_nota: number
                    informacoes_adicionais?: string | null
                    informacoes_fisco?: string | null
                    status?: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    image_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    numero?: string
                    serie?: string | null
                    chave_acesso?: string | null
                    protocolo_autorizacao?: string | null
                    data_hora_autorizacao?: string | null
                    natureza_operacao?: string | null
                    tipo_operacao?: number | null
                    finalidade?: number | null
                    data_emissao?: string
                    hora_emissao?: string | null
                    data_saida?: string | null
                    hora_saida?: string | null
                    dest_razao_social?: string | null
                    dest_cnpj?: string | null
                    dest_inscricao_estadual?: string | null
                    dest_endereco?: string | null
                    dest_municipio?: string | null
                    dest_uf?: string | null
                    dest_cep?: string | null
                    dest_telefone?: string | null
                    dest_email?: string | null
                    base_calculo_icms?: number | null
                    valor_icms?: number | null
                    valor_total_produtos?: number | null
                    valor_frete?: number | null
                    valor_seguro?: number | null
                    desconto?: number | null
                    valor_ipi?: number | null
                    valor_pis?: number | null
                    valor_cofins?: number | null
                    valor_total_nota?: number
                    informacoes_adicionais?: string | null
                    informacoes_fisco?: string | null
                    status?: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    image_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            invoice_items: {
                Row: {
                    id: string
                    invoice_id: string | null
                    codigo: string | null
                    descricao: string
                    ncm: string | null
                    cest: string | null
                    cfop: string | null
                    unidade: string | null
                    quantidade: number
                    valor_unitario: number
                    valor_total: number
                    valor_desconto: number | null
                    bc_icms: number | null
                    valor_icms: number | null
                    aliq_icms: number | null
                    valor_ipi: number | null
                    aliq_ipi: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    invoice_id?: string | null
                    codigo?: string | null
                    descricao: string
                    ncm?: string | null
                    cest?: string | null
                    cfop?: string | null
                    unidade?: string | null
                    quantidade: number
                    valor_unitario: number
                    valor_total: number
                    valor_desconto?: number | null
                    bc_icms?: number | null
                    valor_icms?: number | null
                    aliq_icms?: number | null
                    valor_ipi?: number | null
                    aliq_ipi?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    invoice_id?: string | null
                    codigo?: string | null
                    descricao?: string
                    ncm?: string | null
                    cest?: string | null
                    cfop?: string | null
                    unidade?: string | null
                    quantidade?: number
                    valor_unitario?: number
                    valor_total?: number
                    valor_desconto?: number | null
                    bc_icms?: number | null
                    valor_icms?: number | null
                    aliq_icms?: number | null
                    valor_ipi?: number | null
                    aliq_ipi?: number | null
                    created_at?: string | null
                }
            }
            inventory_products: {
                Row: {
                    id: string
                    company_id: string | null
                    codigo: string
                    codigo_barras: string | null
                    descricao: string
                    ncm: string | null
                    unidade: string | null
                    preco_custo: number | null
                    preco_venda: number | null
                    margem_lucro: number | null
                    quantidade_atual: number | null
                    quantidade_minima: number | null
                    categoria: string | null
                    ativo: boolean | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    codigo: string
                    codigo_barras?: string | null
                    descricao: string
                    ncm?: string | null
                    unidade?: string | null
                    preco_custo?: number | null
                    preco_venda?: number | null
                    margem_lucro?: number | null
                    quantidade_atual?: number | null
                    quantidade_minima?: number | null
                    categoria?: string | null
                    ativo?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    codigo?: string
                    codigo_barras?: string | null
                    descricao?: string
                    ncm?: string | null
                    unidade?: string | null
                    preco_custo?: number | null
                    preco_venda?: number | null
                    margem_lucro?: number | null
                    quantidade_atual?: number | null
                    quantidade_minima?: number | null
                    categoria?: string | null
                    ativo?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            inventory_movements: {
                Row: {
                    id: string
                    product_id: string | null
                    invoice_id: string | null
                    tipo: 'entrada' | 'saida' | 'ajuste'
                    quantidade: number
                    quantidade_anterior: number
                    quantidade_posterior: number
                    custo_unitario: number | null
                    motivo: string | null
                    observacao: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    product_id?: string | null
                    invoice_id?: string | null
                    tipo: 'entrada' | 'saida' | 'ajuste'
                    quantidade: number
                    quantidade_anterior: number
                    quantidade_posterior: number
                    custo_unitario?: number | null
                    motivo?: string | null
                    observacao?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    product_id?: string | null
                    invoice_id?: string | null
                    tipo?: 'entrada' | 'saida' | 'ajuste'
                    quantidade?: number
                    quantidade_anterior?: number
                    quantidade_posterior?: number
                    custo_unitario?: number | null
                    motivo?: string | null
                    observacao?: string | null
                    created_at?: string | null
                }
            }
            financial_transactions: {
                Row: {
                    id: string
                    company_id: string | null
                    invoice_id: string | null
                    tipo: 'receita' | 'despesa'
                    categoria: string | null
                    descricao: string
                    valor: number
                    data_vencimento: string | null
                    data_pagamento: string | null
                    status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    forma_pagamento: string | null
                    observacao: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    invoice_id?: string | null
                    tipo: 'receita' | 'despesa'
                    categoria?: string | null
                    descricao: string
                    valor: number
                    data_vencimento?: string | null
                    data_pagamento?: string | null
                    status?: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    forma_pagamento?: string | null
                    observacao?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    invoice_id?: string | null
                    tipo?: 'receita' | 'despesa'
                    categoria?: string | null
                    descricao?: string
                    valor?: number
                    data_vencimento?: string | null
                    data_pagamento?: string | null
                    status?: 'pendente' | 'pago' | 'vencido' | 'cancelado' | null
                    forma_pagamento?: string | null
                    observacao?: string | null
                    created_at?: string | null
                }
            }
            financial_categories: {
                Row: {
                    id: string
                    company_id: string | null
                    nome: string
                    tipo: 'receita' | 'despesa'
                    cor: string | null
                    icone: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    nome: string
                    tipo: 'receita' | 'despesa'
                    cor?: string | null
                    icone?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    nome?: string
                    tipo?: 'receita' | 'despesa'
                    cor?: string | null
                    icone?: string | null
                    created_at?: string | null
                }
            }
            ai_analysis_history: {
                Row: {
                    id: string
                    company_id: string | null
                    tipo: string
                    prompt: string | null
                    resposta: Json
                    insights: Json | null
                    tokens_usados: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    tipo: string
                    prompt?: string | null
                    resposta: Json
                    insights?: Json | null
                    tokens_usados?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    tipo?: string
                    prompt?: string | null
                    resposta?: Json
                    insights?: Json | null
                    tokens_usados?: number | null
                    created_at?: string | null
                }
            }
            bottleneck_reports: {
                Row: {
                    id: string
                    company_id: string | null
                    analysis_id: string | null
                    categoria: string
                    severidade: 'baixa' | 'media' | 'alta' | 'critica' | null
                    titulo: string
                    descricao: string
                    recomendacao: string | null
                    valor_impacto: number | null
                    resolvido: boolean | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    analysis_id?: string | null
                    categoria: string
                    severidade?: 'baixa' | 'media' | 'alta' | 'critica' | null
                    titulo: string
                    descricao: string
                    recomendacao?: string | null
                    valor_impacto?: number | null
                    resolvido?: boolean | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    analysis_id?: string | null
                    categoria?: string
                    severidade?: 'baixa' | 'media' | 'alta' | 'critica' | null
                    titulo?: string
                    descricao?: string
                    recomendacao?: string | null
                    valor_impacto?: number | null
                    resolvido?: boolean | null
                    created_at?: string | null
                }
            }
            mei_config: {
                Row: {
                    id: string
                    user_id: string
                    annual_limit: number
                    alert_threshold: number
                    razao_social: string | null
                    cnpj: string | null
                    inscricao_estadual: string | null
                    telefone: string | null
                    endereco: string | null
                    logo_url: string | null
                    favicon_url: string | null
                    notifications_vencimento: boolean | null
                    notifications_novas_notas: boolean | null
                    notifications_resumo: boolean | null
                    auth_2fa: boolean | null
                    backup_auto: boolean | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    annual_limit?: number
                    alert_threshold?: number
                    razao_social?: string | null
                    cnpj?: string | null
                    inscricao_estadual?: string | null
                    telefone?: string | null
                    endereco?: string | null
                    logo_url?: string | null
                    favicon_url?: string | null
                    notifications_vencimento?: boolean | null
                    notifications_novas_notas?: boolean | null
                    notifications_resumo?: boolean | null
                    auth_2fa?: boolean | null
                    backup_auto?: boolean | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    annual_limit?: number
                    alert_threshold?: number
                    razao_social?: string | null
                    cnpj?: string | null
                    inscricao_estadual?: string | null
                    telefone?: string | null
                    endereco?: string | null
                    logo_url?: string | null
                    favicon_url?: string | null
                    notifications_vencimento?: boolean | null
                    notifications_novas_notas?: boolean | null
                    notifications_resumo?: boolean | null
                    auth_2fa?: boolean | null
                    backup_auto?: boolean | null
                    created_at?: string
                    updated_at?: string
                }
            }
            agent_messages: {
                Row: {
                    id: string
                    created_at: string
                    agent_id: string
                    message: string
                    type: string
                    status: string
                    metadata: Json
                }
                Insert: {
                    id?: string
                    created_at?: string
                    agent_id: string
                    message: string
                    type?: string
                    status?: string
                    metadata?: Json
                }
                Update: {
                    id?: string
                    created_at?: string
                    agent_id?: string
                    message?: string
                    type?: string
                    status?: string
                    metadata?: Json
                }
            }
        }
    }
}
