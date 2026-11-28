import { useState } from 'react';
import { Button, Icon, Input } from '../ds/index.js';
import { Brand } from '../Brand.jsx';
import { Link } from '../../lib/router.jsx';
import { api } from '../../services/api.js';
import { useUi } from '../../context/UiContext.jsx';
import { EMAIL_DE_CONTATO, INSTAGRAM, WHATSAPP } from '../../lib/site.js';
import { BLOG_NO_RODAPE } from '../../conteudo/rodape.js';
import './css/site-footer.css';

const STATUS_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api/saude';

// Redes da vera.group. Abrem em nova aba; o nome acessível diz isso.
const REDES_SOCIAIS = [
  ['instagram', 'Instagram', `Instagram da vera.group, ${INSTAGRAM.usuario} (abre em nova aba)`, INSTAGRAM.link],
  ['whatsapp', 'WhatsApp', `WhatsApp da vera.group, ${WHATSAPP.numero} (abre em nova aba)`, WHATSAPP.link]
];

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
      ['Onde funciona', '/onde-funciona'],
      ['Base de preços', '/app/comparar']
    ]
  },
  {
    titulo: 'ajuda',
    itens: [
      ['Central de ajuda', '/ajuda'],
      ['Perguntas frequentes', '/perguntas'],
      ['Ler nota fiscal', '/ajuda/ler-nota-fiscal'],
      ['Contato', `mailto:${EMAIL_DE_CONTATO}`],
      ['Status', STATUS_URL]
    ]
  },
  {
    // Artigos do blog pelo nome curto (src/conteudo/rodape.js).
    titulo: 'blog',
    itens: [['Todos os artigos', '/blog'], ...BLOG_NO_RODAPE]
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
          <p>
            Preços dos sites das redes e de notas fiscais. A vera não vende produtos e não recebe de
            mercado.
          </p>
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
          <div className="site-footer__social">
            {REDES_SOCIAIS.map(([icone, nome, rotulo, href]) => (
              <a
                key={icone}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={rotulo}
                className="vera-tap site-footer__social-link"
              >
                <Icon name={icone} size={18} />
                {nome}
              </a>
            ))}
          </div>
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
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="vera-tap site-footer__mute">
            Contato
          </a>
        </div>
      </div>
    </footer>
  );
}
