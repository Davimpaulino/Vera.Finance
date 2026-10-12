import { useEffect, useState } from 'react';
import { Button, EmptyState, Icon, Modal, Skeleton } from '../ds/index.js';
import { api } from '../../services/api.js';
import { diaMes } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/notificacoes.css';

/**
 * Central de avisos: notas para confirmar, limites, convites, metas e preços.
 * Cada aviso leva para a página certa; a nota abre direto a confirmação.
 */
export function Notificacoes({ onClose, onAbrirNota, onIr, onMudou }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/notificacoes')
      .then(setDados)
      .catch(e => setErro(e.message));
  }, []);

  const marcar = async ids => {
    if (!ids.length) return;
    try {
      const novos = await api.post('/notificacoes/vistas', { ids });
      setDados(novos);
      onMudou(novos.naoVistas);
    } catch {
      return;
    }
  };

  const abrir = aviso => {
    if (!aviso.vista) marcar([aviso.id]);
    onClose();
    if (aviso.tipo === 'nota' && aviso.nota) onAbrirNota(aviso.nota);
    else if (aviso.destino) onIr(aviso.destino);
  };

  const naoVistas = dados ? dados.notificacoes.filter(aviso => !aviso.vista) : [];

  return (
    <Modal
      title="Notificações"
      subtitle={
        dados
          ? naoVistas.length
            ? `${naoVistas.length} ${naoVistas.length === 1 ? 'nova' : 'novas'}`
            : 'tudo em dia'
          : 'carregando'
      }
      size="sm"
      onClose={onClose}
      footer={
        naoVistas.length
          ? [
              <Button
                key="m"
                variant="secondary"
                icon="check"
                onClick={() => marcar(naoVistas.map(aviso => aviso.id))}
              >
                Marcar todas como vistas
              </Button>
            ]
          : null
      }
    >
      {erro ? (
        <span className="vera-form-error" role="alert">
          {erro}
        </span>
      ) : null}
      {!dados && !erro ? (
        <div className="vera-stack vera-stack--12">
          <Skeleton className="notif-esqueleto" />
          <Skeleton className="notif-esqueleto" />
          <Skeleton className="notif-esqueleto" />
        </div>
      ) : null}
      {dados && !dados.notificacoes.length ? (
        <EmptyState icon="bell" title="Nenhum aviso agora">
          Notas para confirmar, limites perto de estourar e mudanças de preço aparecem aqui.
        </EmptyState>
      ) : null}
      {dados && dados.notificacoes.length ? (
        <ul className="notif-lista">
          {dados.notificacoes.map(aviso => (
            <li key={aviso.id}>
              <button
                type="button"
                className={cx('notif', !aviso.vista && 'notif--nova')}
                onClick={() => abrir(aviso)}
              >
                <span className={cx('notif__icone', `notif__icone--${aviso.tom}`)}>
                  <Icon name={aviso.icone} size={17} />
                </span>
                <span className="notif__texto">
                  <span className="notif__titulo">{aviso.titulo}</span>
                  <span className="notif__corpo">{aviso.texto}</span>
                  {aviso.data ? <span className="notif__data">{diaMes(aviso.data)}</span> : null}
                </span>
                {!aviso.vista ? <span className="notif__ponto" aria-label="nova" /> : null}
                <Icon name="chevron-right" size={15} className="notif__seta" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
