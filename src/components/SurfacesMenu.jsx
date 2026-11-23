import { useState } from 'react';
import Button from './Button.jsx';
import PhotoStraighten from './PhotoStraighten.jsx';
import Segmented from './Segmented.jsx';
import { WALL_NAMES, keepClear, newDoor, newWindow } from '../lib/room.js';
import { WALL_PAINTS, loadPhoto } from '../lib/surface.js';

// The part both the floor and the walls share: pick a photo, mark a rectangle on
// it (PhotoStraighten), then say how much it shows.
function PhotoControls({ surface, id, hint, secondName, onChange }) {
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState(null); // the photo just picked, while its corners are being marked

  async function handleFile(event) {
    const file = event.target.files[0];
    event.target.value = ''; // so picking the same file again still counts as a change
    if (!file) return;
    try {
      setChosen(await loadPhoto(file));
      setError('');
    } catch (problem) {
      setError(problem.message);
    }
  }

  // Close the corner dialog and let go of the photo's temporary address.
  function closeChosen() {
    URL.revokeObjectURL(chosen.src);
    setChosen(null);
  }

  return (
    <>
      <div className="surface__photo">
        {surface.photo && <img src={surface.photo} alt="" />}
        <label className="surface__pick" htmlFor={id}>
          {surface.photo ? 'Change photo' : 'Choose a photo'}
        </label>
        <input id={id} type="file" accept="image/*" className="surface__file" onChange={handleFile} />
      </div>
      {error && <p className="field__error">{error}</p>}
      {chosen && (
        <PhotoStraighten
          image={chosen}
          secondName={secondName}
          startSpan={surface.span}
          onUse={(tile) => {
            const next = { ...surface, ...tile, kind: 'photo' };
            // A new photo covers every wall, even where the old picture was on one wall only.
            delete next.onlyOn;
            onChange(next);
            closeChosen();
          }}
          onCancel={closeChosen}
        />
      )}
      {surface.photo ? (
        <label className="light__row">
          <span>
            The photo shows <strong>{surface.span.toFixed(1)} m</strong> from left to right
          </span>
          <input
            type="range"
            min="0.3"
            max="4"
            step="0.1"
            value={surface.span}
            onChange={(event) => onChange({ ...surface, span: Number(event.target.value) })}
          />
        </label>
      ) : (
        <p className="feng__note">{hint}</p>
      )}
    </>
  );
}

