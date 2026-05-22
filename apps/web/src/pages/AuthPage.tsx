import { FormEvent, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type Mode = "login" | "register";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    username: "",
    name: "",
    emailOrUsername: "",
    password: ""
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (mode === "login") {
        await login({
          emailOrUsername: form.emailOrUsername,
          password: form.password
        });
      } else {
        await register({
          email: form.email,
          username: form.username,
          name: form.name,
          password: form.password
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel autenticar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-copy">
          <div className="brand-row">
            <div className="brand-mark">SH</div>
            <div>
              <strong>Social Hub</strong>
              <span>Feed, perfis e conversas em uma plataforma.</span>
            </div>
          </div>
          <div className="auth-visual" aria-hidden="true">
            <MessageSquareText size={72} />
            <div>
              <strong>Compartilhe ideias</strong>
              <span>Publique atualizacoes, siga pessoas e acompanhe comentarios em tempo real.</span>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="segmented-control" aria-label="Modo de acesso">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Entrar
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Criar conta
            </button>
          </div>

          {mode === "register" ? (
            <>
              <label>
                Nome
                <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
              </label>
              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  required
                  minLength={3}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Email ou username
              <input
                value={form.emailOrUsername}
                onChange={(event) => updateField("emailOrUsername", event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Senha
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
              minLength={8}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button full-width" type="submit" disabled={saving}>
            {saving ? "Enviando" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}
