import { cert, applicationDefault } from 'firebase-admin/app';

/**
 * Credencial do Admin SDK: a conta de serviço das variáveis FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY ou, sem a chave, o arquivo de
 * GOOGLE_APPLICATION_CREDENTIALS. Usada pela API (banco.js) e pelo script de migração.
 */
export function credencialFirebase(contaDeServico) {
  return contaDeServico.chavePrivada
    ? cert({
        projectId: contaDeServico.idProjeto,
        clientEmail: contaDeServico.emailCliente,
        privateKey: contaDeServico.chavePrivada
      })
    : applicationDefault();
}
