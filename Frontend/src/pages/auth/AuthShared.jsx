import { Button } from '../../components/ds/index.js';
import './css/auth.css';

export function Divisor() {
  return (
    <div className="auth__divisor">
      <div className="auth__divisor-line" />
      <span className="auth__divisor-text">ou</span>
      <div className="auth__divisor-line" />
    </div>
  );
}

// O login com a Apple só funciona depois de configurado no Apple Developer (conta paga) e no
// Firebase. Até lá o botão fica escondido; VITE_LOGIN_APPLE=1 no .env mostra o botão.
const APPLE_LIGADO = import.meta.env.VITE_LOGIN_APPLE === '1';

export function SocialButtons({ onSocial, carregando }) {
  return (
    <>
      {APPLE_LIGADO ? (
        <Button
          block
          variant="secondary"
          icon="apple"
          onClick={() => onSocial('apple')}
          disabled={!!carregando}
        >
          Continuar com Apple
        </Button>
      ) : null}
      <Button
        block
        variant="secondary"
        icon="chrome"
        onClick={() => onSocial('google')}
        disabled={!!carregando}
      >
        Continuar com Google
      </Button>
    </>
  );
}

export function FormError({ children }) {
  return children ? (
    <div className="vera-form-error" role="alert">
      {children}
    </div>
  ) : null;
}
