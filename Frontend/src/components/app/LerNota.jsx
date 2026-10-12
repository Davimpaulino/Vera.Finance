import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Callout, Input, Modal } from '../ds/index.js';
import { api } from '../../services/api.js';
import { cx } from '../../lib/cx.js';
import './css/ler-nota.css';

const temDetector = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;
const LARGURA_MAXIMA = 960;

async function criarDetectorNativo() {
  if (!temDetector()) return null;
  try {
    const formatos = await window.BarcodeDetector.getSupportedFormats();
    return formatos.includes('qr_code') ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
  } catch {
    return null;
  }
}

/**
 * Leitor de QR Code: o do próprio navegador quando existe (mais rápido) e, nos outros
 * (iPhone, Firefox, Chrome no computador), a biblioteca jsQR, carregada só quando precisa.
 * Devolve uma função que recebe vídeo, imagem ou bitmap e responde o texto do QR ou null.
 */
async function criarLeitor() {
  const nativo = await criarDetectorNativo();
  if (nativo)
    return async fonte => {
      const achados = await nativo.detect(fonte);
      return achados[0] && achados[0].rawValue ? achados[0].rawValue : null;
    };
  const { default: jsQR } = await import('jsqr');
  const tela = document.createElement('canvas');
  const contexto = tela.getContext('2d', { willReadFrequently: true });
  return async (fonte, { tentarInvertido = false } = {}) => {
    const largura = fonte.videoWidth || fonte.width;
    const altura = fonte.videoHeight || fonte.height;
    if (!largura || !altura) return null;
    const escala = Math.min(1, LARGURA_MAXIMA / largura);
    tela.width = Math.round(largura * escala);
    tela.height = Math.round(altura * escala);
    contexto.drawImage(fonte, 0, 0, tela.width, tela.height);
    const pixels = contexto.getImageData(0, 0, tela.width, tela.height);
    const achado = jsQR(pixels.data, tela.width, tela.height, {
      inversionAttempts: tentarInvertido ? 'attemptBoth' : 'dontInvert'
    });
    return achado ? achado.data : null;
  };
}

function mensagemDaCamera(erro) {
  if (!window.isSecureContext)
    return 'O navegador só libera a câmera em sites com HTTPS (ou em localhost). Abra a vera pelo endereço seguro.';
  if (erro && (erro.name === 'NotAllowedError' || erro.name === 'SecurityError'))
    return 'A câmera foi bloqueada. Libere o acesso à câmera nas permissões do navegador e tente de novo.';
  if (erro && (erro.name === 'NotFoundError' || erro.name === 'OverconstrainedError'))
    return 'Não achamos uma câmera neste aparelho.';
  if (erro && erro.name === 'NotReadableError')
    return 'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.';
  return 'Não deu para abrir a câmera neste navegador.';
}

/**
 * Leitura da NFC-e: abre a câmera traseira e procura o QR Code do rodapé da nota.
 * Também dá para tirar uma foto do QR Code ou colar o link que ele contém.
 */
export function LerNota({ onClose, onLida }) {
  const video = useRef(null);
  const fluxo = useRef(null);
  const leitor = useRef(null);
  const lendo = useRef(false);
  const aoLer = useRef(onLida);
  const [estado, setEstado] = useState('abrindo');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    aoLer.current = onLida;
  }, [onLida]);

  const pararCamera = useCallback(() => {
    if (fluxo.current) fluxo.current.getTracks().forEach(trilha => trilha.stop());
    fluxo.current = null;
  }, []);

  const enviar = useCallback(
    async endereco => {
      if (lendo.current) return;
      lendo.current = true;
      setErro('');
      setEstado('enviando');
      try {
        const nota = await api.post('/notas/ler', { endereco: String(endereco).trim() });
        pararCamera();
        aoLer.current(nota);
      } catch (e) {
        setErro(e.message);
        setEstado(fluxo.current ? 'camera' : 'sem-camera');
        lendo.current = false;
      }
    },
    [pararCamera]
  );

  useEffect(() => {
    let cancelado = false;
    let relogio = null;

    let ocupado = false;
    const procurar = async () => {
      if (cancelado || ocupado || lendo.current || !leitor.current || !video.current) return;
      if (video.current.readyState < 2) return;
      ocupado = true;
      try {
        const texto = await leitor.current(video.current);
        if (texto) enviar(texto);
      } catch {
        return;
      } finally {
        ocupado = false;
      }
    };

    (async () => {
      leitor.current = await criarLeitor().catch(() => null);
      if (cancelado) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAviso(mensagemDaCamera(null));
        setEstado('sem-camera');
        return;
      }
      try {
        const aberto = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false
        });
        if (cancelado) {
          aberto.getTracks().forEach(trilha => trilha.stop());
          return;
        }
        fluxo.current = aberto;
        if (video.current) {
          video.current.srcObject = aberto;
          await video.current.play().catch(() => {});
        }
        setEstado('camera');
        if (leitor.current) relogio = setInterval(procurar, 250);
      } catch (e) {
        if (cancelado) return;
        setAviso(mensagemDaCamera(e));
        setEstado('sem-camera');
      }
    })();

    return () => {
      cancelado = true;
      clearInterval(relogio);
      pararCamera();
    };
  }, [enviar, pararCamera]);

  const lerFoto = async e => {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    const ler = leitor.current || (await criarLeitor().catch(() => null));
    if (!ler) {
      setErro('Não deu para ler QR Code neste navegador. Cole o link do QR Code logo abaixo.');
      return;
    }
    try {
      const imagem = await createImageBitmap(arquivo);
      const texto = await ler(imagem, { tentarInvertido: true });
      if (texto) enviar(texto);
      else setErro('Não achamos um QR Code na foto. Chegue mais perto do rodapé da nota.');
    } catch {
      setErro('Não deu para ler a foto. Tente de novo com mais luz.');
    }
  };

  return (
    <Modal
      title="Ler nota fiscal"
      subtitle="aponte para o QR Code no rodapé da NFC-e"
      size="sm"
      onClose={onClose}
    >
      <div
        className={cx(
          'ler-nota__visor',
          estado === 'sem-camera' && 'ler-nota__visor--oculto'
        )}
      >
        <video ref={video} className="ler-nota__video" autoPlay playsInline muted />
        <span className="ler-nota__mira" />
        {estado === 'abrindo' ? <span className="ler-nota__status">Abrindo a câmera…</span> : null}
        {estado === 'enviando' ? (
          <span className="ler-nota__status">Lendo a nota na Sefaz…</span>
        ) : null}
      </div>

      {aviso ? (
        <Callout tone="warning" title="Câmera indisponível">
          {aviso}
        </Callout>
      ) : null}
      {erro ? (
        <div className="vera-form-error" role="alert">
          {erro}
        </div>
      ) : null}

      <label className="ler-nota__foto">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="vera-sr-input"
          onChange={lerFoto}
        />
        <span className="ler-nota__foto-botao">Tirar foto do QR Code</span>
      </label>

      <form
        className="ler-nota__link"
        onSubmit={e => {
          e.preventDefault();
          if (link.trim()) enviar(link);
        }}
      >
        <Input
          label="Ou cole o link do QR Code"
          placeholder="https://www.nfce.fazenda.sp.gov.br/..."
          icon="scan-line"
          value={link}
          onChange={e => setLink(e.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={estado === 'enviando'}
          loadingLabel="Lendo"
          disabled={!link.trim()}
        >
          Ler link
        </Button>
      </form>
    </Modal>
  );
}
