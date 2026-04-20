/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileText, 
  Settings2, 
  Cpu, 
  ClipboardCheck, 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  MoreHorizontal,
  Download,
  Share2,
  Trash2,
  Columns,
  Maximize2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowStep, BOMItem, ProjectState } from './types';

// Components
const StepIndicator = ({ current, step, icon: Icon, label }: { current: WorkflowStep, step: WorkflowStep, icon: any, label: string }) => {
  const isActive = current === step;
  const isCompleted = ['upload', 'config', 'analysis', 'result'].indexOf(current) > ['upload', 'config', 'analysis', 'result'].indexOf(step);

  return (
    <div className={`flex items-center gap-2 px-3 py-2 transition-all duration-300 ${isActive ? 'text-[var(--color-primary)]' : 'text-[#94A3B8]'}`}>
      <span className={`text-sm font-bold ${isActive ? 'text-[var(--color-primary)]' : isCompleted ? 'text-[#10B981]' : 'text-inherit'}`}>
        {step === 'upload' ? '01' : step === 'config' ? '02' : step === 'analysis' ? '03' : '04'}
      </span>
      <span className="text-sm font-medium whitespace-nowrap uppercase tracking-wide">{label}</span>
      {isCompleted && <CheckCircle2 size={14} className="text-[#10B981] ml-1" />}
    </div>
  );
};

