import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Post } from "../types";
import { Avatar } from "./Avatar";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function PostCard({
  post,
  onChanged,
  onDeleted
}: {
  post: Post;
  onChanged: (post: Post) => void;
  onDeleted: (postId: string) => void;
}) {
  const { token, user } = useAuth();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLike() {
    if (!token || busy) {
      return;
    }

    try {
      setBusy(true);
      const result = post.likedByMe
        ? await api.unlikePost(token, post.id)
        : await api.likePost(token, post.id);
      onChanged(result.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acao nao concluida");
    } finally {
      setBusy(false);
    }
  }

  async function handleComment(event: FormEvent) {
    event.preventDefault();

    if (!token || !comment.trim()) {
      return;
    }

    try {
      setBusy(true);
      const result = await api.addComment(token, post.id, comment);
      onChanged(result.post);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comentario nao enviado");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || busy) {
      return;
    }

    try {
      setBusy(true);
      await api.deletePost(token, post.id);
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post nao removido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="post-card">
      <header className="post-header">
        <Link to={`/profile/${post.author.username}`} className="author-link">
          <Avatar user={post.author} />
          <span>
            <strong>{post.author.name}</strong>
            <small>@{post.author.username} - {formatDate(post.createdAt)}</small>
          </span>
        </Link>
        {post.authorId === user?.id ? (
          <button className="icon-button danger" type="button" onClick={handleDelete} title="Remover post">
            <Trash2 size={18} />
          </button>
        ) : null}
      </header>

      <p className="post-content">{post.content}</p>
      {post.imageUrl ? <img className="post-image" src={post.imageUrl} alt="" /> : null}

      <div className="post-actions">
        <button
          className={`metric-button ${post.likedByMe ? "liked" : ""}`}
          type="button"
          onClick={handleLike}
          title={post.likedByMe ? "Remover curtida" : "Curtir"}
        >
          <Heart size={18} fill={post.likedByMe ? "currentColor" : "none"} />
          <span>{post.likesCount}</span>
        </button>
        <span className="metric-label">
          <MessageCircle size={18} />
          {post.commentsCount}
        </span>
      </div>

      {post.comments.length > 0 ? (
        <div className="comments">
          {post.comments.map((item) => (
            <div className="comment" key={item.id}>
              <Avatar user={item.author} size="sm" />
              <div>
                <Link to={`/profile/${item.author.username}`}>{item.author.name}</Link>
                <p>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form className="comment-form" onSubmit={handleComment}>
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Responder..."
          maxLength={600}
        />
        <button className="icon-button" type="submit" disabled={!comment.trim() || busy} title="Enviar comentario">
          <Send size={17} />
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
    </article>
  );
}
