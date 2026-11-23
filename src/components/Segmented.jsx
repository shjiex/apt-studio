import { useSlidingThumb } from '../lib/useSlidingThumb.js';

// A row of choices where one is chosen, such as which wall a door is on. The
// choices sit together on one grey track, and a dark "thumb" slides from the old
// choice to the new one (the sliding is in lib/useSlidingThumb.js).
//
//   options      the choices, each as [id, words]: [['oak', 'Oak boards'], ['photo', 'Your photo']]
//   value        the id of the chosen one
//   onChange     called with the id of the choice that was pressed
//   label        what the row is for, read out by screen readers ("Floor")
//   optionClass  an extra class for every choice, for its padding or lettering
function Segmented({ options, value, onChange, label, optionClass }) {
  const { thumb, thumbRef, remember } = useSlidingThumb(value);

  return (
    <div className="light__choices" role="group" aria-label={label}>
      {/* the thumb is not a choice: it is hidden from screen readers and sits behind the words */}
      {thumb && (
        <span ref={thumbRef} className="segmented__thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />
      )}
      {options.map(([id, words]) => {
        const isChosen = id === value;
        // the class names this choice gets, without the ones that do not apply
        const classes = ['light__choice', optionClass, isChosen && 'is-current'].filter(Boolean).join(' ');
        return (
          <button
            key={String(id)}
            ref={remember(id)}
            type="button"
            className={classes}
            aria-pressed={isChosen}
            onClick={() => onChange(id)}
          >
            {words}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
