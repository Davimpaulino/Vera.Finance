import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

// Respostas já conhecidas por caminho. Só a pré-renderização (src/entry-server.jsx) preenche,
// para a página sair com o conteúdo no HTML; no navegador fica vazio e tudo vem da API.
export const DadosIniciaisContext = createContext({});

/** Carrega um recurso da API e oferece recarregar ou trocar o dado local.
 * `versao` muda quando outra parte da tela grava algo (ex.: novo gasto) e força recarregar. */
export function useApi(path, versao = 0) {
  const iniciais = useContext(DadosIniciaisContext);
  const [data, setData] = useState(() => iniciais[path] ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(() => !(path in iniciais));

  const reload = useCallback(async () => {
    if (!path) return null;
    setLoading(true);
    try {
      const d = await api.get(path);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload, versao]);

  return { data, error, loading, reload, setData };
}
