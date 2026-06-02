import { NavLink } from 'react-router-dom';
import { Mail, MailOpen, ClipboardList } from 'lucide-react';

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
              to="/mailing"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <MailOpen size={14} strokeWidth={2} className="nav-icon" />
              Mailing
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/campaigns"
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <ClipboardList size={14} strokeWidth={2} className="nav-icon" />
              Campaigns
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
