import type { Community } from '../types';
import { useAction } from '../hooks/useAction';
import { socialActions } from '../services/rest-social-api';
import { ActionError } from './ActionError';

export function MembershipButton({ community }: { community: Community }) {
  const action = useAction();
  if (community.memberRole === 'owner') return <span className="local-badge">Propietario</span>;
  if (!community.memberRole && community.visibility === 'private')
    return <p>Ingreso por invitación.</p>;
  return (
    <div>
      <button
        className="button secondary small"
        disabled={action.pending}
        onClick={() =>
          void action.run(() => socialActions.membership(community.id, !community.memberRole))
        }
      >
        {community.memberRole ? 'Abandonar comunidad' : 'Unirme'}
      </button>
      <ActionError error={action.error} />
    </div>
  );
}
