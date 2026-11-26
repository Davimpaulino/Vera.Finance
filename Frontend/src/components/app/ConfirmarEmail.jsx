import { useCallback, useEffect, useState } from 'react';
import { Button, Icon, IconButton } from '../ds/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './css/confirmar-email.css';

// Aviso discreto para quem criou a conta com e-mail e senha e ainda não clicou no link do e-mail.
// Não bloqueia nada: a pessoa usa o app normalmente. Some sozinho quando o e-mail é confirmado
// (a conta é conferida de novo quando a aba volta a ficar visível) e pode ser escondido até o
// fim da sessão do navegador.
const CHAVE_DO_ESCONDIDO = 'vera.confirmarEmail.escondido';
// O Firebase recusa reenvios seguidos: o botão espera um minuto entre um e outro.
const ESPERA_DO_REENVIO_MS = 60 * 1000;

const escondidoPara = email => {
  try {
    return sessionStorage.getItem(CHAVE_DO_ESCONDIDO) === email;
  } catch {
    return false;
  }
};

export function ConfirmarEmail() {
  const { emailParaConfirmar, conferirConfirmacao, reenviarConfirmacao } = useAuth();
  const [email, setEmail] = useState(() => emailParaConfirmar?.() || null);
  const [envio, setEnvio] = useState('parado'); // parado | enviando | enviado
  const [erro, setErro] = useState('');
  const [escondido, setEscondido] = useState(() => (email ? escondidoPara(email) : false));
  const pendente = Boolean(email);

  // Confere de novo ao abrir e sempre que a pessoa volta para a aba (pode ter confirmado no celular).
  useEffect(() => {
    if (!pendente || !conferirConfirmacao) return undefined;
    const conferir = () => {
      if (document.visibilityState !== 'visible') return;
      conferirConfirmacao()
        .then(atual => setEmail(atual || null))
        .catch(() => {});
    };
    conferir();
    document.addEventListener('visibilitychange', conferir);
    return () => document.removeEventListener('visibilitychange', conferir);
  }, [pendente, conferirConfirmacao]);

  useEffect(() => {
    if (envio !== 'enviado') return undefined;
    const relogio = setTimeout(() => setEnvio('parado'), ESPERA_DO_REENVIO_MS);
    return () => clearTimeout(relogio);
  }, [envio]);

  const reenviar = useCallback(async () => {
    setErro('');
    setEnvio('enviando');
    try {
      await reenviarConfirmacao();
      setEnvio('enviado');
    } catch (e) {
      setErro(e.message);
      setEnvio('parado');
    }
  }, [reenviarConfirmacao]);

  const esconder = () => {
    try {
      sessionStorage.setItem(CHAVE_DO_ESCONDIDO, email);
    } catch {
      // Sem sessionStorage (aba anônima restrita): esconde só até recarregar a página.
    }
    setEscondido(true);
  };

  if (!email || escondido) return null;

  return (
    <div className="confirmar-email" role="status">
      <Icon name="mail" size={16} className="confirmar-email__icone" />
      <span className="confirmar-email__texto">
        <strong>Confirme seu e-mail.</strong>{' '}
        {envio === 'enviado' ? (
          <>
            Enviamos o link de novo para <span className="confirmar-email__endereco">{email}</span>. Veja
            também a caixa de spam.
          </>
        ) : (
          <>
            Clique no link que enviamos para{' '}
            <span className="confirmar-email__endereco">{email}</span>.
          </>
        )}
        {erro ? (
          <span className="confirmar-email__erro" role="alert">
            {erro}
          </span>
        ) : null}
      </span>
      <span className="confirmar-email__acoes">
        <Button
          variant="secondary"
          size="sm"
          loading={envio === 'enviando'}
          loadingLabel="Enviando"
          disabled={envio === 'enviado'}
          onClick={reenviar}
        >
          {envio === 'enviado' ? 'Enviado' : 'Reenviar'}
        </Button>
        <IconButton icon="x" label="Esconder aviso" variant="ghost" size="sm" onClick={esconder} />
      </span>
    </div>
  );
}
