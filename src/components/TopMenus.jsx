import { useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Segmented from './Segmented.jsx';

// The two round glass buttons at the right of the top bar, each with a small card
// under it. Whether a card is open is kept in Workspace, so only one is open at a time.

// Preferences (the sliders icon): how the app shows things. Nothing here changes the room.
export function PreferencesMenu({ isOpen, onToggle, units, onUnits, layout, onLayout }) {
  return (
    <div className="feng">
      <Button variant="glass" icon="sliders" aria-label="Preferences" aria-expanded={isOpen} title="Preferences" onClick={onToggle} />
      {isOpen && (
        <div className="feng__card menu-card">
          <div className="light__row">
            <strong>
              <Icon name="ruler" size={16} />
              Measurements
            </strong>
            <Segmented
              label="Measurements"
              options={[
                ['metric', 'Metric'],
                ['imperial', 'Imperial'],
              ]}
              value={units}
              onChange={onUnits}
            />
          </div>
          <div className="light__row">
            <strong>
              <Icon name="sidebar" size={16} />
              Tools
            </strong>
            <Segmented
              label="Where the tools sit"
              options={[
                ['stage', 'On the room'],
                ['side', 'At the side'],
              ]}
              value={layout}
              onChange={onLayout}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Settings (the gear icon): things you do once in a while.
export function SettingsMenu({ isOpen, onToggle, onYourFurniture, onShowTips, onStartOver }) {
  const [isAsking, setIsAsking] = useState(false); // is "Start over" waiting for a yes or no?

  return (
    <div className="feng">
      <Button variant="glass" icon="settings" aria-label="Settings" aria-expanded={isOpen} title="Settings" onClick={onToggle} />
      {isOpen && (
        <div className="feng__card menu-card download-menu">
          <button type="button" className="download-menu__choice" onClick={onYourFurniture}>
            <Icon name="image" size={18} />
            <strong>Your furniture</strong>
          </button>
          <button type="button" className="download-menu__choice" onClick={onShowTips}>
            <Icon name="help" size={18} />
            <strong>Show the tips</strong>
          </button>
          {isAsking ? (
            <div className="download-menu__choice">
              <strong>Clear every room?</strong>
              <span className="menu-card__ask">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setIsAsking(false);
                    onStartOver();
                  }}
                >
                  Yes, clear
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsAsking(false)}>
                  Keep
                </Button>
              </span>
            </div>
          ) : (
            <button type="button" className="download-menu__choice" onClick={() => setIsAsking(true)}>
              <Icon name="trash" size={18} />
              <strong>Start over</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
