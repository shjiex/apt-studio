import { useState } from 'react';
import Icon from './Icon.jsx';
import { formatRoom } from '../lib/room.js';
import { kindOf } from '../lib/rooms.js';

// The row under the top bar: the home's name, one tab per room, and a + to add a room.
// Each tab has the icon of its kind of room. Pressing the open room's tab opens the
// room dialog (name, kind, size). Pressing the home's name lets you retype it.
// At the far end, "Start over" clears the saved home after asking once.
function RoomTabs({ homeName, rooms, activeRoomId, onRenameHome, onPick, onEdit, onAdd, onStartOver }) {
  const [isNaming, setIsNaming] = useState(false);
  const [isAsking, setIsAsking] = useState(false); // is "Start over" waiting for a yes or no?
  const [draft, setDraft] = useState(homeName);

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
          <Icon name="home" size={16} />
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
          <Icon name="home" size={16} />
          {homeName}
        </button>
      )}

      {/* The glass pill holds the room tabs and the + button. Only the tabs are in the
          tab list, because a tab list may hold nothing but tabs. */}
      <div className="room-tabs">
        <div className="room-tabs__list" role="tablist" aria-label="Rooms in this home">
          {rooms.map((entry) => {
            const isOpen = entry.id === activeRoomId;
            return (
              <button
                type="button"
                key={entry.id}
                role="tab"
                aria-selected={isOpen}
                className={isOpen ? 'room-tab is-current' : 'room-tab'}
                title={isOpen ? 'Change this room' : `Open ${entry.name}`}
                onClick={() => (isOpen ? onEdit() : onPick(entry.id))}
              >
                <Icon name={kindOf(entry.kind).icon} size={16} />
                {entry.name}
                {/* the open room also shows its size */}
                {isOpen && <span className="room-tab__size">{formatRoom(entry.size)}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="room-tab room-tab--add" aria-label="Add a room" title="Add a room" onClick={onAdd}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {isAsking ? (
        <span className="room-bar__ask">
          Clear every room?
          <button
            type="button"
            className="room-bar__link room-bar__link--danger"
            onClick={() => {
              onStartOver();
              setIsAsking(false);
            }}
          >
            Yes, clear
          </button>
          <button type="button" className="room-bar__link" onClick={() => setIsAsking(false)}>
            Keep
          </button>
        </span>
      ) : (
        <button type="button" className="room-bar__link room-bar__end" onClick={() => setIsAsking(true)}>
          Start over
        </button>
      )}
    </nav>
  );
}

export default RoomTabs;
