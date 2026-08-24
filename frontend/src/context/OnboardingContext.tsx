'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PaymentFrequency = 'WEEKLY_MONDAY' | 'FORTNIGHTLY_1ST_15TH' | 'MONTHLY_1ST';

export interface Plan {
  id: number;
  name: string;
  price: string;
  hours: number;
  discount_percentage?: string;
  description?: string;
}

export interface PromoCodeDetails {
  code: string;
  discount_percentage: number;
  code_type?: string;
}

export const MIN_INSTALLMENT_AMOUNT = 50.0; // Monto mínimo en MXN por cuota para pasarela

export interface OnboardingState {
  plan: string;
  payment_day: PaymentFrequency;
  full_name: string;
  tax_id: string;
  address: string;
  project_idea: string;
  brand_design_tier: string;
  brand_design_price: number;
}

export interface FrequencyBreakdown {
  frequency: PaymentFrequency;
  label: string;
  shortLabel: string;
  periodName: string;
  installmentsPerMonth: number;
  totalInstallmentsSixMonths: number;
  rawAmount: number;
  roundedAmount: number;
  discountedAmount: number;
  isValid: boolean;
}

/**
 * Redondeo financiero estricto a 2 decimales para evitar discrepancias de centavos.
 */
export const roundCurrency = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

/**
 * Calcula el desglose detallado por frecuencia de pago para un plan dado.
 */
export const getFrequencyBreakdown = (
  monthlyPrice: number,
  frequency: PaymentFrequency,
  discountPercentage: number = 0
): FrequencyBreakdown => {
  let installmentsPerMonth = 1;
  let label = 'Mensual';
  let shortLabel = 'mes';
  let periodName = 'Día 1ero de cada mes (Mensual)';
  let totalInstallmentsSixMonths = 6;

  if (frequency === 'WEEKLY_MONDAY') {
    installmentsPerMonth = 4;
    label = 'Semanal';
    shortLabel = 'semana';
    periodName = 'Lunes de cada semana (Semanal)';
    totalInstallmentsSixMonths = 24;
  } else if (frequency === 'FORTNIGHTLY_1ST_15TH') {
    installmentsPerMonth = 2;
    label = 'Quincenal';
    shortLabel = 'quincena';
    periodName = 'Días 1 y 15 de cada mes (Quincenal)';
    totalInstallmentsSixMonths = 12;
  }

  const rawAmount = monthlyPrice / installmentsPerMonth;
  const roundedAmount = roundCurrency(rawAmount);
  const discountedAmount = roundCurrency(roundedAmount * (1 - discountPercentage / 100));

  return {
    frequency,
    label,
    shortLabel,
    periodName,
    installmentsPerMonth,
    totalInstallmentsSixMonths,
    rawAmount,
    roundedAmount,
    discountedAmount,
    isValid: roundedAmount >= MIN_INSTALLMENT_AMOUNT,
  };
};

interface OnboardingContextType {
  formData: OnboardingState;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  updateField: <K extends keyof OnboardingState>(field: K, value: OnboardingState[K]) => void;
  getPlanBreakdown: (planObj?: Plan, promoDiscount?: number) => Record<PaymentFrequency, FrequencyBreakdown> | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<OnboardingState>({
    plan: '',
    payment_day: 'MONTHLY_1ST',
    full_name: '',
    tax_id: '',
    address: '',
    project_idea: '',
    brand_design_tier: 'NONE',
    brand_design_price: 0,
  });

  const updateField = <K extends keyof OnboardingState>(field: K, value: OnboardingState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getPlanBreakdown = (
    planObj?: Plan,
    promoDiscount: number = 0
  ): Record<PaymentFrequency, FrequencyBreakdown> | null => {
    if (!planObj) return null;
    const basePrice = parseFloat(planObj.price) || 0;
    const planDisc = parseFloat(planObj.discount_percentage || '0');
    const effectiveDiscount = promoDiscount > 0 ? promoDiscount : planDisc;

    return {
      WEEKLY_MONDAY: getFrequencyBreakdown(basePrice, 'WEEKLY_MONDAY', effectiveDiscount),
      FORTNIGHTLY_1ST_15TH: getFrequencyBreakdown(basePrice, 'FORTNIGHTLY_1ST_15TH', effectiveDiscount),
      MONTHLY_1ST: getFrequencyBreakdown(basePrice, 'MONTHLY_1ST', effectiveDiscount),
    };
  };

  return (
    <OnboardingContext.Provider
      value={{
        formData,
        setFormData,
        updateField,
        getPlanBreakdown,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
