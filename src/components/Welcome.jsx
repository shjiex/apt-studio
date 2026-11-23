import { useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Segmented from './Segmented.jsx';
import { ROOM_KINDS, kindOf } from '../lib/rooms.js';
import { fromSmall, toSmall } from '../lib/units.js';

const WALLS = [
  ['back', 'Back'],
  ['left', 'Left'],
  ['right', 'Right'],
  ['front', 'Front'],
];

// The first thing a new visitor sees, and what "Start over" comes back to.
// It asks how you would like to begin, so the app does not have to guess your room:
//   a floor plan picture, a few questions, a ready room, or the furnished example.
// The questions take three short steps: the kind of room, its size, and which walls
// the door and the window are on. Everything can be changed later.
//
// onPlan      import a floor plan (opens the plan picker)
// onReady     start with the ready room as it is
// onExample   open the furnished example room
// onAnswers   start with the room the answers describe: { name, kind, size, doorWall, windowWall }
function Welcome({ units, onPlan, onReady, onExample, onAnswers }) {
  const [step, setStep] = useState('start'); // 'start', 'kind', 'size' or 'openings'
  const [kind, setKind] = useState('bedroom');
  // the size as typed, in metres or feet, so a half-typed number is kept as it is
  const isImperial = units === 'imperial';
  const toBig = (metres) => (isImperial ? Math.round((metres / 0.3048) * 10) / 10 : metres);
  const [width, setWidth] = useState(String(toBig(kindOf('bedroom').size.width)));
  const [length, setLength] = useState(String(toBig(kindOf('bedroom').size.length)));
  const [doorWall, setDoorWall] = useState('left');
  const [windowWall, setWindowWall] = useState('back');
  const [error, setError] = useState('');

  function pickKind(id) {
    setKind(id);
    setWidth(String(toBig(kindOf(id).size.width)));
    setLength(String(toBig(kindOf(id).size.length)));
    setStep('size');
  }

  // What was typed, as metres. A room is between 1.5 and 12 metres each way.
  function readSize() {
    const toMetres = (text) => (isImperial ? Number(text) * 0.3048 : Number(text));
    const size = { width: Number(toMetres(width).toFixed(2)), length: Number(toMetres(length).toFixed(2)), height: 2.5 };
    const isUsable = (value) => Number.isFinite(value) && value >= 1.5 && value <= 12;
    return isUsable(size.width) && isUsable(size.length) ? size : null;
  }

  function finish() {
    onAnswers({ name: kindOf(kind).name, kind, size: readSize(), doorWall, windowWall });
  }

  return (
    <div className="scrim">
      <div className="dialog welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        {step === 'start' && (
          <>
            <h2 id="welcome-title">How would you like to start?</h2>
            <p className="dialog__body">Tell us about your room and we’ll set it up for you. You can always change it later.</p>
            <div className="welcome__choices">
              <button type="button" className="welcome__choice" onClick={onPlan}>
                <Icon name="image" size={20} />
                <span>
                  <strong>Import a floor plan</strong>
                  <span>We read the size of your room from a picture of the plan.</span>
                </span>
              </button>
              <button type="button" className="welcome__choice" onClick={() => setStep('kind')}>
                <Icon name="ruler" size={20} />
                <span>
                  <strong>Answer a few questions</strong>
                  <span>Tell us the kind of room, its size, and where the door and window are.</span>
                </span>
              </button>
              <button type="button" className="welcome__choice" onClick={onExample}>
                <Icon name="sofa" size={20} />
                <span>
                  <strong>Open the example room</strong>
                  <span>A furnished living room you can look around and change.</span>
                </span>
              </button>
              {/* Scanning a room with a phone is not built into the app yet, so it cannot be chosen. */}
              <div className="welcome__choice is-off" aria-disabled="true">
                <Icon name="scan" size={20} />
                <span>
                  <strong>
                    Scan your room <span className="tag tag--grey">Soon</span>
                  </strong>
                  <span>Walk around the room with your phone’s camera.</span>
                </span>
              </div>
            </div>
            <button type="button" className="room-bar__link welcome__skip" onClick={onReady}>
              Skip and start with a ready bedroom
            </button>
          </>
        )}

        {step === 'kind' && (
          <>
            <p className="welcome__count">1 of 3</p>
            <h2 id="welcome-title">Which room are you planning?</h2>
            <div className="room-kinds" role="radiogroup" aria-label="Kind of room">
              {ROOM_KINDS.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  role="radio"
                  aria-checked={candidate.id === kind}
                  className={candidate.id === kind ? 'room-kind is-current' : 'room-kind'}
                  onClick={() => pickKind(candidate.id)}
                >
                  <Icon name={candidate.icon} size={20} />
                  {candidate.name}
                </button>
              ))}
            </div>
            <div className="dialog__actions">
              <Button variant="secondary" fill onClick={() => setStep('start')}>
                Back
              </Button>
            </div>
          </>
        )}

        {step === 'size' && (
          <>
            <p className="welcome__count">2 of 3</p>
            <h2 id="welcome-title">How big is it?</h2>
            <p className="dialog__body">
              Measure from wall to wall. We’ve filled in a usual size for a {kindOf(kind).name.toLowerCase()}, so an estimate is fine for now.
            </p>
            <div className="measures welcome__sizes">
              <label className="measure">
                <span className="measure__label">
                  <Icon name="width" size={14} />
                  Width
                </span>
                <span className="measure__well">
                  <input inputMode="decimal" aria-label="Width" value={width} onChange={(event) => setWidth(event.target.value)} />
                  <span className="measure__unit">{isImperial ? 'ft' : 'm'}</span>
                </span>
              </label>
              <label className="measure">
                <span className="measure__label">
                  <Icon name="height" size={14} />
                  Length
                </span>
                <span className="measure__well">
                  <input inputMode="decimal" aria-label="Length" value={length} onChange={(event) => setLength(event.target.value)} />
                  <span className="measure__unit">{isImperial ? 'ft' : 'm'}</span>
                </span>
              </label>
            </div>
            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog__actions">
              <Button variant="secondary" fill onClick={() => setStep('kind')}>
                Back
              </Button>
              <Button
                variant="primary"
                fill
                onClick={() => {
                  if (readSize()) {
                    setError('');
                    setStep('openings');
                  } else {
                    setError(isImperial ? 'Each side needs to be between 5 and 39 feet.' : 'Each side needs to be between 1.5 and 12 metres.');
                  }
                }}
              >
                Next
              </Button>
            </div>
          </>
        )}

        {step === 'openings' && (
          <>
            <p className="welcome__count">3 of 3</p>
            <h2 id="welcome-title">Where are the door and the window?</h2>
            <p className="dialog__body">
              Picture the room from above with the back wall at the top. You can drag both along their walls afterwards.
            </p>
            <div className="light__row">
              <strong>
                <Icon name="door" size={14} /> Door
              </strong>
              <Segmented label="Wall the door is on" options={WALLS} value={doorWall} onChange={setDoorWall} optionClass="surface__choice" />
            </div>
            <div className="light__row">
              <strong>
                <Icon name="window" size={14} /> Window
              </strong>
              <Segmented
                label="Wall the window is on"
                options={[...WALLS, ['none', 'None']]}
                value={windowWall}
                onChange={setWindowWall}
                optionClass="surface__choice"
              />
            </div>
            <div className="dialog__actions">
              <Button variant="secondary" fill onClick={() => setStep('size')}>
                Back
              </Button>
              <Button variant="primary" fill onClick={finish}>
                Open my room
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Welcome;
