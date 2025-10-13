
# 🏁 Porsche Cup - Sistema de Gerenciamento

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-blue.svg" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.4.0-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.3.5-purple.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-3.4.3-cyan.svg" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</div>

## 📋 Sobre o Projeto

Sistema web moderno desenvolvido para gerenciamento de estoque de pneus da Porsche Cup. Aplicação completa com interface responsiva, sistema de autenticação, controle de estoque e relatórios em tempo real.

### ✨ Funcionalidades Principais

- 🔐 **Autenticação Segura** - Login, cadastro e recuperação de senha
- 📊 **Dashboard Interativo** - Visão geral completa do sistema
- 📱 **PWA Ready** - Funciona offline como aplicativo nativo
- 🏷️ **Scanner de Código** - Leitura de códigos de barras para registro
- 📈 **Relatórios** - Análise de consumo e descartes
- 🔄 **Sincronização** - Dados sempre atualizados com Supabase
- 🎨 **UI Moderna** - Interface elegante com Radix UI e Tailwind CSS

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + Radix UI
- **Backend:** Supabase (BaaS)
- **PWA:** Service Worker + Manifest
- **Deploy:** Vercel
- **Ferramentas:** ESLint, PostCSS, SWC

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