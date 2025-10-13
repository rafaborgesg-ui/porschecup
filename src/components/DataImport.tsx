import { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, Database, Loader2, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { getTireModels, getContainers, checkBarcodeExists, getStockEntries, setStockEntries, type StockEntry } from '../utils/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function DataImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<StockEntry[]>([]);
  const [excelData, setExcelData] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normaliza o nome do modelo para encontrar correspondência
  const normalizeModelName = (name: string): string => {
    return name.toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Extrai a parte principal do nome (sem especificações técnicas)
  const extractModelCore = (name: string): string => {
    // Remove especificações técnicas como "30/65-18", "N3", etc
    let core = name
      .replace(/\d+\/\d+-\d+/g, '') // Remove padrões como 30/65-18
      .replace(/\s+N\d+/gi, '')      // Remove N1, N2, N3, etc
      .replace(/\s+\d+\/\d+/g, '')   // Remove outros padrões numéricos
      .trim();
    
    return normalizeModelName(core);
  };

  // Encontra o modelo pelo nome
  const findModelByName = (modelName: string): any | null => {
    const tireModels = getTireModels();
    
    // Extrai o core do nome (sem especificações técnicas)
    const searchCore = extractModelCore(modelName);
    
    // Primeiro: Tenta match exato do core
    let model = tireModels.find(m => {
      const modelCore = extractModelCore(m.name);
      return modelCore === searchCore;
    });
    
    // Segundo: Tenta match onde o modelo cadastrado está contido no nome buscado
    if (!model) {
      model = tireModels.find(m => {
        const modelCore = extractModelCore(m.name);
        return searchCore.includes(modelCore) && modelCore.length > 5; // Evita matches muito curtos
      });
    }
    
    // Terceiro: Tenta match parcial mais flexível
    if (!model) {
      model = tireModels.find(m => {
        const modelNormalized = normalizeModelName(m.name);
        const searchNormalized = normalizeModelName(modelName);
        
        // Verifica se contém as palavras-chave principais
        const modelWords = modelNormalized.split(' ').filter(w => w.length > 2);
        const searchWords = searchNormalized.split(' ').filter(w => w.length > 2);
        
        // Verifica se pelo menos 70% das palavras do modelo estão no nome buscado
        const matchCount = modelWords.filter(word => 
          searchWords.some(sw => sw.includes(word) || word.includes(sw))
        ).length;
        
        return matchCount >= modelWords.length * 0.7;
      });
    }
    
    return model || null;
  };

  const parseExcelFormat = (text: string): StockEntry[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const entries: StockEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const tireModels = getTireModels();

    if (tireModels.length === 0) {
      throw new Error('Nenhum modelo de pneu cadastrado. Cadastre modelos primeiro.');
    }

    // Detecta se parece que o usuário colou apenas uma coluna (sem códigos de barras)
    const linesWithoutDigits = lines.filter(line => {
      const hasEnoughDigits = /\d{7,8}/.test(line);
      return !hasEnoughDigits;
    });

    // Se mais de 50% das linhas não têm códigos, provavelmente falta uma coluna
    if (linesWithoutDigits.length > lines.length * 0.5) {
      throw new Error(
        'Parece que você colou apenas UMA coluna do Excel (só modelos).\n\n' +
        'IMPORTANTE: Você precisa colar DUAS colunas:\n' +
        '1. Coluna de CÓDIGOS DE BARRAS (números de 7-8 dígitos)\n' +
        '2. Coluna de MODELOS (nome do pneu)\n\n' +
        'No Excel, selecione AMBAS as colunas antes de copiar e colar aqui.'
      );
    }

    // Detecta e pula headers comuns (Serial, Código, Barcode, etc)
    let startIndex = 0;
    let skippedHeader = false;
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      const commonHeaders = ['serial', 'código', 'codigo', 'barcode', 'modelo', 'model', 'pneu', 'tire'];
      if (commonHeaders.some(header => firstLine.includes(header))) {
        startIndex = 1;
        skippedHeader = true;
        warnings.push(`Header detectado e ignorado: "${lines[0]}"`);
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Debug: mostra a linha sendo processada
      if (i < 3) {
        console.log(`Processando linha ${i + 1}:`, JSON.stringify(line));
      }

      let barcode = '';
      let modelInfo = '';

      // Estratégia 1: Extrair qualquer sequência de 7-8 dígitos no início
      const digitMatch = line.match(/^(\d{7,8})/);
      if (digitMatch) {
        barcode = digitMatch[1];
        // Pega tudo depois dos dígitos, removendo separadores comuns
        modelInfo = line.substring(barcode.length).replace(/^[\s\t,;]+/, '').trim();
      }
      
      // Estratégia 2: Se não encontrou 7-8 dígitos, tenta encontrar qualquer número
      if (!barcode) {
        const anyDigitMatch = line.match(/^(\d+)/);
        if (anyDigitMatch) {
          barcode = anyDigitMatch[1];
          modelInfo = line.substring(barcode.length).replace(/^[\s\t,;]+/, '').trim();
        }
      }

      // Estratégia 3: Tenta separadores explícitos se ainda não encontrou
      if (!barcode || !modelInfo) {
        let parts: string[] = [];
        
        if (line.includes('\t')) {
          parts = line.split(/\t+/).map(p => p.trim()).filter(p => p);
        } else if (line.includes(';')) {
          parts = line.split(/;+/).map(p => p.trim()).filter(p => p);
        } else if (line.includes(',')) {
          parts = line.split(/,+/).map(p => p.trim()).filter(p => p);
        } else if (line.match(/\s{2,}/)) {
          parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
        } else {
          // Último recurso: split no primeiro espaço
          const spaceIndex = line.indexOf(' ');
          if (spaceIndex > 0) {
            parts = [line.substring(0, spaceIndex), line.substring(spaceIndex + 1)];
          }
        }
        
        if (parts.length >= 2) {
          barcode = parts[0].replace(/\D/g, '');
          modelInfo = parts.slice(1).join(' ').trim();
        }
      }
      
      // Validação final
      if (!barcode || !modelInfo) {
        console.error(`Linha ${i + 1} falhou:`, { linha: line, barcode, modelInfo });
        
        // Mensagem específica se não tem código de barras
        if (!barcode) {
          errors.push(`Linha ${i + 1}: Falta o código de barras! Certifique-se de colar DUAS colunas do Excel (código + modelo). Linha atual: "${line.substring(0, 40)}..."`);
        } else {
          errors.push(`Linha ${i + 1}: Falta o nome do modelo. Formato: "12345678 Slick 992 Dianteiro"`);
        }
        continue;
      }

      // Normaliza o código de barras (remove não-dígitos e adiciona zero à esquerda se necessário)
      const barcodeRaw = barcode;
      barcode = barcode.replace(/\D/g, '');
      
      if (barcode.length === 7) {
        barcode = '0' + barcode;
        warnings.push(`Linha ${i + 1}: Código ${barcodeRaw} → ${barcode} (zero adicionado)`);
      } else if (barcode.length === 8) {
        // OK, 8 dígitos
      } else {
        errors.push(`Linha ${i + 1}: Código inválido "${barcodeRaw}" - deve ter 7 ou 8 dígitos`);
        continue;
      }

      // Verifica se já existe
      if (checkBarcodeExists(barcode)) {
        errors.push(`Linha ${i + 1}: Código ${barcode} já cadastrado no sistema`);
        continue;
      }

      // Tenta encontrar o modelo
      const model = findModelByName(modelInfo);
      
      if (!model) {
        // Debug: mostra modelos disponíveis
        const availableModels = tireModels.map(m => m.name).join(', ');
        errors.push(`Linha ${i + 1}: Modelo "${modelInfo}" não encontrado. Disponíveis: ${availableModels}`);
        continue;
      }

      entries.push({
        id: `import-excel-${Date.now()}-${i}-${Math.random()}`,
        barcode,
        modelId: model.id,
        modelName: model.name,
        modelType: model.type,
        containerId: '',
        containerName: 'Sem Contêiner',
        timestamp: new Date().toISOString(),
      });
    }

    // Mostra feedback de warnings e erros
    if (warnings.length > 0 && !skippedHeader) {
      console.log('Avisos:', warnings);
      toast.info('Códigos normalizados', {
        description: `${warnings.length} ${warnings.length === 1 ? 'código teve' : 'códigos tiveram'} zero adicionado à esquerda`,
      });
    }
    
    if (errors.length > 0) {
      console.error('Erros na importação:', errors);
      toast.error(`${errors.length} ${errors.length === 1 ? 'linha com erro' : 'linhas com erros'}`, {
        description: errors.slice(0, 3).join('\n'),
      });
    }

    // Mensagem de sucesso se houver dados válidos
    if (entries.length > 0 && skippedHeader) {
      toast.success('Dados processados', {
        description: `Header ignorado. ${entries.length} ${entries.length === 1 ? 'pneu encontrado' : 'pneus encontrados'}.`,
      });
    }

    return entries;
  };

  const handleResetDatabase = () => {
    const entries = getStockEntries(true); // incluindo descartados
    
    if (entries.length === 0) {
      toast.error('Base de dados já está vazia', {
        description: 'Não há pneus cadastrados para limpar.',
      });
      return;
    }

    setShowResetDialog(true);
  };

  const confirmResetDatabase = () => {
    try {
      const currentCount = getStockEntries(true).length; // incluindo descartados
      
      // Limpa todos os pneus
      setStockEntries([]);
      
      // Limpa também o histórico de movimentações
      localStorage.removeItem('porsche-cup-tire-movements');
      
      setShowResetDialog(false);
      
      toast.success('Base de dados resetada!', {
        description: `${currentCount} pneus foram removidos. Modelos e contêineres foram preservados.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Erro ao resetar base de dados:', error);
      toast.error('Erro ao resetar base de dados', {
        description: 'Por favor, tente novamente.',
      });
    }
  };

  const handleExcelPaste = () => {
    if (!excelData.trim()) {
      toast.error('Nenhum dado para processar');
      return;
    }

    try {
      const entries = parseExcelFormat(excelData);
      
      if (entries.length === 0) {
        toast.error('Nenhum dado válido encontrado', {
          description: 'Verifique o formato dos dados.',
        });
        return;
      }

      // Cria preview
      setPreviewData(entries.slice(0, 10));
      setPendingData(entries);
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      toast.error('Erro ao processar dados', {
        description: error instanceof Error ? error.message : 'Verifique o formato.',
      });
    }
  };



  const performImport = async () => {
    setShowConfirmDialog(false);
    setIsImporting(true);
    setImportProgress(0);
    setImportedCount(0);

    const existingEntries = getStockEntries(true); // incluindo descartados para verificar duplicatas
    const totalItems = pendingData.length;
    const batchSize = 100;

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = pendingData.slice(i, i + batchSize);
      existingEntries.push(...batch);
      
      const progress = Math.round(((i + batch.length) / totalItems) * 100);
      setImportProgress(progress);
      setImportedCount(i + batch.length);

      // Pequeno delay para atualizar a UI
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setStockEntries(existingEntries);
    window.dispatchEvent(new Event('stock-entries-updated'));

    setIsImporting(false);
    setImportProgress(100);
    
    toast.success('Importação concluída!', {
      description: `${totalItems} ${totalItems === 1 ? 'pneu importado' : 'pneus importados'} com sucesso.`,
    });

    // Limpa os dados
    setPendingData([]);
    setPreviewData([]);
    setExcelData('');
  };

  const downloadTemplate = () => {
    const template = `4903715\tSlick 992 Dianteiro 30/65-18 N3
4903447\tSlick 992 Dianteiro 30/65-18 N3
4903735\tSlick 992 Dianteiro 30/65-18 N3
4903748\tSlick 992 Traseiro 31/71-18 N3
4903749\tSlick 992 Traseiro 31/71-18 N3
903456\tWet 991 Dianteiro 27/65-18 N1
903457\tWet 992 Dianteiro 27/65-18 N1
903458\tWet 991 e 992 Traseiro 31/71-18 N1`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-importacao-pneus.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Template baixado', {
      description: 'Use este arquivo como exemplo para importação.',
    });
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl lg:mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-gray-900">Importação de Dados</h1>
              <p className="text-gray-500">Carregue pneus em massa no sistema</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="excel" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="excel">Importar do Excel</TabsTrigger>
            <TabsTrigger value="reset">Resetar Base de Dados</TabsTrigger>
          </TabsList>

          {/* Importar do Excel */}
          <TabsContent value="excel" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-blue-600" />
                  Colar Dados do Excel
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="excel-data">Dados Copiados do Excel</Label>
                    <Textarea
                      id="excel-data"
                      value={excelData}
                      onChange={(e) => setExcelData(e.target.value)}
                      placeholder="⚠️ IMPORTANTE: Copie DUAS colunas do Excel&#10;   Coluna 1: Código de barras (números)&#10;   Coluna 2: Nome do modelo&#10;&#10;Exemplos válidos:&#10;12345678	Slick 992 Dianteiro&#10;12345678	Wet 991 Traseiro&#10;9876543	Slick 991 Dianteiro"
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ No Excel, selecione AMBAS as colunas (código + modelo) antes de copiar!
                    </p>
                  </div>

                  <Button
                    onClick={handleExcelPaste}
                    disabled={!excelData.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Upload size={16} className="mr-2" />
                    Processar Dados
                  </Button>

                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="w-full"
                  >
                    <Download size={16} className="mr-2" />
                    Baixar Template de Exemplo
                  </Button>
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Como Copiar do Excel</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li><strong>Selecione DUAS colunas</strong>: código + modelo</li>
                        <li>Código de barras deve ter 7 ou 8 dígitos</li>
                        <li>Não precisa se preocupar com o separador (auto-detectado)</li>
                        <li>Headers são detectados e ignorados automaticamente</li>
                        <li>Códigos com 7 dígitos ganham zero à esquerda</li>
                        <li>Pneus são cadastrados sem contêiner inicialmente</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-green-200 bg-green-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-green-900 text-sm mb-2">Exemplo de Seleção no Excel</h3>
                      <div className="bg-white p-3 rounded-lg space-y-2">
                        <div className="text-xs text-gray-600 mb-1">
                          📊 Planilha Excel:
                        </div>
                        <div className="font-mono text-xs space-y-1 text-green-900">
                          <div className="bg-green-50 p-1 rounded">
                            <span className="text-green-700">Coluna A (código)</span> | <span className="text-green-700">Coluna B (modelo)</span>
                          </div>
                          <div>4903715 | Slick 992 Dianteiro</div>
                          <div>4903447 | Slick 992 Dianteiro</div>
                          <div>903456 | Wet 991 Dianteiro</div>
                        </div>
                      </div>
                      <p className="text-xs text-green-700 mt-2">
                        ✓ Selecione desde A1 até B(última linha) e copie
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Códigos com 7 dígitos ganham zero à esquerda automaticamente
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-orange-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-orange-900 text-sm mb-2">Modelos Cadastrados</h3>
                      <p className="text-xs text-orange-700 mb-2">
                        O sistema reconhecerá automaticamente estes modelos:
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {getTireModels().length === 0 ? (
                          <p className="text-xs text-orange-900 bg-orange-100 p-2 rounded">
                            ⚠️ Nenhum modelo cadastrado! Cadastre os modelos primeiro.
                          </p>
                        ) : (
                          getTireModels().map((model) => (
                            <div key={model.id} className="text-xs bg-white px-2 py-1 rounded flex items-center justify-between">
                              <span className="text-orange-900">{model.name}</span>
                              <Badge
                                variant="secondary"
                                className={model.type === 'Slick' 
                                  ? 'bg-orange-100 text-orange-700 text-[10px] py-0' 
                                  : 'bg-blue-100 text-blue-700 text-[10px] py-0'
                                }
                              >
                                {model.type}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-orange-700 mt-2">
                        💡 O sistema ignora especificações técnicas (30/65-18 N3)
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Resetar Base de Dados */}
          <TabsContent value="reset" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Trash2 size={20} className="text-red-600" />
                  Limpar Todos os Pneus
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-red-900">Total de pneus cadastrados:</span>
                      <Badge className="bg-red-600 text-white">
                        {getStockEntries().length}
                      </Badge>
                    </div>
                    <p className="text-xs text-red-700">
                      Esta ação não pode ser desfeita
                    </p>
                  </div>

                  <Button
                    onClick={handleResetDatabase}
                    disabled={getStockEntries(true).length === 0}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Resetar Base de Dados
                  </Button>
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="p-6 border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-red-900 text-sm mb-2">Atenção</h3>
                      <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                        <li>Remove TODOS os pneus cadastrados</li>
                        <li>Remove TODO o histórico de movimentações</li>
                        <li>Esta ação é IRREVERSÍVEL</li>
                        <li>Modelos e contêineres serão preservados</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h3 className="text-blue-900 text-sm mb-2">Dados Preservados</h3>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Modelos de pneus cadastrados</li>
                        <li>Contêineres cadastrados</li>
                        <li>Usuários e permissões</li>
                        <li>Configurações do sistema</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Importação de Dados</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 mt-4">
                  {!isImporting ? (
                    <>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-900">Total de pneus:</span>
                          <Badge className="bg-blue-600 text-white">
                            {pendingData.length}
                          </Badge>
                        </div>
                      </div>

                      {previewData.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-900 mb-2">
                            Preview (primeiros {Math.min(10, previewData.length)} registros):
                          </div>
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-gray-600">Código</th>
                                  <th className="px-3 py-2 text-left text-gray-600">Modelo</th>
                                  <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                                  <th className="px-3 py-2 text-left text-gray-600">Contêiner</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {previewData.map((entry, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <code className="bg-gray-100 px-2 py-1 rounded">
                                        {entry.barcode}
                                      </code>
                                    </td>
                                    <td className="px-3 py-2 text-gray-900">{entry.modelName}</td>
                                    <td className="px-3 py-2">
                                      <Badge
                                        variant="secondary"
                                        className={entry.modelType === 'Slick' 
                                          ? 'bg-orange-100 text-orange-700' 
                                          : 'bg-blue-100 text-blue-700'
                                        }
                                      >
                                        {entry.modelType}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{entry.containerName}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {pendingData.length > 10 && (
                            <div className="text-xs text-gray-500 mt-2 text-center">
                              + {pendingData.length - 10} registros adicionais
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-sm text-gray-600 text-center">
                        Deseja importar <strong>{pendingData.length}</strong> {pendingData.length === 1 ? 'pneu' : 'pneus'}?
                      </div>
                    </>
                  ) : (
                    <div className="py-8">
                      <div className="flex items-center justify-center mb-4">
                        <Loader2 size={48} className="text-blue-600 animate-spin" />
                      </div>
                      <div className="text-center text-gray-900 mb-2">
                        Importando dados...
                      </div>
                      <div className="text-center text-sm text-gray-600 mb-4">
                        {importedCount} de {pendingData.length}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      <div className="text-center text-xs text-gray-500 mt-2">
                        {importProgress}% concluído
                      </div>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {!isImporting && (
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={performImport}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Confirmar Importação
                </AlertDialogAction>
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Confirmação de Reset */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={24} />
                Confirmar Reset da Base de Dados
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <p className="text-sm text-red-900 mb-2">
                      Você está prestes a <strong>REMOVER TODOS OS PNEUS</strong> cadastrados no sistema.
                    </p>
                    <p className="text-xs text-red-700">
                      Esta ação é irreversível e não pode ser desfeita!
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-900 mb-2">
                      <strong>Será removido:</strong>
                    </p>
                    <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                      <li>{getStockEntries(true).length} pneus cadastrados (incluindo descartados)</li>
                      <li>Todo o histórico de movimentações</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                    <p className="text-sm text-blue-900 mb-2">
                      <strong>Será preservado:</strong>
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>Modelos de pneus cadastrados</li>
                      <li>Contêineres cadastrados</li>
                      <li>Usuários e permissões</li>
                    </ul>
                  </div>

                  <p className="text-sm text-center text-gray-600">
                    Tem certeza que deseja continuar?
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmResetDatabase}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Sim, Resetar Base de Dados
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
