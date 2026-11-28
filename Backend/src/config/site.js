// Endereço público do site (o Static Site, não a API), sem "/" no fim. Vem de SITE_URL; sem ela,
// vale o endereço atual do site no Render. O mesmo padrão de Frontend/src/lib/site.js (o teste
// confere). Usado nos links dos e-mails e no user-agent do robô de coleta.
export const SITE_PADRAO = 'https://vera-finance-ckfn.onrender.com';

/** Endereço do site: SITE_URL ou o padrão, sem barra no fim. Lido a cada chamada. */
export const enderecoDoSite = () => String(process.env.SITE_URL || SITE_PADRAO).replace(/\/+$/, '');
