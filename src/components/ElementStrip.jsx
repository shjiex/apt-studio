import { useState } from 'react';
import ElementTile from './ElementTile.jsx';
import Icon from './Icon.jsx';
import { useSlidingThumb } from '../lib/useSlidingThumb.js';

// The groups shown as chips above the tiles. Each lists the catalog categories it holds.
const GROUPS = [
  { id: 'all', name: 'All', categories: null },
  { id: 'board', name: 'From your board', categories: null },
  { id: 'seating', name: 'Seating', categories: ['seating'] },
  { id: 'tables', name: 'Desks and tables', categories: ['desks'] },
  { id: 'storage', name: 'Storage', categories: ['storage'] },
  { id: 'beds', name: 'Beds', categories: ['beds'] },
  { id: 'lighting', name: 'Lighting', categories: ['lighting'] },
  { id: 'decor', name: 'Rugs and plants', categories: ['decor', 'plants'] },
];

// The furniture to add: a search field, a row of group chips, then the tiles.
// Typing in the search field looks through every group by name.
// layout is 'row' (one line of tiles under the room) or 'grid' (tiles in rows, in the
// tools section at the side).
// The dark pill behind the chosen chip is one element that flows from chip to chip
// (lib/useSlidingThumb.js), as on the view switch.
function ElementStrip({ items, pieces, onAdd, layout = 'row' }) {
  const [groupId, setGroupId] = useState('all');
  const [search, setSearch] = useState('');
  const hasBoardItems = items.some((item) => item.pinId);

  // "From your board" only shows when there is furniture made from moodboard images.
  const groups = GROUPS.filter((group) => group.id !== 'board' || hasBoardItems);
  const group = groups.find((candidate) => candidate.id === groupId) || groups[0];

  const words = search.trim().toLowerCase();
  // while searching no chip is chosen, so the thumb has nowhere to sit and is not drawn
  const { thumb, thumbRef, remember } = useSlidingThumb(words ? null : group.id, groups.length);
  const shownItems = items.filter((item) => {
    // While searching, the chips step aside: a name match from any group shows.
    if (words) return item.name.toLowerCase().includes(words);
    if (group.id === 'all') return true;
    if (group.id === 'board') return Boolean(item.pinId);
    return group.categories.includes(item.category);
  });

  return (
    <div className={`strip-area strip-area--${layout}`}>
      <div className="strip-tools">
        <label className="strip-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search furniture"
            aria-label="Search furniture"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="strip-groups strip-groups--glass" role="tablist" aria-label="Furniture groups">
          {thumb && !words && (
            <span ref={thumbRef} className="strip-groups__thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />
          )}
          {groups.map((candidate) => {
            const isCurrent = !words && candidate.id === group.id;
            return (
              <button
                type="button"
                key={candidate.id}
                ref={remember(candidate.id)}
                role="tab"
                aria-selected={isCurrent}
                className={isCurrent ? 'strip-group is-current' : 'strip-group'}
                onClick={() => {
                  setGroupId(candidate.id);
                  setSearch('');
                }}
              >
                {candidate.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="strip" aria-label="Furniture to add">
        {shownItems.length === 0 && <p className="strip__empty">Nothing called "{search.trim()}". Try sofa, desk or lamp.</p>}
        {shownItems.map((item) => (
          <ElementTile
            key={item.type}
            item={item}
            count={pieces.filter((piece) => piece.type === item.type).length}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

export default ElementStrip;
