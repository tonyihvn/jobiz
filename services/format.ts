export function fmt(value: any, decimals = 2) {
  const n = Number(value);
  if (Number.isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}

export function fmtCurrency(value: any, decimals = 2) {
  const symbol = (typeof window !== 'undefined' && localStorage.getItem('omnisales_currency')) || '$';
  return `${symbol}${fmt(value, decimals)}`;
}

export default { fmt, fmtCurrency };
