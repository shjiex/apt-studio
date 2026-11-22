import { useEffect, useState } from 'react';
import Button from './Button.jsx';
import { getItem } from '../data/catalog.js';
import { asset } from '../lib/paths.js';

// A dialog for furniture you already own. It reads the list that
// pipeline/photo2inventory.py made from a photo of your room, shows the photo
// with each piece outlined, and lets you keep or drop each one.
// Kept pieces go into the plan in grey ("already yours"). The photo cannot
// tell where a piece stands, so you drag each one into place afterwards.
// A typical footprint for a kind of piece, such as "~200 × 90 cm".
function sizeOf(type) {
  const size = getItem(type).size;
  return `~${Math.round(size.w * 100)} × ${Math.round(size.d * 100)} cm`;
}

function FoundFurniture({ onAdd, onClose }) {
  const [found, setFound] = useState(null); // null while loading, false if there is no list
  const [kept, setKept] = useState([]); // the numbers of the pieces to keep

  useEffect(() => {
    fetch(asset('/inventory/room.json'))
      .then((response) => (response.ok ? response.json() : false))
      .then((data) => {
        setFound(data);
        // Start with the pieces the finder is sure about switched on.
        if (data) setKept(data.pieces.filter((piece) => piece.sure).map((piece) => piece.number));
      })
      .catch(() => setFound(false));
  }, []);

  function toggle(number) {
    setKept(kept.includes(number) ? kept.filter((n) => n !== number) : [...kept, number]);
  }

  function handleAdd() {
    const types = found.pieces.filter((piece) => kept.includes(piece.number)).map((piece) => piece.type);
    onAdd(types);
    onClose();
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="found-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="found-title">Already in your room</h2>

        {found === null && <p className="dialog__body">Looking…</p>}

        {found === false && (
          <p className="dialog__body">
            We haven’t read a photo of your room yet. Run <code>python3 pipeline/photo2inventory.py your-room.jpg</code>, then open this again and we’ll list the furniture we find.
          </p>
        )}

        {found && (
          <>
            <p className="dialog__body">
              We found {found.pieces.length} pieces in your photo and estimated their sizes based on average furniture. Keep the ones that are staying, then drag each one to where it sits in your room.
            </p>
            <div className="found">
              <div className="found__photo">
                <img src={asset(`/inventory/${found.photo}`)} alt="Your room" />
                {/* Each piece is drawn as its own shape, in a 100 by 100 box stretched over the photo. */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {found.pieces.map((piece) => (
                    <polygon
                      key={piece.number}
                      className={kept.includes(piece.number) ? 'found__shape is-kept' : 'found__shape'}
                      points={piece.outline.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                      onClick={() => toggle(piece.number)}
                    />
                  ))}
                </svg>
                {found.pieces.map((piece) => (
                  <span
                    key={piece.number}
                    className="found__number found__number--on-photo"
                    style={{ left: `${piece.box[0] * 100}%`, top: `${piece.box[1] * 100}%` }}
                  >
                    {piece.number}
                  </span>
                ))}
              </div>
              <ul className="found__list">
                {found.pieces.map((piece) => (
                  <li key={piece.number}>
                    <label className="found__row">
                      <span className="found__number">{piece.number}</span>
                      <span className="found__text">
                        <strong>{getItem(piece.type).name}</strong>
                        <span className="found__meta">
                          {sizeOf(piece.type)}
                          <span className="tag">{piece.sure ? 'Likely' : 'Uncertain'}</span>
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={kept.includes(piece.number)}
                        onChange={() => toggle(piece.number)}
                        aria-label={`Keep ${piece.label} ${piece.number}`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" fill disabled={!found || kept.length === 0} onClick={handleAdd}>
            Add {kept.length} to my room
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FoundFurniture;
