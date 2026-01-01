import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, Play, SkipForward, Layers, Cpu, CheckCircle2, Plus, Database } from 'lucide-react';

// --- Components ---

// 基础方块矩阵组件 - 修复了遮挡问题
const BlockGrid = ({ 
  rows, 
  cols, 
  color = "gray", 
  label, 
  subLabel, 
  active = false,
  highlightLastRow = false,
  transposed = false,
  badge = null // 用于特殊标记，如 "Saved to Cache"
}) => {
  const colors = {
    gray:   { bg: "bg-slate-200", active: "bg-slate-800", border: "border-slate-300", text: "text-slate-600" },
    red:    { bg: "bg-rose-100", active: "bg-rose-500", border: "border-rose-200", text: "text-rose-600" },     // Q
    blue:   { bg: "bg-sky-100", active: "bg-sky-500", border: "border-sky-200", text: "text-sky-600" },       // K
    green:  { bg: "bg-emerald-100", active: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600" }, // V
    yellow: { bg: "bg-amber-100", active: "bg-amber-400", border: "border-amber-200", text: "text-amber-600" }, // Attention
    purple: { bg: "bg-violet-100", active: "bg-violet-500", border: "border-violet-200", text: "text-violet-600" }, // Output
  };

  const theme = colors[color] || colors.gray;

  const renderCells = () => {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isHighlighted = highlightLastRow && r === rows - 1;
        cells.push(
          <motion.div
            key={`${r}-${c}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (r * cols + c) * 0.002 }}
            className={`
              w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] border 
              ${theme.border}
              ${active || isHighlighted ? theme.active : theme.bg}
              ${isHighlighted ? 'ring-2 ring-yellow-400 z-10' : ''}
            `}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      {/* 维度标注 - 移至上方且不再绝对定位，防止遮挡 */}
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{rows}, {cols}]
      </div>

      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        {badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full z-20 shadow-sm">
            {badge}
          </div>
        )}
        <div 
          className="grid gap-[1px]"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {renderCells()}
        </div>
      </div>
      
      <div className="text-center mt-1">
        <div className={`text-xs font-bold ${theme.text}`}>{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight max-w-[80px]">{subLabel}</div>}
      </div>
    </div>
  );
};

const Operator = ({ symbol, vertical = false }) => (
  <div className={`flex items-center justify-center text-gray-400 font-bold text-lg ${vertical ? 'h-8 w-full rotate-90' : 'w-6 h-8'}`}>
    {symbol}
  </div>
);

const SectionLabel = ({ icon: Icon, title, color }) => (
  <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${color === 'indigo' ? 'border-indigo-100 text-indigo-900' : 'border-amber-100 text-amber-900'}`}>
    <div className={`p-1.5 rounded-md ${color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
      <Icon size={18} />
    </div>
    <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
  </div>
);

// --- Main Static Flow Component ---
const StaticFlow = () => {
  const SEQ = 4;
  const HID = 3;
  const D_MODEL = 6; // 输入维度
  
  return (
    <div className="w-full mx-auto space-y-8">
      
      {/* 1. PREFILL STAGE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
        <SectionLabel icon={Layers} title="Phase 1: Prefill (Context Processing)" color="indigo" />
        
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 flex-nowrap">
          {/* Input X */}
          <BlockGrid rows={SEQ} cols={D_MODEL} color="gray" label="Input X" subLabel="[L, D_model]" active />
          <Operator symbol="×" />
          
          {/* W matrices */}
          <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="red" label="Wq" subLabel="[D, D_k]" active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="blue" label="Wk" subLabel="[D, D_k]" active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="green" label="Wv" subLabel="[D, D_v]" active />
            </div>
          </div>
          <Operator symbol="=" />
          
          {/* QKV results */}
          <div className="flex flex-col gap-2">
            <BlockGrid rows={SEQ} cols={HID} color="red" label="Q" subLabel="[L, D_k]" active />
            <div className="relative p-1.5 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={HID} color="blue" label="K" subLabel="[L, D_k]" active />
            </div>
            <div className="relative p-1.5 rounded-lg border-2 border-dashed border-green-300 bg-green-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-100 text-green-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={HID} color="green" label="V" subLabel="[L, D_v]" active />
            </div>
          </div>
          
          <ArrowRight className="text-gray-300" />
          
          {/* Attention: Q × K^T */}
          <BlockGrid rows={SEQ} cols={HID} color="red" label="Q" subLabel="[L, D_k]" active />
          <Operator symbol="×" />
          <BlockGrid rows={HID} cols={SEQ} color="blue" label="K^T" subLabel="[D_k, L]" active transposed />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={SEQ} color="yellow" label="Scores" subLabel="[L, L]" active />
          <Operator symbol="×" />
          <BlockGrid rows={SEQ} cols={HID} color="green" label="V" subLabel="[L, D_v]" active />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={HID} color="purple" label="Output" subLabel="[L, D_v]" highlightLastRow active />
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Prefill 计算完整的 [L, L] 方阵。Output 的<span className="font-bold text-yellow-600">最后一行</span>用于预测下一个 Token。
        </p>
      </div>

      {/* TRANSITION ARROW */}
      <div className="flex justify-center -my-4 relative z-10">
        <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md">
            <Database size={14} />
            KV Cache Handover
            <ArrowDown size={14} />
        </div>
      </div>

      {/* 2. DECODING STAGE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
        <SectionLabel icon={Cpu} title="Phase 2: Decoding (Token Generation)" color="amber" />

        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 flex-nowrap">
          {/* Input x */}
          <BlockGrid rows={1} cols={D_MODEL} color="gray" label="x_new" subLabel="[1, D_model]" active />
          <Operator symbol="×" />
          
          {/* W matrices */}
          <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="red" label="Wq" subLabel="[D, D_k]" active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="blue" label="Wk" subLabel="[D, D_k]" active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={HID} color="green" label="Wv" subLabel="[D, D_v]" active />
            </div>
          </div>
          <Operator symbol="=" />
          
          {/* qkv results + cache combined */}
          <div className="relative flex flex-col gap-2 p-2 pt-4 bg-amber-50/50 rounded-lg border border-amber-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">New (this step)</div>
            <BlockGrid rows={1} cols={HID} color="red" label="q" subLabel="[1, D_k]" active />
            <BlockGrid rows={1} cols={HID} color="blue" label="k" subLabel="[1, D_k]" active />
            <BlockGrid rows={1} cols={HID} color="green" label="v" subLabel="[1, D_v]" active />
          </div>
          
          <Operator symbol="+" />
          
          {/* Cache from prefill */}
          <div className="relative flex flex-col gap-2 p-2 pt-4 bg-indigo-50/50 rounded-lg border border-indigo-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">from Prefill</div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={HID} color="blue" label="K_cache" subLabel="[L, D_k]" /></div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={HID} color="green" label="V_cache" subLabel="[L, D_v]" /></div>
          </div>
          
          <ArrowRight className="text-gray-300" />
          
          {/* Attention calculation with merged K/V */}
          <BlockGrid rows={1} cols={HID} color="red" label="q" subLabel="[1, D_k]" active />
          <Operator symbol="×" />
          <div className="relative flex flex-col gap-[1px] p-1.5 bg-blue-50 rounded border border-blue-200">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-blue-600 font-bold whitespace-nowrap">K^T [D_k, L+1]</div>
            <div className="flex gap-[1px]">
              <div className="opacity-50"><BlockGrid rows={HID} cols={SEQ} color="blue" label="" /></div>
              <BlockGrid rows={HID} cols={1} color="blue" label="" active />
            </div>
          </div>
          <Operator symbol="=" />
          <div className="p-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <BlockGrid rows={1} cols={SEQ + 1} color="yellow" label="Scores" subLabel="[1, L+1]" active />
          </div>
          <Operator symbol="×" />
          <div className="relative flex flex-col gap-[1px] p-1.5 bg-green-50 rounded border border-green-200">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-green-600 font-bold whitespace-nowrap">V [L+1, D_v]</div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={HID} color="green" label="" /></div>
            <BlockGrid rows={1} cols={HID} color="green" label="" active />
          </div>
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={HID} color="purple" label="Output" subLabel="[1, D_v]" active />
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          <span className="inline-block w-3 h-3 bg-indigo-200 rounded mr-1 align-middle"></span>浅色 = Prefill 缓存
          <span className="inline-block w-3 h-3 bg-amber-400 rounded mx-1 ml-3 align-middle"></span>深色 = 本次计算
          <span className="mx-3">|</span>
          Decoding 只计算 <span className="font-bold text-amber-600">1×(L+1) 向量</span>
        </p>
      </div>
    </div>
  );
};

// --- Step-by-Step Wrapper ---
const StepCard = ({ title, description, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-4xl min-h-[400px] flex flex-col"
  >
    <div className="mb-6 border-b border-gray-100 pb-4">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center overflow-x-auto py-4">
      {children}
    </div>
  </motion.div>
);

// --- Main Application ---

export default function BlockVisualizer() {
  const [mode, setMode] = useState('compare'); // 'compare' | 'prefill' | 'decoding'
  const [step, setStep] = useState(0);

  // Constants
  const SEQ_LEN = 6;
  const HIDDEN_DIM = 4;
  const CACHE_LEN = 6;

  const prefillSteps = [
    {
      title: "1. 输入嵌入 (Embedding)",
      desc: "输入是一个完整的序列矩阵。维度为 [Sequence_Length, Hidden_Dim]。",
      render: () => (
        <BlockGrid rows={SEQ_LEN} cols={HIDDEN_DIM} color="gray" label="Input X" active />
      )
    },
    {
      title: "2. 生成 Q, K, V",
      desc: "输入矩阵分别投影生成三个相同形状的矩阵。",
      render: () => (
        <div className="flex gap-8">
           <BlockGrid rows={SEQ_LEN} cols={HIDDEN_DIM} color="red" label="Q" active />
           <BlockGrid rows={SEQ_LEN} cols={HIDDEN_DIM} color="blue" label="K" active />
           <BlockGrid rows={SEQ_LEN} cols={HIDDEN_DIM} color="green" label="V" active />
        </div>
      )
    },
    {
      title: "3. 自注意力 (Self-Attention)",
      desc: "Q 乘以 K 的转置。生成一个 [L, L] 的方阵。这就是 Prefill 计算量大的原因。",
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGrid rows={SEQ_LEN} cols={HIDDEN_DIM} color="red" label="Q" active />
          <Operator symbol="×" />
          <BlockGrid rows={HIDDEN_DIM} cols={SEQ_LEN} color="blue" label="K^T" active transposed />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ_LEN} cols={SEQ_LEN} color="yellow" label="Score Matrix" subLabel="[L, L] Square" active />
        </div>
      )
    }
  ];

  const decodingSteps = [
    {
      title: "1. 单点输入",
      desc: "Decoding 阶段，输入只是刚刚生成的 1 个 Token。",
      render: () => (
        <BlockGrid rows={1} cols={HIDDEN_DIM} color="gray" label="Input x" subLabel="[1, D]" active />
      )
    },
    {
      title: "2. 拼接 KV Cache",
      desc: "新生成的 k, v (1行) 被拼接到历史 Cache (L行) 的末尾。",
      render: () => (
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-center opacity-50">
             <BlockGrid rows={CACHE_LEN} cols={HIDDEN_DIM} color="blue" label="Old Cache" />
           </div>
           <Plus className="text-gray-400" />
           <BlockGrid rows={1} cols={HIDDEN_DIM} color="blue" label="New k" active />
           <ArrowRight className="text-gray-400" />
           <div className="flex flex-col gap-[1px]">
                <BlockGrid rows={CACHE_LEN} cols={HIDDEN_DIM} color="blue" label="" />
                <BlockGrid rows={1} cols={HIDDEN_DIM} color="blue" label="" active />
                <div className="text-xs font-bold text-blue-600 mt-1 text-center">New Cache</div>
           </div>
        </div>
      )
    },
    {
      title: "3. 注意力计算 (Vector)",
      desc: "新 Token (q) 查询整个 Cache。结果是一个扁平的向量 [1, L+1]。",
      render: () => (
        <div className="flex items-center gap-2">
            <BlockGrid rows={1} cols={HIDDEN_DIM} color="red" label="q_new" active />
            <Operator symbol="×" />
            <BlockGrid rows={HIDDEN_DIM} cols={CACHE_LEN + 1} color="blue" label="K_Cache^T" active transposed />
            <Operator symbol="=" />
            <BlockGrid rows={1} cols={CACHE_LEN + 1} color="yellow" label="Scores" subLabel="[1, L+1] Vector" active />
        </div>
      )
    }
  ];

  const currentSteps = mode === 'prefill' ? prefillSteps : decodingSteps;

  return (
    <div className="min-h-screen bg-gray-50 font-sans px-4 py-6">
      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LLM 矩阵变换全流程</h1>
          <p className="text-gray-600">Prefill (方阵) <ArrowRight className="inline w-4 h-4"/> KV Cache <ArrowRight className="inline w-4 h-4"/> Decoding (向量)</p>
        </header>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setMode('compare')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'compare' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <Layers size={16} /> 全流程视图
          </button>
          <button 
            onClick={() => { setMode('prefill'); setStep(0); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'prefill' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <Play size={16} /> Prefill 细节
          </button>
          <button 
            onClick={() => { setMode('decoding'); setStep(0); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${mode === 'decoding' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <Cpu size={16} /> Decoding 细节
          </button>
        </div>

        {/* Content Area */}
        <div className="flex justify-center">
          {mode === 'compare' ? (
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="w-full"
             >
                <StaticFlow />
             </motion.div>
          ) : (
            <div className="w-full flex flex-col items-center">
                {/* Step Progress */}
                <div className="flex gap-2 mb-6">
                    {currentSteps.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 w-8 rounded-full transition-colors ${idx === step ? (mode === 'prefill' ? 'bg-indigo-600' : 'bg-amber-500') : 'bg-gray-200'}`} 
                        />
                    ))}
                </div>

                {/* Main Visualization Card */}
                <StepCard 
                    title={currentSteps[step].title} 
                    description={currentSteps[step].desc}
                >
                    {currentSteps[step].render()}
                </StepCard>

                {/* Controls */}
                <div className="flex gap-4 mt-8">
                    <button 
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        上一步
                    </button>
                    <button 
                        onClick={() => setStep(Math.min(currentSteps.length - 1, step + 1))}
                        disabled={step === currentSteps.length - 1}
                        className={`px-6 py-2 rounded-lg text-white font-medium shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2 ${mode === 'prefill' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                    >
                        {step === currentSteps.length - 1 ? <CheckCircle2 size={16}/> : <SkipForward size={16}/>}
                        {step === currentSteps.length - 1 ? '完成' : '下一步'}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}