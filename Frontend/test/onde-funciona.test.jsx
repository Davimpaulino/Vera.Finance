import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import OndeFunciona, { OndeFuncionaNaCidade } from '../src/pages/site/OndeFunciona.jsx';
import { CIDADES, cidadeDoCaminho, metaDaCidade } from '../src/conteudo/cidades.js';
import { PAGINAS, ROTAS_PUBLICAS, metaDaPagina } from '../src/lib/paginas.js';
import { renderComProvedores } from './auxiliares.jsx';

// Páginas das cidades (/onde-funciona/<slug>), a partir de src/conteudo/cidades.json.
const SAO_PAULO = cidadeDoCaminho('/onde-funciona/sao-paulo-sp');

const jsonLd = container =>
  JSON.parse(container.querySelector('script[type="application/ld+json"]').textContent);

describe('páginas das cidades', () => {
  it('as 12 cidades viram rota pré-renderizada, com título e descrição próprios', () => {
    expect(CIDADES).toHaveLength(12);
    for (const cidade of CIDADES) {
      expect(ROTAS_PUBLICAS).toContain(cidade.caminho);
      expect(PAGINAS[cidade.caminho]).toEqual(metaDaCidade(cidade));
      expect(metaDaPagina(cidade.caminho).robots).toBe('index, follow');
    }
    expect(PAGINAS['/onde-funciona/sao-paulo-sp'][0]).toBe(
      'Comparar preço de supermercado em São Paulo · vera.finance'
    );
    expect(PAGINAS['/onde-funciona/rio-de-janeiro-rj'][0]).toBe(
      'Comparar preço de supermercado no Rio de Janeiro · vera.finance'
    );
    const descricoes = CIDADES.map(cidade => PAGINAS[cidade.caminho][1]);
    expect(new Set(descricoes).size).toBe(descricoes.length);
    expect(cidadeDoCaminho('/onde-funciona/atlantida-xx')).toBeNull();
  });

  it('sem levantamento: o verificador de CEP e o texto geral, sem lista inventada', () => {
    const semLevantamento = { ...SAO_PAULO, redes: null, levantadoEm: null, totalMercados: null };
    const { container } = renderComProvedores(<OndeFuncionaNaCidade cidade={semLevantamento} />, {
      caminho: SAO_PAULO.caminho
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Comparar preço de supermercado em São Paulo' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Seu CEP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver redes' })).toBeInTheDocument();
    expect(screen.queryByText(/Redes com preço online a até/)).toBeNull();
    expect(screen.queryByText(/Levantamento de/)).toBeNull();
    const trilha = jsonLd(container)['@graph'].find(parte => parte['@type'] === 'BreadcrumbList');
    expect(trilha.itemListElement.map(item => item.name)).toEqual([
      'Início',
      'Onde a vera funciona',
      'São Paulo'
    ]);
    expect(trilha.itemListElement[2].item).toMatch(/\/onde-funciona\/sao-paulo-sp$/);
  });

  it('com levantamento: as redes perto do centro, a data, a fonte e o aviso de vínculo', () => {
    const levantada = {
      ...SAO_PAULO,
      totalMercados: 7,
      redes: [
        { id: 'pao-de-acucar', nome: 'Pão de Açúcar', tipo: 'mercado', lojas: 3, distanciaKm: 0.8 },
        { id: 'atacadao', nome: 'Atacadão', tipo: 'atacado', lojas: 1, distanciaKm: 4.2 }
      ],
      levantadoEm: '2026-11-28'
    };
    renderComProvedores(<OndeFuncionaNaCidade cidade={levantada} />, { caminho: SAO_PAULO.caminho });
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Redes com preço online a até 15 km do centro de São Paulo'
      })
    ).toBeInTheDocument();
    const lista = screen.getByText('Pão de Açúcar').closest('ul');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lista).getByText('supermercado · 3 lojas · a mais perto a 0,8 km do centro')).toBeInTheDocument();
    expect(within(lista).getByText('atacado · 1 loja · a mais perto a 4,2 km do centro')).toBeInTheDocument();
    const nota = screen.getByText(/Levantamento de 28 de novembro de 2026 com dados do OpenStreetMap/);
    expect(nota).toHaveTextContent('7 mercados no mapa a até 15 km do centro');
    expect(nota).toHaveTextContent('A vera não tem vínculo com as redes citadas.');
    expect(screen.getByLabelText('Seu CEP')).toBeInTheDocument();
  });

  it('no Rio de Janeiro, o texto usa o artigo', () => {
    const rio = cidadeDoCaminho('/onde-funciona/rio-de-janeiro-rj');
    renderComProvedores(<OndeFuncionaNaCidade cidade={rio} />, { caminho: rio.caminho });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Comparar preço de supermercado no Rio de Janeiro' })
    ).toBeInTheDocument();
    expect(screen.getByText(/^No Rio de Janeiro \(RJ\), a vera compara/)).toBeInTheDocument();
  });

  it('a página Onde funciona tem um link para cada cidade', () => {
    renderComProvedores(<OndeFunciona />, { caminho: '/onde-funciona' });
    const principal = screen.getByRole('main');
    for (const cidade of CIDADES)
      expect(
        within(principal).getByRole('link', { name: `${cidade.nome} ${cidade.uf}` })
      ).toHaveAttribute('href', cidade.caminho);
  });
});
