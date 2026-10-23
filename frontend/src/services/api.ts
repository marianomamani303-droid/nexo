import type { User, Post, Comment, Community, Notification, Page, Project } from '../types';

export interface RequestOptions {
  signal: AbortSignal;
  cursor?: string;
}
export interface FeedQuery {
  kind: 'discover' | 'following';
  category?: string;
  search?: string;
  authorId?: string;
  communityId?: string;
  cursor?: string;
}
/** Implementar este contrato al conectar la API. No hay adaptador ni endpoints ficticios. */
export interface SocialApi {
  getFeed(query: FeedQuery, options: RequestOptions): Promise<Page<Post>>;
  getProfile(id: string, options: RequestOptions): Promise<User | null>;
  getPeople(search: string, options: RequestOptions): Promise<Page<User>>;
  getProjects(authorId: string, options: RequestOptions): Promise<Page<Project>>;
  getCommunities(
    query: { search?: string; category?: string },
    options: RequestOptions,
  ): Promise<Page<Community>>;
  getCommunity(id: string, options: RequestOptions): Promise<Community | null>;
  getCommunityMembers(id: string, options: RequestOptions): Promise<Page<User>>;
  getNotifications(filter: 'all' | 'unread', options: RequestOptions): Promise<Page<Notification>>;
  getComments(postId: string, options: RequestOptions): Promise<Page<Comment>>;
  createPost(input: { content: string; image?: File }, options: RequestOptions): Promise<Post>;
}
