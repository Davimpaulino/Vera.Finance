import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  brl,
  brlCents,
  diaDeMes,
  diaMes,
  diaRelativo,
  diasAtras,
  hojeLabel,
  idadeNota,
  iniciais,
  km,
  mask,
  mes,
  mesAno,
  mesAnoCurto,
  mesCurto,
  moneyField,
  oculto,
  parseMoney,
  plural,
  precoUnitario
} from '../src/lib/format.js';

// Datas sem fuso no texto ("2026-08-19T12:00") são lidas no horário local, como as da API.
const dia = texto => new Date(texto).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

describe('dinheiro', () => {
  it('brl arredonda para reais inteiros e usa o sinal de menos tipográfico', () => {
    expect(brl(4200.4)).toBe('R$ 4.200');
    expect(brl(4200.5)).toBe('R$ 4.201');
    expect(brl(-35)).toBe('− R$ 35');
    expect(brl('abc')).toBe('R$ 0');
    expect(brl(undefined)).toBe('R$ 0');
  });

  it('brlCents sempre mostra os centavos', () => {
    expect(brlCents(4.9)).toBe('R$ 4,90');
    expect(brlCents(1234.567)).toBe('R$ 1.234,57');
    expect(brlCents(-12.3)).toBe('− R$ 12,30');
    expect(brlCents(null)).toBe('R$ 0,00');
  });

  it('moneyField devolve o valor pronto para o campo, sem R$', () => {
    expect(moneyField(4200)).toBe('4.200,00');
    expect(moneyField('x')).toBe('0,00');
  });

  it('parseMoney entende vírgula brasileira, ponto decimal e número', () => {
    expect(parseMoney('4.200,50')).toBe(4200.5);
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56);
    expect(parseMoney('4200.5')).toBe(4200.5);
    expect(parseMoney(12.3)).toBe(12.3);
    expect(parseMoney('')).toBe(0);
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney('abc')).toBe(0);
  });

  it('mask esconde o valor quando a pessoa pede', () => {
    expect(mask(true, 'R$ 10')).toBe(oculto);
    expect(mask(false, 'R$ 10')).toBe('R$ 10');
  });

  it('precoUnitario mostra o preço por kg, litro ou unidade', () => {
    expect(precoUnitario({ valor: 4.98, unidade: 'kg' })).toBe('R$ 4,98/kg');
    expect(precoUnitario({ valor: 7.5, unidade: 'l' })).toBe('R$ 7,50/L');
    expect(precoUnitario({ valor: 0, unidade: 'un' })).toBe('R$ 0,00/un');
    expect(precoUnitario(null)).toBe('');
    expect(precoUnitario({ unidade: 'kg' })).toBe('');
  });
});

describe('datas', () => {
  const agosto19 = dia('2026-08-19T12:00:00');

  it('escreve dia e mês por extenso ou abreviado', () => {
    expect(diaMes(agosto19)).toBe('19 ago');
    expect(diaDeMes(agosto19)).toBe('19 de agosto');
    expect(mes(agosto19)).toBe('agosto');
    expect(mesCurto(agosto19)).toBe('ago');
    expect(mesAno(agosto19)).toBe('agosto 2026');
    expect(mesAnoCurto(dia('2026-03-02T09:00:00'))).toBe('mar 2026');
  });

  it('diasAtras conta dias de calendário, não horas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T08:00:00'));
    expect(diasAtras(dia('2026-08-19T23:00:00'))).toBe(0);
    expect(diasAtras(dia('2026-08-18T23:59:00'))).toBe(1);
    expect(diasAtras(dia('2026-08-12T10:00:00'))).toBe(7);
  });

  it('diaRelativo diz hoje e ontem', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T15:00:00'));
    expect(diaRelativo(dia('2026-08-19T09:00:00'))).toBe('hoje, 19 de agosto');
    expect(diaRelativo(dia('2026-08-18T09:00:00'))).toBe('ontem, 18 de agosto');
    expect(diaRelativo(dia('2026-08-17T09:00:00'))).toBe('17 de agosto');
  });

  it('virada do ano: 1º de janeiro, ontem é 31 de dezembro', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T10:00:00'));
    expect(diaRelativo(dia('2026-12-31T22:00:00'))).toBe('ontem, 31 de dezembro');
  });

  it('hojeLabel junta mês, ano e o dia de hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T10:00:00'));
    expect(hojeLabel()).toBe('novembro 2026 · hoje, 26');
  });

  it('idadeNota fala a idade da nota fiscal', () => {
    expect(idadeNota(0)).toBe('nota de hoje');
    expect(idadeNota(1)).toBe('nota de ontem');
    expect(idadeNota(5)).toBe('nota de há 5 dias');
  });
});

describe('textos curtos', () => {
  it('plural escolhe a forma pela quantidade', () => {
    expect(plural(1, 'item', 'itens')).toBe('1 item');
    expect(plural(0, 'item', 'itens')).toBe('0 itens');
    expect(plural(3, 'item', 'itens')).toBe('3 itens');
  });

  it('km troca o ponto pela vírgula', () => {
    expect(km(2.5)).toBe('2,5 km');
    expect(km(10)).toBe('10 km');
  });

  it('iniciais pega as duas primeiras palavras do nome', () => {
    expect(iniciais('ana clara souza')).toBe('AC');
    expect(iniciais('  Bia  ')).toBe('B');
    expect(iniciais('')).toBe('?');
    expect(iniciais(null)).toBe('?');
  });
});
