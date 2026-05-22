export type User = {
  id: string;
  email?: string;
  username: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
};

export type UserSummary = User & {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
};

export type Post = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: User;
  comments: Comment[];
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
};

export type Profile = UserSummary & {
  posts: Post[];
};

export type AuthResult = {
  user: User;
  token: string;
};
