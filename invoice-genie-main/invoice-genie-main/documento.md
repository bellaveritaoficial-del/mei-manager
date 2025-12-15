# Documentação Completa do Sistema - Invoice Genie

## 1. Visão Geral e Propósito
O **Invoice Genie** é uma plataforma de gestão empresarial desenvolvida para microempreendedores (MEI) e pequenas empresas. O objetivo principal é simplificar burocracias financeiras através de **automação e Inteligência Artificial**.

Ao contrário de ERPs tradicionais que exigem muitos cliques e cadastros manuais, o Invoice Genie foca em:
*   **Captura Inteligente**: Transformar fotos de notas fiscais em dados estruturados automaticamente.
*   **Análise Pró-ativa**: Agentes de IA que monitoram o estoque e o fluxo de caixa, sugerindo ações.
*   **Interface Fluida**: Uma experiência de usuário (UX) moderna, rápida e responsiva.

---

## 2. Arquitetura Técnica (Visão Macro)
O sistema opera sobre uma arquitetura **Serverless** e **Event-Driven** (orientada a eventos), utilizando o Supabase como espinha dorsal.

### 2.1 Frontend (A Interface do Usuário)
A aplicação que roda no navegador do cliente.
*   **Framework**: React 18 (com Vite para build ultrarrápido).
*   **Linguagem**: TypeScript (garante segurança e menos bugs no código).
*   **Design System**: Tailwind CSS + shadcn/ui. Isso garante que a interface seja bonita, consistente e funcione bem em celulares e desktops (responsiva).
*   **Estado da Aplicação**:
    *   `React Query`: Gerencia o cache de dados vindos do servidor (evita telas de carregamento desnecessárias).
    *   `Zustand/Context`: Gerencia estados globais simples (ex: tema escuro/claro, sessão do usuário).
*   **Hospedagem**: Pode ser hospedado em qualquer CDN (Vercel, Netlify, AWS S3).

### 2.2 Backend (O Motor do Sistema)
Não há servidores tradicionais (como EC2 ou VPS) para gerenciar. Tudo roda na infraestrutura do **Supabase**.
*   **Banco de Dados**: PostgreSQL. É um banco relacional robusto e seguro.
*   **API**: O Supabase gera automaticamente uma API RESTful baseada nas tabelas do banco. O Frontend consome essa API diretamente de forma segura.
*   **Autenticação**: Supabase Auth (Gerencia login, senha, recuperação de conta e sessões).
*   **Storage**: Supabase Storage (Armazena as imagens e PDFs das notas fiscais).

### 2.3 Camada de Inteligência (Edge Functions)
Aqui reside a "mágica" da IA. São pequenas funções que rodam na borda (Edge), próximas ao usuário, e executam lógicas complexas.
*   **Tecnologia**: Deno (TypeScript).
*   **Modelos de IA**: Integração com LLMs (Large Language Models) via API (OpenRouter, OpenAI, Gemini, DeepSeek).

---

## 3. Detalhamento dos Módulos

### 3.1 Módulo de Notas Fiscais (InvoiceList & Capture)
*   **Funcionalidade**: Listagem, filtro, exclusão e captura de novas notas.
*   **Componente Chave**: `InvoiceCaptureModal`.
    *   Permite upload de até 5 arquivos simultâneos.
    *   Possui lógica de processamento em fila (`batch processing`).
    *   Formulário manual (Accordions) completo para edição fina.
*   **Fluxo de Dados (IA)**:
    1.  Frontend envia imagem → Edge Function `process-invoice-ocr`.
    2.  Function chama IA de Visão → Extrai JSON.
    3.  Frontend recebe JSON → Preenche formulário.
    4.  Usuário Salva → Banco de Dados (`invoices` table).

### 3.2 Módulo de Dashboard e Relatórios (Reports)
*   **Funcionalidade**: Visualização de saúde financeira e operacional.
*   **Componente Chave**: `ReportRenderer`.
    *   Capaz de renderizar qualquer JSON estruturado retornado pela IA.
    *   Exibe gráficos, tabelas, KPIs e listas de alertas dinamicamente.
*   **Agentes Envolvidos**:
    *   `analysis-agent`: Cruza dados gerais.
    *   `finance-agent`: Foca em DRE e fluxo de caixa.

### 3.3 Módulo de Estoque (Inventory)
*   **Funcionalidade**: Controle de entradas e saídas de produtos.
*   **Inteligência**: O `inventory-agent` roda periodicamente (ou sob demanda) para identificar:
    *   Produtos sem giro (estoque parado).
    *   Previsão de ruptura (vai faltar produto?).
    *   Sugestão de reposição baseada no histórico de vendas (tabela `invoice_items`).

### 3.4 Gestão MEI
*   **Funcionalidade**: Controle específico para Microempreendedores Individuais.
*   **Recursos**: Monitoramento do teto de faturamento anual (R$ 81k), controle de pagamento da guia DAS.

---

## 4. Estrutura de Banco de Dados (Principais Tabelas)

1.  `invoices`: Cabeçalho das notas (data, destiniatário, valores totais).
2.  `invoice_items`: Itens da nota (produto, qtd, valor unitário). Linkado via `invoice_id`.
3.  `mei_config`: Configurações do usuário (limite de faturamento, alertas).
4.  `agent_messages`: Histórico do chat com os agentes de IA (perguntas e respostas).

---

## 5. Segurança e Privacidade
*   **RLS (Row Level Security)**: Cada linha no banco de dados tem um "dono" (`user_id`). O banco recusa automaticamente qualquer tentativa de um usuário ler ou editar dados que não sejam dele.
*   **Criptografia**: Dados sensíveis e conexões (HTTPS) são criptografados.

---

## 6. Conclusão
O Invoice Genie não é apenas um "CRUD" (sistema de cadastro). É uma aplicação **AI-First**, onde a inteligência artificial é parte integrante do fluxo de trabalho, não apenas um extra. A arquitetura Serverless garante que o sistema escale automaticamente (aguenta 1 ou 1 milhão de usuários) com custo baixo de manutenção.
