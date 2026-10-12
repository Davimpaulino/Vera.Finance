import { useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  HeroNumber,
  Input,
  ProjectionLine
} from '../../components/ds/index.js';
import { Brand } from '../../components/Brand.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { Divisor, FormError, SocialButtons } from './AuthShared.jsx';

const PROJECAO = [3200, 3050, 2800, 2610, 2400, 2180, 1980, 1740, 1520, 1280, 900, 600, 340];

export default function Login() {
  const auth = useAuth();
  const { toast } = useUi();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(null);

  const depois = me => navigate(me && me.onboardingCompleto ? '/app' : '/cadastro/perguntas');

  const entrar = async e => {
    e.preventDefault();
    setErro('');
    setCarregando('email');
    try {
      depois(await auth.login(email.trim(), senha, lembrar));
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
      depois(await auth.social(p));
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(null);
    }
  };

  const esqueci = async e => {
    e.preventDefault();
    if (!email.trim()) {
      setErro('Digite o seu e-mail acima para receber o link de troca de senha.');
      return;
    }
    try {
      await auth.resetPassword(email.trim());
      toast('Enviamos um link para o seu e-mail.');
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <section className="vera-page auth">
      <div className="auth__side auth__side--sunken">
        <Brand size="lg" to="/" className="auth__brand" />
        <span className="auth__headline">O seu ciclo continua exatamente de onde parou.</span>
        <Card wide padding="md" gap={14}>
          <HeroNumber label="livre para gastar até o fim do ciclo" value="R$ 1.284" size="sm" />
          <ProjectionLine points={PROJECAO} todayIndex={8} height={72} />
        </Card>
        <span className="auth__note">
          As notas fiscais lidas esperam a sua confirmação no painel.
        </span>
      </div>
      <form onSubmit={entrar} className="auth__form">
        <h1 className="auth__title">Entrar</h1>
        <SocialButtons onSocial={social} carregando={carregando} />
        <Divisor />
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
          placeholder="sua senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={e => setSenha(e.target.value)}
        />
        <div className="auth__row">
          <Checkbox checked={lembrar} onChange={e => setLembrar(e.target.checked)}>
            Manter conectado
          </Checkbox>
          <a href="#" className="vera-tap auth__forgot" onClick={esqueci}>
            Esqueci a senha
          </a>
        </div>
        <FormError>{erro}</FormError>
        <Button block type="submit" loading={carregando === 'email'} loadingLabel="Entrando">
          Entrar
        </Button>
        <span className="auth__note auth__note--top">
          Não tem conta?{' '}
          <Link to="/cadastro" className="vera-tap vera-link-strong">
            Criar conta grátis
          </Link>
        </span>
      </form>
    </section>
  );
}
