import { useState } from 'react';
import Button from './Button.jsx';
import FitTag from './FitTag.jsx';
import Icon from './Icon.jsx';
import Segmented from './Segmented.jsx';
import { SiteIcon, formatPrice, siteOf } from './ShopList.jsx';
import { getItem, sizeOf } from '../data/catalog.js';
import { getWallDistances } from '../lib/room.js';
import { asset } from '../lib/paths.js';
import { BulbSliders } from './LightingPanel.jsx';
import { bulbOf } from '../lib/light.js';
import { fromSmall, smallUnit, toSmall } from '../lib/units.js';

// The colours a piece can be given. The first one, null, means "as it was made".
const COLOURS = [
  { name: 'As made', value: null },
  { name: 'White', value: '#F4F3EF' },
  { name: 'Sand', value: '#D9C7A8' },
  { name: 'Oak', value: '#B98B5E' },
  { name: 'Walnut', value: '#6B4630' },
  { name: 'Black', value: '#2B2B29' },
  { name: 'Sage', value: '#9DB09A' },
  { name: 'Blue', value: '#5B7FA6' },
  { name: 'Clay', value: '#C7694B' },
  { name: 'Mustard', value: '#D9A93B' },
];

// One number you can type, with an icon and a unit: "↔ Width 150 cm".
// The text being typed is kept here, so a half-typed number ("1", then "15", then
// "150") is not rounded or thrown away on the way. It is handed on when you press
// Enter or leave the field, and only if it is a number above zero (or zero, when
// `allowZero` is set, as for a distance from a wall).
function Measure({ icon, label, value, unit, allowZero, onCommit }) {
  const [text, setText] = useState(null); // null while not typing: the field shows `value`

  function commit() {
    if (text === null) return;
    const number = Number(text);
    const isUsable = text.trim() !== '' && Number.isFinite(number) && (allowZero ? number >= 0 : number > 0);
    if (isUsable) onCommit(number);
    setText(null);
  }

  return (
    <label className="measure">
      <span className="measure__label">
        <Icon name={icon} size={14} />
        {label}
      </span>
      <span className="measure__well">
        <input
          inputMode="decimal"
          value={text === null ? value : text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.target.blur(); // leaving the field saves it
          }}
        />
        <span className="measure__unit">{unit}</span>
      </span>
    </label>
  );
}

