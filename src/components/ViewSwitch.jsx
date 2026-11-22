import Icon from './Icon.jsx';

// The 2D / 3D switch that sits on top of the stage.
function ViewSwitch({ view, onChange }) {
  return (
    <div className="view-switch" role="tablist" aria-label="Room view">
      <button
        type="button"
        role="tab"
        aria-selected={view === '2d'}
        className={view === '2d' ? 'view-switch__option is-current' : 'view-switch__option'}
        onClick={() => onChange('2d')}
      >
        <Icon name="grid" size={16} />
        2D
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === '3d'}
        className={view === '3d' ? 'view-switch__option is-current' : 'view-switch__option'}
        onClick={() => onChange('3d')}
      >
        <Icon name="cube" size={16} />
        3D
      </button>
    </div>
  );
}

export default ViewSwitch;
