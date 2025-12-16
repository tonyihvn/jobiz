import { useCallback } from 'react';
import { useCurrency } from './CurrencyContext';
import { fmt } from './format';

// Hook that returns a formatter which uses the CurrencyContext symbol
export default function useFmtCurrency() {
    const { symbol } = useCurrency();
    return useCallback((value: number | string, decimals = 2) => {
        return `${symbol}${fmt(Number(value) || 0, decimals)}`;
    }, [symbol]);
}
