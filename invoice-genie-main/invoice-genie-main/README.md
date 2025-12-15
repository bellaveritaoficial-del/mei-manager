# 📊 MEI Manager

Sistema completo de gestão para Microempreendedores Individuais (MEI), com captura de notas fiscais por câmera, leitura por IA, controle financeiro e gestão de estoque.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)

## ✨ Funcionalidades

### 📄 Gestão de Notas Fiscais
- Captura de notas fiscais via câmera do dispositivo
- Leitura automática por IA (OCR + Processamento Inteligente)
- Armazenamento seguro na nuvem
- Histórico completo de notas

### 📦 Controle de Estoque
- Cadastro de produtos e categorias
- Alertas de estoque baixo
- Análise de movimentação com gráficos
- **Agente de IA** para análise inteligente do inventário

### 💰 Controle Financeiro
- Dashboard de receitas e despesas
- Acompanhamento de faturamento mensal
- Controle de limite MEI (R$ 81.000/ano)
- Geração de boletos

### 📈 Relatórios
- Relatórios financeiros completos
- Exportação em PDF
- Análise por período
- **Agente de IA** para insights

### ⚙️ Configurações
- Cadastro de dados da empresa
- Logo e favicon personalizados
- Tema claro/escuro
- Integração com Supabase

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ 
- npm ou bun
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/bellaveritaoficial-del/mei-manager.git

# Entre no diretório
cd mei-manager

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:3000`

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 🛠️ Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Estilização** | Tailwind CSS, shadcn/ui |
| **Gráficos** | Recharts |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **IA** | Google Gemini (via Edge Functions) |
| **PDFs** | jsPDF, html2canvas |
| **Formulários** | React Hook Form, Zod |

## 📁 Estrutura do Projeto

```
mei-manager/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   │   ├── ui/         # Componentes shadcn/ui
│   │   ├── inventory/  # Componentes de estoque
│   │   ├── invoice/    # Componentes de notas fiscais
│   │   └── layout/     # Layout e navegação
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilitários e configurações
│   ├── pages/          # Páginas da aplicação
│   └── types/          # Definições TypeScript
├── supabase/
│   └── functions/      # Edge Functions (IA)
└── public/             # Assets estáticos
```

## 📱 Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard principal |
| `/notas` | Lista de notas fiscais |
| `/notas/:id` | Detalhes da nota |
| `/estoque` | Gestão de inventário |
| `/financeiro` | Controle financeiro |
| `/relatorios` | Relatórios e exportação |
| `/mei` | Dashboard MEI |
| `/configuracoes` | Configurações do sistema |

## 🤖 Edge Functions (IA)

O projeto inclui Edge Functions do Supabase para funcionalidades de IA:

- **`analysis-agent`** - Análise inteligente de relatórios
- **`inventory-agent`** - Análise de estoque com IA
- **`analyze-product`** - Análise de imagens de produtos

## 🎨 Temas

O sistema suporta tema claro e escuro, com cores personalizáveis via CSS variables.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

Feito com ❤️ para facilitar a vida dos MEIs brasileiros.
