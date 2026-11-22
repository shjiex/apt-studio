import { useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// The three views: the plan (2D), the room seen from outside (3D), and standing inside it.
const OPTIONS = [
  { id: '2d', label: '2D', icon: 'grid' },
  { id: '3d', label: '3D', icon: 'cube' },
  { id: 'inside', label: 'Inside', icon: 'eye', title: 'Stand in the room' },
];

// The view switch. The dark pill behind the chosen option is one element (the
// "thumb") that slides from the old option to the new one, and stretches a little
// on the way, like a drop of liquid, in place of a pill that blinks off and on.
function ViewSwitch({ view, onChange }) {
  const buttons = useRef({}); // the three buttons, by id, so they can be measured
  const thumbRef = useRef(null);
  const [thumb, setThumb] = useState(null); // where the chosen option is: { left, width } in pixels

  // Measure the chosen button and move the thumb onto it. useLayoutEffect runs
  // before the browser paints, so the thumb never shows in the wrong place.
  useLayoutEffect(() => {
    function measure() {
      const button = buttons.current[view];
      if (button) setThumb({ left: button.offsetLeft, width: button.offsetWidth });
    }
    measure();
    // the labels get wider when the web font arrives, so measure once more then
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [view]);

  // The stretch: wider and flatter a third of the way through, then back.
  // Skipped for people who have asked their system for less motion.
  const isFirst = useRef(true);
  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false; // nothing moves when the page first opens
      return;
    }
    const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (thumbRef.current && thumbRef.current.animate && !lessMotion) {
      thumbRef.current.animate([{ scale: '1 1' }, { scale: '1.14 0.86', offset: 0.35 }, { scale: '1 1' }], {
        duration: 420,
        easing: 'ease-out',
      });
    }
  }, [view]);

  return (
    <div className="view-switch" role="tablist" aria-label="Room view">
      {thumb && <span ref={thumbRef} className="view-switch__thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          ref={(element) => (buttons.current[option.id] = element)}
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
