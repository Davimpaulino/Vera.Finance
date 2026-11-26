import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O módulo guarda se já mandou recarregar: cada teste pega uma cópia nova, como uma página nova.
let modulo;
let recarregou;
beforeEach(async () => {
  vi.resetModules();
  modulo = await import('../src/lib/versaoNova.js');
  recarregou = vi.spyOn(modulo.pagina, 'recarregar').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const semInternet = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

describe('pedaço do build que não carregou', () => {
  it('com a internet ligada, recarrega a página uma vez', () => {
    expect(modulo.recarregarParaVersaoNova()).toBe(true);
    expect(recarregou).toHaveBeenCalledOnce();
  });

  it('o segundo import() que falha na mesma página só espera a página nova', () => {
    modulo.recarregarParaVersaoNova();
    expect(modulo.recarregarParaVersaoNova()).toBe(true);
    expect(recarregou).toHaveBeenCalledOnce();
  });

  it('sem internet não recarrega: quem chamou mostra "Sem conexão"', () => {
    semInternet();
    expect(modulo.recarregarParaVersaoNova()).toBe(false);
    expect(recarregou).not.toHaveBeenCalled();
  });

  it('se falhar de novo logo depois de recarregar, não entra em laço', async () => {
    vi.useFakeTimers();
    modulo.recarregarParaVersaoNova();
    // A página nova (outro módulo) lê a marca deixada pela anterior.
    vi.resetModules();
    const paginaNova = await import('../src/lib/versaoNova.js');
    const recarregouDeNovo = vi.spyOn(paginaNova.pagina, 'recarregar').mockImplementation(() => {});
    vi.advanceTimersByTime(10_000);
    expect(paginaNova.recarregarParaVersaoNova()).toBe(false);
    expect(recarregouDeNovo).not.toHaveBeenCalled();

    // Bem depois (outro deploy com a mesma aba aberta), volta a recarregar sozinho.
    vi.advanceTimersByTime(60_000);
    expect(paginaNova.recarregarParaVersaoNova()).toBe(true);
    expect(recarregouDeNovo).toHaveBeenCalledOnce();
  });

  it('o "Tentar de novo" recarrega mesmo logo depois de uma recarga automática', () => {
    sessionStorage.setItem('vera.recarregadaEm', String(Date.now()));
    modulo.recarregarAPagina();
    expect(recarregou).toHaveBeenCalledOnce();
  });

  it('a tela do React.lazy fica esperando enquanto a página recarrega', async () => {
    const tela = modulo.importarTela(() => Promise.reject(new TypeError('Failed to fetch')));
    const resultado = await Promise.race([
      tela().then(
        () => 'terminou',
        () => 'falhou'
      ),
      new Promise(resolver => setTimeout(() => resolver('esperando'), 20))
    ]);
    expect(resultado).toBe('esperando');
    expect(recarregou).toHaveBeenCalledOnce();
  });

  it('sem internet, a tela do React.lazy devolve o erro', async () => {
    semInternet();
    const erro = new TypeError('Failed to fetch');
    await expect(modulo.importarTela(() => Promise.reject(erro))()).rejects.toBe(erro);
  });

  it('a tela que carrega segue normal', async () => {
    const tela = { default: () => null };
    await expect(modulo.importarTela(() => Promise.resolve(tela))()).resolves.toBe(tela);
    expect(recarregou).not.toHaveBeenCalled();
  });
});
