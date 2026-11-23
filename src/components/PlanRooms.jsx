import { useEffect, useState } from 'react';
import Button from './Button.jsx';
import NumberField from './NumberField.jsx';
import { asset } from '../lib/paths.js';

// A dialog for taking the room's size from a floor plan. It reads the rooms
// that pipeline/plan2room.py found in a plan picture and draws each one over
// the picture. You pick your room and type ONE length you know. A picture has
// no scale, so that one length is what turns pixels into metres.
function PlanRooms({ room, onSave, onClose }) {
  const [plan, setPlan] = useState(null); // null while loading, false if there is no plan
  const [picked, setPicked] = useState(null); // the number of the chosen room
  const [across, setAcross] = useState(''); // what the person typed: the room's size left to right, in metres
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(asset('/plan/plan.json'))
      .then((response) => (response.ok ? response.json() : false))
      .then((data) => setPlan(data))
      .catch(() => setPlan(false));
  }, []);

  const pickedRoom = plan ? plan.rooms.find((candidate) => candidate.number === picked) : null;

  function handlePick(number) {
    setPicked(number);
    setError('');
    // If the plan file already knows its scale, fill the length in.
    const next = plan.rooms.find((candidate) => candidate.number === number);
    setAcross(plan.metres_per_pixel ? (next.across_px * plan.metres_per_pixel).toFixed(2) : '');
  }

  // The room is across_px wide and down_px long on the picture. The typed
  // width gives metres per pixel, and the same scale gives the length.
  const width = Number(across);
  const isWidthOk = across !== '' && !Number.isNaN(width) && width > 0;
  const length = pickedRoom && isWidthOk ? (width / pickedRoom.across_px) * pickedRoom.down_px : null;

  function handleSubmit(event) {
    event.preventDefault();
    if (!isWidthOk || width < 1.5 || width > 12 || length < 1.5 || length > 12) {
      setError('The app handles rooms from 1.5 to 12 m on each side');
      return;
    }
    // Round to the centimetre. The ceiling height is not on a plan, so it stays.
    onSave({ width: Math.round(width * 100) / 100, length: Math.round(length * 100) / 100, height: room.height });
  }

  return (
    <div className="scrim" onClick={onClose}>
      <form
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="plan-title">Room from a floor plan</h2>

        {plan === null && <p className="dialog__body">Looking…</p>}

        {plan === false && (
          <p className="dialog__body">
            We haven’t read a floor plan yet. Run <code>python3 pipeline/plan2room.py your-plan.jpg --app public/plan</code>, then open this again and we’ll show the rooms we find.
          </p>
        )}

        {plan && (
          <>
            <p className="dialog__body">
              We found {plan.rooms.length} rooms. Pick yours and type how wide it is.
            </p>
            <div className="found">
              <div className="found__photo plan__picture">
                <img src={asset(`/plan/${plan.picture}`)} alt="Floor plan" />
                {/* The outlines are drawn in a 100 by 100 box stretched over the picture. */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {plan.rooms.map((candidate) => (
                    <polygon
                      key={candidate.number}
                      className={candidate.number === picked ? 'plan__room is-picked' : 'plan__room'}
                      points={candidate.outline.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                      onClick={() => handlePick(candidate.number)}
                    />
                  ))}
                </svg>
                {plan.rooms.map((candidate) => (
                  <span
                    key={candidate.number}
                    className="found__number plan__number"
                    style={{
                      // in the room's top left corner, so it does not cover the size printed in the middle
                      left: `${Math.min(...candidate.outline.map((point) => point[0])) * 100 + 4}%`,
                      top: `${Math.min(...candidate.outline.map((point) => point[1])) * 100 + 5}%`,
                    }}
                  >
                    {candidate.number}
                  </span>
                ))}
              </div>

              <div className="plan__side">
                <ul className="found__list">
                  {plan.rooms.map((candidate) => (
                    <li key={candidate.number}>
                      <label className="found__row">
                        <span className="found__number">{candidate.number}</span>
                        <span className="found__text">
                          <strong>Room {candidate.number}</strong>
                          <span>
                            {candidate.across_px >= candidate.down_px ? 'Wider than long' : 'Longer than wide'} on the
                            plan
                          </span>
                        </span>
                        <input
                          type="radio"
                          name="plan-room"
                          checked={candidate.number === picked}
                          onChange={() => handlePick(candidate.number)}
                          aria-label={`Room ${candidate.number}`}
                        />
                      </label>
                    </li>
                  ))}
                </ul>

                {pickedRoom && (
                  <>
                    <NumberField
                      id="plan-across"
                      label={`Room ${picked}, left to right`}
                      unit="m"
                      value={across}
                      error={error}
                      onChange={(text) => {
                        setAcross(text);
                        setError('');
                      }}
                    />
                    <p className="plan__result">
                      {length ? `Your room: ${width.toFixed(2)} × ${length.toFixed(2)} m` : 'Read it off the plan, or measure that wall.'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" fill type="submit" disabled={!length}>
            Use this room
          </Button>
        </div>
      </form>
    </div>
  );
}

export default PlanRooms;
