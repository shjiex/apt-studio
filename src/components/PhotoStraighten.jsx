import { useRef, useState } from 'react';
import Button from './Button.jsx';
import NumberField from './NumberField.jsx';
import { canvasToTile } from '../lib/surface.js';
import { straightenPhoto } from '../lib/straighten.js';
import { bigUnit, fromBig, toBig } from '../lib/units.js';

const CORNER_NAMES = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];

// A dialog shown after you choose a floor or wall photo. You drag four corners
// onto a rectangle you can measure and type its size. The app then straightens
// that rectangle (see lib/straighten.js) and uses it as the repeating picture.
// A photo shot square on needs no dragging: the corners start on the whole photo.
// `secondName` is 'Deep' for a floor and 'Up' for a wall.
// `units` is 'metric' or 'imperial': the two sizes are typed in metres or in feet.
function PhotoStraighten({ image, secondName, startSpan, units, onUse, onCancel }) {
  // The corners as fractions of the photo: [0, 0] is its top left, [1, 1] its bottom right.
  const [corners, setCorners] = useState([[0, 0], [1, 0], [1, 1], [0, 1]]);
  const [across, setAcross] = useState(String(toBig(startSpan, units)));
  const [second, setSecond] = useState(String(toBig(startSpan / (image.width / image.height), units)));
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(null); // which corner is held, 0 to 3
  const frameRef = useRef(null);

  function handleDown(index, event) {
    event.target.setPointerCapture(event.pointerId); // keep getting moves even off the handle
    setDragging(index);
  }

  // Move the held corner to the pointer, as a fraction of the photo, kept inside it.
  function handleMove(event) {
    if (dragging === null) return;
    const frame = frameRef.current.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - frame.left) / frame.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - frame.top) / frame.height, 0), 1);
    setCorners(corners.map((corner, index) => (index === dragging ? [x, y] : corner)));
  }

  // The same with the arrow keys, one hundredth of the photo per press.
  function handleKey(index, event) {
    const steps = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    setCorners(
      corners.map((corner, cornerIndex) =>
        cornerIndex === index
          ? [Math.min(Math.max(corner[0] + step[0], 0), 1), Math.min(Math.max(corner[1] + step[1], 0), 1)]
          : corner
      )
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    // both in metres, whichever unit was typed
    const width = fromBig(Number(across), units);
    const depth = fromBig(Number(second), units);
    // 0.1 and 10 m, as they come out when typed in the chosen unit (0.3 ft is 0.09 m)
    const smallest = fromBig(toBig(0.1, units), units);
    const largest = fromBig(toBig(10, units), units);
    if (!(width >= smallest && width <= largest) || !(depth >= smallest && depth <= largest)) {
      setError(`Enter both sizes, between ${toBig(0.1, units)} and ${toBig(10, units)} ${bigUnit(units)}.`);
      return;
    }
    const flat = straightenPhoto(image, corners, width / depth);
    onUse({ ...canvasToTile(flat), span: width });
  }

  const points = corners.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');

  return (
    <div className="scrim" onClick={onCancel}>
      <form
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="straighten-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="straighten-title">Mark a rectangle</h2>
        <p className="dialog__body">
          Drag the four corners onto a rectangle you can measure, then type its size.
        </p>

        <div className="straighten" ref={frameRef} onPointerMove={handleMove} onPointerUp={() => setDragging(null)}>
          <img src={image.src} alt="The photo you chose" draggable="false" />
          {/* the marked shape, drawn over the photo */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={points} />
          </svg>
          {corners.map(([x, y], index) => (
            <button
              type="button"
              key={CORNER_NAMES[index]}
              className="straighten__corner"
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              aria-label={`${CORNER_NAMES[index]} corner`}
              onPointerDown={(event) => handleDown(index, event)}
              onKeyDown={(event) => handleKey(index, event)}
            />
          ))}
        </div>

        <div className="dialog__fields dialog__fields--two">
          <NumberField id="straighten-across" label="Across" unit={bigUnit(units)} value={across} onChange={setAcross} />
          <NumberField id="straighten-second" label={secondName} unit={bigUnit(units)} value={second} onChange={setSecond} />
        </div>
        {error && <p className="field__error">{error}</p>}

        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" fill type="submit">
            Use this
          </Button>
        </div>
      </form>
    </div>
  );
}

export default PhotoStraighten;
