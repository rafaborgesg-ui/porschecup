-- ============================================
-- PORSCHE CUP - MANUAL DE IMPLEMENTAÇÃO DE BANCO DE DADOS
-- ============================================

# Manual de Implementação da Base de Dados Supabase - Porsche Cup

## Visão Geral

Este documento fornece instruções completas para configurar a base de dados do projeto Porsche Cup no Supabase, incluindo todas as tabelas, políticas de segurança e funcionalidades necessárias.

## Estrutura do Projeto

### Módulos Principais Identificados:

1. **Gestão de Pneus**
   - Entrada de Estoque (`TireStockEntry`)
   - Movimentação entre Contêineres (`TireMovement`)
   - Transferência para Pilotos (`TireConsumption`)
   - Mudança de Status (`TireStatusChange`)
   - Descarte (`TireDiscard`)

2. **Cadastros Básicos**
   - Modelos de Pneus (`TireModelRegistration`)
   - Contêineres (`ContainerRegistration`)
   - Status Personalizados (`StatusRegistration`)

3. **Relatórios e Dashboards**
   - Dashboard (`Dashboard`)
   - Relatórios Gerais (`Reports`)
   - Relatórios de Descarte (`DiscardReports`)

4. **Gestão de Usuários**
   - Autenticação e Perfis (`UserManagement`)

5. **Solicitação de Frete** (Implementação Futura)
   - Nacional e Internacional

## Passos de Implementação

### 1. Executar Schema Principal

```sql
-- Execute o arquivo: supabase_database_schema.sql
-- Este arquivo contém:
-- - Criação de todas as tabelas
-- - Triggers para updated_at
-- - Functions para lógica de negócio
-- - Dados iniciais (seeds)
```

### 2. Configurar Segurança (RLS)

```sql
-- Execute o arquivo: supabase_rls_policies.sql
-- Este arquivo contém:
-- - Habilitação de RLS em todas as tabelas
-- - Políticas de acesso baseadas em roles
-- - Functions auxiliares para validação
-- - Grants para usuários autenticados
```

### 3. Verificar Configuração do Supabase

No painel do Supabase, verifique:

#### Authentication Settings:
- Site URL: `https://porschecup-fmpjkoknk-rafaels-projects-d8a48143.vercel.app`
- Redirect URLs: Adicionar URL de produção
- Email Templates: Configurar se necessário

#### Database Settings:
- Verificar se todas as tabelas foram criadas
- Confirmar se RLS está ativo em todas as tabelas
- Testar políticas de segurança

### 4. Configurar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```bash
# .env.local (desenvolvimento)
VITE_SUPABASE_URL=https://nflgqugaabtxzifyhjor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# .env.production (produção)
VITE_SUPABASE_URL=https://nflgqugaabtxzifyhjor.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Tabelas e Relacionamentos

### Estrutura de Dados Principal:

```
tire_models (Modelos de Pneus)
├── id (UUID, PK)
├── name (VARCHAR, UNIQUE)
├── code (VARCHAR, UNIQUE)
└── type (VARCHAR: 'Slick' | 'Wet')

containers (Contêineres)
├── id (UUID, PK)
├── name (VARCHAR, UNIQUE)
├── location (VARCHAR)
├── capacity (INTEGER)
└── current_stock (INTEGER, AUTO-CALCULATED)

tire_status (Status Personalizados)
├── id (UUID, PK)
├── name (VARCHAR, UNIQUE)
├── color (VARCHAR, HEX)
└── is_default (BOOLEAN)

stock_entries (Entradas de Estoque)
├── id (UUID, PK)
├── barcode (VARCHAR, UNIQUE)
├── model_id (UUID, FK → tire_models)
├── container_id (UUID, FK → containers)
├── status (VARCHAR)
├── pilot (VARCHAR, NULLABLE)
├── team (VARCHAR, NULLABLE)
└── session_id (VARCHAR, NULLABLE)

tire_movements (Movimentações)
├── id (UUID, PK)
├── barcode (VARCHAR)
├── from_container_id (UUID, FK → containers)
├── to_container_id (UUID, FK → containers)
├── reason (TEXT)
└── moved_by (UUID, FK → auth.users)

tire_consumption (Consumo/Transferências)
├── id (UUID, PK)
├── barcode (VARCHAR)
├── pilot (VARCHAR)
├── team (VARCHAR)
├── notes (TEXT)
└── registered_by (UUID, FK → auth.users)

user_profiles (Perfis de Usuário)
├── id (UUID, PK, FK → auth.users)
├── email (VARCHAR, UNIQUE)
├── name (VARCHAR)
├── role (VARCHAR: 'admin' | 'operator')
└── is_active (BOOLEAN)
```

