import { useState } from 'react';
import Button from './Button.jsx';
import FitTag from './FitTag.jsx';
import { getItem } from '../data/catalog.js';
import { getWallDistances } from '../lib/room.js';

// Shown over the stage while a piece is selected: its name and size, how far
// it is from the two nearest walls, whether it fits, and what you can do to it.
// A piece can also carry a shop link: the page where it can be bought.
function SelectionBar({ piece, room, fit, onRotate, onDuplicate, onRemove, onSetLink }) {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkText, setLinkText] = useState('');
  const item = getItem(piece.type);
  const link = piece.link || item.link; // the piece's own link, or the page its moodboard image came from

  function handleLinkSubmit(event) {
    event.preventDefault();
    onSetLink(piece.id, linkText.trim());
    setIsEditingLink(false);
  }
  const gaps = getWallDistances(piece, room);
  const side = gaps.left <= gaps.right ? ['left', gaps.left] : ['right', gaps.right];
  const depth = gaps.back <= gaps.front ? ['back', gaps.back] : ['front', gaps.front];
  const toCm = (metres) => Math.round(metres * 100);

  return (
    <div className="selection-bar">
      <span className="selection-bar__name">{item.name}</span>
      <span className="selection-bar__size">
        {toCm(item.size.w)} × {toCm(item.size.d)} cm
      </span>
      {piece.existing && <span className="tag tag--grey">Already yours</span>}
      <span className="selection-bar__size">
        {toCm(side[1])} cm to {side[0]} wall
      </span>
      <span className="selection-bar__size">
        {toCm(depth[1])} cm to {depth[0]} wall
      </span>
      <FitTag fit={fit} />
      <Button variant="secondary" size="sm" icon="rotate" onClick={() => onRotate(piece.id)}>
        Rotate
      </Button>
      <Button variant="secondary" size="sm" icon="copy" onClick={() => onDuplicate(piece.id)}>
        Duplicate
      </Button>
      <Button variant="secondary" size="sm" icon="trash" onClick={() => onRemove(piece.id)}>
        Remove
      </Button>

      {!piece.existing && !isEditingLink && link && (
        <a className="btn btn--secondary btn--sm" href={link} target="_blank" rel="noreferrer">
          Shop
        </a>
      )}
      {!piece.existing && !isEditingLink && (
        <Button
          variant="secondary"
          size="sm"
          icon="link"
          onClick={() => {
            setLinkText(piece.link || '');
            setIsEditingLink(true);
          }}
        >
          {link ? 'Edit link' : 'Add link'}
        </Button>
      )}
      {isEditingLink && (
        <form className="selection-bar__link" onSubmit={handleLinkSubmit}>
          <input
            type="url"
            aria-label="Product page link"
            placeholder="https://www.amazon.com/..."
            value={linkText}
            autoFocus
            onChange={(event) => setLinkText(event.target.value)}
          />
          <Button variant="primary" size="sm" type="submit">
            Save
          </Button>
        </form>
      )}
    </div>
  );
}

export default SelectionBar;
