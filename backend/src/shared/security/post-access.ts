import type { SqlValue } from '../../database/query.js';

export function postVisibility(viewerId: string | null): { sql: string; values: SqlValue[] } {
  return {
    sql: `p.deleted_at IS NULL
      AND EXISTS(SELECT 1 FROM users author WHERE author.id = p.author_id AND author.status = 'active' AND author.deleted_at IS NULL)
      AND ((p.community_id IS NULL AND (p.visibility = 'public' OR p.author_id = ?
        OR (p.visibility = 'followers' AND EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id = ? AND f.followed_id = p.author_id))))
      OR (p.community_id IS NOT NULL AND EXISTS(SELECT 1 FROM communities community WHERE community.id = p.community_id AND community.deleted_at IS NULL
        AND (community.visibility = 'public' OR EXISTS(SELECT 1 FROM community_members member WHERE member.community_id = community.id AND member.user_id = ?)))))`,
    values: [viewerId, viewerId, viewerId],
  };
}
