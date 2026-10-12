import { useState } from 'react';
import { Button, Icon, Input } from '../../components/ds/index.js';
import { Brand } from '../../components/Brand.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Divisor, FormError, SocialButtons } from './AuthShared.jsx';

const GARANTIAS = [
  'Sem conectar banco',
  'Sem cartão para começar',
  'Leitura de NF-e por QR Code',
  'Seus dados saem em planilha quando você quiser'
];

export default function Cadastro() {
  const auth = useAuth();
  const { navigate } = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(null);

  const criar = async e => {
    e.preventDefault();
    setErro('');
    setCarregando('email');
    try {
      await auth.register(nome.trim(), email.trim(), senha);
      navigate('/cadastro/perguntas');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(null);
    }
  };

  const social = async p => {
    setErro('');
    setCarregando(p);
    try {
      const me = await auth.social(p);
      navigate(me && me.onboardingCompleto ? '/app' : '/cadastro/perguntas');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(null);
    }
  };

  return (
    <section className="vera-page auth">
      <div className="auth__side auth__side--cadastro">
        <Brand size="lg" to="/" className="auth__brand" />
        <span className="auth__headline">
          Crie a conta e responda cinco perguntas. O painel abre com o seu mês já reservado.
        </span>
        <div className="auth__garantias">
          {GARANTIAS.map(g => (
            <span key={g} className="auth__garantia">
              <Icon name="check" size={15} strokeWidth={2.4} />
              {g}
            </span>
          ))}
        </div>
      </div>
      <form onSubmit={criar} className="auth__form auth__form--sunken">
        <h1 className="auth__title">Criar conta</h1>
        <SocialButtons onSocial={social} carregando={carregando} />
        <Divisor />
        <Input
          label="Nome"
          placeholder="como a vera vai te chamar"
          autoComplete="given-name"
          required
          value={nome}
          onChange={e => setNome(e.target.value)}
        />
        <Input
          label="E-mail"
          placeholder="voce@email.com"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          label="Senha"
          placeholder="mínimo de 8 caracteres"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint="Sem conectar banco. Você lança e a vera projeta."
          value={senha}
          onChange={e => setSenha(e.target.value)}
        />
        <FormError>{erro}</FormError>
        <Button
          block
          type="submit"
          iconRight="arrow-right"
          loading={carregando === 'email'}
          loadingLabel="Criando a conta"
        >
          Criar conta e continuar
        </Button>
        <span className="auth__legal">
          Ao criar conta você concorda com os <Link to="/termos">Termos</Link> e a{' '}
          <Link to="/privacidade">Privacidade</Link>.
        </span>
        <span className="auth__note auth__note--top4">
          Já tem conta?{' '}
          <Link to="/entrar" className="vera-tap vera-link-strong">
            Entrar
          </Link>
        </span>
      </form>
    </section>
  );
}
