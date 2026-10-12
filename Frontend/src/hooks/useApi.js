import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

/** Carrega um recurso da API e oferece recarregar ou trocar o dado local.
 * `versao` muda quando outra parte da tela grava algo (ex.: novo gasto) e força recarregar. */
export function useApi(path, versao = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
