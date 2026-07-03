'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface TutorialStep {
  selector: string;
  title: string;
  content: string;
}

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  tutorialKey: string;
  onComplete?: () => void;
}

export default function InteractiveTutorial({
  steps,
  tutorialKey,
  onComplete,
}: InteractiveTutorialProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  
  const resizeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCompleted = localStorage.getItem(`completed_tutorial_${tutorialKey}`);
      if (!isCompleted && steps && steps.length > 0) {
        // Retrasar 2.5 segundos para que la página renderice completamente
        const timer = setTimeout(() => {
          setIsVisible(true);
          setCurrentStepIdx(0);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [tutorialKey, steps]);

  // Update tooltip & highlight coordinates based on selected element
  const updatePosition = () => {
    if (!isVisible || !steps || steps.length === 0) return;
    const step = steps[currentStepIdx];
    const element = document.querySelector(step.selector);

    if (element) {
      // Element found in DOM
      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Ensure target element is visible in view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight style
      setHighlightStyle({
        top: `${rect.top + scrollY - 6}px`,
        left: `${rect.left + scrollX - 6}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
        position: 'absolute',
        zIndex: 99998,
        borderRadius: '12px',
        border: '3px solid #C68A1E',
        boxShadow: '0 0 20px rgba(198, 138, 30, 0.4), 0 0 0 9999px rgba(2, 4, 3, 0.75)',
        transition: 'all 0.3s ease-in-out',
        pointerEvents: 'none',
      });

      // Tooltip position (place below element, or above if no space)
      const spaceBelow = window.innerHeight - rect.bottom;
      const tooltipHeight = 160;
      const placeAbove = spaceBelow < tooltipHeight && rect.top > tooltipHeight;

      setTooltipStyle({
        position: 'absolute',
        top: placeAbove 
          ? `${rect.top + scrollY - tooltipHeight - 16}px`
          : `${rect.bottom + scrollY + 16}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 340, rect.left + scrollX + (rect.width / 2) - 160))}px`,
        width: '320px',
        zIndex: 99999,
        transition: 'all 0.3s ease-in-out',
      });
    } else {
      // Fallback: Center of the screen if element not found
      setHighlightStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '0px',
        height: '0px',
        zIndex: 99998,
        boxShadow: '0 0 0 9999px rgba(2, 4, 3, 0.85)',
      });

      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    updatePosition();
    
    // Periodically recalculate layout position to handle async renders/resizes
    resizeIntervalRef.current = setInterval(updatePosition, 800);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      if (resizeIntervalRef.current) clearInterval(resizeIntervalRef.current);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isVisible, currentStepIdx, steps]);

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      handleClose(true);
    }
  };

  const handleSkip = () => {
    handleClose(true);
  };

  const handleClose = (markCompleted = true) => {
    setIsVisible(false);
    if (markCompleted) {
      localStorage.setItem(`completed_tutorial_${tutorialKey}`, 'true');
    }
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || steps.length === 0) return null;

  const currentStep = steps[currentStepIdx];

  return (
    <>
      {/* Target Element Highlight Box */}
      <div style={highlightStyle} className="pointer-events-none" />

      {/* Interactive Tooltip Card */}
      <div 
        style={tooltipStyle} 
        className="bg-[#0b0e0c] border border-[#C68A1E]/40 rounded-[2rem] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="flex items-center justify-between mb-3 border-b border-card-border/40 pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C68A1E]">
            Guía Interactiva ({currentStepIdx + 1}/{steps.length})
          </span>
          <button 
            onClick={handleSkip} 
            className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            Omitir
          </button>
        </div>

        <h4 className="text-xs font-black text-white mb-2 uppercase tracking-wide">
          {currentStep.title}
        </h4>
        <p className="text-[10px] leading-relaxed text-white/70 font-medium mb-6">
          {currentStep.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1.5">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentStepIdx ? 'bg-[#C68A1E] w-3' : 'bg-white/20'}`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-white/10"
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-[#C68A1E] text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {currentStepIdx === steps.length - 1 ? 'Terminar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
