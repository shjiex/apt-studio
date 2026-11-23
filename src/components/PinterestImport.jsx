import { useState } from 'react';
import Button from './Button.jsx';
import { fetchBoard, readBoardLink } from '../lib/pinterest.js';

// A dialog that asks for a public Pinterest board link and loads its pins.
// While a board is connected it also offers the way back to the sample photos.
function PinterestImport({ isConnected, onImport, onUseSamples, onCancel }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = readBoardLink(link);
    if (parsed.problem) {
      setError(parsed.problem);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const board = await fetchBoard(parsed.username, parsed.board);
      if (board.images.length === 0) {
        setError('That board has no pins yet.');
      } else {
        onImport(board);
      }
    } catch (fetchError) {
      setError(fetchError.message);
    }
    setIsLoading(false);
  }

  return (
    <div className="scrim" onClick={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pinterest-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="pinterest-title">Connect a Pinterest board</h2>
        <p className="dialog__body">Paste the link to a public board.</p>
        <div className="field">
          <label htmlFor="board-link">Board link</label>
          <div className={error ? 'field__well has-error' : 'field__well'}>
            <input
              id="board-link"
              className="field__text"
              type="text"
              placeholder="pinterest.com/yourname/your-board"
              autoFocus
              autoComplete="off"
              spellCheck="false"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
          </div>
          {/* role="alert" has a screen reader say the message as soon as it appears */}
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" fill type="submit" disabled={isLoading}>
            {isLoading ? 'Loading pins' : 'Connect board'}
          </Button>
        </div>
        {isConnected && (
          <div className="dialog__actions">
            <Button variant="secondary" fill icon="image" onClick={onUseSamples}>
              Back to the sample photos
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export default PinterestImport;
