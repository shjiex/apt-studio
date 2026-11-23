import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
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
  'auth/missing-email': 'Enter your email.',
  'auth/email-already-in-use': 'There is already an account with that email.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'We couldn’t reach the account service. Check your connection and try again.',
  'auth/user-disabled': 'This account has been switched off.',
  // The project owner has not turned on "Email/Password" under Sign-in method in the Firebase console.
  'auth/operation-not-allowed': 'Email and password accounts aren’t switched on for this app yet.',
};

// The codes that mean "wrong email or password". After one of these the card
// offers to send a reset link.
const WRONG_DETAILS = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];

// One page for both logging in and signing up. mode is 'login' or 'signup'.
// user is the person signed in, or null.
function AuthPage({ mode, user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState(''); // good news, such as "a reset link is on its way"
  const [isWaiting, setIsWaiting] = useState(false); // true while Firebase is answering
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [canReset, setCanReset] = useState(false);
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

  // Someone who is already signed in has no use for this page. This also sends a
  // person back to their room the moment logging in or signing up succeeds.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!isFirebaseReady) return; // Enter in a field also lands here; without Firebase there is nothing to ask
    setError('');
    setNote('');
    setCanReset(false);
    // Catch the plain mistakes here, without asking Firebase.
    if (email.trim() === '') return setError(MESSAGES['auth/missing-email']);
    if (password === '') return setError(MESSAGES['auth/missing-password']);
    if (isSignup && password.length < 6) return setError(MESSAGES['auth/weak-password']);

    setIsWaiting(true);
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      navigate('/'); // back to the workspace, now signed in
    } catch (authError) {
      setError(MESSAGES[authError.code] || 'That didn’t work. Try again in a moment.');
      setCanReset(!isSignup && WRONG_DETAILS.includes(authError.code));
      setIsWaiting(false);
    }
  }

  // Firebase emails a link for choosing a new password. It answers the same way
  // whether or not the email has an account, so nobody can use this to find out
  // who has one, and the note is worded to match.
  async function handleReset() {
    setError('');
    setIsWaiting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNote('If there is an account for that email, a link to choose a new password is on its way.');
      setCanReset(false);
    } catch (authError) {
      setError(MESSAGES[authError.code] || 'We couldn’t send the link. Try again in a moment.');
    }
    setIsWaiting(false);
  }

  return (
    <main className="auth">
      {/* noValidate: the card shows its own messages, in its own words, in place of the browser's bubbles */}
      <form className="auth__card" onSubmit={handleSubmit} noValidate>
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
              autoFocus
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
              type={isPasswordShown ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {/* aria-pressed tells a screen reader whether the password is showing */}
            <button
              type="button"
              className="icon-action"
              aria-pressed={isPasswordShown}
              aria-label="Show the password"
              title={isPasswordShown ? 'Hide the password' : 'Show the password'}
              onClick={() => setIsPasswordShown(!isPasswordShown)}
            >
              <Icon name="eye" size={16} />
            </button>
          </div>
        </div>
        {/* role="alert" has a screen reader say the message as soon as it appears */}
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        {note && (
          <p className="auth__notice" role="status">
            {note}
          </p>
        )}

        <Button variant="primary" type="submit" disabled={!isFirebaseReady || isWaiting}>
          {isWaiting ? 'One moment' : isSignup ? 'Create account' : 'Log in'}
        </Button>
        {canReset && (
          <Button variant="secondary" icon="link" disabled={isWaiting} onClick={handleReset}>
            Email me a reset link
          </Button>
        )}

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
