import { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import { socialActions } from '../services/rest-social-api';
import { ActionError } from './ActionError';
import type { User } from '../types';

export function FollowButton({ user }: { user: User }) {
  const session = useSession();
  const action = useAction();
  const [following, setFollowing] = useState(user.followed || false);
  useEffect(() => {
    if (user.followed !== undefined) setFollowing(user.followed);
  }, [user.followed]);
  if (session.user?.id === user.id) return null;
  return (
    <div>
      <button
        className="button secondary small"
        disabled={action.pending}
        aria-pressed={following}
        onClick={() =>
          void action.run(async () => {
            await socialActions.follow(user.id, !following);
            setFollowing(!following);
          })
        }
      >
        {following ? 'Dejar de seguir' : 'Seguir'}
      </button>
      <ActionError error={action.error} />
    </div>
  );
}
