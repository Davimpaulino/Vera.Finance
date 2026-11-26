import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/services/api.js';
import { servicoDeLogin } from '../src/services/servicoDeLogin.js';

// Firebase de mentira, sem rede. Como o de verdade, o onIdTokenChanged entrega a conta atual
// logo depois de ligado e dispara de novo a cada token renovado e a cada reload().
const firebaseFalso = vi.hoisted(() => {
  const ouvintes = new Set();
  const autenticacaoFirebase = { currentUser: null };
  const emitir = usuario => {
    autenticacaoFirebase.currentUser = usuario;
    ouvintes.forEach(ouvinte => ouvinte(usuario));
  };
  return {
    autenticacaoFirebase,
    emitir,
    getRedirectResult: async () => null,
    onIdTokenChanged: (_auth, ouvinte) => {
      ouvintes.add(ouvinte);
      Promise.resolve().then(() => {
        if (ouvintes.has(ouvinte)) ouvinte(autenticacaoFirebase.currentUser);
      });
      return () => ouvintes.delete(ouvinte);
    },
    reload: async usuario => emitir(usuario),
    signOut: async () => emitir(null)
  };
});
vi.mock('../src/services/firebase.js', () => firebaseFalso);
vi.mock('../src/services/configuracaoFirebase.js', () => ({
  firebaseHabilitado: true,
  configuracaoFirebase: {}
}));

const conta = uid => ({
  uid,
  email: `${uid}@exemplo.com`,
  emailVerified: false,
  providerData: [{ providerId: 'password' }],
  getIdToken: vi.fn(async () => `token-de-${uid}`)
});

// Cada teste desliga o que ligou, para nenhum ouvinte sobrar para o próximo.
const desligamentos = [];
const ligar = aoMudar => {
  const desligar = servicoDeLogin.observar(aoMudar);
  desligamentos.push(desligar);
  return desligar;
};
const avisos = aoMudar => aoMudar.mock.calls.map(([logado]) => logado);

afterEach(() => {
  desligamentos.splice(0).forEach(desligar => desligar());
  firebaseFalso.autenticacaoFirebase.currentUser = null;
});

describe('servicoDeLogin.observar', () => {
  it('avisa a conta conectada assim que liga', async () => {
    firebaseFalso.autenticacaoFirebase.currentUser = conta('ana');
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));
  });

  it('sem ninguém conectado, o primeiro aviso também passa', async () => {
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([false]));
  });

  it('o token renovado não avisa de novo, e a API recebe o token novo', async () => {
    const ana = conta('ana');
    firebaseFalso.autenticacaoFirebase.currentUser = ana;
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));

    ana.getIdToken.mockResolvedValue('token-renovado');
    firebaseFalso.emitir(ana);
    firebaseFalso.emitir(ana);
    expect(avisos(aoMudar)).toEqual([true]);

    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ nome: 'Ana' })
    });
    await api.get('/me');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-renovado');
  });

  it('o reload da confirmação do e-mail não reabre a sessão', async () => {
    const ana = conta('ana');
    firebaseFalso.autenticacaoFirebase.currentUser = ana;
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));

    expect(await servicoDeLogin.conferirConfirmacao()).toBe('ana@exemplo.com');
    // A pessoa clicou no link em outra aba.
    ana.emailVerified = true;
    expect(await servicoDeLogin.conferirConfirmacao()).toBeNull();
    expect(avisos(aoMudar)).toEqual([true]);
  });

  it('sair e entrar de novo com a mesma conta avisa as duas vezes', async () => {
    firebaseFalso.autenticacaoFirebase.currentUser = conta('ana');
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));

    await servicoDeLogin.sair();
    expect(avisos(aoMudar)).toEqual([true, false]);
    firebaseFalso.emitir(conta('ana'));
    expect(avisos(aoMudar)).toEqual([true, false, true]);
  });

  it('trocar de conta avisa de novo', async () => {
    firebaseFalso.autenticacaoFirebase.currentUser = conta('ana');
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));

    firebaseFalso.emitir(conta('bia'));
    expect(avisos(aoMudar)).toEqual([true, true]);
  });

  it('o login próprio (token da API) conta como conectado e é outra conta para o Firebase', async () => {
    localStorage.setItem('vera.token', 'token-da-api');
    const aoMudar = vi.fn();
    ligar(aoMudar);
    await vi.waitFor(() => expect(avisos(aoMudar)).toEqual([true]));

    firebaseFalso.emitir(null);
    expect(avisos(aoMudar)).toEqual([true]);
    firebaseFalso.emitir(conta('ana'));
    expect(avisos(aoMudar)).toEqual([true, true]);
  });

  it('uma inscrição nova começa do zero (o "Tentar de novo" reabre a sessão)', async () => {
    firebaseFalso.autenticacaoFirebase.currentUser = conta('ana');
    const primeiro = vi.fn();
    const desligar = ligar(primeiro);
    await vi.waitFor(() => expect(avisos(primeiro)).toEqual([true]));
    desligar();

    const segundo = vi.fn();
    ligar(segundo);
    await vi.waitFor(() => expect(avisos(segundo)).toEqual([true]));
    firebaseFalso.emitir(conta('bia'));
    expect(avisos(primeiro)).toEqual([true]);
    expect(avisos(segundo)).toEqual([true, true]);
  });
});
