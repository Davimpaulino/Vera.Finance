import { criarBancoPostgres } from '../../src/config/bancoPostgres.js';

// Escolhe o banco dos testes, antes de a API ser carregada. O padrão é a memória.
// Com BANCO_TESTE=postgres (npm run test:pg), os mesmos testes rodam no PostgreSQL de
// DATABASE_URL_TESTE, e cada arquivo começa com o banco vazio.
export const usandoPostgres = process.env.BANCO_TESTE === 'postgres';

if (usandoPostgres) {
  const url = process.env.DATABASE_URL_TESTE || '';
  // Os testes apagam tudo: só aceita banco com "test" no nome, para nunca limpar o de produção.
  if (!/test/i.test(new URL(url || 'postgres://x/').pathname))
    throw new Error('Defina DATABASE_URL_TESTE com um banco de teste (o nome precisa ter "test").');
  process.env.BANCO = 'postgres';
  process.env.DATABASE_URL = url;
  const banco = criarBancoPostgres({ url });
  await banco.remover('');
  await banco.fechar();
} else {
  process.env.BANCO = 'memoria';
  delete process.env.DATABASE_URL;
}

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;
