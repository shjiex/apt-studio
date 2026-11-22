import Icon from './Icon.jsx';

// Phones show one panel at a time. This bar switches between them.
function TabBar({ tab, onChange }) {
  return (
    <nav className="tab-bar" aria-label="Panels">
      <button type="button" className={tab === 'preview' ? 'is-current' : ''} onClick={() => onChange('preview')}>
        <Icon name="cube" />
        Preview
      </button>
      <button type="button" className={tab === 'moodboard' ? 'is-current' : ''} onClick={() => onChange('moodboard')}>
        <Icon name="image" />
        Moodboard
      </button>
    </nav>
  );
}

export default TabBar;
