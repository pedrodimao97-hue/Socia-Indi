import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { UserCard } from "../components/UserCard";
import type { UserSummary } from "../types";

export function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const result = await api.searchUsers(query, token);
        setUsers(result.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Busca indisponivel");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, token]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h1>Busca</h1>
          <p>Encontre usuarios por nome ou username.</p>
        </div>
      </header>

      <label className="search-field">
        <Search size={19} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar pessoas" />
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted">Pesquisando...</p> : null}

      <div className="user-grid">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </section>
  );
}
