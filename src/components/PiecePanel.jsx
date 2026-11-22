import { useState } from 'react';
import Button from './Button.jsx';
import FitTag from './FitTag.jsx';
import Icon from './Icon.jsx';
import { SiteIcon, formatPrice, siteOf } from './ShopList.jsx';
import { getItem } from '../data/catalog.js';
import { getWallDistances } from '../lib/room.js';
import { asset } from '../lib/paths.js';
import { BulbSliders } from './LightingMenu.jsx';
import { bulbOf } from '../lib/light.js';

// The right-hand panel while a piece is selected. It takes the moodboard's
// place and shows what the piece is, whether it fits, what you can do to it,
// its size, how far it is from the walls, and where to buy it.
// Closing it (or clicking empty floor) brings the moodboard back.
function PiecePanel({ piece, room, fit, lighting, onLightingChange, onRotate, onDuplicate, onRemove, onSetLink, onClose }) {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [priceText, setPriceText] = useState('');
  const item = getItem(piece.type);
  const link = piece.link || item.link; // the piece's own link, or the page its moodboard image came from

  // The nearer wall on each axis, in centimetres.
  const gaps = getWallDistances(piece, room);
  const side = gaps.left <= gaps.right ? ['Left wall', gaps.left] : ['Right wall', gaps.right];
  const depth = gaps.back <= gaps.front ? ['Back wall', gaps.back] : ['Front wall', gaps.front];
  const toCm = (metres) => Math.round(metres * 100);

  // Lamps only: this lamp's bulb, and how to change it without touching the other lamps.
  const isLamp = (item.baseType || piece.type) === 'lamp';
  const bulb = bulbOf(piece, lighting);
  function setBulb(next) {
    onLightingChange({ ...lighting, lampBulbs: { ...lighting.lampBulbs, [piece.id]: next } });
  }

  function handleLinkSubmit(event) {
    event.preventDefault();
    // An empty or unreadable price is saved as "no price".
    const price = Number(priceText);
    onSetLink(piece.id, linkText.trim(), priceText.trim() !== '' && price > 0 ? price : null);
    setIsEditingLink(false);
  }

  return (
    <section className="panel piece-panel" aria-label="Selected piece">
      <header className="piece-panel__head">
        <img src={asset(item.image)} alt="" />
        <div className="piece-panel__name">
          <h2>{item.name}</h2>
          <span className="piece-panel__tags">
            <FitTag fit={fit} />
            {piece.existing && <span className="tag tag--grey">Already yours</span>}
          </span>
        </div>
        <Button variant="secondary" icon="close" aria-label="Close" title="Back to the moodboard" onClick={onClose} />
      </header>

      <div className="piece-panel__actions">
        <Button variant="secondary" icon="rotate" aria-label="Rotate" title="Rotate (R)" onClick={() => onRotate(piece.id)} />
        <Button variant="secondary" icon="copy" aria-label="Duplicate" title="Duplicate" onClick={() => onDuplicate(piece.id)} />
        <Button variant="secondary" icon="trash" aria-label="Remove" title="Remove (Delete)" onClick={() => onRemove(piece.id)} />
      </div>

      <div className="piece-panel__group">
        <h3>Size</h3>
        <dl className="piece-panel__facts">
          <div><dt>Width</dt><dd>{toCm(item.size.w)} cm</dd></div>
          <div><dt>Depth</dt><dd>{toCm(item.size.d)} cm</dd></div>
          <div><dt>Height</dt><dd>{toCm(item.size.h)} cm</dd></div>
        </dl>
      </div>

      <div className="piece-panel__group">
        <h3>Position</h3>
        <dl className="piece-panel__facts">
          <div><dt>{side[0]}</dt><dd>{toCm(side[1])} cm</dd></div>
          <div><dt>{depth[0]}</dt><dd>{toCm(depth[1])} cm</dd></div>
          <div><dt>Turned</dt><dd>{piece.rotation}°</dd></div>
        </dl>
      </div>

      {/* A lamp has a bulb of its own: on or off, its colour and its brightness. */}
      {isLamp && (
        <div className="piece-panel__group piece-panel__bulb">
          <h3>Bulb</h3>
          <label className="light__head">
            <strong>On</strong>
            <input type="checkbox" checked={bulb.on} onChange={(event) => setBulb({ ...bulb, on: event.target.checked })} />
          </label>
          {bulb.on && <BulbSliders bulb={bulb} onChange={setBulb} />}
        </div>
      )}

      {!piece.existing && (
        <div className="piece-panel__group">
          <h3>Shop</h3>
          {piece.price > 0 && !isEditingLink && (
            <div className="piece-panel__shop">
              <span>Price</span>
              <strong>{formatPrice(piece.price)}</strong>
            </div>
          )}
          {link && !isEditingLink && (
            <div className="piece-panel__shop">
              <span className="shop-row__site">
                <SiteIcon site={siteOf(link)} />
                {siteOf(link)}
              </span>
              <a className="btn btn--secondary btn--sm" href={link} target="_blank" rel="noreferrer">
                Open
                <Icon name="open" size={16} />
              </a>
            </div>
          )}
          {!isEditingLink && (
            <Button
              variant="secondary"
              size="sm"
              icon="link"
              onClick={() => {
                setLinkText(piece.link || '');
                setPriceText(piece.price ? String(piece.price) : '');
                setIsEditingLink(true);
              }}
            >
              {link || piece.price ? 'Change link or price' : 'Add link or price'}
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
              <input
                className="piece-panel__price"
                inputMode="decimal"
                aria-label="Price in dollars"
                placeholder="Price $"
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
              />
              <Button variant="primary" size="sm" type="submit">
                Save
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export default PiecePanel;
