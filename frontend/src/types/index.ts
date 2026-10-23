export type ID = string;

export interface User {
  id: ID;
  name: string;
  handle: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt?: string;
  followerCount?: number;
  followingCount?: number;
  followed?: boolean;
}
export interface Media {
  id: ID;
  url: string;
  alt: string;
  type: 'image';
}
export interface Post {
  id: ID;
  author: User;
  content: string;
  createdAt: string;
  media: Media[];
  category?: string;
  likeCount?: number;
  commentCount?: number;
  bookmarked?: boolean;
  viewerReaction?: string | null;
  visibility?: 'public' | 'followers' | 'community';
  communityId?: string | null;
}
export interface Comment {
  id: ID;
  postId: ID;
  author: User;
  content: string;
  createdAt: string;
  parentId?: string | null;
  viewerReaction?: string | null;
  reactionsCount?: number;
}
export interface Project {
  id: ID;
  authorId: ID;
  author: User;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'followers';
}
export interface Community {
  id: ID;
  name: string;
  description: string;
  category?: string;
  coverUrl?: string;
  memberCount?: number;
  memberRole?: 'owner' | 'moderator' | 'member' | null;
  ownerId?: string;
  visibility?: 'public' | 'private';
  slug?: string;
}
export interface Notification {
  id: ID;
  actor?: User;
  text: string;
  createdAt: string;
  read: boolean;
  kind: 'like' | 'comment' | 'follow' | 'community';
  href?: string;
}
export interface Page<T> {
  items: T[];
  nextCursor?: string | null;
}
export type ResourceState<T> =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };
export interface Resource<T> {
  state: ResourceState<T>;
  retry: () => void;
  loadMore?: () => void;
  loadingMore?: boolean;
  paginationError?: string;
}
