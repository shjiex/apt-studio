import Icon from './Icon.jsx';
import { useSlidingThumb } from '../lib/useSlidingThumb.js';

// The three views: the plan (2D), the room seen from outside (3D), and standing inside it.
const OPTIONS = [
  { id: '2d', name: '2D', icon: 'grid' },
  { id: '3d', name: '3D', icon: 'cube' },
  { id: 'inside', name: 'Inside', icon: 'eye' },
];

// The view switch. It stands on the stage as a column of three icons, as drawn in
// Figma. Each icon has its name as a tooltip (title) and for screen readers (aria-label).
// The dark pill behind the chosen option is one element (the
// "thumb") that slides from the old option to the new one, and stretches a little
// on the way, like a drop of liquid, in place of a pill that blinks off and on.
// Finding where the thumb belongs, and the stretch, are in lib/useSlidingThumb.js,
// which the smaller choice rows (Segmented.jsx) use too.
function ViewSwitch({ view, onChange }) {
  const { thumb, thumbRef, remember } = useSlidingThumb(view);

  return (
    <div className="view-switch" role="tablist" aria-label="Room view" aria-orientation="vertical">
      {thumb && <span ref={thumbRef} className="view-switch__thumb" style={{ top: thumb.top, height: thumb.height }} aria-hidden="true" />}
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          ref={remember(option.id)}
          type="button"
          role="tab"
          aria-selected={view === option.id}
          className={view === option.id ? 'view-switch__option is-current' : 'view-switch__option'}
          aria-label={option.name}
          title={option.name}
          onClick={() => onChange(option.id)}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
    </div>
  );
}

export default ViewSwitch;
