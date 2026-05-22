import { UserPlus, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { UserSummary } from "../types";
import { Avatar } from "./Avatar";

export function UserCard({ user }: { user: UserSummary }) {
  const { token, user: currentUser } = useAuth();
  const [state, setState] = useState(user);
  const [busy, setBusy] = useState(false);

  async function toggleFollow() {
    if (!token || currentUser?.id === state.id) {
      return;
    }

    try {
      setBusy(true);
      if (state.isFollowing) {
        await api.unfollow(token, state.id);
        setState((value) => ({
          ...value,
          isFollowing: false,
          followersCount: Math.max(0, value.followersCount - 1)
        }));
      } else {
        await api.follow(token, state.id);
        setState((value) => ({
          ...value,
          isFollowing: true,
          followersCount: value.followersCount + 1
        }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="user-card">
      <Link to={`/profile/${state.username}`} className="user-card-main">
        <Avatar user={state} />
        <span>
          <strong>{state.name}</strong>
          <small>@{state.username}</small>
        </span>
      </Link>
      <div className="user-card-meta">
        <span>{state.followersCount} seguidores</span>
        <span>{state.postsCount} posts</span>
      </div>
      {currentUser?.id !== state.id ? (
        <button className="secondary-button" type="button" onClick={toggleFollow} disabled={busy}>
          {state.isFollowing ? <UserRoundCheck size={17} /> : <UserPlus size={17} />}
          <span>{state.isFollowing ? "Seguindo" : "Seguir"}</span>
        </button>
      ) : null}
    </article>
  );
}
