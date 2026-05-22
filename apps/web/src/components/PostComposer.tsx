import { ImagePlus, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Post } from "../types";
import { Avatar } from "./Avatar";

export function PostComposer({ onCreated }: { onCreated: (post: Post) => void }) {
  const { token, user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token || !content.trim()) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const result = await api.createPost(token, {
        content,
        imageUrl: imageUrl.trim() || undefined
      });
      onCreated(result.post);
      setContent("");
      setImageUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel publicar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <Avatar user={user!} />
      <div className="composer-fields">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={1200}
          placeholder="O que voce quer compartilhar?"
        />
        <div className="composer-actions">
          <label className="image-url-field">
            <ImagePlus size={18} />
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="URL de imagem opcional"
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving || !content.trim()}>
            <Send size={18} />
            <span>{saving ? "Publicando" : "Publicar"}</span>
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </form>
  );
}
