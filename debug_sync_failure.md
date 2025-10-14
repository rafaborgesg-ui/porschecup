# Debug: Falha na Sincronização de Stock Entries

## 🚨 Problema Identificado:

**Apenas 9 de 22 pneus cadastrados foram sincronizados com o Supabase**

## 🔍 Causa Raiz:

### 1. **Constraint NOT NULL violada**
```sql
-- Schema do Supabase (stock_entries)
model_id UUID NOT NULL REFERENCES public.tire_models(id) ON DELETE RESTRICT,
```

O campo `model_id` é **obrigatório** e deve referenciar um modelo válido na tabela `tire_models`.

### 2. **Falha no Mapeamento de IDs**
```typescript
// Problema: se o mapeamento retorna null, a inserção falha
model_id: modelIdMap[entry.modelId] || modelIdMap[entry.modelName] || modelIdMap[entry.modelType] || null,
```

Se nenhum dos mapeamentos funcionasse, `model_id` ficava `null`, violando a constraint e causando falha silenciosa.

## 🔧 Solução Implementada:

### 1. **Validação Prévia**
```typescript
entries.forEach((entry, index) => {
  const model_id = modelIdMap[entry.modelId] || modelIdMap[entry.modelName] || modelIdMap[entry.modelType];
  
  if (!model_id) {
    console.error(`❌ SKIP Entry ${index + 1}: No model_id found`);
    failedEntries.push({ barcode: entry.barcode, reason: 'model_id not found', entry });
    return; // PULA esta entrada
  }
  
  // Só adiciona se model_id foi encontrado
  entriesForDB.push(mapped);
});
```

### 2. **Logging Detalhado**
- ✅ Mostra quantas entradas são válidas vs falharam
- ✅ Detalha qual campo de mapeamento falhou
- ✅ Lista códigos de barras que falharam
- ✅ Mostra resultado do upsert no Supabase

### 3. **Tratamento de Erros**
- Entradas inválidas são puladas (não param toda a sincronização)
- Logs de erro específicos para debugging
- Continua processando entradas válidas

## 🧪 Como Testar:

1. **Acessar:** https://porschecup-lkadcwmmk-rafaels-projects-d8a48143.vercel.app
2. **Abrir Console:** F12 → Console
3. **Fazer cadastro de pneus**
4. **Observar logs:**
   - `📊 Sync Debug - Total entries to sync: X`
   - `📊 Model ID Map: {...}`
   - `📊 Valid entries for DB: Y`
   - `❌ Failed entries: Z`

## 🎯 Possíveis Problemas Restantes:

1. **Modelos não cadastrados no Supabase**
   - Solution: Sincronizar tire_models primeiro
   
2. **Mapeamento incorreto de modelId/modelName**
   - Solution: Verificar se os IDs locais correspondem aos do Supabase
   
3. **Containers não cadastrados**
   - Impact: Menor (container_id pode ser NULL)

## 📊 Monitoramento:

Agora os logs vão mostrar exatamente:
- Quantos pneus foram tentados
- Quantos passaram na validação  
- Quantos foram efetivamente inseridos no Supabase
- Detalhes de qualquer falha

## 🔄 Próximos Passos:

1. Teste com console aberto para ver logs detalhados
2. Se ainda houver falhas, verificar sincronização de tire_models
3. Possivelmente implementar auto-criação de modelos faltantes