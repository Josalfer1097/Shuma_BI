'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type FontScale = 1 | 1.15 | 1.3 | 1.5;

export const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 1,    label: 'Normal' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3,  label: 'Muy grande' },
  { value: 1.5,  label: 'Máximo' },
];

interface Ctx {
  scale: FontScale;
  setScale: (s: FontScale) => void;
}

const FontScaleContext = createContext<Ctx>({ scale: 1, setScale: () => {} });

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<FontScale>(1);

  useEffect(() => {
    const guardado = localStorage.getItem('shuma-bi-font-scale');
    if (!guardado) return;
    const valor = parseFloat(guardado) as FontScale;
    if (FONT_SCALES.some((s) => s.value === valor)) {
      setScaleState(valor);
      document.documentElement.style.setProperty('--font-scale', String(valor));
    }
  }, []);

  const setScale = (s: FontScale) => {
    setScaleState(s);
    localStorage.setItem('shuma-bi-font-scale', String(s));
    document.documentElement.style.setProperty('--font-scale', String(s));
  };

  return (
    <FontScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export const useFontScale = () => useContext(FontScaleContext);
