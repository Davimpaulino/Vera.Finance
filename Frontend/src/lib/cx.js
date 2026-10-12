/** Junta nomes de classe, ignorando os vazios: cx('a', cond && 'b'). */
export const cx = (...nomes) => nomes.filter(Boolean).join(' ');
