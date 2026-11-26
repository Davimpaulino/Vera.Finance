/** Dados estruturados (schema.org) no HTML, para buscadores e IAs. */
export function JsonLd({ dados }) {
  return (
    <script
      type="application/ld+json"
      // "<" escapado para o texto nunca fechar a tag script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }}
    />
  );
}
