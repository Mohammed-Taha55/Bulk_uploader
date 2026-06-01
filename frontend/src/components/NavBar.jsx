import { NavLink } from 'react-router-dom';
import { Send, Users, ClipboardList, Mail } from 'lucide-react';

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="brand-icon" aria-hidden="true">
            <Mail size={16} strokeWidth={2.5} />
          </div>
          <span className="brand-text">
            Bulk <span>Mailer</span>
          </span>
        </div>

        {/* Nav links */}
        <ul className="navbar-links">
          <li>
            <NavLink
              to="/senders"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Send size={14} strokeWidth={2} className="nav-icon" />
              Senders
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/recipients"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Users size={14} strokeWidth={2} className="nav-icon" />
              Recipients
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/logs"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <ClipboardList size={14} strokeWidth={2} className="nav-icon" />
              Upload Logs
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
