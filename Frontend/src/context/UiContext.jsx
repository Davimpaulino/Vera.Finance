import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Icon } from '../components/ds/index.js';

const UiContext = createContext(null);
const KEY = 'vera.tema';

const lerTema = () => {
  try {
    return localStorage.getItem(KEY) || 'tinta';
  } catch {
    return 'tinta';
  }
};

/** Superfície (tinta/papel), esconder valores e avisos rápidos. */
export function UiProvider({ children }) {
  const [theme, setThemeState] = useState(lerTema);
  const [ocultar, setOcultar] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const timer = useRef(null);

  const setTheme = useCallback(t => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* sem storage */
    }
  }, []);

  // A superfície fica no <html>: os tokens de cor (css/semantic.css) trocam junto com o fundo da página.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'papel' ? '#FAF8F5' : '#0C0E10');
  }, [theme]);

  const toast = useCallback((texto, tone = 'neutral') => {
    clearTimeout(timer.current);
    setToastMsg({ texto, tone });
    timer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, ocultar, setOcultar, toast }),
    [theme, setTheme, ocultar, toast]
  );

  return (
    <UiContext.Provider value={value}>
      <div className="vera-root">
        {children}
        {toastMsg ? (
          <div
            className={toastMsg.tone === 'danger' ? 'vera-toast vera-toast--danger' : 'vera-toast'}
            role="status"
          >
            <Icon name={toastMsg.tone === 'danger' ? 'circle-alert' : 'circle-check'} size={16} />
            {toastMsg.texto}
          </div>
        ) : null}
      </div>
    </UiContext.Provider>
  );
}

export const useUi = () => useContext(UiContext);
