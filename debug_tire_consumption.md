# Debug: Transferir Pneu para Piloto

## Problemas Identificados e Corrigidos:

### 1. **Mapeamento incorreto na sincronização tire_consumption**
**Problema:** Na função `syncTireConsumptionToSupabase`, havia campos incorretos:
- `record.consumedBy` → Deveria ser `record.pilot`
- `record.reason` → Deveria ser `record.notes`
- `record.registeredBy` → Estava sendo tratado como UUID, mas é uma string

**Correção aplicada:** 
```typescript
// Antes (INCORRETO):
pilot: record.consumedBy || record.pilot || null,
notes: record.reason || record.notes || null,
registered_by: isUUID(record.registeredBy) ? record.registeredBy : (authUser?.id ?? null),

// Depois (CORRETO):
pilot: record.pilot || null,
notes: record.notes || null,
registered_by: authUser?.id ?? null,
registered_by_name: record.registeredBy || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || authUser?.email || null,
```

### 2. **Campos faltando na interface StockEntry**
**Problema:** A interface `StockEntry` não tinha os campos `pilot`, `team`, `notes`, `sessionId`

**Correção aplicada:**
```typescript
export interface StockEntry {
  // ... campos existentes
  sessionId?: string;
  pilot?: string;
  team?: string;
  notes?: string;
}
```

### 3. **Sincronização de stock_entries apagando dados de piloto**
**Problema:** Na sincronização de `stock_entries`, os campos de piloto estavam sendo sempre zerados:
```typescript
// Antes (INCORRETO):
pilot: null,
team: null,
notes: null,

// Depois (CORRETO):
pilot: entry.pilot || null,
team: entry.team || null,
notes: entry.notes || null,
```

## Fluxo Correto da Transferência:

1. **TireConsumption.tsx:** Usuário clica em "Transferir para Piloto"
2. **updateTireToPilot():** Atualiza o status do pneu para "Piloto" no localStorage
3. **saveConsumptionRecord():** Salva o registro de consumo no localStorage
4. **Evento 'tire-consumption-updated':** Dispara sincronização
5. **syncTireConsumptionToSupabase():** Envia dados para tabela `tire_consumption`
6. **Evento 'stock-entries-updated':** Dispara sincronização de estoque
7. **syncStockEntriesToSupabase():** Atualiza status do pneu na tabela `stock_entries`

## Teste Manual:

1. Acessar: https://porschecup-hl5e7r3xh-rafaels-projects-d8a48143.vercel.app
2. Ir para "Transferir Pneu para Piloto"
3. Escanear/digitar código de um pneu com status "Novo"
4. Preencher nome do piloto e etapa
5. Confirmar transferência
6. Verificar se:
   - Status do pneu mudou para "Piloto"
   - Registro aparece no histórico
   - Dados foram salvos no Supabase (tabelas `tire_consumption` e `stock_entries`)

## Tabelas Afetadas no Supabase:

- **tire_consumption:** Registros de transferência para pilotos
- **stock_entries:** Status atualizado do pneu (Novo → Piloto)