### Relacionamentos Principais:

1. **stock_entries** ↔ **tire_models**: Cada pneu está associado a um modelo
2. **stock_entries** ↔ **containers**: Cada pneu está em um contêiner (pode ser NULL)
3. **tire_movements**: Registra histórico de movimentações entre contêineres
4. **tire_consumption**: Registra transferências para pilotos
5. **user_profiles**: Extensão dos usuários do Supabase Auth

## Funcionalidades Automáticas

### 1. Atualização de Ocupação de Contêineres
- Trigger automático quando pneus são adicionados/removidos
- Calcula `current_stock` baseado em pneus ativos (não descartados)

### 2. Criação Automática de Perfis
- Quando um usuário é criado no Supabase Auth
- Automaticamente cria registro em `user_profiles`

### 3. Controle de Timestamps
- `created_at` e `updated_at` automáticos
- Trigger para atualizar `updated_at` em modificações

## Segurança e Permissões

### Roles do Sistema:
- **admin**: Acesso completo, pode gerenciar usuários e configurações
- **operator**: Pode operar pneus, ver relatórios, mas não gerenciar sistema

### Políticas RLS:
- **Leitura**: Usuários ativos podem ver dados relevantes
- **Escrita**: Baseada em role (admin vs operator)
- **Histórico**: Movimentações e consumo são imutáveis (apenas inserção)
- **Usuários**: Cada usuário vê apenas seus dados (admins veem todos)

## Testes Recomendados

### 1. Teste de Autenticação
```sql
-- Verificar se perfil é criado automaticamente
SELECT * FROM public.user_profiles WHERE email = 'teste@example.com';
```

### 2. Teste de RLS
```sql
-- Verificar políticas de segurança
SELECT * FROM public.tire_models; -- Deve funcionar para usuários ativos
```

### 3. Teste de Triggers
```sql
-- Inserir pneu e verificar se ocupação do contêiner é atualizada
INSERT INTO public.stock_entries (barcode, model_id, container_id, model_name, model_type, container_name) 
VALUES ('TEST001', (SELECT id FROM tire_models LIMIT 1), (SELECT id FROM containers LIMIT 1), 'Test Model', 'Slick', 'Test Container');

SELECT current_stock FROM public.containers WHERE id = (SELECT id FROM containers LIMIT 1);
```

## Próximos Passos

1. **Executar scripts SQL** no Supabase Dashboard
2. **Testar autenticação** com usuário de teste
3. **Verificar funcionamento** de cada módulo
4. **Configurar backup** automático
5. **Monitorar performance** das queries

## Suporte e Manutenção

### Logs Importantes:
- Verificar logs do Supabase para erros de RLS
- Monitorar performance de queries complexas
- Acompanhar crescimento da base de dados

### Backup:
- Configurar backup automático no Supabase
- Exportar dados críticos periodicamente
- Testar procedimentos de restauração

### Otimização:
- Monitorar índices para queries frequentes
- Analisar performance do dashboard
- Otimizar queries de relatórios complexos

---

**Nota**: Este manual foi gerado baseado na análise completa dos componentes do projeto. Todas as estruturas foram mapeadas dos arquivos existentes para garantir compatibilidade total.