import Icon from './Icon.jsx';
import MoodboardPanel from './MoodboardPanel.jsx';
import ShopList from './ShopList.jsx';

const TABS = [
  { id: 'moodboard', name: 'Moodboard' },
  { id: 'shop', name: 'Shop' },
];

// The section to the right of the room, as drawn in Figma (frame 216:4506).
// Its two tabs are written as headings: the open one in ink, the other in grey.
// The cross at the end closes the section, which gives the room the whole width.
// A button in the top bar opens it again.
function SidePanel({ tab, onTab, onClose, pieces, moodboard, pickedIds, pinModels, user, onTogglePick, onAddItem, onConnect, onSelectPiece }) {
  return (
    <section className="panel side" aria-label={tab === 'shop' ? 'Shop list' : 'Moodboard'}>
      <header className="side__head">
        <div className="side__tabs" role="tablist" aria-label="Moodboard or shop list">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === tab}
              className={entry.id === tab ? 'side__tab is-current' : 'side__tab'}
              onClick={() => onTab(entry.id)}
            >
              {entry.name}
            </button>
          ))}
        </div>
        <button type="button" className="side__close" aria-label="Close this section" title="Close this section" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </header>

      {tab === 'shop' ? (
        <ShopList pieces={pieces} onSelect={onSelectPiece} />
      ) : (
        <MoodboardPanel
          moodboard={moodboard}
          pickedIds={pickedIds}
          pinModels={pinModels}
          user={user}
          onTogglePick={onTogglePick}
          onAddItem={onAddItem}
          onConnect={onConnect}
        />
      )}
    </section>
  );
}

export default SidePanel;