// One slider row in a window's card: a label, the value in metres, and the slider.
function WindowSlider({ label, value, min, max, onChange }) {
  return (
    <label className="light__row">
      <span>
        {label} <strong>{value.toFixed(2)} m</strong>
      </span>
      <input type="range" aria-label={label} min={min} max={max} step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

// The surfaces button in the top bar. Its panel sets what this room is made of:
// the floor (the built-in oak or a photo of your own floor), the walls (a paint
// colour or a photo) and the windows (which wall, where along it, how big).
// The room changes as you choose.
// Whether the panel is open is kept in Workspace, so only one panel is open at a time.
function SurfacesMenu({ surfaces, onChange, room, onRoomChange, isOpen, onToggle }) {
  const { floor, wall } = surfaces;

  // Replace one window with a changed copy, or take it out.
  // The name of the wall paint in use: one from the list, or the person's own colour.
  const paintName = (WALL_PAINTS.find((paint) => paint.color === surfaces.wall.color) || { name: 'Your own colour' }).name;

  // Shown under the add buttons when a wall has no free place for what was asked.
  const [note, setNote] = useState('');

  // Every change goes through keepClear (lib/room.js), so a window or door never
  // overlaps another one on its wall. If the wall has no room for it, nothing changes.
  function changeWindow(changed) {
    const kept = keepClear(changed, 'windows', room);
    setNote(kept ? '' : "There isn’t enough free space on that wall, so we left it where it was.");
    if (kept) onRoomChange({ ...room, windows: room.windows.map((win) => (win.id === kept.id ? kept : win)) });
  }
  function removeWindow(id) {
    onRoomChange({ ...room, windows: room.windows.filter((win) => win.id !== id) }, 'Window removed');
  }
  function addWindow() {
    const kept = keepClear(newWindow(room.windows), 'windows', room);
    setNote(kept ? '' : "We couldn’t find room for another window. You can move or remove one to make space.");
    if (kept) onRoomChange({ ...room, windows: [...room.windows, kept] }, 'Window added');
  }
  function addDoor() {
    const kept = keepClear(newDoor(room.doors), 'doors', room);
    setNote(kept ? '' : "We couldn’t find room for another door. You can move or remove one to make space.");
    if (kept) onRoomChange({ ...room, doors: [...room.doors, kept] }, 'Door added');
  }
  // The same for doors.
  function changeDoor(changed) {
    const kept = keepClear(changed, 'doors', room);
    setNote(kept ? '' : "There isn’t enough free space on that wall, so we left it where it was.");
    if (kept) onRoomChange({ ...room, doors: room.doors.map((door) => (door.id === kept.id ? kept : door)) });
  }
  function removeDoor(id) {
    onRoomChange({ ...room, doors: room.doors.filter((door) => door.id !== id) }, 'Door removed');
  }

  return (
    <div className="feng">
      <Button
        variant={isOpen ? 'primary' : 'secondary'}
        icon="layers"
        aria-label="Floor, walls, windows and doors"
        aria-expanded={isOpen}
        title="Floor, walls, windows and doors"
        onClick={onToggle}
      />

      {isOpen && (
        <div className="feng__card light">
          <div className="light__fixed">
          <div className="light__row">
            <strong>Floor</strong>
            <Segmented
              label="Floor"
              options={[
                ['oak', 'Oak boards'],
                ['photo', 'Your photo'],
              ]}
              value={floor.kind}
              onChange={(kind) => onChange({ ...surfaces, floor: { ...floor, kind } })}
              optionClass="surface__choice"
            />
          </div>
          {floor.kind === 'photo' && (
            <PhotoControls
              surface={floor}
              id="floor-photo"
              secondName="Deep"
              hint="Photograph a clear patch of floor in even light. An angle is fine: you mark a rectangle on it next."
              onChange={(next) => onChange({ ...surfaces, floor: next })}
            />
          )}
          </div>

          <div className="light__fixed">
            <div className="light__row">
              <strong>Walls</strong>
              <Segmented
                label="Walls"
                options={[
                  ['paint', 'Paint'],
                  ['photo', 'Your photo'],
                ]}
                value={wall.kind}
                onChange={(kind) => onChange({ ...surfaces, wall: { ...wall, kind } })}
                optionClass="surface__choice"
              />
            </div>
            {wall.kind === 'paint' ? (
              <div className="surface__paints">
                {WALL_PAINTS.map((paint) => (
                  <button
                    key={paint.color}
                    type="button"
                    className={paint.color === wall.color ? 'surface__paint is-current' : 'surface__paint'}
                    style={{ background: paint.color }}
                    aria-label={paint.name}
                    aria-pressed={paint.color === wall.color}
                    title={paint.name}
                    onClick={() => onChange({ ...surfaces, wall: { ...wall, color: paint.color } })}
                  />
                ))}
                {/* any other colour: the browser's own colour picker */}
                <input
                  type="color"
                  className="surface__paint surface__paint--any"
                  aria-label="Another colour"
                  title="Another colour"
                  value={wall.color}
                  onChange={(event) => onChange({ ...surfaces, wall: { ...wall, color: event.target.value.toUpperCase() } })}
                />
                {/* the name of the paint in use, so you can say which one it is */}
                <p className="surface__paint-name">
                  <strong>{paintName}</strong>
                  <span>{wall.color}</span>
                </p>
              </div>
            ) : (
              <PhotoControls
                surface={wall}
                id="wall-photo"
                secondName="Up"
                hint="Photograph a clear patch of wall in even light. Wallpaper, brick and tiles work best."
                onChange={(next) => onChange({ ...surfaces, wall: next })}
              />
            )}
          </div>

          {/* Windows: one card each. A window can sit on any wall; the wall is opened
              there, so daylight and the sun come in where your real window is. */}
          {room.windows.map((win, index) => (
            <div className="light__fixed" key={win.id}>
              <div className="light__row">
                <strong>Window {index + 1}</strong>
                <button type="button" className="light__remove" onClick={() => removeWindow(win.id)}>
                  Remove
                </button>
              </div>
              <div className="light__row">
                <span>Wall</span>
                <Segmented
                  label="Wall"
                  options={Object.entries(WALL_NAMES)}
                  value={win.wall}
                  onChange={(id) => changeWindow({ ...win, wall: id })}
                  optionClass="surface__choice"
                />
              </div>
              <label className="light__row">
                <span>Along the wall</span>
                <input
                  type="range"
                  aria-label="Along the wall"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={win.along}
                  onChange={(event) => changeWindow({ ...win, along: Number(event.target.value) })}
                />
              </label>
              <WindowSlider label="Width" value={win.width} min={0.4} max={3} onChange={(width) => changeWindow({ ...win, width })} />
              <WindowSlider
                label="Bottom edge"
                value={win.bottom}
                min={0}
                max={1.5}
                onChange={(bottom) => changeWindow({ ...win, bottom, top: Math.max(win.top, bottom + 0.3) })}
              />
              <WindowSlider
                label="Top edge"
                value={win.top}
                min={1}
                max={room.height - 0.1}
                onChange={(top) => changeWindow({ ...win, top, bottom: Math.min(win.bottom, top - 0.3) })}
              />
            </div>
          ))}
          {/* Doors: one card each. A door keeps the floor in front of it clear: furniture there shows as Blocked. */}
          {room.doors.map((door, index) => (
            <div className="light__fixed" key={door.id}>
              <div className="light__row">
                <strong>Door {index + 1}</strong>
                <button type="button" className="light__remove" onClick={() => removeDoor(door.id)}>
                  Remove
                </button>
              </div>
              <div className="light__row">
                <span>Wall</span>
                <Segmented
                  label="Wall"
                  options={Object.entries(WALL_NAMES)}
                  value={door.wall}
                  onChange={(id) => changeDoor({ ...door, wall: id })}
                  optionClass="surface__choice"
                />
              </div>
              <label className="light__row">
                <span>Along the wall</span>
                <input
                  type="range"
                  aria-label="Along the wall"
                  min="0.02"
                  max="0.98"
                  step="0.01"
                  value={door.along}
                  onChange={(event) => changeDoor({ ...door, along: Number(event.target.value) })}
                />
              </label>
              <WindowSlider label="Width" value={door.width} min={0.6} max={1.6} onChange={(width) => changeDoor({ ...door, width })} />
              {/* which edge the hinge is on, as you face the door from inside the room */}
              <div className="light__row">
                <span>Hinge</span>
                <Segmented
                  label="Hinge"
                  options={[
                    ['left', 'Left'],
                    ['right', 'Right'],
                  ]}
                  value={door.hinge || 'left'}
                  onChange={(hinge) => changeDoor({ ...door, hinge })}
                  optionClass="surface__choice"
                />
              </div>
              <div className="light__row">
                <span>Door</span>
                <Segmented
                  label="Door"
                  options={[
                    [false, 'Open'],
                    [true, 'Shut'],
                  ]}
                  value={Boolean(door.shut)}
                  onChange={(shut) => changeDoor({ ...door, shut })}
                  optionClass="surface__choice"
                />
              </div>
            </div>
          ))}
          <div className="light__add">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={addWindow}
            >
              + Add a window
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={addDoor}
            >
              + Add a door
            </button>
          </div>
          {note && (
            <p className="surface__note" role="status">
              {note}
            </p>
          )}
          <p className="feng__note">
            You can also drag a window or door along its wall on the plan, using its dot. The back wall is the one at the top of the plan. For a balcony door, add a window and set its bottom edge to 0.
          </p>
        </div>
      )}
    </div>
  );
}

export default SurfacesMenu;
