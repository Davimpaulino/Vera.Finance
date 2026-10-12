export const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
export const sum = (arr, f = x => x) => round2(arr.reduce((t, x) => t + (Number(f(x)) || 0), 0));
