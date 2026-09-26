import React from 'react';

interface StatusPipelineProps {
  form: any;
  isInput: boolean;
  currentStepIdx: number;
  steps: { key: string; label: string; desc: string }[];
}

export function StatusPipeline({
  form,
  isInput,
  currentStepIdx,
  steps,
}: StatusPipelineProps) {
  if (form.status === 'cancelled') return null;

  return (
    <div className="bg-slate-50/50 border-b border-gray-100 px-6 py-5">
      <div className="max-w-3xl mx-auto flex items-center justify-between relative">
        <div className="absolute left-[3%] right-[3%] top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0">
          <div
            className={`h-full rounded-full transition-all duration-500 z-0 bg-gradient-to-r ${
              isInput
                ? 'from-blue-500 to-indigo-600'
                : 'from-emerald-500 to-teal-600'
            }`}
            style={{ width: `${(currentStepIdx / 3) * 100}%` }}
          />
        </div>

        {steps.map((step, idx) => {
          const isActive = idx <= currentStepIdx;
          const isCurrent = idx === currentStepIdx;

          let bgClass = 'bg-gray-200 border-gray-300 text-gray-400';
          let textClass = 'text-gray-500 font-medium';

          if (isActive) {
            if (isInput) {
              bgClass = isCurrent
                ? 'bg-indigo-600 border-indigo-200 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-600/20'
                : 'bg-indigo-500 border-indigo-300 text-white';
              textClass = isCurrent ? 'text-indigo-600 font-extrabold' : 'text-indigo-500 font-bold';
            } else {
              bgClass = isCurrent
                ? 'bg-emerald-600 border-emerald-200 text-white ring-4 ring-emerald-100 shadow-md shadow-emerald-600/20'
                : 'bg-emerald-500 border-emerald-300 text-white';
              textClass = isCurrent ? 'text-emerald-600 font-extrabold' : 'text-emerald-500 font-bold';
            }
          }

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 w-1/4">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-300 font-bold ${bgClass}`}>
                {idx + 1}
              </div>
              <span className={`text-[11px] mt-2 text-center transition-all ${textClass}`}>
                {step.label}
              </span>
              <span className="text-[9px] text-gray-400 font-bold mt-0.5 text-center hidden sm:block">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}