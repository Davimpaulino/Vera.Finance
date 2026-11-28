import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arquivoDoRender, scriptDaBarra } from '../scripts/como-o-render.mjs';

// O Static Site do Render com a regra /* -> /app.html: arquivo que existe sai; pasta só pelo
// index.html dela quando o caminho termina em "/"; o resto recebe a casca (app.html).
describe('como o Render responde', () => {
  let dist;
  beforeAll(() => {
    dist = mkdtempSync(join(tmpdir(), 'vera-dist-'));
    for (const arquivo of ['index.html', 'app.html', 'sitemap.xml', 'precos/index.html', 'ajuda/ler-nota-fiscal/index.html', 'assets/index-abc.js']) {
      mkdirSync(join(dist, arquivo, '..'), { recursive: true });
      writeFileSync(join(dist, arquivo), arquivo);
    }
  });
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  it('arquivo que existe sai como está', () => {
    expect(arquivoDoRender(dist, '/sitemap.xml')).toBe('/sitemap.xml');
    expect(arquivoDoRender(dist, '/assets/index-abc.js')).toBe('/assets/index-abc.js');
    expect(arquivoDoRender(dist, '/precos/index.html')).toBe('/precos/index.html');
  });

  it('pasta com a barra no fim abre o index.html dela', () => {
    expect(arquivoDoRender(dist, '/')).toBe('/index.html');
    expect(arquivoDoRender(dist, '/precos/')).toBe('/precos/index.html');
    expect(arquivoDoRender(dist, '/ajuda/ler-nota-fiscal/')).toBe('/ajuda/ler-nota-fiscal/index.html');
  });

  it('pasta sem a barra, rota do app e endereço que não existe recebem a casca', () => {
    for (const caminho of ['/precos', '/ajuda/ler-nota-fiscal', '/app', '/app/lista', '/cadastro/perguntas', '/nao-existe', '/nao-existe/', '/assets/apagado.js'])
      expect(arquivoDoRender(dist, caminho), caminho).toBe('/app.html');
  });

  it('caminho com ".." ou mal codificado não passa', () => {
    expect(arquivoDoRender(dist, '/../segredo')).toBeNull();
    expect(arquivoDoRender(dist, '/%E0%A4%A')).toBeNull();
  });
});

describe('script da barra (casca do app)', () => {
  const rodar = (rotas, endereco) => {
    const url = new URL(endereco, 'https://site.exemplo');
    let destino = null;
    const location = {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      replace: para => {
        destino = para;
      }
    };
    const codigo = scriptDaBarra(rotas).replace(/^<script>|<\/script>$/g, '');
    new Function('window', codigo)({ location });
    return destino;
  };
  const ROTAS = ['/', '/precos', '/cadastro', '/ajuda/ler-nota-fiscal'];

  it('é um <script> comum, sem "<" da lista que feche a tag', () => {
    const script = scriptDaBarra([...ROTAS, '/x</script>']);
    expect(script).toMatch(/^<script>.*<\/script>$/);
    expect(script.match(/<\/script>/g)).toHaveLength(1);
  });

  it('leva a página pré-renderizada sem a barra para a forma com barra, com busca e "#"', () => {
    expect(rodar(ROTAS, '/precos')).toBe('/precos/');
    expect(rodar(ROTAS, '/precos?plano=anual#tabela')).toBe('/precos/?plano=anual#tabela');
    expect(rodar(ROTAS, '/ajuda/ler-nota-fiscal')).toBe('/ajuda/ler-nota-fiscal/');
    expect(rodar(ROTAS, '/cadastro')).toBe('/cadastro/');
  });

  it('não mexe na home, no app, nas perguntas do cadastro nem em endereço desconhecido', () => {
    for (const endereco of ['/', '/precos/', '/app', '/app/lista', '/cadastro/perguntas', '/nao-existe', '/ajuda/outro'])
      expect(rodar(ROTAS, endereco), endereco).toBeNull();
  });
});
