import { Check, Pencil, Phone, UserPlus, UserRoundCheck, Video, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCalls } from "../calls/CallContext";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import type { Post, Profile } from "../types";

export function ProfilePage() {
  const { username } = useParams();
  const { token, user, updateUser } = useAuth();
  const { startCall } = useCalls();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    bio: "",
    avatarUrl: ""
  });

  async function loadProfile() {
    if (!username) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await api.profile(username, token);
      setProfile(result.profile);
      setForm({
        name: result.profile.name,
        bio: result.profile.bio || "",
        avatarUrl: result.profile.avatarUrl || ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perfil nao encontrado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [username, token]);

  async function handleFollow() {
    if (!profile || !token) {
      return;
    }

    try {
      setBusy(true);
      if (profile.isFollowing) {
        await api.unfollow(token, profile.id);
        setProfile({
          ...profile,
          isFollowing: false,
          followersCount: Math.max(0, profile.followersCount - 1)
        });
      } else {
        await api.follow(token, profile.id);
        setProfile({
          ...profile,
          isFollowing: true,
          followersCount: profile.followersCount + 1
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!token || !profile) {
      return;
    }

    try {
      setBusy(true);
      const result = await api.updateProfile(token, {
        name: form.name,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null
      });
      updateUser(result.user);
      setProfile({
        ...profile,
        ...result.user
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perfil nao atualizado");
    } finally {
      setBusy(false);
    }
  }

  function replacePost(nextPost: Post) {
    setProfile((current) =>
      current
        ? {
            ...current,
            posts: current.posts.map((post) => (post.id === nextPost.id ? nextPost : post))
          }
        : current
    );
  }

  if (loading) {
    return <p className="muted">Carregando perfil...</p>;
  }

  if (!profile) {
    return <p className="form-error">{error || "Perfil nao encontrado"}</p>;
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <section className="page-stack">
      <header className="profile-header">
        <Avatar user={profile} size="lg" />
        <div className="profile-main">
          <h1>{profile.name}</h1>
          <p>@{profile.username}</p>
          <div className="profile-stats">
            <span>{profile.postsCount} posts</span>
            <span>{profile.followersCount} seguidores</span>
            <span>{profile.followingCount} seguindo</span>
          </div>
          <p className="profile-bio">{profile.bio || "Sem bio ainda."}</p>
        </div>
        {isOwnProfile ? (
          <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
            <Pencil size={17} />
            <span>Editar</span>
          </button>
        ) : (
          <div className="profile-actions">
            <button className="icon-button call-action" type="button" onClick={() => startCall(profile, "audio")} title="Chamada de audio">
              <Phone size={18} />
            </button>
            <button className="icon-button call-action" type="button" onClick={() => startCall(profile, "video")} title="Videochamada HD">
              <Video size={18} />
            </button>
            <button className="secondary-button" type="button" onClick={handleFollow} disabled={busy}>
              {profile.isFollowing ? <UserRoundCheck size={17} /> : <UserPlus size={17} />}
              <span>{profile.isFollowing ? "Seguindo" : "Seguir"}</span>
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <form className="edit-profile" onSubmit={handleSave}>
          <label>
            Nome
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Bio
            <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </label>
          <label>
            Avatar URL
            <input value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} />
          </label>
          <div className="form-row">
            <button className="primary-button" type="submit" disabled={busy}>
              <Check size={17} />
              <span>Salvar</span>
            </button>
            <button className="ghost-button" type="button" onClick={() => setEditing(false)}>
              <X size={17} />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="post-list">
        {profile.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onChanged={replacePost}
            onDeleted={(postId) =>
              setProfile((current) =>
                current
                  ? {
                      ...current,
                      posts: current.posts.filter((post) => post.id !== postId),
                      postsCount: Math.max(0, current.postsCount - 1)
                    }
                  : current
              )
            }
          />
        ))}
      </div>
    </section>
  );
}
