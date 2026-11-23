import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

// A round glass button at the right end of the top bar.
// Visitors get a link to the login page. Signed-in people get their initial,
// which opens a small menu with their email and "Log out".
function AccountButton({ user, onLogOut }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <Link to="/login" className="btn btn--glass btn--md btn--icon-only" aria-label="Log in" title="Log in">
        <Icon name="user" />
      </Link>
    );
  }

  return (
    <span className="account">
      <button
        type="button"
        className="btn btn--glass btn--md btn--icon-only"
        aria-label="Account"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.email[0].toUpperCase()}
      </button>
      {isOpen && (
        <span className="account__menu">
          <span className="account__email">{user.email}</span>
          <Button variant="secondary" size="sm" icon="logout" onClick={onLogOut}>
            Log out
          </Button>
        </span>
      )}
    </span>
  );
}

export default AccountButton;
