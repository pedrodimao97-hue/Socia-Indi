import type { AuthResult, Post, Profile, User, UserSummary } from "../types";

function getDefaultApiUrl() {
  if (globalThis.location?.hostname.endsWith(".app.github.dev")) {
    const apiHost = globalThis.location.hostname.replace(/-\d+\.app\.github\.dev$/, "-4000.app.github.dev");
    return `${globalThis.location.protocol}//${apiHost}/api`;
  }

  return "http://localhost:4000/api";
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = (configuredApiUrl || getDefaultApiUrl()).replace(/\/$/, "");

export const apiBaseUrl = API_URL;

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : (options.body as BodyInit | null | undefined)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(data?.message ?? "Erro na comunicacao com a API");
  }

  return data as T;
}

export const api = {
  register(payload: { email: string; username: string; name: string; password: string }) {
    return request<AuthResult>("/auth/register", {
      method: "POST",
      body: payload
    });
  },
  login(payload: { emailOrUsername: string; password: string }) {
    return request<AuthResult>("/auth/login", {
      method: "POST",
      body: payload
    });
  },
  me(token: string) {
    return request<{ user: User }>("/auth/me", {
      token
    });
  },
  updateProfile(token: string, payload: { name?: string; bio?: string | null; avatarUrl?: string | null }) {
    return request<{ user: User }>("/users/me", {
      method: "PATCH",
      token,
      body: payload
    });
  },
  searchUsers(search: string, token?: string | null) {
    return request<{ users: UserSummary[] }>(`/users?search=${encodeURIComponent(search)}`, {
      token
    });
  },
  profile(username: string, token?: string | null) {
    return request<{ profile: Profile }>(`/users/${encodeURIComponent(username)}`, {
      token
    });
  },
  follow(token: string, userId: string) {
    return request<void>(`/users/${userId}/follow`, {
      method: "POST",
      token
    });
  },
  unfollow(token: string, userId: string) {
    return request<void>(`/users/${userId}/follow`, {
      method: "DELETE",
      token
    });
  },
  feed(token?: string | null) {
    return request<{ posts: Post[] }>("/posts", {
      token
    });
  },
  createPost(token: string, payload: { content: string; imageUrl?: string }) {
    return request<{ post: Post }>("/posts", {
      method: "POST",
      token,
      body: payload
    });
  },
  deletePost(token: string, postId: string) {
    return request<void>(`/posts/${postId}`, {
      method: "DELETE",
      token
    });
  },
  likePost(token: string, postId: string) {
    return request<{ post: Post }>(`/posts/${postId}/like`, {
      method: "POST",
      token
    });
  },
  unlikePost(token: string, postId: string) {
    return request<{ post: Post }>(`/posts/${postId}/like`, {
      method: "DELETE",
      token
    });
  },
  addComment(token: string, postId: string, content: string) {
    return request<{ post: Post }>(`/posts/${postId}/comments`, {
      method: "POST",
      token,
      body: { content }
    });
  },
  deleteComment(token: string, postId: string, commentId: string) {
    return request<{ post: Post }>(`/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
      token
    });
  }
};
