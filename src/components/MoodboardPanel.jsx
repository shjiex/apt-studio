import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import AccountButton from './AccountButton.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { CATALOG } from '../data/catalog.js';
import { asset } from '../lib/paths.js';
import '../styles/moodboard-options.css';

// How wide the card of furniture options is, in pixels (the same number is in the CSS).
const CARD_WIDTH = 320;

// A size written the way people say it: "1.8 m wide, 0.85 m deep".
// Sizes made from a picture can be long numbers (2.267), so they are rounded to centimetres.
function sizeWords(size) {
  const metres = (value) => Number(value.toFixed(2)); // 2.267 -> 2.27, and 1.8 stays 1.8
  return `${metres(size.w)} m wide, ${metres(size.d)} m deep`;
}

// The inspiration board on the right, laid out like a Pinterest board:
// a big board name, then pins in columns. Pressing a pin picks it, shown by a
// border inside the image.
// Each image aims at ONE object. If a 3D model was made from it, a button under
// the image puts it in the room.
// Every piece of furniture found in a picture (its "elements") is outlined on the
// picture. Each outline is a button: pressing it opens a small card with furniture
// of that kind to choose from, and each choice has its own Add button.
// Above the pins: a search field, three filters, and a link out to Pinterest to find more.
function MoodboardPanel({ moodboard, pickedIds, pinModels, user, onTogglePick, onAddItem, onConnect, onLogOut }) {
  const isPinterest = moodboard.source === 'pinterest';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'picked' or '3d'
  // The furniture found in each sample picture, by picture id: { 'mood-1': [element, ...] }.
  const [elementsByPin, setElementsByPin] = useState({});
  // The open card of options, or null: { imageId, elementId, left, top } (left and top in pixels on the screen).
  const [open, setOpen] = useState(null);
  const cardRef = useRef(null); // the card, to tell a click inside it from a click outside
  const openerRef = useRef(null); // the outline that opened the card, to hand the keyboard back to it

  // The pipeline (pipeline/pin2object.py) writes what it found in each picture into
  // the same file as the 3D models. Read it once, when the board first shows.
  useEffect(() => {
    let isGone = false; // true once this panel has left the screen, so a late answer is dropped
    fetch(asset('/models/pins/manifest.json'))
      .then((response) => (response.ok ? response.json() : []))
      .then((entries) => {
        if (isGone) return;
        const byPin = {};
        entries.forEach((entry) => {
          if (entry.elements) byPin[entry.id] = entry.elements;
        });
        setElementsByPin(byPin);
      })
      .catch(() => {}); // no file, no outlines: the board still works
    return () => {
      isGone = true;
    };
  }, []);

  // While a card is open: Escape closes it, so does a press anywhere outside it, and
  // so does scrolling or resizing (the card is pinned to the screen, so it would
  // drift away from its picture).
  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(null);
    }
    function handleKey(event) {
      if (event.key === 'Escape') {
        close();
        if (openerRef.current) openerRef.current.focus(); // the keyboard goes back to the outline
      }
    }
    function handlePress(event) {
      const inCard = cardRef.current && cardRef.current.contains(event.target);
      // a press on another outline opens that outline's card, so it must not close first
      const onOutline = event.target.closest && event.target.closest('.pin-element');
      if (!inCard && !onOutline) close();
    }
    function handleScroll(event) {
      // scrolling the list inside the card is fine
      if (cardRef.current && cardRef.current.contains(event.target)) return;
      close();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePress);
    window.addEventListener('scroll', handleScroll, true); // true: also hear the board's own scrolling
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePress);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // The card's height is only known once it is drawn. If it would run off the bottom of
  // the window, move it up. useLayoutEffect runs before the browser paints, so the card
  // is never seen in the wrong place.
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const lowestTop = Math.max(12, window.innerHeight - 12 - cardRef.current.offsetHeight);
    if (open.top > lowestTop) setOpen({ ...open, top: lowestTop });
  }, [open]);

  // When a card opens, put the keyboard on its first Add button.
  useEffect(() => {
    if (open && cardRef.current) {
      const first = cardRef.current.querySelector('.pin-options__row button');
      if (first) first.focus();
    }
  }, [open]);

  // Open the card for one element. It sits just under the element, centred on the
  // picture, and is kept inside the board and inside the window.
  function openOptions(image, element, outlineNode) {
    openerRef.current = outlineNode;
    const frame = outlineNode.closest('.pin-frame').getBoundingClientRect();
    const board = outlineNode.closest('.moodboard').getBoundingClientRect();
    const width = Math.min(CARD_WIDTH, window.innerWidth - 24);
    let left = frame.left + frame.width / 2 - width / 2;
    left = Math.min(left, board.right - 8 - width); // not past the board's right edge
    left = Math.max(left, board.left + 8); // nor its left edge
    left = Math.max(12, Math.min(left, window.innerWidth - 12 - width)); // and always on the screen
    // box[3] is the element's bottom edge, from 0 at the top of the picture to 1 at the bottom
    const top = Math.max(12, frame.top + element.box[3] * frame.height + 8);
    setOpen({ imageId: image.id, elementId: element.id, left, top });
  }

  // The furniture to choose from for one element, closest first. Each option is
  // { type, name, size, image, note }.
  function optionsFor(image, element) {
    const options = [];
    // 1. The 3D model made from this very picture, when this element is the one it was made from.
    const made = modelOf(image);
    if (made && element.is_target) {
      options.push({ ...made, note: 'Made from this picture' });
    }
    // 2. Catalog furniture. The group ("seating", "storage") comes from the file; if it is
    //    missing, take it from a catalog piece of the same kind.
    const sameKind = CATALOG.find((item) => item.type === element.kind);
    const group = element.group || (sameKind ? sameKind.category : null);
    const word = element.kind.replace('_', ' '); // 'coffee_table' -> 'coffee table'
    // How close a catalog piece is: 0 the same kind, 1 the kind is in its name, 2 only the same group.
    function distance(item) {
      if (item.type === element.kind) return 0;
      if (item.type.includes(element.kind) || item.name.toLowerCase().includes(word)) return 1;
      return 2;
    }
    CATALOG.filter((item) => item.type === element.kind || item.category === group)
      .sort((a, b) => distance(a) - distance(b)) // sort keeps the catalog's order among equals
      .forEach((item) => options.push(item));
    return options;
  }

  // Add the chosen furniture the same way every other Add in the app does, then close the card.
  function chooseOption(option) {
    onAddItem(option.type);
    setOpen(null);
  }

  // The 3D model made from a pin, if there is one.
  function modelOf(image) {
    return pinModels.find((candidate) => candidate.pinId === image.id);
  }

  // A pin matches the search if every typed word is in its description, its tags
  // or the name of the furniture made from it ("blue sofa" finds a pin tagged both).
  const words = search.toLowerCase().split(' ').filter(Boolean);
  const shownImages = moodboard.images.filter((image) => {
    if (filter === 'picked' && !pickedIds.includes(image.id)) return false;
    if (filter === '3d' && !modelOf(image)) return false;
    const model = modelOf(image);
    const found = (elementsByPin[image.id] || []).map((element) => element.label).join(' ');
    const text = `${image.description} ${image.tags || ''} ${model ? model.name : ''} ${found}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  const filters = [
    { id: 'all', name: 'All', count: moodboard.images.length },
    { id: 'picked', name: 'Picked', count: pickedIds.length },
    { id: '3d', name: 'In 3D', count: moodboard.images.filter(modelOf).length },
  ];
  // "Explore" opens a Pinterest search for the typed words (or a general one) in a new tab.
  const exploreUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(search.trim() || 'small apartment interior')}`;

  return (
    <section className="panel moodboard" aria-label="Moodboard">
      <header className="board-header">
        <div>
          <h1>{isPinterest ? moodboard.boardName : 'Moodboard'}</h1>
          {/* Where the pins come from. How many there are, and how many are picked, is on the filters below. */}
          <p className="board-header__meta">
            {isPinterest ? (
              <a href={moodboard.boardUrl} target="_blank" rel="noreferrer">
                {moodboard.owner} on Pinterest
              </a>
            ) : (
              'Sample photos'
            )}
          </p>
        </div>
        <div className="board-header__actions">
          <Button
            variant="secondary"
            icon="pin"
            aria-label={isPinterest ? 'Change Pinterest board' : 'Connect a Pinterest board'}
            title={isPinterest ? 'Change Pinterest board' : 'Connect a Pinterest board'}
            onClick={onConnect}
          />
          <AccountButton user={user} onLogOut={onLogOut} />
        </div>
      </header>

      {isPinterest && !user && (
        <p className="board-notice">
          <Link to="/login">Log in</Link> to keep this board and your picks.
        </p>
      )}

      <div className="board-tools">
        <label className="strip-search board-tools__search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search this board"
            aria-label="Search this board"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <a className="board-tools__explore" href={exploreUrl} target="_blank" rel="noreferrer" title="Find more on Pinterest">
          Explore
          <Icon name="open" size={16} />
        </a>
      </div>
      <div className="strip-groups" role="tablist" aria-label="Which pins to show">
        {filters.map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            role="tab"
            aria-selected={candidate.id === filter}
            className={candidate.id === filter ? 'strip-group is-current' : 'strip-group'}
            onClick={() => setFilter(candidate.id)}
          >
            {candidate.name} <span className="board-tools__count">{candidate.count}</span>
          </button>
        ))}
      </div>

      {/* Shown once above the board, only when some picture has furniture to choose from. */}
      {Object.keys(elementsByPin).length > 0 && (
        <p className="board-note">
          Simpler pictures work best. A picture with one piece of furniture, seen from the front, gives the closest match.
        </p>
      )}

      {shownImages.length === 0 && (
        <p className="board-empty">
          {filter === 'picked' && words.length === 0
            ? "You haven’t picked any pins yet. Press a pin you like and it will show up here."
            : "We couldn’t find a pin that matches. You can try another word, or press Explore to look for more on Pinterest."}
        </p>
      )}

      <div className="pin-grid">
        {shownImages.map((image) => {
          const isPicked = pickedIds.includes(image.id);
          const model = modelOf(image);
          // Biggest first, so a small piece (a lamp) is drawn last and sits on top of a big one (a rug).
          const elements = [...(elementsByPin[image.id] || [])].sort((a, b) => {
            const area = (element) => (element.box[2] - element.box[0]) * (element.box[3] - element.box[1]);
            return area(b) - area(a);
          });
          return (
            <div className="pin-card" key={image.id}>
              {/* the frame holds the picture (a button that picks the pin) and, over it, the outlines */}
              <div className="pin-frame">
              <button
                type="button"
                className={isPicked ? 'pin is-picked' : 'pin'}
                aria-pressed={isPicked}
                onClick={() => onTogglePick(image.id)}
              >
                <span className="pin__image" style={{ background: image.color }}>
                  <img
                    src={asset(image.src)}
                    alt={image.description}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                  />
                  {/* On hover: everything but the target object fades, and the object is outlined.
                      The path is the whole image with the object's shape cut out of it. */}
                  {/* Only for a picture without a list of elements: the one target, as before. */}
                  {elements.length === 0 && model && model.outline && (
                    <svg className="pin__focus" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        className="pin__veil"
                        fillRule="evenodd"
                        d={`M0 0H100V100H0Z M${model.outline.map(([x, y]) => `${x * 100} ${y * 100}`).join(' L')} Z`}
                      />
                      <polygon
                        className="pin__outline"
                        points={model.outline.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                      />
                    </svg>
                  )}
                </span>
              </button>
              {/* One outline for each piece of furniture found. An outline is a button: it takes
                  the keyboard (tabIndex), says what it is (aria-label) and opens the card of options.
                  The viewBox is 100 by 100, so a point at 0.5 of the picture is drawn at 50. */}
              {elements.length > 0 && (
                <svg className="pin-elements" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {elements.map((element) => {
                    const isOpen = open !== null && open.elementId === element.id;
                    return (
                      <polygon
                        key={element.id}
                        className={isOpen ? 'pin-element is-open' : 'pin-element'}
                        points={element.outline.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                        role="button"
                        tabIndex={0}
                        aria-label={`${element.label} in this picture`}
                        aria-haspopup="dialog"
                        aria-expanded={isOpen}
                        onClick={(event) => (isOpen ? setOpen(null) : openOptions(image, element, event.currentTarget))}
                        onKeyDown={(event) => {
                          // a real button answers Enter and Space, so this one does too
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openOptions(image, element, event.currentTarget);
                          }
                        }}
                      >
                        {/* the browser shows this as a tooltip */}
                        <title>{`${element.label}. Choose furniture like it.`}</title>
                      </polygon>
                    );
                  })}
                </svg>
              )}
              </div>
              {/* Shown under the image on hover: what the photo is, and a button that adds its object in 3D. */}
              <div className="pin__under">
                <span className="pin__title">{image.description}</span>
                {model && (
                  <button
                    type="button"
                    className="pin__add"
                    title={`Add this ${model.name.toLowerCase()} in 3D`}
                    aria-label={`Add this ${model.name.toLowerCase()} in 3D`}
                    onClick={() => onAddItem(model.type)}
                  >
                    <img src={asset(model.image)} alt="" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* The card of furniture options. createPortal draws it at the end of the page instead
          of inside the board, so the board's columns and scrolling cannot cut it off. */}
      {open &&
        (() => {
          const image = moodboard.images.find((candidate) => candidate.id === open.imageId);
          const element = (elementsByPin[open.imageId] || []).find((candidate) => candidate.id === open.elementId);
          if (!image || !element) return null;
          const options = optionsFor(image, element);
          return createPortal(
            <div
              ref={cardRef}
              className="pin-options"
              role="dialog"
              aria-label={`Furniture for the ${element.label.toLowerCase()} in this picture`}
              style={{ left: open.left, top: open.top }}
            >
              <header className="pin-options__head">
                <h2>{element.label}</h2>
                <Button variant="white" size="sm" icon="close" aria-label="Close" onClick={() => setOpen(null)} />
              </header>
              {options.length > 0 ? (
                <>
                  <p className="pin-options__lead">Choose the one that looks closest to the picture.</p>
                  <ul className="pin-options__list">
                    {options.map((option) => (
                      <li className="pin-options__row" key={option.type}>
                        <span className="pin-options__thumb">
                          <img src={asset(option.image)} alt="" />
                        </span>
                        <span className="pin-options__text">
                          <strong>{option.name}</strong>
                          {option.note && <span>{option.note}</span>}
                          <span>{sizeWords(option.size)}</span>
                        </span>
                        <Button variant="primary" size="sm" aria-label={`Add ${option.name}`} onClick={() => chooseOption(option)}>
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="pin-options__lead">
                  We don’t have a {element.label.toLowerCase()} like this one yet. You can pick the closest piece from the
                  furniture under your room.
                </p>
              )}
            </div>,
            document.body
          );
        })()}
    </section>
  );
}

export default MoodboardPanel;
