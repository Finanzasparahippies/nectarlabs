'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl, getStoredToken } from '@/lib/api';

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
  const apiBase = getApiBaseUrl();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCompleted = localStorage.getItem(`completed_tutorial_${tutorialKey}`);
      const hideAll = localStorage.getItem('hide_all_tutorials');

      if (hideAll === 'true') {
        return;
      }

      // Check remote user preference if available
      const checkRemoteStatus = async () => {
        const token = getStoredToken();
        if (token) {
          try {
            const res = await fetch(`${apiBase}/users/me/`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            if (res.ok) {
              const userData = await res.json();
              const prefs = userData.preferences || {};
              if (prefs.hide_all_tutorials) {
                localStorage.setItem('hide_all_tutorials', 'true');
                return;
              }
              if (Array.isArray(prefs.completed_tutorials) && prefs.completed_tutorials.includes(tutorialKey)) {
                localStorage.setItem(`completed_tutorial_${tutorialKey}`, 'true');
                return;
              }
            }
          } catch {
            // Silently fallback to localStorage check
          }
        }

        // Only open if never completed
        if (isCompleted !== 'true' && steps && steps.length > 0) {
          const timer = setTimeout(() => {
            setIsVisible(true);
            setCurrentStepIdx(0);
          }, 1500);
          return () => clearTimeout(timer);
        }
      };

      checkRemoteStatus();
    }
  }, [tutorialKey, steps, apiBase]);

  // Soporte para reinicio manual mediante eventos personalizados del sistema
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleManualRestart = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === tutorialKey) {
        localStorage.removeItem(`completed_tutorial_${tutorialKey}`);
        localStorage.removeItem('hide_all_tutorials');
        setIsVisible(true);
        setCurrentStepIdx(0);
      }
    };

    window.addEventListener('restart_tutorial', handleManualRestart);
    return () => {
      window.removeEventListener('restart_tutorial', handleManualRestart);
    };
  }, [tutorialKey]);

  // Update tooltip & highlight coordinates based on selected element
  const updatePosition = () => {
    if (!isVisible || !steps || steps.length === 0) return;
    const step = steps[currentStepIdx];
    const element = step.selector ? document.querySelector(step.selector) : null;

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
        borderRadius: '16px',
        border: '2.5px solid #C68A1E',
        boxShadow: '0 0 25px rgba(198, 138, 30, 0.45), 0 0 0 9999px rgba(3, 7, 5, 0.82)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      });

      // Tooltip position (place below element, or above if no space)
      const spaceBelow = window.innerHeight - rect.bottom;
      const tooltipHeight = 180;
      const placeAbove = spaceBelow < tooltipHeight && rect.top > tooltipHeight;

      setTooltipStyle({
        position: 'absolute',
        top: placeAbove 
          ? `${Math.max(16, rect.top + scrollY - tooltipHeight - 20)}px`
          : `${rect.bottom + scrollY + 16}px`,
        left: `${Math.max(16, Math.min(window.innerWidth - 360, rect.left + scrollX + (rect.width / 2) - 170))}px`,
        width: '340px',
        zIndex: 99999,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      });
    } else {
      // Clean, elegant center dialog when selector is not in current DOM
      setHighlightStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '0px',
        height: '0px',
        zIndex: 99998,
        boxShadow: '0 0 0 9999px rgba(3, 7, 5, 0.88)',
      });

      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '360px',
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    updatePosition();
    
    // Periodically recalculate layout position to handle async renders/resizes
    resizeIntervalRef.current = setInterval(updatePosition, 1000);
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

  const persistTutorialCompletion = async (neverShowAgain = false) => {
    const token = getStoredToken();
    if (!token) return;

    try {
      // First fetch current preferences
      const getRes = await fetch(`${apiBase}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (getRes.ok) {
        const u = await getRes.json();
        const prevPrefs = u.preferences || {};
        const currentCompleted = Array.isArray(prevPrefs.completed_tutorials) ? prevPrefs.completed_tutorials : [];
        const nextCompleted = Array.from(new Set([...currentCompleted, tutorialKey]));

        const patchPayload: Record<string, any> = {
          preferences: {
            ...prevPrefs,
            completed_tutorials: nextCompleted
          }
        };

        if (neverShowAgain) {
          patchPayload.preferences.hide_all_tutorials = true;
        }

        await fetch(`${apiBase}/users/me/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(patchPayload)
        });
      }
    } catch {
      // Fallback persists safely in localStorage
    }
  };

  const handleNeverShowAgain = () => {
    localStorage.setItem('hide_all_tutorials', 'true');
    localStorage.setItem(`completed_tutorial_${tutorialKey}`, 'true');
    persistTutorialCompletion(true);
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  const handleClose = (markCompleted = true) => {
    setIsVisible(false);
    if (markCompleted) {
      localStorage.setItem(`completed_tutorial_${tutorialKey}`, 'true');
      persistTutorialCompletion(false);
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

      {/* Interactive Tooltip Card with Dark Glassmorphism */}
      <div 
        style={tooltipStyle} 
        className="bg-[#090e0b]/95 backdrop-blur-2xl border border-nectar-gold/40 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-3 border-b border-card-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-nectar-gold animate-pulse"></span>
            <span className="text-2xs font-black uppercase tracking-widest text-nectar-gold">
              Guía Interactiva ({currentStepIdx + 1}/{steps.length})
            </span>
          </div>
          <button 
            onClick={handleSkip} 
            className="text-2xs font-bold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>

        <h4 className="text-xs font-black text-foreground mb-2 uppercase tracking-wide">
          {currentStep.title}
        </h4>
        <p className="text-2xs leading-relaxed text-foreground/75 font-medium mb-5">
          {currentStep.content}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-card-border/40">
          <div className="flex space-x-1.5 items-center">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIdx ? 'bg-nectar-gold w-4' : 'bg-foreground/20 w-1.5'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 text-foreground text-2xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-card-border"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 bg-nectar-gold text-black text-2xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md shadow-nectar-gold/20"
            >
              {currentStepIdx === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleNeverShowAgain}
            className="text-[9px] font-bold text-foreground/40 hover:text-foreground/70 uppercase tracking-wider transition-colors cursor-pointer"
          >
            No volver a mostrar guías
          </button>
        </div>
      </div>
    </>
  );
}
