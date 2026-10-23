import { Link } from 'react-router-dom';
import type { User } from '../types';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';

export function PeopleList({ users }: { users: User[] }) {
  return (
    <div className="people-list">
      {users.map((user) => (
        <article className="card person-card" key={user.id}>
          <Avatar user={user} />
          <div>
            <Link to={`/perfil/${user.id}`}>
              <h3>{user.name}</h3>
            </Link>
            <span>@{user.handle}</span>
            {user.bio && <p>{user.bio}</p>}
          </div>
          <FollowButton user={user} />
        </article>
      ))}
    </div>
  );
}
