import { useState } from 'react';
import Button from './Button.jsx';
import NumberField from './NumberField.jsx';

const LIMITS = {
  width: { min: 1.5, max: 12 },
  length: { min: 1.5, max: 12 },
  height: { min: 2, max: 5 },
};

// A dialog for building the room by hand: type its width, length and height.
function RoomSetup({ room, onSave, onCancel }) {
  // The fields hold text while the person types; we turn it into numbers on save.
  const [form, setForm] = useState({
    width: String(room.width),
    length: String(room.length),
    height: String(room.height),
  });
  const [errors, setErrors] = useState({});

  function updateField(name, text) {
    setForm({ ...form, [name]: text });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextRoom = {};
    const nextErrors = {};
    for (const name of ['width', 'length', 'height']) {
      const number = Number(form[name]);
      const { min, max } = LIMITS[name];
      if (Number.isNaN(number) || number < min || number > max) {
        nextErrors[name] = `Enter a ${name} between ${min} and ${max} m`;
      }
      nextRoom[name] = number;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave(nextRoom);
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
        <h2 id="room-setup-title">Room size</h2>
        <p className="dialog__body">Measure wall to wall. You can change this later.</p>
        <div className="dialog__fields">
          <NumberField id="room-width" label="Width" unit="m" value={form.width} error={errors.width} onChange={(text) => updateField('width', text)} />
          <NumberField id="room-length" label="Length" unit="m" value={form.length} error={errors.length} onChange={(text) => updateField('length', text)} />
          <NumberField id="room-height" label="Height" unit="m" value={form.height} error={errors.height} onChange={(text) => updateField('height', text)} />
        </div>
        <div className="dialog__actions">
          <Button variant="secondary" fill onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" fill type="submit">
            Save room
          </Button>
        </div>
      </form>
    </div>
  );
}

export default RoomSetup;