export default function App() {
  const [project, setProject] = useState<ProjectState>({
    id: '1',
    name: '5ВРУ_Общежитие_v2',
    currentStep: 'upload',
    analysisMode: 'ai',
    pdfFile: null,
    pagesRange: '',
    instructions: '',
    status: 'idle',
    statusMessage: '',
  });

  const [splitPosition, setSplitPosition] = useState(40); // PDF viewer width %
  const [isResizing, setIsResizing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // BOM Handlers
  const handleUpdateItem = (id: string, updates: Partial<BOMItem>) => {
    setProject(prev => ({
      ...prev,
      results: prev.results?.map(item => {
        if (item.id === id) {
          const newItem = { ...item, ...updates };
          // Auto-recalculate total if quantity or price changed
          if ('quantity' in updates || 'price' in updates) {
            newItem.total = newItem.quantity * newItem.price;
          }
          return newItem;
        }
        return item;
      })
    }));
  };

  const handleDeleteItem = (id: string) => {
    setProject(prev => ({
      ...prev,
      results: prev.results?.filter(item => item.id !== id)
    }));
  };

  const handleAddItem = () => {
    const newItem: BOMItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Новая позиция',
      article: '—',
      manufacturer: '—',
      quantity: 1,
      unit: 'шт',
      price: 0,
      total: 0
    };
    setProject(prev => ({
      ...prev,
      results: [...(prev.results || []), newItem]
    }));
    setEditingItemId(newItem.id);
  };

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProject(prev => ({ 
        ...prev, 
        pdfFile: file, 
        currentStep: 'config', 
        statusMessage: 'Документ загружен' 
      }));
    }
  };

  const startAnalysis = async () => {
    // Check for "error" trigger in instructions for demo
    if (project.instructions.toLowerCase().includes('error')) {
      setProject(prev => ({ 
        ...prev, 
        currentStep: 'analysis', 
        status: 'processing', 
        statusMessage: 'Подготовка к анализу...' 
      }));
      await new Promise(r => setTimeout(r, 2000));
      setProject(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Сервер перегружен или файл слишком сложный. Пожалуйста, попробуйте повторить запрос позже.',
        statusMessage: 'Ошибка обработки'
      }));
      return;
    }

    setProject(prev => ({ 
      ...prev, 
      currentStep: 'analysis', 
      status: 'processing', 
      statusMessage: project.analysisMode === 'ai' ? 'Агент анализирует чертежи...' : 'Извлечение текста...' 
    }));

    const aiStages = [
      { msg: 'Распознавание структуры документа...', time: 1500 },
      { msg: 'Поиск схем на стр. 47...', time: 2000 },
      { msg: 'Сверка с номенклатурой...', time: 2500 },
      { msg: 'Финальный расчет...', time: 1000 },
    ];

    const basicStages = [
      { msg: 'Сканирование (Fast OCR)...', time: 1000 },
      { msg: 'Поиск ключевых слов...', time: 1000 },
    ];

    const activeStages = project.analysisMode === 'ai' ? aiStages : basicStages;

    for (const stage of activeStages) {
      await new Promise(r => setTimeout(r, stage.time));
      setProject(prev => ({ ...prev, statusMessage: stage.msg }));
    }

    const mockResults: BOMItem[] = project.analysisMode === 'ai' ? [
      { id: '1', name: 'Автоматический выключатель iK60N 3P 25A C', article: 'A9F74325', manufacturer: 'System Electric', quantity: 2, unit: 'шт', price: 1450, total: 2900 },
      { id: '2', name: 'Шкаф напольный 2000х600х600 IP55', article: 'DKS-FS-2066', manufacturer: 'DKS', quantity: 1, unit: 'шт', price: 42000, total: 42000 },
      { id: '3', name: 'Шина медная 20х3мм', article: 'BUS-CU-203', manufacturer: 'Электропром', quantity: 4, unit: 'м', price: 1200, total: 4800 },
    ] : [
      { id: '1', name: 'Автоматы 25А C', article: 'Не определено', manufacturer: 'Не определено', quantity: 2, unit: 'шт', price: 0, total: 0 },
      { id: '2', name: 'Шкаф 2000х600х600', article: 'Не определено', manufacturer: 'Не определено', quantity: 1, unit: 'шт', price: 0, total: 0 },
    ];

    setProject(prev => ({ 
      ...prev, 
      currentStep: 'result', 
      status: 'success', 
      results: mockResults 
    }));
  };

  // Split View Resize
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newPos = (e.clientX / window.innerWidth) * 100;
      if (newPos > 20 && newPos < 80) setSplitPosition(newPos);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans text-[#1E293B] overflow-hidden">
      {/* Header */}
      <header className="h-[64px] flex items-center justify-between px-6 bg-white border-b border-[#E2E8F0] z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white font-bold">
            P
          </div>
          <span className="font-bold text-lg tracking-tight">PDF Спецификатор</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <StepIndicator current={project.currentStep} step="upload" icon={Upload} label="Загрузка" />
          <StepIndicator current={project.currentStep} step="config" icon={Settings2} label="Настройка" />
          <StepIndicator current={project.currentStep} step="analysis" icon={Cpu} label="Обработка" />
          <StepIndicator current={project.currentStep} step="result" icon={ClipboardCheck} label="Результат" />
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs text-[#64748B]">Проект: {project.name}</span>
          <div className="w-8 h-8 bg-[#F1F5F9] rounded-full border border-[#E2E8F0]" />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* PDF Viewer */}
        <div 
          className="bg-[#525659] flex flex-col items-center overflow-hidden border-r border-[#E2E8F0] relative"
          style={{ width: `${splitPosition}%` }}
        >
          <div className="w-full h-[48px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 shrink-0 shadow-sm z-10 transition-colors">
            <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Просмотр документа</span>
            {project.pdfFile && (
              <span className="bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                стр. 47 из 124
              </span>
            )}
          </div>
          
          <div className="flex-1 w-full overflow-auto p-12 flex flex-col items-center gap-6 scrollbar-hide">
            {project.pdfFile ? (
              <div className="w-[340px] aspect-[1/1.41] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] rounded-sm p-8 flex flex-col gap-4 relative shrink-0">
                <div className="w-full h-[140px] border-2 border-dashed border-[#E2E8F0] rounded-lg flex flex-col items-center justify-center text-[#94A3B8]">
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em]">[СХЕМА ВП1]</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full w-[80%]" />
                <div className="h-2 bg-[#F1F5F9] rounded-full w-[90%]" />
                <div className="h-2 bg-[#F1F5F9] rounded-full w-[40%]" />
                <div className="h-2 bg-[#F1F5F9] rounded-full w-[70%]" />

                <div className="mt-auto pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
                  <div className="h-2 bg-[#F1F5F9] rounded-full w-[30%]" />
                  <div className="h-2 bg-[#F1F5F9] rounded-full w-[100%]" />
                </div>
              </div>
            ) : (
              <div className="mt-20 text-center group cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl border border-white/20 flex items-center justify-center text-white/50 mx-auto mb-4 group-hover:scale-105 transition-transform duration-500">
                  <Upload size={32} />
                </div>
                <p className="text-white/60 text-sm font-medium">Выберите PDF для просмотра</p>
                <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </div>
            )}
            
            {project.pdfFile && (
               <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-[12px] font-medium shadow-lg flex items-center gap-3">
                 <span>Инструменты:</span>
                 <button className="hover:text-[#2563EB]">Масштаб</button>
                 <span className="opacity-20">|</span>
                 <button className="hover:text-[#2563EB]">Поиск</button>
                 <span className="opacity-20">|</span>
                 <button className="hover:text-[#2563EB]">Печать</button>
               </div>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div 
          className={`w-px cursor-col-resize z-20 transition-all ${isResizing ? 'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-[#E2E8F0] hover:bg-[#2563EB]'}`}
          onMouseDown={startResizing}
        />

        {/* Action Pane */}
        <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <AnimatePresence mode="wait">
              {project.currentStep === 'upload' && (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center"
                >
                  <label 
                    htmlFor="main-upload"
                    className="w-full p-20 border border-[#E2E8F0] rounded-3xl bg-[#F9FAFB] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all cursor-pointer group flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-center text-[#2563EB] mb-6 shadow-sm group-hover:scale-105 transition-transform duration-300">
                      <Plus size={32} />
                    </div>
                    <span className="text-[18px] font-bold text-[#1E293B] mb-2 tracking-tight uppercase">Загрузить PDF Спецификацию</span>
                    <span className="text-sm text-[#64748B]">Выберите проектную документацию для автоматического разбора состава и цен</span>
                    <input id="main-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                  </label>
                </motion.div>
              )}

              {project.currentStep === 'config' && (
                <motion.div 
                  key="config"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl mx-auto flex flex-col gap-8"
                >
                  <header>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1E293B]">Настройка параметров разбора</h2>
                    <p className="text-sm text-[#64748B]">Уточните данные, чтобы агент подобрал оборудование максимально точно</p>
                  </header>

                  {/* Mode & Details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Выбор страниц</label>
                      <input 
                        type="text" 
                        value={project.pagesRange || '47-71'}
                        onChange={(e) => setProject(p => ({ ...p, pagesRange: e.target.value }))}
                        className="p-3 border border-[#E2E8F0] rounded-lg bg-[#F9FAFB] text-sm focus:outline-none focus:border-[#2563EB]"
                        placeholder="Напр: 47-71"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Бренд оборудования</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setProject(p => ({ ...p, analysisMode: 'ai' }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${project.analysisMode === 'ai' ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] text-[#64748B] hover:border-slate-300'}`}
                        >
                          System Electric
                        </button>
                        <button 
                          onClick={() => setProject(p => ({ ...p, analysisMode: 'basic' }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${project.analysisMode === 'basic' ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] text-[#64748B] hover:border-slate-300'}`}
                        >
                          DKS (Оболочки)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Инструкции для анализа</label>
                    <p className="text-[12px] text-[#64748B] mb-1 italic leading-relaxed">
                      Опишите задачу: на что обратить внимание или какие коэффициенты использовать. Например, «Стоимость сборки: x2 от оборудования».
                    </p>
                    <textarea 
                      value={project.instructions}
                      onChange={(e) => setProject(p => ({ ...p, instructions: e.target.value }))}
                      placeholder="Пример: В файле есть линейные схемы на стр. 47..."
                      rows={6}
                      className="p-4 border border-[#E2E8F0] rounded-lg bg-[#F9FAFB] text-sm focus:outline-none focus:border-[#2563EB] resize-none leading-relaxed"
                    />
                  </div>

                  <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-end gap-3 mt-auto">
                    <button className="px-6 py-3 border border-[#E2E8F0] rounded-lg font-bold text-[#1E293B] hover:bg-[#F9FAFB] transition-colors">Отмена</button>
                    <button 
                      onClick={startAnalysis}
                      className="px-8 py-3 bg-[#2563EB] text-white rounded-lg font-bold flex items-center gap-3 hover:bg-[#1D4ED8] transition-all shadow-lg shadow-blue-100"
                    >
                      <Cpu size={18} />
                      <span>Запустить расчет состава</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {project.currentStep === 'analysis' && (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-10"
                >
                  <div className="bg-[#F0F9FF] border border-[#B9E6FE] rounded-2xl p-8 flex items-start gap-6 max-w-lg text-left shadow-sm">
                    <div className="w-6 h-6 border-2 border-[#BAE6FD] border-t-[#0284C7] rounded-full animate-spin shrink-0" />
                    <div>
                      <h4 className="font-bold text-[16px] text-[#0369A1] mb-1">Идет распознавание документа...</h4>
                      <p className="text-sm text-[#0C4A6E] leading-relaxed mb-4">
                        {project.statusMessage || 'Анализируем схемы и сверяем с номенклатурой производителя.'}
                      </p>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#0C4A6E] opacity-50 italic">
                        Расчет может занять до 2 минут. Не закрывайте вкладку.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {project.status === 'error' && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-10"
                >
                   <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 mb-6 font-bold shadow-sm">
                      !
                   </div>
                   <h3 className="font-bold text-[18px] text-[#1E293B] mb-2 uppercase tracking-wide">Ошибка выполнения</h3>
                   <p className="text-sm text-[#64748B] max-w-sm mb-8 leading-relaxed italic">{project.error}</p>
                   <button 
                    onClick={() => setProject(p => ({ ...p, currentStep: 'config', status: 'idle' }))}
                    className="px-6 py-2 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </motion.div>
              )}

              {project.currentStep === 'result' && project.status === 'success' && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col gap-6"
                >
                  <header className="flex items-center justify-between border-b border-[#E2E8F0] pb-6">
                    <div>
                      <h2 className="text-[20px] font-bold tracking-tight text-[#1E293B]">Спецификация комплектующих</h2>
                      <p className="text-sm text-[#64748B]">Предварительный состав оборудования на основе анализа схем</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-[var(--color-primary)] rounded-lg font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={16} /> Добавить позицию
                      </button>
                      <button className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F9FAFB]"><Download size={18}/></button>
                      <button className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F9FAFB]"><Share2 size={18}/></button>
                    </div>
                  </header>

                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="px-6 py-4 font-bold text-[11px] text-[#64748B] uppercase tracking-widest italic">Наименование</th>
                          <th className="px-6 py-3 font-bold text-[11px] text-[#64748B] uppercase tracking-widest italic">Артикул</th>
                          <th className="px-4 py-3 font-bold text-[11px] text-[#64748B] uppercase tracking-widest text-center italic">Кол-во</th>
                          <th className="px-6 py-3 font-bold text-[11px] text-[#64748B] uppercase tracking-widest text-right italic">Сумма</th>
                          <th className="px-4 py-3 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {project.results?.map(item => (
                          <tr key={item.id} className={`hover:bg-[#F8FAFC] transition-colors ${editingItemId === item.id ? 'bg-indigo-50/30' : ''}`}>
                            <td className="px-6 py-3">
                              {editingItemId === item.id ? (
                                <input 
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                  className="w-full bg-white border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                              ) : (
                                <span className="font-medium text-[#1E293B]">{item.name}</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {editingItemId === item.id ? (
                                <input 
                                  value={item.article || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { article: e.target.value })}
                                  className="w-full bg-white border border-indigo-200 rounded px-2 py-1 font-mono text-xs"
                                />
                              ) : (
                                <span className="font-mono text-[12px] text-[#64748B] uppercase opacity-70">{item.article}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {editingItemId === item.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input 
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                                    className="w-14 bg-white border border-indigo-200 rounded px-2 py-1 text-center"
                                  />
                                  <span className="text-[10px] text-slate-400">{item.unit}</span>
                                </div>
                              ) : (
                                <span className="text-[#1E293B] font-bold italic">{item.quantity} {item.unit}</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {editingItemId === item.id ? (
                                <input 
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => handleUpdateItem(item.id, { price: Number(e.target.value) })}
                                  className="w-24 bg-white border border-indigo-200 rounded px-2 py-1 text-right tabular-nums font-bold"
                                />
                              ) : (
                                <span className="font-bold text-[#1E293B] tabular-nums">{item.total.toLocaleString()} ₽</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {editingItemId === item.id ? (
                                  <button 
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    title="Сохранить"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => setEditingItemId(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-indigo-50 rounded transition-all"
                                    title="Изменить"
                                  >
                                    <Settings2 size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                  title="Удалить"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#F1F5F9] border-t border-[#E2E8F0] text-[var(--color-text-main)]">
                        <tr className="font-bold">
                          <td colSpan={3} className="px-6 py-5 text-sm uppercase tracking-widest">Итого по оборудованию</td>
                          <td className="px-6 py-5 text-right text-lg border-l border-[#E2E8F0]">
                            {project.results?.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} ₽
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6">
                    <button 
                      onClick={() => setProject(p => ({ ...p, currentStep: 'config', status: 'idle' }))}
                      className="px-6 py-3 border border-[#E2E8F0] rounded-lg font-bold text-[#64748B] hover:bg-[#F9FAFB] transition-colors"
                    >
                      Начать заново
                    </button>
                    <button className="px-8 py-3 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-[#1D4ED8] transition-all shadow-lg shadow-blue-100">
                      Сформировать КП
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Persistent Footer Stats */}
          <footer className="h-[64px] bg-[#F8FAFC] border-t border-[#E2E8F0] px-10 flex items-center justify-between shrink-0">
             <div className="flex gap-8">
               <div className="flex flex-col gap-0.5">
                 <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">API Status</span>
                 <span className="text-[12px] font-bold text-[#10B981] flex items-center gap-1.5 leading-none">
                    <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full" /> Online
                 </span>
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Лимит агента</span>
                 <span className="text-[12px] font-bold text-[#1E293B] leading-none tracking-tight">85% доступно</span>
               </div>
             </div>
             <p className="text-[12px] text-[#64748B] italic font-medium">Ваш расчет будет сохранен в разделе "История проектов"</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
