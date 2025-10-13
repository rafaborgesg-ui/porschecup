
# 🏁 Porsche Cup - Sistema de Gerenciamento de Pneus

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-blue.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.4.0-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.3.5-purple.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-Database-green.svg" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-Enabled-purple.svg" alt="PWA" />
  <img src="https://img.shields.io/badge/Version-v1.2.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</div>

## 🚀 Acesso ao Sistema

- **🌐 Produção**: https://porschecup.vercel.app
- **📱 PWA**: Instalável em dispositivos móveis e desktop
- **📂 Repositório**: https://github.com/rafaborgesg-ui/porschecup

## 📋 Sobre o Projeto

Sistema completo para gerenciamento de estoque de pneus da Porsche Cup Brasil, desenvolvido como **Progressive Web App (PWA)** com backend Supabase. Aplicação moderna com interface responsiva, sistema de autenticação robusto e funcionalidades offline.

### ✨ Funcionalidades Principais

#### � PWA (Progressive Web App)
- ✅ **Instalação Nativa** - Instalável em dispositivos móveis e desktop
- ✅ **Funcionamento Offline** - Service Worker para cache inteligente
- ✅ **Interface Responsiva** - Design adaptativo para todas as telas
- ✅ **Notificações Push** - (planejado para v1.3.0)

#### 🗄️ Gerenciamento de Estoque
- � **Entrada de Pneus** - Registro de novos pneus no estoque
- 🔄 **Movimentação** - Transferência entre containers
- ⚡ **Consumo** - Ativação de pneus para uso em corridas
- 📊 **Ajustes** - Correções e ajustes de estoque
- 📈 **Relatórios** - Dashboards com métricas em tempo real

#### 🔐 Sistema de Usuários
- � **Autenticação Segura** - Login via Supabase Auth
- 👥 **Níveis de Acesso** - Admin e Operador
- 🛡️ **RLS Implementado** - Row Level Security em todas as tabelas
- 👤 **Gestão de Perfis** - Controle completo de usuários

## �️ Tecnologias

### Frontend
- **React 18.3.1** - Framework principal
- **TypeScript** - Tipagem estática  
- **Vite 6.3.5** - Build tool moderna
- **Tailwind CSS** - Estilização utility-first
- **shadcn/ui** - Componentes UI com Radix

### Backend
- **Supabase** - Backend-as-a-Service completo
- **PostgreSQL** - Banco de dados relacional
- **RLS** - Row Level Security implementado
- **Auth** - Sistema de autenticação robusto

### Infraestrutura
- **Vercel** - Deploy automático e hosting
- **GitHub** - Controle de versão e CI/CD
- **PWA** - Service Worker + Manifest
- **Offline First** - Funcionalidade offline completa

## 📊 Estrutura do Banco de Dados

```sql
-- 8 Tabelas Principais
├── tire_models          # Modelos de pneus disponíveis
├── containers           # Containers de organização
├── stock_entries        # Entradas de estoque
├── tire_movements       # Movimentações de pneus
├── tire_consumption     # Consumo e ativação
├── tire_status          # Status dos pneus
├── user_profiles        # Perfis com permissões
└── freight_requests     # Solicitações de frete (futuro)
```

## 🚀 Como Instalar o PWA

### 📱 Mobile (Android/iOS)
1. Acesse https://porschecup.vercel.app no navegador
2. O prompt de instalação aparecerá automaticamente
3. Toque em **"Instalar"** ou **"Adicionar à tela inicial"**

### 💻 Desktop (Chrome/Edge)
1. Acesse https://porschecup.vercel.app  
2. Procure o ícone de instalação **(⊞)** na barra de endereços
3. Clique em **"Instalar Porsche Cup"**

## 📦 Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/rafaborgesg-ui/porschecup.git
   cd porschecup
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```
   
   Edite o arquivo `.env.local` com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

4. **Execute o projeto**
   ```bash
   npm run dev
   ```

## 📋 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build para produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa análise de código
- `npm run lint:fix` - Corrige problemas automaticamente
- `npm run type-check` - Verifica tipos TypeScript

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI (Radix)
│   └── figma/          # Componentes específicos do Figma
├── utils/              # Utilitários e helpers
│   └── supabase/       # Configuração Supabase
├── styles/             # Estilos globais
├── assets/             # Imagens e recursos
└── public/             # Arquivos públicos (PWA)
```

## 🔧 Configuração do Supabase

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Configure as tabelas necessárias
4. Adicione as credenciais no arquivo `.env.local`

## 🚀 Deploy

### Vercel (Recomendado)

1. **Via GitHub**
   - Conecte o repositório ao Vercel
   - Configure as variáveis de ambiente
   - Deploy automático a cada push

2. **Via CLI**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

### Outras Plataformas

O projeto é compatível com Netlify, Railway, e outras plataformas que suportam Node.js.

## 📱 PWA (Progressive Web App)

O projeto inclui funcionalidades PWA:
- ✅ Funciona offline
- ✅ Instalável como app nativo
- ✅ Service Worker configurado
- ✅ Manifest.json otimizado

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Rafael Borges**
- GitHub: [@rafaborgesg-ui](https://github.com/rafaborgesg-ui)
- LinkedIn: [Rafael Borges](https://linkedin.com/in/rafael-borges)

## 🎨 Design

Design original disponível no [Figma](https://www.figma.com/design/1gXPOBwAysRvWk6EAkqkpQ/Porsche-Cup)

---

<div align="center">
  <p>Feito com ❤️ para a Porsche Cup</p>
</div>  