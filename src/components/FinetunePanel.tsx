import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Settings, Activity, TrendingDown, Save, Trash2, Eye, EyeOff, Layers } from 'lucide-react';
import type { FinetuneStep } from '../types';
import { formatMSE } from '../utils/colorMap';

interface SavedExperiment {
  id: string;
  name: string;
  color: string;
  rank: number;
  alpha: number;
  learningRate: number;
  numSteps: number;
  steps: FinetuneStep[];
  timestamp: number;
  visible: boolean;
}

const COLOR_PALETTE = [
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
];

interface FinetunePanelProps {
  steps: FinetuneStep[];
  currentStepIndex: number;
  isFinetuning: boolean;
  onStartFinetune: (steps: number, learningRate: number) => void;
  onStepChange: (index: number) => void;
  rank: number;
  alpha: number;
}

export function FinetunePanel({
  steps,
  currentStepIndex,
  isFinetuning,
  onStartFinetune,
  onStepChange,
  rank,
  alpha,
}: FinetunePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [numSteps, setNumSteps] = useState(500);
  const [learningRate, setLearningRate] = useState(0.01);
  const [numStepsInput, setNumStepsInput] = useState('500');
  const [learningRateInput, setLearningRateInput] = useState('0.01');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([]);
  const [historyPanelExpanded, setHistoryPanelExpanded] = useState(true);
  
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const experimentCounterRef = useRef(0);

  isPlayingRef.current = isPlaying;

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      return;
    }

    const tick = () => {
      if (!isPlayingRef.current) return;
      
      if (currentStepIndex < steps.length - 1) {
        onStepChange(currentStepIndex + 1);
        animationTimerRef.current = setTimeout(tick, playbackSpeed);
      } else {
        setIsPlaying(false);
      }
    };

    animationTimerRef.current = setTimeout(tick, playbackSpeed);

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps.length, onStepChange, playbackSpeed]);

  const handleNumStepsBlur = useCallback(() => {
    const val = parseInt(numStepsInput, 10);
    if (isNaN(val)) {
      setNumSteps(10);
      setNumStepsInput('10');
    } else {
      const clamped = Math.max(10, Math.min(2000, Math.round(val / 10) * 10));
      setNumSteps(clamped);
      setNumStepsInput(String(clamped));
    }
  }, [numStepsInput]);

  const handleLearningRateBlur = useCallback(() => {
    const val = parseFloat(learningRateInput);
    if (isNaN(val)) {
      setLearningRate(0.01);
      setLearningRateInput('0.01');
    } else {
      const clamped = Math.max(0.001, Math.min(0.5, val));
      setLearningRate(clamped);
      setLearningRateInput(String(clamped));
    }
  }, [learningRateInput]);

  const handlePlayPause = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    
    if (currentStepIndex >= steps.length - 1) {
      onStepChange(0);
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps.length, onStepChange]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    onStepChange(0);
  }, [onStepChange]);

  const handleStart = useCallback(() => {
    setIsPlaying(false);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    let finalSteps = numSteps;
    const stepsVal = parseInt(numStepsInput, 10);
    if (!isNaN(stepsVal)) {
      finalSteps = Math.max(10, Math.min(2000, Math.round(stepsVal / 10) * 10));
      setNumSteps(finalSteps);
      setNumStepsInput(String(finalSteps));
    }

    let finalLR = learningRate;
    const lrVal = parseFloat(learningRateInput);
    if (!isNaN(lrVal)) {
      finalLR = Math.max(0.001, Math.min(0.5, lrVal));
      setLearningRate(finalLR);
      setLearningRateInput(String(finalLR));
    }

    onStartFinetune(finalSteps, finalLR);
  }, [numSteps, learningRate, numStepsInput, learningRateInput, onStartFinetune]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setIsPlaying(false);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    onStepChange(index);
  }, [onStepChange]);

  const handleSaveExperiment = useCallback(() => {
    if (steps.length === 0) return;
    
    experimentCounterRef.current += 1;
    const colorIndex = savedExperiments.length % COLOR_PALETTE.length;
    const newExperiment: SavedExperiment = {
      id: `exp-${Date.now()}-${experimentCounterRef.current}`,
      name: `实验 #${experimentCounterRef.current}`,
      color: COLOR_PALETTE[colorIndex],
      rank,
      alpha,
      learningRate: learningRate,
      numSteps: steps.length - 1,
      steps: [...steps],
      timestamp: Date.now(),
      visible: true,
    };
    
    setSavedExperiments((prev) => [...prev, newExperiment]);
  }, [steps, rank, alpha, learningRate, savedExperiments.length]);

  const handleToggleExperiment = useCallback((id: string) => {
    setSavedExperiments((prev) =>
      prev.map((exp) =>
        exp.id === id ? { ...exp, visible: !exp.visible } : exp
      )
    );
  }, []);

  const handleDeleteExperiment = useCallback((id: string) => {
    setSavedExperiments((prev) => prev.filter((exp) => exp.id !== id));
  }, []);

  const handleClearAllExperiments = useCallback(() => {
    setSavedExperiments([]);
  }, []);

  const visibleSavedExperiments = useMemo(
    () => savedExperiments.filter((exp) => exp.visible),
    [savedExperiments]
  );

  const allLossData = useMemo(() => {
    const all: number[] = [];
    if (steps.length > 0) {
      all.push(...steps.map((s) => s.loss));
    }
    visibleSavedExperiments.forEach((exp) => {
      exp.steps.forEach((s) => all.push(s.loss));
    });
    return all;
  }, [steps, visibleSavedExperiments]);

  const lossData = useMemo(() => steps.map(s => s.loss), [steps]);
  const stepNumbers = useMemo(() => steps.map(s => s.step), [steps]);

  const CHART = {
    leftPad: 0,
    rightPad: 0,
    topPad: 6,
    bottomPad: 0,
  };

  const SVG_W = 1000;
  const SVG_H = 370;
  const CHART_X = CHART.leftPad;
  const CHART_Y = CHART.topPad;
  const CHART_W = SVG_W - CHART.leftPad - CHART.rightPad;
  const CHART_H = SVG_H - CHART.topPad - CHART.bottomPad;

  const { minLoss, maxLoss } = useMemo(() => {
    if (allLossData.length === 0) return { minLoss: 0, maxLoss: 1 };
    let min = Math.min(...allLossData);
    let max = Math.max(...allLossData);
    if (min === max) {
      min = min === 0 ? -1 : min * 0.9;
      max = max === 0 ? 1 : max * 1.1;
    }
    const padding = (max - min) * 0.08;
    return { minLoss: min - padding, maxLoss: max + padding };
  }, [allLossData]);

  const maxStepValue = useMemo(() => {
    let max = 0;
    if (steps.length > 0) {
      max = steps[steps.length - 1].step;
    }
    visibleSavedExperiments.forEach((exp) => {
      if (exp.steps.length > 0) {
        const lastStep = exp.steps[exp.steps.length - 1].step;
        if (lastStep > max) max = lastStep;
      }
    });
    return max;
  }, [steps, visibleSavedExperiments]);

  const yAt = useCallback((loss: number) => {
    if (maxLoss === minLoss) return CHART_Y + CHART_H / 2;
    return CHART_Y + (1 - (loss - minLoss) / (maxLoss - minLoss)) * CHART_H;
  }, [minLoss, maxLoss]);

  const xAtStep = useCallback((stepVal: number) => {
    if (maxStepValue === 0) return CHART_X;
    return CHART_X + (stepVal / maxStepValue) * CHART_W;
  }, [maxStepValue]);

  const polylinePoints = useMemo(() => {
    if (steps.length <= 1) return '';
    return steps.map((s) => `${xAtStep(s.step).toFixed(1)},${yAt(s.loss).toFixed(1)}`).join(' ');
  }, [steps, xAtStep, yAt]);

  const areaPathD = useMemo(() => {
    if (steps.length <= 1) return '';
    const bottomY = (CHART_Y + CHART_H).toFixed(1);
    const firstX = xAtStep(steps[0].step).toFixed(1);
    const lastX = xAtStep(steps[steps.length - 1].step).toFixed(1);
    const line = steps.map((s) => `L${xAtStep(s.step).toFixed(1)},${yAt(s.loss).toFixed(1)}`).join(' ');
    return `M${firstX},${yAt(steps[0].loss).toFixed(1)} ${line} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
  }, [steps, xAtStep, yAt]);

  const currentPoint = useMemo(() => {
    if (steps.length === 0) return { x: CHART_X, y: CHART_Y + CHART_H / 2 };
    const step = steps[currentStepIndex];
    return { x: xAtStep(step.step), y: yAt(step.loss) };
  }, [steps, currentStepIndex, xAtStep, yAt]);

  const yTickValues = useMemo(() => {
    const arr: { value: number; yRatio: number }[] = [];
    for (let i = 0; i <= 4; i++) {
      const ratio = i / 4;
      arr.push({ value: maxLoss - ratio * (maxLoss - minLoss), yRatio: ratio });
    }
    return arr;
  }, [minLoss, maxLoss]);

  const xTickValues = useMemo(() => {
    if (maxStepValue === 0) return [] as { value: number; xRatio: number }[];
    return [
      { value: 0, xRatio: 0 },
      { value: Math.round(maxStepValue / 2), xRatio: 0.5 },
      { value: maxStepValue, xRatio: 1 },
    ];
  }, [maxStepValue]);

  const xTickValuesGlobal = xTickValues;

  return (
    <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden">
      <div
        className="flex items-center justify-between p-6 hover:bg-zinc-700/20 transition-colors"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer"
        >
          <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-white">模拟 LoRA 微调</h2>
            <p className="text-sm text-zinc-400">
              观察矩阵在梯度下降过程中如何动态变化
              {steps.length > 0 && ` · 已完成 ${steps.length - 1} 步`}
              {savedExperiments.length > 0 && ` · 已暂存 ${savedExperiments.length} 个实验`}
            </p>
          </div>
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-700/50 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30">
              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                <Settings className="w-4 h-4" />
                训练步数
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                step={10}
                value={numStepsInput}
                onChange={(e) => setNumStepsInput(e.target.value)}
                onBlur={handleNumStepsBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30">
              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                <Settings className="w-4 h-4" />
                学习率
              </label>
              <input
                type="number"
                min={0.001}
                max={0.5}
                step={0.001}
                value={learningRateInput}
                onChange={(e) => setLearningRateInput(e.target.value)}
                onBlur={handleLearningRateBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30">
              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                <Settings className="w-4 h-4" />
                播放速度
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value={500}>慢 (0.5s)</option>
                <option value={200}>正常 (0.2s)</option>
                <option value={100}>快 (0.1s)</option>
                <option value={50}>极速 (0.05s)</option>
              </select>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 flex flex-col justify-end">
              <button
                onClick={handleStart}
                disabled={isFinetuning}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isFinetuning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    模拟中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    开始模拟
                  </>
                )}
              </button>
            </div>
          </div>

          {steps.length > 0 && (
            <>
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-zinc-400">损失曲线 (Loss Curve)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveExperiment}
                      disabled={isFinetuning || steps.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      暂存当前实验
                    </button>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-zinc-500">
                        初始: <span className="text-zinc-300 font-mono">{formatMSE(steps[0].loss)}</span>
                      </span>
                      <span className="text-zinc-500">
                        最终: <span className="text-emerald-400 font-mono">{formatMSE(steps[steps.length - 1].loss)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {savedExperiments.length > 0 && (
                  <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <button
                      onClick={() => setHistoryPanelExpanded(!historyPanelExpanded)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-zinc-300">
                          历史实验对比 ({savedExperiments.length})
                        </span>
                      </div>
                      <span className="text-zinc-500 text-xs">
                        {historyPanelExpanded ? '收起 ▲' : '展开 ▼'}
                      </span>
                    </button>
                    
                    {historyPanelExpanded && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {savedExperiments.map((exp) => (
                            <div
                              key={exp.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                                exp.visible
                                  ? 'bg-zinc-700/50 border-zinc-600'
                                  : 'bg-zinc-800/50 border-zinc-700/50 opacity-60'
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: exp.color }}
                              />
                              <span className="text-xs text-zinc-300 font-medium">
                                {exp.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                r={exp.rank} α={exp.alpha} lr={exp.learningRate}
                              </span>
                              <button
                                onClick={() => handleToggleExperiment(exp.id)}
                                className="p-0.5 hover:bg-zinc-600 rounded transition-colors"
                                title={exp.visible ? '隐藏' : '显示'}
                              >
                                {exp.visible ? (
                                  <Eye className="w-3 h-3 text-zinc-400" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-zinc-500" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteExperiment(exp.id)}
                                className="p-0.5 hover:bg-red-900/50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleClearAllExperiments}
                          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          清除全部历史实验
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative h-44 bg-zinc-800 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between py-3 px-1.5 pointer-events-none select-none z-10">
                    {yTickValues.slice().reverse().map((tick, i) => (
                      <div
                        key={`yt-${i}`}
                        className="text-right text-[11px] text-zinc-400 font-mono leading-none whitespace-nowrap"
                        title={tick.value.toFixed(8)}
                      >
                        {tick.value.toExponential(1)}
                      </div>
                    ))}
                  </div>

                  <div className="absolute left-14 right-4 top-3 bottom-8">
                    <svg
                      className="w-full h-full block"
                      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="lossGradientArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
                        </linearGradient>
                        {visibleSavedExperiments.map((exp) => (
                          <linearGradient
                            key={`grad-${exp.id}`}
                            id={`lossGradient-${exp.id}`}
                            x1="0" y1="0" x2="0" y2="1"
                          >
                            <stop offset="0%" stopColor={exp.color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={exp.color} stopOpacity="0.02" />
                          </linearGradient>
                        ))}
                      </defs>

                      <rect
                        x={0}
                        y={CHART_Y}
                        width={CHART_W}
                        height={CHART_H}
                        fill="none"
                        stroke="#52525b"
                        strokeWidth="2"
                        rx="2"
                      />

                      {yTickValues.map((tick, i) => (
                        i > 0 && i < yTickValues.length - 1 && (
                          <line
                            key={`gl-${i}`}
                            x1={0}
                            y1={CHART_Y + tick.yRatio * CHART_H}
                            x2={CHART_W}
                            y2={CHART_Y + tick.yRatio * CHART_H}
                            stroke="#3f3f46"
                            strokeWidth="1.2"
                            strokeDasharray="5 7"
                          />
                        )
                      ))}

                      {visibleSavedExperiments.map((exp) => {
                        if (exp.steps.length <= 1) return null;
                        
                        const points = exp.steps
                          .map((s) => `${xAtStep(s.step).toFixed(1)},${yAt(s.loss).toFixed(1)}`)
                          .join(' ');
                        
                        const bottomY = (CHART_Y + CHART_H).toFixed(1);
                        const firstStep = exp.steps[0];
                        const lastStep = exp.steps[exp.steps.length - 1];
                        const firstX = xAtStep(firstStep.step).toFixed(1);
                        const lastX = xAtStep(lastStep.step).toFixed(1);
                        const linePath = exp.steps.map((s) => 
                          `L${xAtStep(s.step).toFixed(1)},${yAt(s.loss).toFixed(1)}`
                        ).join(' ');
                        const areaD = `M${firstX},${yAt(firstStep.loss).toFixed(1)} ${linePath} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
                        
                        return (
                          <g key={`exp-${exp.id}`}>
                            <path d={areaD} fill={`url(#lossGradient-${exp.id})`} />
                            <polyline
                              points={points}
                              fill="none"
                              stroke={exp.color}
                              strokeWidth="2"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              strokeDasharray="6 4"
                              opacity="0.85"
                            />
                          </g>
                        );
                      })}

                      {lossData.length > 1 && (
                        <>
                          <path
                            d={areaPathD}
                            fill="url(#lossGradientArea)"
                          />
                          <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </>
                      )}

                      {lossData.length > 0 && (
                        <>
                          <circle
                            cx={currentPoint.x}
                            cy={currentPoint.y}
                            r="11"
                            fill="#fbbf24"
                            opacity="0.15"
                          />
                          <circle
                            cx={currentPoint.x}
                            cy={currentPoint.y}
                            r="7"
                            fill="#fbbf24"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                          />
                        </>
                      )}
                    </svg>
                  </div>

                  <div className="absolute left-14 right-4 bottom-0 h-8 flex items-end justify-between pointer-events-none select-none z-10">
                    {xTickValuesGlobal.map((tick, i) => (
                      <div
                        key={`xt-${i}`}
                        className={`text-[11px] text-zinc-400 font-mono leading-none ${
                          i === 0 ? 'text-left' : i === xTickValuesGlobal.length - 1 ? 'text-right' : 'text-center'
                        }`}
                        style={{
                          minWidth: i === 0 || i === xTickValuesGlobal.length - 1 ? '0' : '60px',
                          flex: i === 0 || i === xTickValuesGlobal.length - 1 ? '0 0 auto' : '0 0 60px',
                        }}
                      >
                        Step {tick.value}
                      </div>
                    ))}
                  </div>
                </div>

                {savedExperiments.length > 0 && historyPanelExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50">
                    <div className="text-xs text-zinc-500 mb-2">图例说明</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                        <span className="text-zinc-400">当前实验</span>
                      </div>
                      {savedExperiments.map((exp) => (
                        <div key={exp.id} className="flex items-center gap-2">
                          <div
                            className="w-6 h-0.5 rounded"
                            style={{ 
                              backgroundColor: exp.color,
                              opacity: exp.visible ? 1 : 0.3,
                              borderStyle: 'dashed',
                              borderWidth: '0 0 2px 0',
                              borderColor: exp.color,
                            }}
                          />
                          <span className={exp.visible ? 'text-zinc-400' : 'text-zinc-600'}>
                            {exp.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayPause}
                      disabled={steps.length === 0}
                      className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={steps.length === 0}
                      className="w-10 h-10 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="text-white font-medium">
                        Step {currentStep?.step ?? 0} / {steps[steps.length - 1]?.step ?? 0}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Loss: {currentStep ? formatMSE(currentStep.loss) : '-'}
                      </div>
                    </div>
                  </div>
                  {currentStep && (
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <div className="text-zinc-500">||grad_A||</div>
                        <div className="text-zinc-300 font-mono">{currentStep.gradNormA.toFixed(6)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-zinc-500">||grad_B||</div>
                        <div className="text-zinc-300 font-mono">{currentStep.gradNormB.toFixed(6)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={currentStepIndex}
                  onChange={handleSliderChange}
                  className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between mt-1 text-xs text-zinc-600">
                  <span>Step 0</span>
                  <span>Step {steps[steps.length - 1]?.step ?? 0}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                <h3 className="text-md font-medium text-emerald-300 mb-2">💡 微调过程说明</h3>
                <div className="text-zinc-300 text-sm leading-relaxed space-y-1">
                  <p><strong>前向传播：</strong>W' = W₀ + α × (B × A)，其中 W₀ 固定，只训练 A 和 B</p>
                  <p><strong>反向传播：</strong>计算损失对 A 和 B 的梯度，使用梯度下降更新</p>
                  <p><strong>Alpha 的作用：</strong>α/r 作为缩放因子，控制低秩更新的幅度，防止小秩 r 时更新过小</p>
                  <p><strong>历史对比：</strong>点击"暂存当前实验"按钮保存当前结果，可在同一张图中对比不同参数下的损失曲线</p>
                </div>
              </div>
            </>
          )}

          {steps.length === 0 && !isFinetuning && (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">配置参数后点击"开始模拟"按钮</p>
              <p className="text-zinc-600 text-sm mt-1">
                将模拟梯度下降过程，观察矩阵 A、B、ΔW 和 W' 如何动态变化
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
