import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, Play, SkipForward, Layers, Cpu, CheckCircle2, Plus, Database, Pause } from 'lucide-react';

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

// 纯 Causal Mask 矩阵（显示 0 和 -∞）
const CausalMaskGrid = ({ size, label, subLabel }) => {
  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{size}, {size}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: size }).map((_, r) => (
            <div key={r} className="flex gap-[1px]">
              {Array.from({ length: size }).map((_, c) => {
                const isMasked = c > r;
                return (
                  <motion.div
                    key={c}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (r * size + c) * 0.002 }}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[1px] flex items-center justify-center text-[8px] font-bold ${isMasked ? 'bg-red-100 border border-red-300 text-red-600' : 'bg-green-100 border border-green-300 text-green-600'}`}
                  >
                    {isMasked ? '-∞' : '0'}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className="text-xs font-bold text-gray-600">{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 带 Causal Mask 的 Scores 矩阵（下三角有效，右上角 masked）
const ScoresWithMask = ({ size, label, subLabel, showNew = false, newCount = 1 }) => {
  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{size}, {size}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: size }).map((_, r) => (
            <div key={r} className="flex gap-[1px]">
              {Array.from({ length: size }).map((_, c) => {
                const isMasked = c > r;
                const isNew = showNew && (r >= size - newCount || c >= size - newCount);
                return (
                  <motion.div
                    key={c}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (r * size + c) * 0.002 }}
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] ${isMasked ? 'border border-dashed border-gray-600' : 'border border-solid border-amber-300'} ${isNew ? 'bg-amber-500' : 'bg-amber-200'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="absolute -right-1 -top-1 bg-gray-500 text-white text-[8px] px-1 rounded">mask</div>
      </div>
      <div className="text-center mt-1">
        <div className="text-xs font-bold text-amber-600">{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 带深浅色区分的 Scores 矩阵（展示 KV Cache 效果 + Causal Mask）
const ScoresWithCache = ({ oldRows, oldCols, label, subLabel }) => {
  const totalRows = oldRows + 1;
  const totalCols = oldCols + 1;
  
  const renderCell = (r, c) => {
    const isMasked = c > r;
    const isNew = r >= oldRows || c >= oldCols;
    return (
      <motion.div
        key={`${r}-${c}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: (r * totalCols + c) * 0.002 }}
        className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] ${isMasked ? 'border border-dashed border-gray-400 bg-transparent' : isNew ? 'border border-amber-300 bg-amber-500' : 'border border-amber-200 bg-amber-200'}`}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{totalRows}, {totalCols}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: totalRows }).map((_, r) => (
            <div key={r} className="flex gap-[1px]">
              {Array.from({ length: totalCols }).map((_, c) => renderCell(r, c))}
            </div>
          ))}
        </div>
        <div className="absolute -right-1 -top-1 bg-gray-500 text-white text-[8px] px-1 rounded">mask</div>
      </div>
      <div className="text-center mt-1">
        <div className="text-xs font-bold text-amber-600">{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 带深浅色区分的矩阵（最后一行高亮，或最后一列高亮）
const BlockGridWithHighlight = ({ rows, cols, color, label, subLabel, highlightLastRow = true, highlightLastCol = false }) => {
  const colors = {
    red:    { light: "bg-rose-200", dark: "bg-rose-500", border: "border-rose-200", text: "text-rose-600" },
    blue:   { light: "bg-sky-200", dark: "bg-sky-500", border: "border-sky-200", text: "text-sky-600" },
    green:  { light: "bg-emerald-200", dark: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600" },
    purple: { light: "bg-violet-200", dark: "bg-violet-500", border: "border-violet-200", text: "text-violet-600" },
    gray:   { light: "bg-slate-200", dark: "bg-slate-800", border: "border-slate-300", text: "text-slate-600" },
  };
  const theme = colors[color] || colors.gray;

  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{rows}, {cols}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-[1px]">
              {Array.from({ length: cols }).map((_, c) => {
                const isHighlighted = (highlightLastRow && r === rows - 1) || (highlightLastCol && c === cols - 1);
                return (
                  <motion.div
                    key={c}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (r * cols + c) * 0.002 }}
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] border ${theme.border} ${isHighlighted ? theme.dark : theme.light}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className={`text-xs font-bold ${theme.text}`}>{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 横向拼接的矩阵（用于 K^T = cache + new）
const HConcatGrid = ({ rows, colsOld, colsNew, color, label, subLabel }) => {
  const colors = {
    blue: { light: "bg-sky-100", dark: "bg-sky-500", border: "border-sky-200", text: "text-sky-600" },
    green: { light: "bg-emerald-100", dark: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600" },
  };
  const theme = colors[color] || colors.blue;
  const totalCols = colsOld + colsNew;

  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{rows}, {totalCols}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-[1px]">
              {Array.from({ length: totalCols }).map((_, c) => {
                const isNew = c >= colsOld;
                return (
                  <motion.div
                    key={c}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (r * totalCols + c) * 0.002 }}
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] border ${theme.border} ${isNew ? theme.dark : theme.light}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className={`text-xs font-bold ${theme.text}`}>{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 纵向拼接的矩阵（用于 V = cache + new）
const VConcatGrid = ({ rowsOld, rowsNew, cols, color, label, subLabel }) => {
  const colors = {
    blue: { light: "bg-sky-100", dark: "bg-sky-500", border: "border-sky-200", text: "text-sky-600" },
    green: { light: "bg-emerald-100", dark: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600" },
  };
  const theme = colors[color] || colors.green;
  const totalRows = rowsOld + rowsNew;

  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{totalRows}, {cols}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: totalRows }).map((_, r) => {
            const isNew = r >= rowsOld;
            return (
              <div key={r} className="flex gap-[1px]">
                {Array.from({ length: cols }).map((_, c) => (
                  <motion.div
                    key={c}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (r * cols + c) * 0.002 }}
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] border ${theme.border} ${isNew ? theme.dark : theme.light}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className={`text-xs font-bold ${theme.text}`}>{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

// 带 Token 标签的输入矩阵
const TokenInput = ({ tokens, cols, color = "gray", label, subLabel, active = false, highlightLastRow = false }) => {
  const colors = {
    gray: { bg: "bg-slate-200", active: "bg-slate-800", border: "border-slate-300", text: "text-slate-600" },
  };
  const theme = colors[color] || colors.gray;
  
  return (
    <div className="flex flex-col items-center gap-1 mx-1">
      <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 rounded mb-1">
        [{tokens.length}, {cols}]
      </div>
      <div className="relative p-1 bg-white rounded shadow-sm border border-gray-100">
        <div className="flex flex-col gap-[1px]">
          {tokens.map((token, r) => {
            const isLastRow = r === tokens.length - 1;
            const cellActive = highlightLastRow ? isLastRow : active;
            return (
              <div key={r} className="flex items-center gap-1">
                <span className={`text-[9px] w-6 text-right pr-1 font-mono ${isLastRow && highlightLastRow ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>{token}</span>
                <div className="flex gap-[1px]">
                  {Array.from({ length: cols }).map((_, c) => (
                    <motion.div
                      key={c}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: (r * cols + c) * 0.002 }}
                      className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[1px] border ${theme.border} ${cellActive ? theme.active : theme.bg}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-center mt-1">
        <div className={`text-xs font-bold ${theme.text}`}>{label}</div>
        {subLabel && <div className="text-[9px] text-gray-400 font-mono leading-tight">{subLabel}</div>}
      </div>
    </div>
  );
};

const SectionLabel = ({ title, color, onDetail }) => (
  <div className={`flex items-center justify-between mb-4 pb-2 border-b ${color === 'indigo' ? 'border-indigo-200 text-indigo-900' : color === 'amber' ? 'border-amber-200 text-amber-900' : 'border-red-200 text-red-900'}`}>
    <h3 className="font-bold text-base">{title}</h3>
    {onDetail && (
      <button 
        onClick={onDetail}
        className={`text-xs px-3 py-1 rounded-full font-medium transition-all hover:scale-105 ${color === 'indigo' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : color === 'amber' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
      >
        查看细节 →
      </button>
    )}
  </div>
);

// --- Main Static Flow Component ---
const StaticFlow = ({ phase, onShowPrefillDetail, onShowDecodingDetail, onShowNocacheDetail }) => {
  const PREFILL_TOKENS = ['别', '偷着', '学了', '带带', '我', '啊'];
  const DECODE_TOKEN = '！';
  const SEQ = PREFILL_TOKENS.length;
  const D_K = 2;  // 每头的维度
  const D_MODEL = 4; // 输入维度
  const N_HEADS = 2; // 头数 (D_MODEL / D_K)
  
  return (
    <div className="w-full mx-auto">
      
      {/* 1. PREFILL STAGE */}
      {phase === 1 && (
      <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-indigo-200">
        <SectionLabel title="Phase 1: Prefill (Context Processing)" color="indigo" onDetail={onShowPrefillDetail} />
        
        {/* 标注多头信息 */}
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full border border-indigo-200">
            Multi-Head Attention: h={N_HEADS} heads, D_model={D_MODEL}, D_k=D_v={D_K}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 flex-nowrap">
          {/* Input X */}
          <TokenInput tokens={PREFILL_TOKENS} cols={D_MODEL} label="Input X" subLabel={`[L=${SEQ}, D_model]`} active />
          <Operator symbol="×" />
          
          {/* W matrices - 标注这是单头 */}
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i (i=1..{N_HEADS})</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
          </div>
          <Operator symbol="=" />
          
          {/* QKV results */}
          <div className="flex flex-col gap-4">
            <BlockGrid rows={SEQ} cols={D_K} color="red" label="Qⁱ" subLabel={`[L, ${D_K}]`} active />
            <div className="relative p-2 pt-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={D_K} color="blue" label="Kⁱ" subLabel={`[L, ${D_K}]`} active />
            </div>
            <div className="relative p-2 pt-4 rounded-lg border-2 border-dashed border-green-300 bg-green-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-100 text-green-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ" subLabel={`[L, ${D_K}]`} active />
            </div>
          </div>
          
          <ArrowRight className="text-gray-300" />
          
          {/* Attention: Q × K^T */}
          <BlockGrid rows={SEQ} cols={D_K} color="red" label="Qⁱ" subLabel={`[L, ${D_K}]`} active />
          <Operator symbol="×" />
          <BlockGrid rows={D_K} cols={SEQ} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, L]`} active transposed />
          <Operator symbol="=" />
          <ScoresWithMask size={SEQ} label="Scoresⁱ" subLabel="[L, L]" />
          <Operator symbol="×" />
          <BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ" subLabel={`[L, ${D_K}]`} active />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={D_K} color="purple" label="Headⁱ" subLabel={`[L, ${D_K}]`} highlightLastRow active />
          
          <ArrowRight className="text-gray-300" />
          
          {/* Multi-head concat + Wo */}
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat {N_HEADS} heads</div>
            <BlockGrid rows={SEQ} cols={D_K} color="purple" label="H1" subLabel="" active />
            <BlockGrid rows={SEQ} cols={D_K} color="purple" label="H2" subLabel="" active />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={D_MODEL} color="purple" label="Output" subLabel={`[L, ${D_MODEL}]`} highlightLastRow active />
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          每个头独立计算 Attention，然后 Concat 拼接，通过 Wo 投影回 D_model。Output 的<span className="font-bold text-yellow-600">最后一行</span>用于预测下一个 Token。
        </p>
      </div>
      )}

      {/* 2. DECODING STAGE */}
      {phase === 2 && (
      <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-amber-200">
        <SectionLabel title="Phase 2: Decoding (Token Generation)" color="amber" onDetail={onShowDecodingDetail} />

        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 flex-nowrap">
          {/* Input x */}
                    <TokenInput tokens={[DECODE_TOKEN]} cols={D_MODEL} label="x_new" subLabel={`[1, ${D_MODEL}]`} active />
          <Operator symbol="×" />
          
          {/* W matrices */}
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i (i=1..{N_HEADS})</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
          </div>
          <Operator symbol="=" />
          
          {/* qkv results + cache combined */}
          <div className="relative flex flex-col gap-3 p-3 pt-5 bg-amber-50/50 rounded-lg border border-amber-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">New</div>
            <BlockGrid rows={1} cols={D_K} color="red" label="qⁱ" subLabel={`[1, ${D_K}]`} active />
            <BlockGrid rows={1} cols={D_K} color="blue" label="kⁱ" subLabel={`[1, ${D_K}]`} active />
            <BlockGrid rows={1} cols={D_K} color="green" label="vⁱ" subLabel={`[1, ${D_K}]`} active />
          </div>
          
          <Operator symbol="+" />
          
          {/* Cache from prefill */}
          <div className="relative flex flex-col gap-3 p-3 pt-5 bg-indigo-50/50 rounded-lg border border-indigo-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">from Prefill</div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={D_K} color="blue" label="Kⁱ_cache" subLabel={`[L, ${D_K}]`} /></div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ_cache" subLabel={`[L, ${D_K}]`} /></div>
          </div>
          
          <ArrowRight className="text-gray-300" />
          
          {/* Attention calculation with merged K/V */}
          <BlockGrid rows={1} cols={D_K} color="red" label="qⁱ" subLabel={`[1, ${D_K}]`} active />
          <Operator symbol="×" />
          <HConcatGrid rows={D_K} colsOld={SEQ} colsNew={1} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, L+1]`} />
          <Operator symbol="=" />
          <div className="p-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <BlockGrid rows={1} cols={SEQ + 1} color="yellow" label="Scoresⁱ" subLabel="[1, L+1]" active />
          </div>
          <Operator symbol="×" />
          <VConcatGrid rowsOld={SEQ} rowsNew={1} cols={D_K} color="green" label="Vⁱ" subLabel={`[L+1, ${D_K}]`} />
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={D_K} color="purple" label="Headⁱ" subLabel={`[1, ${D_K}]`} active />
          
          <ArrowRight className="text-gray-300" />
          
          {/* Multi-head concat + Wo */}
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat</div>
            <BlockGrid rows={1} cols={D_K} color="purple" label="H1" subLabel="" active />
            <BlockGrid rows={1} cols={D_K} color="purple" label="H2" subLabel="" active />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={D_MODEL} color="purple" label="Output" subLabel={`[1, ${D_MODEL}]`} active />
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          <span className="inline-block w-3 h-3 bg-indigo-200 rounded mr-1 align-middle"></span>浅色 = Prefill 缓存
          <span className="inline-block w-3 h-3 bg-amber-400 rounded mx-1 ml-3 align-middle"></span>深色 = 本次计算
          <span className="mx-3">|</span>
          维度闭环: Input [{D_MODEL}] → Concat [{N_HEADS}×{D_K}] × Wo → Output [{D_MODEL}]
        </p>
      </div>
      )}

      {/* 3. WITHOUT KV CACHE - 完整流程对比 */}
      {phase === 3 && (
      <div className="bg-white/50 p-6 rounded-xl shadow-sm border border-red-200">
        <SectionLabel title="Phase 3: Without KV Cache (每次重算全部)" color="red" onDetail={onShowNocacheDetail} />

        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 flex-nowrap">
          {/* 完整输入 - 最后一行高亮 */}
          <TokenInput tokens={[...PREFILL_TOKENS, DECODE_TOKEN]} cols={D_MODEL} label="Full Input" subLabel={`[L+1, ${D_MODEL}]`} highlightLastRow />
          <Operator symbol="×" />
          
          {/* W matrices */}
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i (i=1..{N_HEADS})</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
          </div>
          <Operator symbol="=" />
          
          {/* QKV - 最后一行高亮 */}
          <div className="flex flex-col gap-4">
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="red" label="Qⁱ" subLabel={`[L+1, ${D_K}]`} />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="blue" label="Kⁱ" subLabel={`[L+1, ${D_K}]`} />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="green" label="Vⁱ" subLabel={`[L+1, ${D_K}]`} />
          </div>
          
          <ArrowRight className="text-gray-300" />
          
          {/* Attention 计算 */}
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="red" label="Qⁱ" subLabel={`[L+1, ${D_K}]`} />
          <Operator symbol="×" />
          <BlockGridWithHighlight rows={D_K} cols={SEQ+1} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, L+1]`} highlightLastRow={false} highlightLastCol />
          <Operator symbol="=" />
          <ScoresWithMask size={SEQ+1} label="Scoresⁱ" subLabel="[L+1, L+1]" showNew />
          <Operator symbol="×" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="green" label="Vⁱ" subLabel={`[L+1, ${D_K}]`} />
          <Operator symbol="=" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="Headⁱ" subLabel={`[L+1, ${D_K}]`} />
          
          <ArrowRight className="text-gray-300" />
          
          {/* Concat + Wo */}
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat</div>
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="H1" subLabel="" />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="H2" subLabel="" />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_MODEL} color="purple" label="Output" subLabel={`[L+1, ${D_MODEL}]`} />
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          <span className="inline-block w-3 h-3 bg-slate-200 rounded mr-1 align-middle"></span>浅色 = 可缓存（Prefill已算）
          <span className="inline-block w-3 h-3 bg-slate-800 rounded mx-1 ml-3 align-middle"></span>深色 = 当前token
          <span className="mx-2">|</span>
          Without Cache: 每次都要重算<span className="font-bold text-red-600">全部 {(SEQ+1)*(SEQ+1)}</span> 个 Scores
        </p>
      </div>
      )}

      {/* 效率对比总结 */}
      {phase === 3 && (
      <div className="p-4 mt-4 bg-gradient-to-r from-red-50 via-white to-emerald-50 rounded-xl border border-gray-200">
        <div className="flex justify-center items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-red-700">Without Cache: Scores <span className="font-bold">[{SEQ+1}×{SEQ+1}]</span> = {(SEQ+1)*(SEQ+1)} 元素</span>
          </div>
          <ArrowRight className="text-gray-400" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-emerald-700">With Cache: Scores <span className="font-bold">[1×{SEQ+1}]</span> = {SEQ+1} 元素</span>
          </div>
          <div className="text-gray-600 font-bold bg-indigo-100 px-3 py-1 rounded-full">
            节省 <span className="text-indigo-600">{Math.round((1 - (SEQ+1) / ((SEQ+1)*(SEQ+1))) * 100)}%</span> Attention 计算
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

// --- Step-by-Step Wrapper ---
const StepCard = ({ title, description, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/50 rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-6xl min-h-[400px] flex flex-col"
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
  const [mode, setMode] = useState('compare'); // 'compare' | 'prefill' | 'decoding' | 'nocache'
  const [phase, setPhase] = useState(1); // 1 | 2 | 3
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToDetail = (type) => {
    setMode(type);
    setStep(0);
    setAutoPlay(false);
  };

  const backToOverview = () => {
    setMode('compare');
    setAutoPlay(false);
  };

  // Constants - 与 StaticFlow 保持一致
  const PREFILL_TOKENS = ['别', '偷着', '学了', '带带', '我', '啊'];
  const DECODE_TOKEN = '！';
  const SEQ = PREFILL_TOKENS.length;
  const D_K = 2;
  const D_MODEL = 4;
  const N_HEADS = 2;

  const prefillSteps = [
    {
      title: "1. 输入嵌入 (Input Embedding)",
      desc: `输入序列 "${PREFILL_TOKENS.join('')}" 转换为嵌入矩阵 [L=${SEQ}, D_model=${D_MODEL}]`,
      render: () => (
        <TokenInput tokens={PREFILL_TOKENS} cols={D_MODEL} label="Input X" subLabel={`[${SEQ}, ${D_MODEL}]`} active />
      )
    },
    {
      title: "2. 线性投影 (Linear Projection)",
      desc: `Input X 分别乘以 Wq、Wk、Wv 得到 Q、K、V。每个头的维度为 D_k=${D_K}`,
      render: () => (
        <div className="flex items-center gap-3">
          <TokenInput tokens={PREFILL_TOKENS} cols={D_MODEL} label="Input X" subLabel={`[${SEQ}, ${D_MODEL}]`} active />
          <Operator symbol="×" />
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i (i=1..{N_HEADS})</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel={`[${D_MODEL}, ${D_K}]`} active />
            </div>
          </div>
          <Operator symbol="=" />
          <div className="flex flex-col gap-4">
            <BlockGrid rows={SEQ} cols={D_K} color="red" label="Qⁱ" subLabel={`[${SEQ}, ${D_K}]`} active />
            <div className="relative p-2 pt-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={D_K} color="blue" label="Kⁱ" subLabel={`[${SEQ}, ${D_K}]`} active />
            </div>
            <div className="relative p-2 pt-4 rounded-lg border-2 border-dashed border-green-300 bg-green-50/50">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-100 text-green-700 text-[9px] px-1.5 rounded font-bold">Cache</div>
              <BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ" subLabel={`[${SEQ}, ${D_K}]`} active />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. 计算原始分数 (Raw Scores)",
      desc: `Q × K^T 得到 [${SEQ}, ${SEQ}] 的原始注意力分数矩阵`,
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGrid rows={SEQ} cols={D_K} color="red" label="Qⁱ" subLabel={`[${SEQ}, ${D_K}]`} active />
          <Operator symbol="×" />
          <BlockGrid rows={D_K} cols={SEQ} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, ${SEQ}]`} active />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={SEQ} color="yellow" label="Raw Scores" subLabel={`[${SEQ}, ${SEQ}]`} active />
        </div>
      )
    },
    {
      title: "4. 应用 Causal Mask",
      desc: "将右上角（未来位置）设为 -∞，确保每个 token 只能看到自己和之前的 token",
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGrid rows={SEQ} cols={SEQ} color="yellow" label="Raw Scores" subLabel={`[${SEQ}, ${SEQ}]`} active />
          <Operator symbol="+" />
          <CausalMaskGrid size={SEQ} label="Causal Mask" subLabel="0 / -∞" />
          <Operator symbol="=" />
          <ScoresWithMask size={SEQ} label="Masked Scores" subLabel={`[${SEQ}, ${SEQ}]`} />
        </div>
      )
    },
    {
      title: "5. Softmax 归一化",
      desc: "对每行做 Softmax，-∞ 位置变为 0，得到注意力权重",
      render: () => (
        <div className="flex items-center gap-2">
          <ScoresWithMask size={SEQ} label="Masked Scores" subLabel={`[${SEQ}, ${SEQ}]`} />
          <Operator symbol="→" />
          <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">Softmax</div>
          <Operator symbol="→" />
          <ScoresWithMask size={SEQ} label="Attention Weights" subLabel="每行和=1" />
        </div>
      )
    },
    {
      title: "6. 加权求和 (Weighted Sum)",
      desc: "Attention Weights × V 得到每个头的输出",
      render: () => (
        <div className="flex items-center gap-2">
          <ScoresWithMask size={SEQ} label="Weights" subLabel={`[${SEQ}, ${SEQ}]`} />
          <Operator symbol="×" />
          <BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ" subLabel={`[${SEQ}, ${D_K}]`} active />
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={D_K} color="purple" label="Headⁱ" subLabel={`[${SEQ}, ${D_K}]`} highlightLastRow active />
        </div>
      )
    },
    {
      title: "7. 多头拼接 + 输出投影 (Concat + Output Projection)",
      desc: `${N_HEADS} 个头拼接后通过 Wo 投影回 D_model=${D_MODEL}`,
      render: () => (
        <div className="flex items-center gap-2">
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat {N_HEADS} heads</div>
            <BlockGrid rows={SEQ} cols={D_K} color="purple" label="H1" subLabel="" active />
            <BlockGrid rows={SEQ} cols={D_K} color="purple" label="H2" subLabel="" active />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGrid rows={SEQ} cols={D_MODEL} color="purple" label="Output" subLabel={`[${SEQ}, ${D_MODEL}]`} highlightLastRow active />
        </div>
      )
    }
  ];

  const decodingSteps = [
    {
      title: "1. 单 Token 输入",
      desc: `Decoding 阶段只输入新生成的 1 个 Token "${DECODE_TOKEN}"`,
      render: () => (
        <TokenInput tokens={[DECODE_TOKEN]} cols={D_MODEL} label="x_new" subLabel={`[1, ${D_MODEL}]`} active />
      )
    },
    {
      title: "2. 线性投影 + KV Cache",
      desc: "新 token 投影得到 q, k, v，k 和 v 追加到 Cache",
      render: () => (
        <div className="flex items-center gap-3">
          <TokenInput tokens={[DECODE_TOKEN]} cols={D_MODEL} label="x_new" subLabel={`[1, ${D_MODEL}]`} active />
          <Operator symbol="×" />
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel="" active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel="" active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel="" active />
            </div>
          </div>
          <Operator symbol="=" />
          <div className="relative flex flex-col gap-3 p-3 pt-5 bg-amber-50/50 rounded-lg border border-amber-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">New</div>
            <BlockGrid rows={1} cols={D_K} color="red" label="qⁱ" subLabel={`[1, ${D_K}]`} active />
            <BlockGrid rows={1} cols={D_K} color="blue" label="kⁱ" subLabel={`[1, ${D_K}]`} active />
            <BlockGrid rows={1} cols={D_K} color="green" label="vⁱ" subLabel={`[1, ${D_K}]`} active />
          </div>
          <Operator symbol="+" />
          <div className="relative flex flex-col gap-3 p-3 pt-5 bg-indigo-50/50 rounded-lg border border-indigo-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">from Prefill</div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={D_K} color="blue" label="Kⁱ_cache" subLabel={`[${SEQ}, ${D_K}]`} /></div>
            <div className="opacity-50"><BlockGrid rows={SEQ} cols={D_K} color="green" label="Vⁱ_cache" subLabel={`[${SEQ}, ${D_K}]`} /></div>
          </div>
        </div>
      )
    },
    {
      title: "3. 注意力计算",
      desc: `q × K_cache^T 得到 [1, ${SEQ+1}] 的注意力向量（不是方阵！）`,
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGrid rows={1} cols={D_K} color="red" label="qⁱ" subLabel={`[1, ${D_K}]`} active />
          <Operator symbol="×" />
          <HConcatGrid rows={D_K} colsOld={SEQ} colsNew={1} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, ${SEQ+1}]`} />
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={SEQ + 1} color="yellow" label="Scoresⁱ" subLabel={`[1, ${SEQ+1}]`} active />
        </div>
      )
    },
    {
      title: "4. 加权求和",
      desc: "Scores × V_cache 得到单个输出向量",
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGrid rows={1} cols={SEQ + 1} color="yellow" label="Scoresⁱ" subLabel={`[1, ${SEQ+1}]`} active />
          <Operator symbol="×" />
          <VConcatGrid rowsOld={SEQ} rowsNew={1} cols={D_K} color="green" label="Vⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={D_K} color="purple" label="Headⁱ" subLabel={`[1, ${D_K}]`} active />
        </div>
      )
    },
    {
      title: "5. 多头拼接 + 输出投影",
      desc: `${N_HEADS} 个头拼接后通过 Wo 投影，输出下一个 token 的表示`,
      render: () => (
        <div className="flex items-center gap-2">
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat</div>
            <BlockGrid rows={1} cols={D_K} color="purple" label="H1" subLabel="" active />
            <BlockGrid rows={1} cols={D_K} color="purple" label="H2" subLabel="" active />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGrid rows={1} cols={D_MODEL} color="purple" label="Output" subLabel={`[1, ${D_MODEL}]`} active />
        </div>
      )
    }
  ];

  const nocacheSteps = [
    {
      title: "1. 完整输入",
      desc: `每次都需要输入完整序列 [L+1, D_model]，包括所有历史 token`,
      render: () => (
        <TokenInput tokens={[...PREFILL_TOKENS, DECODE_TOKEN]} cols={D_MODEL} label="Full Input" subLabel={`[${SEQ+1}, ${D_MODEL}]`} highlightLastRow />
      )
    },
    {
      title: "2. 线性投影",
      desc: `完整输入乘以 Wq、Wk、Wv，得到完整的 Q、K、V`,
      render: () => (
        <div className="flex items-center gap-3">
          <TokenInput tokens={[...PREFILL_TOKENS, DECODE_TOKEN]} cols={D_MODEL} label="Full Input" subLabel={`[${SEQ+1}, ${D_MODEL}]`} highlightLastRow />
          <Operator symbol="×" />
          <div className="relative flex flex-col gap-3 p-3 pt-6 bg-gray-50 rounded-lg border border-gray-200 mt-3 overflow-visible">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap z-10">Head i</div>
            <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="red" label="Wqⁱ" subLabel="" active />
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="blue" label="Wkⁱ" subLabel="" active />
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <BlockGrid rows={D_MODEL} cols={D_K} color="green" label="Wvⁱ" subLabel="" active />
            </div>
          </div>
          <Operator symbol="=" />
          <div className="flex flex-col gap-4">
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="red" label="Qⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="blue" label="Kⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="green" label="Vⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
          </div>
        </div>
      )
    },
    {
      title: "3. 计算注意力分数",
      desc: `Q × K^T 得到 [${SEQ+1}, ${SEQ+1}] 的完整方阵，计算量 O(n²)`,
      render: () => (
        <div className="flex items-center gap-2">
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="red" label="Qⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
          <Operator symbol="×" />
          <BlockGridWithHighlight rows={D_K} cols={SEQ+1} color="blue" label="Kⁱᵀ" subLabel={`[${D_K}, ${SEQ+1}]`} highlightLastRow={false} highlightLastCol />
          <Operator symbol="=" />
          <ScoresWithMask size={SEQ+1} label="Scoresⁱ" subLabel={`[${SEQ+1}, ${SEQ+1}]`} showNew />
        </div>
      )
    },
    {
      title: "4. 加权求和",
      desc: `Scores × V 得到输出，每次都要重算全部 ${(SEQ+1)*(SEQ+1)} 个元素`,
      render: () => (
        <div className="flex items-center gap-2">
          <ScoresWithMask size={SEQ+1} label="Scoresⁱ" subLabel={`[${SEQ+1}, ${SEQ+1}]`} showNew />
          <Operator symbol="×" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="green" label="Vⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
          <Operator symbol="=" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="Headⁱ" subLabel={`[${SEQ+1}, ${D_K}]`} />
        </div>
      )
    },
    {
      title: "5. 多头拼接 + 输出投影",
      desc: `${N_HEADS} 个头拼接后通过 Wo 投影，输出完整序列`,
      render: () => (
        <div className="flex items-center gap-2">
          <div className="relative flex gap-1 p-2 pt-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Concat</div>
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="H1" subLabel="" />
            <BlockGridWithHighlight rows={SEQ+1} cols={D_K} color="purple" label="H2" subLabel="" />
          </div>
          <Operator symbol="×" />
          <div className="p-1.5 bg-gray-100 rounded border border-gray-300">
            <BlockGrid rows={D_MODEL} cols={D_MODEL} color="gray" label="Wo" subLabel={`[${D_MODEL}, ${D_MODEL}]`} active />
          </div>
          <Operator symbol="=" />
          <BlockGridWithHighlight rows={SEQ+1} cols={D_MODEL} color="purple" label="Output" subLabel={`[${SEQ+1}, ${D_MODEL}]`} />
        </div>
      )
    }
  ];

  const currentSteps = mode === 'prefill' ? prefillSteps : mode === 'decoding' ? decodingSteps : nocacheSteps;

  // Auto play logic
  useEffect(() => {
    if (autoPlay && mode !== 'compare') {
      autoPlayRef.current = setInterval(() => {
        setStep(prev => {
          if (prev >= currentSteps.length - 1) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, mode, currentSteps.length]);

  return (
    <div className="min-h-screen font-sans px-4 py-6">
      <div className="w-full max-w-[1800px] mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LLM 矩阵变换全流程</h1>
          <p className="text-gray-600">Prefill (方阵) <ArrowRight className="inline w-4 h-4"/> KV Cache <ArrowRight className="inline w-4 h-4"/> Decoding (向量)</p>
        </header>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          {mode === 'compare' ? (
            <>
              <button 
                onClick={() => setPhase(1)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${phase === 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                阶段1: Prefill
              </button>
              <button 
                onClick={() => setPhase(2)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${phase === 2 ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                阶段2: Decoding
              </button>
              <button 
                onClick={() => setPhase(3)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${phase === 3 ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Decoding (No Cache)
              </button>
            </>
          ) : (
            <div className={`px-5 py-2 rounded-full text-sm font-bold ${mode === 'prefill' ? 'bg-indigo-600 text-white' : mode === 'decoding' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
              {mode === 'prefill' ? 'Prefill 细节' : mode === 'decoding' ? 'Decoding 细节' : 'No Cache 细节'}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex justify-center">
          {mode === 'compare' ? (
             <motion.div 
                key={phase}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full"
             >
                <StaticFlow 
                  phase={phase}
                  onShowPrefillDetail={() => goToDetail('prefill')} 
                  onShowDecodingDetail={() => goToDetail('decoding')}
                  onShowNocacheDetail={() => goToDetail('nocache')} 
                />
             </motion.div>
          ) : (
            <div className="w-full flex flex-col items-center">
                {/* Top bar: Back button + Step controls */}
                <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                  <button 
                    onClick={backToOverview}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← 返回全流程视图
                  </button>
                  
                  {/* Step Controls */}
                  <div className="flex gap-3">
                    <button 
                        onClick={() => { setAutoPlay(!autoPlay); if (!autoPlay && step === currentSteps.length - 1) setStep(0); }}
                        className={`px-4 py-2 rounded-lg border font-medium text-sm flex items-center gap-2 ${autoPlay ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        {autoPlay ? <Pause size={16}/> : <Play size={16}/>}
                        {autoPlay ? '暂停' : '自动'}
                    </button>
                    <button 
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0 || autoPlay}
                        className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        上一步
                    </button>
                    <button 
                        onClick={() => setStep(Math.min(currentSteps.length - 1, step + 1))}
                        disabled={step === currentSteps.length - 1 || autoPlay}
                        className={`px-5 py-2 rounded-lg text-white font-medium shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2 ${mode === 'prefill' ? 'bg-indigo-600 hover:bg-indigo-700' : mode === 'decoding' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {step === currentSteps.length - 1 ? <CheckCircle2 size={16}/> : <SkipForward size={16}/>}
                        {step === currentSteps.length - 1 ? '完成' : '下一步'}
                    </button>
                  </div>
                </div>

                {/* Step Progress */}
                <div className="flex gap-2 mb-6">
                    {currentSteps.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 w-8 rounded-full transition-colors ${idx === step ? (mode === 'prefill' ? 'bg-indigo-600' : mode === 'decoding' ? 'bg-amber-500' : 'bg-red-500') : 'bg-gray-200'}`} 
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}