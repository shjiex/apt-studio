import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { auth, isFirebaseReady } from '../firebase.js';

// Firebase reports errors as codes. These are the ones worth explaining.
const MESSAGES = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/user-not-found': 'That email and password do not match.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'There is already an account with that email.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
};

// One page for both logging in and signing up. mode is 'login' or 'signup'.
function AuthPage({ mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isSignup = mode === 'signup';

  // Escape goes back to the room, the same as the cross in the corner of the card.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') navigate('/');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setError('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/'); // back to the workspace, now signed in
    } catch (authError) {
      setError(MESSAGES[authError.code] || 'Something went wrong. Try again.');
    }
  }

  return (
    <main className="auth">
      <form className="auth__card" onSubmit={handleSubmit}>
        {/* The way out: back to your room without an account. */}
        <div className="auth__top">
          <Logo height={28} />
          <Link to="/" className="btn btn--secondary btn--md btn--icon-only" aria-label="Back to your room" title="Back to your room">
            <Icon name="close" />
          </Link>
        </div>
        <h1>{isSignup ? 'Create your account' : 'Log in'}</h1>

        {!isFirebaseReady && (
          <p className="auth__notice">
            Accounts aren’t switched on in this copy of the app yet. You can keep planning without one, and your room stays saved in this browser.
          </p>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="field__well">
            <input
              id="email"
              className="field__text"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="field__well">
            <input
              id="password"
              className="field__text"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>
        {error && <p className="field__error">{error}</p>}

        <Button variant="primary" type="submit" disabled={!isFirebaseReady}>
          {isSignup ? 'Create account' : 'Log in'}
        </Button>

        <p className="auth__switch">
          {isSignup ? (
            <>
              Have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}

export default AuthPage;
