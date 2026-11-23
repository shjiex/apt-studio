import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

// What the menu says about saving, for each state App.jsx reports.
const SAVE_NOTES = {
  loading: 'Getting your saved home.',
  saving: 'Saving your home.',
  saved: 'Your home is saved to this account.',
  failed: 'We couldn’t reach your account. Your changes are kept in this browser for now.',
};

// A round glass button at the right end of the top bar.
// Visitors get a link to the login page. Signed-in people get their initial,
// which opens a small menu with their email, how saving is going, and "Log out".
function AccountButton({ user, onLogOut, state, onTryAgain }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // While the menu is open, a click anywhere else or the Escape key closes it.
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  if (!user) {
    return (
      <Link to="/login" className="btn btn--glass btn--md btn--icon-only" aria-label="Log in" title="Log in">
        <Icon name="user" />
      </Link>
    );
  }

  const hasProblem = state === 'failed';

  return (
    <span className="account" ref={menuRef}>
      <button
        type="button"
        className="btn btn--glass btn--md btn--icon-only"
        aria-label={hasProblem ? 'Account, not saved' : 'Account'}
        title="Account"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.email[0].toUpperCase()}
        {/* a small red mark on the button when saving to the account failed */}
        {hasProblem && <span className="account__mark" aria-hidden="true" />}
      </button>
      {isOpen && (
        <span className="account__menu">
          <span className="account__email">{user.email}</span>
          {SAVE_NOTES[state] && (
            <span className={hasProblem ? 'account__note is-problem' : 'account__note'} role="status">
              <Icon name={hasProblem ? 'warning' : 'check'} size={16} />
              {SAVE_NOTES[state]}
            </span>
          )}
          <span className="account__actions">
            {hasProblem && (
              <Button variant="primary" size="sm" icon="rotate" onClick={onTryAgain}>
                Try again
              </Button>
            )}
            <Button variant="secondary" size="sm" icon="logout" onClick={onLogOut}>
              Log out
            </Button>
          </span>
        </span>
      )}
    </span>
  );
}

export default AccountButton;
