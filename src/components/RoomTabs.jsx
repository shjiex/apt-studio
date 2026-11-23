import { useState } from 'react';
import Icon from './Icon.jsx';
import { kindOf } from '../lib/rooms.js';
import { useSlidingThumb } from '../lib/useSlidingThumb.js';

// In the top bar, after the logo: the home's name, then one tab per room and a + to
// add a room. Both are glass pills, as drawn in Figma (frame 216:4506).
// Each tab has the icon of its kind of room. Pressing the open room's tab opens the
// room dialog (name, kind, size). Pressing the home's name lets you retype it.
// The white pill behind the open room is one element (the "thumb") that flows from
// tab to tab. lib/useSlidingThumb.js finds where it belongs.
function RoomTabs({ homeName, rooms, activeRoomId, onRenameHome, onPick, onEdit, onAdd }) {
  const [isNaming, setIsNaming] = useState(false);
  const [draft, setDraft] = useState(homeName);
  // the room names, joined: when one changes, its tab changes width and the thumb is measured again
  const names = rooms.map((entry) => entry.name).join('|');
  const { thumb, thumbRef, remember } = useSlidingThumb(activeRoomId, names);

  function finishNaming() {
    onRenameHome(draft.trim() || homeName);
    setIsNaming(false);
  }

  return (
    <nav className="room-bar" aria-label="Rooms">
      {isNaming ? (
        <form
          className="home-chip is-naming"
          onSubmit={(event) => {
            event.preventDefault();
            finishNaming();
          }}
        >
          <Icon name="door" size={16} />
          <input
            aria-label="Name of your home"
            value={draft}
            maxLength={24}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={finishNaming}
          />
        </form>
      ) : (
        <button
          type="button"
          className="home-chip"
          title="Rename your home"
          onClick={() => {
            setDraft(homeName);
            setIsNaming(true);
          }}
        >
          <Icon name="door" size={16} />
          {homeName}
        </button>
      )}

      {/* The glass pill holds the room tabs and the + button. Only the tabs are in the
          tab list, because a tab list may hold nothing but tabs. */}
      <div className="room-tabs">
        <div className="room-tabs__list" role="tablist" aria-label="Rooms in this home">
          {thumb && (
            <span ref={thumbRef} className="room-tabs__thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />
          )}
          {rooms.map((entry) => {
            const isOpen = entry.id === activeRoomId;
            return (
              <button
                type="button"
                key={entry.id}
                ref={remember(entry.id)}
                role="tab"
                aria-selected={isOpen}
                className={isOpen ? 'room-tab is-current' : 'room-tab'}
                title={isOpen ? 'Change this room' : `Open ${entry.name}`}
                onClick={() => (isOpen ? onEdit() : onPick(entry.id))}
              >
                <Icon name={kindOf(entry.kind).icon} size={16} />
                {entry.name}
              </button>
            );
          })}
        </div>
        <button type="button" className="room-tab room-tab--add" aria-label="Add a room" title="Add a room" onClick={onAdd}>
          <Icon name="plus" size={16} />
        </button>
      </div>
    </nav>
  );
}

export default RoomTabs;
