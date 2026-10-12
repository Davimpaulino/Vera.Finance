import { useState } from 'react';
import { Button, Input } from '../ds/index.js';
import { Brand } from '../Brand.jsx';
import { Link } from '../../lib/router.jsx';
import { api } from '../../services/api.js';
import { useUi } from '../../context/UiContext.jsx';
import './css/site-footer.css';

const STATUS_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api/saude';

const COLS = [
  {
    titulo: 'produto',
    itens: [
      ['Painel', '/app'],
      ['Comparar mercados', '/app/comparar'],
      ['Lista de compras', '/app/lista'],
      ['Modo família', '/app/familia']
    ]
  },
  {
    titulo: 'vera',
    itens: [
      ['Como funciona', '/#como-funciona'],
      ['Planos', '/precos'],
      ['Base de preços', '/app/comparar'],
      ['Integrantes', '/integrantes']
    ]
  },
  {
    titulo: 'ajuda',
    itens: [
      ['Central de ajuda', 'mailto:ajuda@vera.finance'],
      ['Ler NF-e', '/app'],
      ['Contato', 'mailto:oi@vera.finance'],
      ['Status', STATUS_URL]
    ]
  }
];

export function SiteFooter() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { toast } = useUi();

  const enviar = async e => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post('/leads', { email });
      setEmail('');
      toast('Pronto: você está na lista.');
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  const linkProps = href =>
    href.startsWith('mailto:') || href.startsWith('/#') || href.startsWith('http')
      ? { href }
      : null;

  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__about">
          <Brand size="md" />
          <p>Preços de notas fiscais reais. A vera não vende produtos e não recebe de mercado.</p>
          <form className="vera-filter-row site-footer__form" onSubmit={enviar}>
            <Input
              placeholder="seu e-mail"
              size="sm"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-label="Seu e-mail"
              className="site-footer__email"
            />
            <Button type="submit" loading={enviando} loadingLabel="Enviando">
              Entrar na lista
            </Button>
          </form>
        </div>
        {COLS.map(c => (
          <div key={c.titulo} className="site-footer__col">
            <span className="site-footer__title">{c.titulo}</span>
            <div className="site-footer__links">
              {c.itens.map(([label, href]) => {
                const raw = linkProps(href);
                return raw ? (
                  <a key={label} {...raw} className="vera-tap site-footer__link">
                    {label}
                  </a>
                ) : (
                  <Link key={label} to={href} className="vera-tap site-footer__link">
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="site-footer__bottom">
        <span className="site-footer__copy">
          © {new Date().getFullYear()} vera.finance · Indaiatuba, SP
        </span>
        <div className="site-footer__legal">
          <Link to="/termos" className="vera-tap site-footer__mute">
            Termos
          </Link>
          <Link to="/privacidade" className="vera-tap site-footer__mute">
            Privacidade
          </Link>
          <a href="mailto:oi@vera.finance" className="vera-tap site-footer__mute">
            Contato
          </a>
        </div>
      </div>
    </footer>
  );
}
