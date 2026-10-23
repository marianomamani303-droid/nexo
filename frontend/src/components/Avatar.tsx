import { UserRound } from 'lucide-react';
import type { User } from '../types';
export function Avatar({ user, large = false }: { user?: User | null; large?: boolean }) {
  return (
    <span className={`avatar ${large ? 'avatar-large' : ''}`}>
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} />
      ) : user ? (
        <span aria-label={user.name}>
          {user.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </span>
      ) : (
        <UserRound size={large ? 34 : 19} aria-hidden="true" />
      )}
    </span>
  );
}
