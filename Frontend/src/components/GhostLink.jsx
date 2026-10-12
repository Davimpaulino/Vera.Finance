import { Button } from './ds/index.js';
import './css/ghost-link.css';

/** Botão fantasma pequeno do cabeçalho de seção, colado à direita. */
export function GhostLink({ children, ...props }) {
  return (
    <Button variant="ghost" size="sm" className="vera-ghost-link" {...props}>
      {children}
    </Button>
  );
}