// The right-hand panel while a piece is selected. It takes the moodboard's place
// and shows what the piece is and whether it fits, and lets you change it: turn or
// remove it, type its size, type how far it stands from the walls, give it a colour
// and a finish, and say where to buy it.
// Closing it (or clicking empty floor) brings the moodboard back.
// `onChange(id, changes)` saves any changed fields of the piece, for example { size } or { x, z }.
function PiecePanel({ piece, room, fit, units, lighting, onLightingChange, onRotate, onRemove, onChange, onSetLink, onClose }) {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [priceText, setPriceText] = useState('');
  const item = getItem(piece.type);
  const size = sizeOf(piece);
  const link = piece.link || item.link; // the piece's own link, or the page its moodboard image came from
  const unit = smallUnit(units);
  // How far the piece stands from the left wall and from the back wall, in metres.
  const gaps = getWallDistances(piece, room);
  // Is the piece lying across (turned 90 or 270)? Then its width runs front to back.
  const isTurned = piece.rotation === 90 || piece.rotation === 270;

  // Lamps only: this lamp's bulb, and how to change it without touching the other lamps.
  const isLamp = (item.baseType || piece.type) === 'lamp';
  const bulb = bulbOf(piece, lighting);
  function setBulb(next) {
    onLightingChange({ ...lighting, lampBulbs: { ...lighting.lampBulbs, [piece.id]: next } });
  }

  // Change one side of the size. `side` is 'w', 'd' or 'h', and `typed` is in the small unit.
  function setSize(side, typed) {
    const metres = Math.min(Math.max(fromSmall(typed, units), 0.05), 6); // from 5 cm to 6 m
    onChange(piece.id, { size: { ...size, [side]: metres } });
  }

  // Move the piece so its left edge is `typed` from the left wall. x is counted from
  // the middle of the room, so: left wall + the gap + half the piece's width.
  function setFromLeft(typed) {
    const across = isTurned ? size.d : size.w;
    onChange(piece.id, { x: -room.width / 2 + fromSmall(typed, units) + across / 2 });
  }
  function setFromBack(typed) {
    const deep = isTurned ? size.w : size.d;
    onChange(piece.id, { z: -room.length / 2 + fromSmall(typed, units) + deep / 2 });
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
            {piece.existing && <span className="tag tag--grey">Own</span>}
          </span>
        </div>
        <Button variant="secondary" icon="close" aria-label="Close" title="Back to the moodboard" onClick={onClose} />
      </header>

      {/* The same two actions float above the piece in the room. */}
      <div className="piece-panel__actions">
        <Button variant="secondary" size="sm" icon="rotate" title="Rotate (R)" onClick={() => onRotate(piece.id)}>
          Rotate
        </Button>
        <button type="button" className="btn btn--sm btn--remove" title="Remove (Delete)" onClick={() => onRemove(piece.id)}>
          <Icon name="trash" />
          Remove
        </button>
        {/* Furniture you already own is drawn grey on the plan and left out of the shop list. */}
        <label className="piece-panel__own">
          <input type="checkbox" checked={Boolean(piece.existing)} onChange={(event) => onChange(piece.id, { existing: event.target.checked })} />
          Own
        </label>
      </div>

      <div className="piece-panel__group">
        <h3>
          <Icon name="ruler" size={14} />
          Size
        </h3>
        <div className="measures">
          <Measure icon="width" label="Width" value={toSmall(size.w, units)} unit={unit} onCommit={(typed) => setSize('w', typed)} />
          <Measure icon="depth" label="Depth" value={toSmall(size.d, units)} unit={unit} onCommit={(typed) => setSize('d', typed)} />
          <Measure icon="height" label="Height" value={toSmall(size.h, units)} unit={unit} onCommit={(typed) => setSize('h', typed)} />
        </div>
        {piece.size && (
          <button type="button" className="room-bar__link" onClick={() => onChange(piece.id, { size: null })}>
            Back to its usual size
          </button>
        )}
      </div>

      <div className="piece-panel__group">
        <h3>
          <Icon name="fit" size={14} />
          Position
        </h3>
        <div className="measures">
          <Measure icon="width" label="From left wall" value={toSmall(gaps.left, units)} unit={unit} allowZero onCommit={setFromLeft} />
          <Measure icon="height" label="From back wall" value={toSmall(gaps.back, units)} unit={unit} allowZero onCommit={setFromBack} />
          {/* Something on a wall can be hung higher or lower. The number is where its middle is. */}
          {item.wall && (
            <Measure
              icon="height"
              label="Above floor"
              value={toSmall(piece.hang === undefined ? item.hang : piece.hang, units)}
              unit={unit}
              onCommit={(typed) => onChange(piece.id, { hang: Math.min(Math.max(fromSmall(typed, units), size.h / 2), room.height - size.h / 2) })}
            />
          )}
          <Measure
            icon="rotate"
            label="Turned"
            value={piece.rotation}
            unit="°"
            allowZero
            // a quarter turn at a time: what is typed is rounded to 0, 90, 180 or 270
            onCommit={(typed) => onChange(piece.id, { rotation: (Math.round(typed / 90) * 90) % 360 })}
          />
        </div>
      </div>

      <div className="piece-panel__group">
        <h3>
          <Icon name="drop" size={14} />
          Colour and finish
        </h3>
        <div className="surface__paints">
          {COLOURS.map((colour) => {
            const isChosen = (piece.tint || null) === colour.value;
            return (
              <button
                key={colour.name}
                type="button"
                className={isChosen ? 'surface__paint is-current' : 'surface__paint'}
                // "As made" has no colour of its own, so it shows a struck-through white dot
                style={{ background: colour.value || 'linear-gradient(135deg, #fff 45%, #d92c0f 45%, #d92c0f 55%, #fff 55%)' }}
                aria-label={colour.name}
                aria-pressed={isChosen}
                title={colour.name}
                onClick={() => onChange(piece.id, { tint: colour.value })}
              />
            );
          })}
        </div>
        <Segmented
          label="Finish"
          options={[
            [null, 'As made'],
            ['matte', 'Matte'],
            ['gloss', 'Gloss'],
            ['metal', 'Metal'],
          ]}
          value={piece.finish || null}
          onChange={(finish) => onChange(piece.id, { finish })}
          optionClass="surface__choice"
        />
      </div>

      {/* A lamp has a bulb of its own: on or off, its colour and its brightness. */}
      {isLamp && (
        <div className="piece-panel__group piece-panel__bulb">
          <h3>
            <Icon name="bulb" size={14} />
            Bulb
          </h3>
          <label className="light__head">
            <strong>On</strong>
            <input type="checkbox" checked={bulb.on} onChange={(event) => setBulb({ ...bulb, on: event.target.checked })} />
          </label>
          {bulb.on && <BulbSliders bulb={bulb} onChange={setBulb} />}
        </div>
      )}

      {!piece.existing && (
        <div className="piece-panel__group">
          <h3>
            <Icon name="tag" size={14} />
            Shop
          </h3>
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
