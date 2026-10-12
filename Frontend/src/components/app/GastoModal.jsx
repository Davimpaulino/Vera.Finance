import { useEffect, useState } from 'react';
import { Button, Input, Modal, MoneyInput, Select } from '../ds/index.js';
import { api } from '../../services/api.js';
import { useUi } from '../../context/UiContext.jsx';
import { brl, brlCents, hojeLabel, moneyField, parseMoney } from '../../lib/format.js';
import './css/gasto-modal.css';

/**
 * Novo gasto, nova entrada ou confirmação de nota fiscal lida.
 * `nota` preenche o modal e, ao lançar, confirma a nota em vez de criar um lançamento solto.
 */
export function GastoModal({ tipo = 'saida', nota, onLerNota, onClose, onSaved }) {
  const { toast } = useUi();
  const entrada = tipo === 'entrada';
  const [valor, setValor] = useState(nota ? moneyField(nota.valor) : '');
  const [titulo, setTitulo] = useState(nota ? nota.estabelecimento : entrada ? 'Salário' : '');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (entrada) return;
    api
      .get('/categorias')
      .then(r => {
        const todas = r.categorias.concat(r.reservas);
        setCategorias(todas);
        setCategoriaId(c => c || (todas[0] && todas[0].id) || '');
      })
      .catch(e => setErro(e.message));
  }, [entrada]);

  const cat = categorias.find(c => c.id === categoriaId);
  const v = parseMoney(valor);
  const hint = cat
    ? v > 0
      ? `sobram ${brl(cat.livre - v)} em ${cat.nome}`
      : `sobram ${brl(cat.livre)} em ${cat.nome}`
    : entrada
      ? 'entra no saldo livre do ciclo'
      : ' ';

  const lancar = async e => {
    e?.preventDefault();
    setErro('');
    if (v <= 0) {
      setErro('Digite quanto foi.');
      return;
    }
    if (!titulo.trim()) {
      setErro('Diga onde foi o gasto.');
      return;
    }
    setSalvando(true);
    try {
      if (nota)
        await api.post(`/notas/${nota.id}/confirmar`, {
          categoriaId,
          valor: v,
          titulo: titulo.trim()
        });
      else
        await api.post('/lancamentos', {
          titulo: titulo.trim(),
          valor: v,
          tipo,
          categoriaId: entrada ? undefined : categoriaId
        });
      toast(
        entrada
          ? `Entrada de ${brlCents(v)} lançada.`
          : `${brlCents(v)} lançados em ${cat ? cat.nome : 'gasto'}.`
      );
      onSaved();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      title={nota ? 'Confirmar nota fiscal' : entrada ? 'Entrada de renda' : 'Novo gasto'}
      subtitle={nota ? `${nota.itens} ${nota.itens === 1 ? 'item' : 'itens'} · lida pelo QR Code` : hojeLabel()}
      size="sm"
      onClose={onClose}
      footer={[
        <Button key="a" onClick={lancar} loading={salvando} loadingLabel="Lançando">
          Lançar
        </Button>,
        <Button key="b" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      ]}
    >
      <form onSubmit={lancar} className="vera-form">
        <MoneyInput
          label="quanto foi"
          hint={hint}
          value={valor}
          onChange={e => setValor(e.target.value)}
          autoFocus={!nota}
        />
        <Input
          label={entrada ? 'De onde veio' : 'Onde'}
          placeholder={entrada ? 'Salário, freela, aluguel recebido' : 'Nagumo, 99 Pop, Bar do Zé'}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
        />
        {entrada ? null : (
          <Select
            label="Categoria"
            options={categorias.map(c => ({ value: c.id, label: c.nome }))}
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value)}
          />
        )}
        {nota && nota.produtos && nota.produtos.length ? (
          <ul className="gasto-produtos" aria-label="Itens da nota">
            {nota.produtos.slice(0, 6).map((p, i) => (
              <li key={i} className="gasto-produtos__item">
                <span className="gasto-produtos__nome">
                  {p.quantidade > 1 ? `${p.quantidade}× ` : ''}
                  {p.produto}
                </span>
                <span className="gasto-produtos__valor">{brlCents(p.total)}</span>
              </li>
            ))}
            {nota.produtos.length > 6 ? (
              <li className="gasto-produtos__mais">
                e mais {nota.produtos.length - 6} itens
              </li>
            ) : null}
          </ul>
        ) : null}
        {erro ? (
          <div className="vera-form-error" role="alert">
            {erro}
          </div>
        ) : null}
        <button type="submit" hidden />
      </form>
      {nota || entrada ? null : (
        <Button
          block
          variant="ghost"
          icon="scan-line"
          onClick={onLerNota}
        >
          Ler o QR Code da nota
        </Button>
      )}
    </Modal>
  );
}
