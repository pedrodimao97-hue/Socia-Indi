import { Home, LogOut, Search, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "./Avatar";
import { CallPanel } from "./CallPanel";

export function Layout() {
  const { logout, user } = useAuth();

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-row">
            <div className="brand-mark">SH</div>
            <div>
              <strong>Social Hub</strong>
              <span>Rede social</span>
            </div>
          </div>

          <nav className="main-nav" aria-label="Principal">
            <NavLink to="/" end title="Feed">
              <Home size={20} />
              <span>Feed</span>
            </NavLink>
            <NavLink to="/search" title="Busca">
              <Search size={20} />
              <span>Busca</span>
            </NavLink>
            <NavLink to={`/profile/${user!.username}`} title="Perfil">
              <UserRound size={20} />
              <span>Perfil</span>
            </NavLink>
          </nav>

          <button className="ghost-button sidebar-logout" type="button" onClick={logout} title="Sair">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </aside>

        <main className="content-area">
          <Outlet />
        </main>

        <aside className="right-panel">
          <div className="profile-summary">
            <Avatar user={user!} size="lg" />
            <div>
              <strong>{user!.name}</strong>
              <span>@{user!.username}</span>
            </div>
          </div>
          <p className="muted">
            {user!.bio || "Edite seu perfil para adicionar uma bio e deixar sua pagina mais completa."}
          </p>
        </aside>
      </div>
      <CallPanel />
    </>
  );
}
