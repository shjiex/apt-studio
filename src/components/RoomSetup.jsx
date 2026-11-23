import { useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import NumberField from './NumberField.jsx';
import { EXAMPLE_ROOM } from '../data/exampleRoom.js';
import { asset } from '../lib/paths.js';
import { formatRoom } from '../lib/room.js';
import { ROOM_KINDS, kindOf } from '../lib/rooms.js';
import '../styles/example-room.css';

const LIMITS = {
  width: { min: 1.5, max: 12 },
  length: { min: 1.5, max: 12 },
  height: { min: 2, max: 5 },
};

// Turn a size in numbers into the text the three fields hold.
function sizeToText(size) {
  return { width: String(size.width), length: String(size.length), height: String(size.height) };
}

// The room dialog: what kind of room it is, its name and its size.
// With `entry` it edits that room. Without it, it makes a new one.
// The link under the fields opens the floor plan picker instead.
// A new room can also start from the example (data/exampleRoom.js): `onUseExample`
// is called when the person presses "Open the example room".
function RoomSetup({ entry, onSave, onCancel, onUsePlan, onRemove, onUseExample }) {
  const isNew = !entry;
  const start = entry || { name: 'Living room', kind: 'living', size: kindOf('living').size };
  const [kind, setKind] = useState(start.kind);
  const [name, setName] = useState(start.name);
  // The size fields hold text while the person types; we turn it into numbers on save.
  const [form, setForm] = useState(sizeToText(start.size));
  const [errors, setErrors] = useState({});

  function updateField(field, text) {
    setForm({ ...form, [field]: text });
  }

  // Picking a kind. If the name is still a kind's own name ("Bedroom"), it follows
  // the new kind. A new room also takes that kind's usual size as a start.
  function pickKind(nextKind) {
    const nameIsDefault = ROOM_KINDS.some((candidate) => candidate.name === name) || name.trim() === '';
    if (nameIsDefault) setName(kindOf(nextKind).name);
    if (isNew) setForm(sizeToText(kindOf(nextKind).size));
    setKind(nextKind);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const size = {};
    const nextErrors = {};
    for (const field of ['width', 'length', 'height']) {
      const number = Number(form[field]);
      const { min, max } = LIMITS[field];
      if (Number.isNaN(number) || number < min || number > max) {
        nextErrors[field] = `Enter a ${field} between ${min} and ${max} m`;
      }
      size[field] = number;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave({ name: name.trim() || kindOf(kind).name, kind, size });
    }
  }

  return (
    <div className="scrim" onClick={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-setup-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="room-setup-title">{isNew ? 'Add a room' : 'Room'}</h2>

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

        <div className="field">
          <label htmlFor="room-name">Name</label>
          <div className="field__well">
            <input
              id="room-name"
              className="field__text"
              value={name}
              maxLength={24}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>

        <div className="dialog__fields">
          <NumberField id="room-width" label="Width" unit="m" value={form.width} error={errors.width} onChange={(text) => updateField('width', text)} />
          <NumberField id="room-length" label="Length" unit="m" value={form.length} error={errors.length} onChange={(text) => updateField('length', text)} />
          <NumberField id="room-height" label="Height" unit="m" value={form.height} error={errors.height} onChange={(text) => updateField('height', text)} />
        </div>
        <p className="dialog__body">Measure your room from wall to wall. You can always change these numbers later.</p>

        {/* Links under the fields: only for a room that already exists. */}
        {!isNew && (
          <div className="dialog__links">
            <button type="button" className="dialog__link" onClick={onUsePlan}>
              Take the size from a floor plan
            </button>
            {onRemove && (
              <button type="button" className="dialog__link dialog__link--danger" onClick={onRemove}>
                Remove this room
              </button>
            )}
          </div>
        )}

        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" fill type="submit">
            {isNew ? 'Add room' : 'Save room'}
          </Button>
        </div>

        {/* Only when making a new room: a furnished example to open instead of typing a size. */}
        {isNew && onUseExample && (
          <section className="example-room" aria-labelledby="example-room-title">
            <p className="example-room__lead">Or start from an example</p>
            <div className="example-room__card">
              {/* alt is empty because the name beside the picture already says what it is */}
              <img className="example-room__picture" src={asset(EXAMPLE_ROOM.picture)} alt="" />
              <div className="example-room__words">
                <h3 id="example-room-title">{EXAMPLE_ROOM.name}</h3>
                <p className="example-room__size">{formatRoom(EXAMPLE_ROOM.size)}</p>
                <p>We’ve furnished this room based on a photo from the sample moodboard. You can always change it later.</p>
              </div>
            </div>
            <Button variant="secondary" fill onClick={onUseExample}>
              Open the example room
            </Button>
          </section>
        )}
      </form>
    </div>
  );
}

export default RoomSetup;
