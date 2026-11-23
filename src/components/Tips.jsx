import { useLayoutEffect, useState } from 'react';
import Button from './Button.jsx';

// A short tour of the main controls. Each tip is a small card that sits next to the
// control it is about, with a ring around that control, so the rest of the screen
// stays in view. `target` is a CSS selector for the control, and `side` says on
// which side of it the card goes.
const TIPS = [
  {
    target: '.view-switch',
    side: 'left',
    title: 'Three ways to see your room',
    text: 'You can look at the plan from above, turn the room around in 3D, or stand inside it.',
  },
  {
    target: '.stage canvas',
    side: 'inside',
    title: 'Move things in the room',
    text: 'Click a piece to select it, then drag it. Double click the floor, a wall, a door or a window to change it. On the plan, the round arrows outside the walls resize the room.',
  },
  {
    target: '.stage__tools',
    side: 'top',
    title: 'Grid, lighting, and floor and walls',
    text: 'These open beside the room. Lighting sets the time of day, and floor and walls is where you add windows and doors.',
  },
  {
    target: '.strip-area, .tools',
    side: 'top',
    title: 'Add furniture',
    text: 'Press a piece to add it, or drag it to where you’d like it. We tell you straight away whether it fits.',
  },
  {
    target: '.stage__score',
    side: 'left',
    title: 'Your room score',
    text: 'It checks things like walkways and where the bed stands, and suggests what to improve first.',
  },
  {
    target: '.side',
    side: 'left',
    title: 'Your moodboard',
    text: 'Connect a Pinterest board and pick the pictures you like. Furniture we found in a picture can be added to your room.',
  },
];

const CARD_WIDTH = 300;

// Where the card goes for one tip, as { left, top } (or { left, bottom }) in pixels on the screen, and the
// box of the control it is about. null if that control is not on screen right now.
function placeFor(tip) {
  const element = document.querySelector(tip.target);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0) return null;
  let left = box.left + box.width / 2 - CARD_WIDTH / 2;
  let top = box.bottom + 12;
  if (tip.side === 'left') {
    left = box.left - CARD_WIDTH - 16;
    top = box.top;
  }
  // above the control: the card's bottom edge is given, so it sits right over the
  // control whatever its own height turns out to be
  if (tip.side === 'top') return { left: Math.min(Math.max(left, 12), window.innerWidth - CARD_WIDTH - 12), bottom: window.innerHeight - box.top + 16, box };
  if (tip.side === 'inside') top = box.top + box.height / 2 - 85;
  // keep the whole card on the screen
  left = Math.min(Math.max(left, 12), window.innerWidth - CARD_WIDTH - 12);
  top = Math.min(Math.max(top, 12), window.innerHeight - 190);
  return { left, top, box };
}

// onDone is called when the tour ends or is skipped.
function Tips({ onDone }) {
  const [index, setIndex] = useState(0);
  const [place, setPlace] = useState(null);

  // Find the control for this tip and put the card beside it. Measured before the
  // browser paints, and again when the window changes size. A tip whose control is
  // not on screen (the moodboard, when it is closed) is skipped.
  useLayoutEffect(() => {
    function measure() {
      const found = placeFor(TIPS[index]);
      if (found) setPlace(found);
      else if (index < TIPS.length - 1) setIndex(index + 1);
      else onDone();
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!place) return null;
  const tip = TIPS[index];
  const isLast = index === TIPS.length - 1;

  return (
    <>
      {/* the ring around the control this tip is about */}
      <div
        className="tip__ring"
        style={{ left: place.box.left - 6, top: place.box.top - 6, width: place.box.width + 12, height: place.box.height + 12 }}
        aria-hidden="true"
      />
      <div className="tip" role="dialog" aria-label={tip.title} style={{ left: place.left, top: place.top, bottom: place.bottom, width: CARD_WIDTH }}>
        <p className="tip__count">
          {index + 1} of {TIPS.length}
        </p>
        <strong>{tip.title}</strong>
        <p>{tip.text}</p>
        <div className="tip__actions">
          <button type="button" className="room-bar__link" onClick={onDone}>
            Skip the tour
          </button>
          <Button variant="primary" size="sm" onClick={() => (isLast ? onDone() : setIndex(index + 1))}>
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </>
  );
}

export default Tips;
