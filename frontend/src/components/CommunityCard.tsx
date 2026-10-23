import { ArrowUpRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MembershipButton } from './MembershipButton';
import type { Community } from '../types';
import { formatCount } from '../utils/format';
export function CommunityCard({ community }: { community: Community }) {
  return (
    <article className="card community-card" data-scroll data-hover>
      <Link className="community-art" to={`/comunidades/${encodeURIComponent(community.id)}`}>
        {community.coverUrl ? (
          <img src={community.coverUrl} alt="" />
        ) : (
          <Users size={36} strokeWidth={1} />
        )}
        <ArrowUpRight size={19} />
      </Link>
      <div className="community-body">
        {community.category && <span className="eyebrow">{community.category}</span>}
        <Link to={`/comunidades/${encodeURIComponent(community.id)}`}>
          <h3>{community.name}</h3>
        </Link>
        <p>{community.description}</p>
        <div className="community-bottom">
          {community.memberCount !== undefined && (
            <span>
              <Users size={14} />
              {formatCount(community.memberCount)} miembros
            </span>
          )}
          <MembershipButton community={community} />
        </div>
      </div>
    </article>
  );
}
