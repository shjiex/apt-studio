import Icon from './Icon.jsx';
import { useSlidingThumb } from '../lib/useSlidingThumb.js';

// The three views: the plan (2D), the room seen from outside (3D), and standing inside it.
const OPTIONS = [
  { id: '2d', label: '2D', icon: 'grid' },
  { id: '3d', label: '3D', icon: 'cube' },
  { id: 'inside', label: 'Inside', icon: 'eye', title: 'Stand in the room' },
];

// The view switch. The dark pill behind the chosen option is one element (the
// "thumb") that slides from the old option to the new one, and stretches a little
// on the way, like a drop of liquid, in place of a pill that blinks off and on.
// Finding where the thumb belongs, and the stretch, are in lib/useSlidingThumb.js,
// which the smaller choice rows (Segmented.jsx) use too.
function ViewSwitch({ view, onChange }) {
  const { thumb, thumbRef, remember } = useSlidingThumb(view);

  return (
    <div className="view-switch" role="tablist" aria-label="Room view">
      {thumb && <span ref={thumbRef} className="view-switch__thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          ref={remember(option.id)}
          type="button"
          role="tab"
          aria-selected={view === option.id}
          className={view === option.id ? 'view-switch__option is-current' : 'view-switch__option'}
          title={option.title}
          onClick={() => onChange(option.id)}
        >
          <Icon name={option.icon} size={16} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ViewSwitch;
