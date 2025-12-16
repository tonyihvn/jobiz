import React, { createContext, useContext, useEffect, useState } from 'react';

type CurrencyContextValue = {
  symbol: string;
  setSymbol: (s: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue>({ symbol: '$', setSymbol: () => {} });

export const CurrencyProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [symbol, setSymbolState] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('omnisales_currency') || '$';
      }
    } catch (e) {}
    return '$';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnisales_currency', symbol);
      }
    } catch (e) {}
  }, [symbol]);

  const setSymbol = (s: string) => setSymbolState(s || '$');

  return (
    <CurrencyContext.Provider value={{ symbol, setSymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

export default CurrencyContext;
