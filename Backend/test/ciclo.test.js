import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleFor } from '../src/utils/dates.js';
import { criarBancoMemoria } from '../src/config/bancoMemoria.js';
import { achatarEmCaminhos, gerarId } from '../src/config/caminhos.js';
import { matchScore } from '../src/utils/text.js';

test('ciclo começa no dia de virada e termina na véspera do próximo', () => {
  const c = cycleFor(5, new Date(2026, 7, 19));
  assert.equal(new Date(c.inicio).getDate(), 5);
  assert.equal(new Date(c.inicio).getMonth(), 7);
  assert.equal(new Date(c.fim).getDate(), 4);
  assert.equal(new Date(c.fim).getMonth(), 8);
  assert.equal(c.totalDias, 31);
  assert.equal(c.diaAtual, 15);
  assert.equal(c.restantes, 16);
});

test('antes do dia de virada o ciclo é o do mês anterior', () => {
  const c = cycleFor(10, new Date(2026, 2, 3));
  assert.equal(new Date(c.inicio).getMonth(), 1);
  assert.equal(new Date(c.inicio).getDate(), 10);
});

test('dia 31 de virada cai no último dia de meses curtos', () => {
  const c = cycleFor(31, new Date(2026, 1, 28));
  assert.equal(new Date(c.inicio).getDate(), 28);
  assert.equal(new Date(c.inicio).getMonth(), 1);
});

test('banco em memória segue as regras do Realtime Database', async () => {
  const banco = criarBancoMemoria();
  await banco.gravar('usuarios/u1/perfil', {
    nome: 'Ana',
    prefs: { tema: 'tinta', avisos: true },
    vazio: [],
    nada: null
  });
  assert.deepEqual(await banco.ler('usuarios/u1/perfil'), {
    nome: 'Ana',
    prefs: { tema: 'tinta', avisos: true }
  });
  await banco.mesclar('usuarios/u1/perfil', { prefs: { tema: 'papel' } });
  assert.deepEqual(await banco.ler('usuarios/u1/perfil/prefs'), { tema: 'papel', avisos: true });
  const id = await banco.adicionar('usuarios/u1/lista', { nome: 'arroz' });
  await banco.adicionar('usuarios/u1/lista', { nome: 'leite' });
  const itens = await banco.listar('usuarios/u1/lista');
  assert.equal(itens.length, 2);
  assert.ok(itens.some(item => item.id === id && item.nome === 'arroz'));
  await banco.atualizarVarios({ [`usuarios/u1/lista/${id}`]: null, 'mercados/dia/nome': 'Dia' });
  assert.equal((await banco.listar('usuarios/u1/lista')).length, 1);
  assert.deepEqual(await banco.ler('mercados'), { dia: { nome: 'Dia' } });
  await banco.remover('usuarios/u1');
  assert.equal(await banco.ler('usuarios'), null);
});

test('achatar objetos em caminhos para atualizar sem apagar irmãos', () => {
  assert.deepEqual(achatarEmCaminhos({ a: { b: 1, c: { d: 2 } }, e: [1, 2], f: undefined }), {
    'a/b': 1,
    'a/c/d': 2,
    e: [1, 2],
    f: null
  });
});

test('ids gerados são únicos e ordenáveis pelo tempo', () => {
  const ids = Array.from({ length: 50 }, gerarId);
  assert.equal(new Set(ids).size, 50);
  assert.ok(ids.every(id => /^[-0-9A-Za-z_]{20}$/.test(id)));
});

test('busca de produto casa por palavras, sem acento', () => {
  assert.equal(matchScore('feijao', 'Feijão carioca 1kg'), 1);
  assert.equal(matchScore('arroz integral', 'Arroz branco 5kg'), 0.5);
});
