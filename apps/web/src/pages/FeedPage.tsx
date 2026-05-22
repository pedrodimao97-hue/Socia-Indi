import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import type { Post } from "../types";

export function FeedPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFeed() {
    try {
      setLoading(true);
      setError("");
      const result = await api.feed(token);
      setPosts(result.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, [token]);

  function replacePost(nextPost: Post) {
    setPosts((current) => current.map((post) => (post.id === nextPost.id ? nextPost : post)));
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h1>Feed</h1>
          <p>Atualizacoes recentes da comunidade.</p>
        </div>
        <button className="icon-button" type="button" onClick={loadFeed} title="Atualizar feed">
          <RefreshCw size={18} />
        </button>
      </header>

      <PostComposer onCreated={(post) => setPosts((current) => [post, ...current])} />

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted">Carregando posts...</p> : null}
      {!loading && posts.length === 0 ? <p className="empty-state">Nenhum post ainda. Seja a primeira pessoa a publicar.</p> : null}

      <div className="post-list">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onChanged={replacePost}
            onDeleted={(postId) => setPosts((current) => current.filter((post) => post.id !== postId))}
          />
        ))}
      </div>
    </section>
  );
}
