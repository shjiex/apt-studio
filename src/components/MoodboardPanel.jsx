import { useState } from 'react';
import { Link } from 'react-router-dom';
import AccountButton from './AccountButton.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { asset } from '../lib/paths.js';

// The inspiration board on the right, laid out like a Pinterest board:
// a big board name, then pins in columns. Pressing a pin picks it, shown by a
// border inside the image.
// Each image aims at ONE object. If a 3D model was made from it, a frame shows
// where that object is and a button under the image puts it in the room.
// Above the pins: a search field, three filters, and a link out to Pinterest to find more.
function MoodboardPanel({ moodboard, pickedIds, pinModels, user, onTogglePick, onAddItem, onConnect, onLogOut }) {
  const isPinterest = moodboard.source === 'pinterest';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'picked' or '3d'

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
    const text = `${image.description} ${image.tags || ''} ${model ? model.name : ''}`.toLowerCase();
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
          return (
            <div className="pin-card" key={image.id}>
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
                  {model && model.outline && (
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
    </section>
  );
}

export default MoodboardPanel;
