import { CornerUpLeft } from 'lucide-react';
import { PageHeading } from '../components/PageHeading';
import { EmptyState } from '../components/EmptyState';
import { AnimatedRegion } from '../components/AnimatedRegion';
export function NotFound() {
  return (
    <AnimatedRegion identity="not-found">
      <PageHeading
        eyebrow="UN PEQUEÑO DESVÍO"
        title={
          <>
            Las ideas a veces
            <br />
            toman <em>otro camino.</em>
          </>
        }
        description="Esta dirección no corresponde a una página de Nexo."
      />
      <EmptyState
        icon={CornerUpLeft}
        title="Volvamos a encontrarnos."
        description="Podés retomar desde tu inicio o seguir explorando."
        action={{ label: 'Volver al inicio', to: '/' }}
      />
    </AnimatedRegion>
  );
}
