import { useState } from 'react';
import Button from './Button.jsx';
import Segmented from './Segmented.jsx';
import { MONTH_NAMES, PLACES, formatHour, getSun, kelvinToColor, nameOfKelvin, newFixedLight, sunOnWindows } from '../lib/light.js';

const KIND_NAMES = { ceiling: 'Ceiling light', wall: 'Wall light', strip: 'LED strip' };

// The three sliders every bulb has: its colour in Kelvin, its brightness in lumens, and a dimmer.
// Used here and in the piece panel for a lamp's own bulb.
export function BulbSliders({ bulb, onChange }) {
  return (
    <>
      <label className="light__row">
        <span>
          Colour <strong>{bulb.kelvin} K</strong>
        </span>
        {/* the everyday name for that Kelvin number, beside a dot of its colour */}
        <span className="light__named">
          {nameOfKelvin(bulb.kelvin)}
          <span className="light__swatch" style={{ background: kelvinToColor(bulb.kelvin) }} />
        </span>
        <input
          type="range"
          min="2000"
          max="6500"
          step="100"
          value={bulb.kelvin}
          onChange={(event) => onChange({ ...bulb, kelvin: Number(event.target.value) })}
        />
      </label>
      <label className="light__row">
        <span>
          Brightness <strong>{bulb.lumens} lm</strong>
        </span>
        <input
          type="range"
          min="100"
          max="3000"
          step="50"
          value={bulb.lumens}
          onChange={(event) => onChange({ ...bulb, lumens: Number(event.target.value) })}
        />
      </label>
      {/* a bulb saved before dimmers existed has no `dim`; treat it as fully up */}
      <label className="light__row">
        <span>
          Dimmer <strong>{bulb.dim === undefined ? 100 : bulb.dim}%</strong>
        </span>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={bulb.dim === undefined ? 100 : bulb.dim}
          onChange={(event) => onChange({ ...bulb, dim: Number(event.target.value) })}
        />
      </label>
    </>
  );
}

// The lighting button in the top bar. Its panel describes the room's real light:
// daylight (which way the window faces, the time of day), the lights fixed to the
// room (ceiling, wall, strip: where, Kelvin, lumens) and the bulb lamps start with.
// The room changes as you move the controls.
function LightingMenu({ lighting, onChange, windows }) {
  const [isOpen, setIsOpen] = useState(false);
  const sun = getSun(lighting);

  // Replace one fixed light with a changed copy.
  function changeLight(changed) {
    onChange({ ...lighting, fixed: lighting.fixed.map((light) => (light.id === changed.id ? changed : light)) });
  }

  return (
    <div className="feng">
      <Button
        variant={isOpen ? 'primary' : 'secondary'}
        icon="bulb"
        aria-label="Lighting"
        aria-expanded={isOpen}
        title="Lighting"
        onClick={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <div className="feng__card light">
          <label className="light__head">
            <strong>Daylight</strong>
            <input
              type="checkbox"
              checked={lighting.daylight}
              onChange={(event) => onChange({ ...lighting, daylight: event.target.checked })}
            />
          </label>
          {lighting.daylight && (
            <>
              <div className="light__row">
                <span title="The back wall is the one at the top of the plan">Back wall faces</span>
                <Segmented
                  label="Back wall faces"
                  // the row shows one letter for each side: N, E, S, W
                  options={['north', 'east', 'south', 'west'].map((side) => [side, side[0].toUpperCase()])}
                  value={lighting.windowFaces}
                  onChange={(side) => onChange({ ...lighting, windowFaces: side })}
                />
              </div>
              {/* Where the home is: pick a city, or set the latitude yourself with the slider. */}
              <div className="light__row">
                <span>
                  Where <strong>{Math.abs(Math.round(lighting.latitude))}° {lighting.latitude >= 0 ? 'N' : 'S'}</strong>
                </span>
                <select
                  className="light__select"
                  aria-label="City"
                  value={PLACES.some((place) => place.latitude === lighting.latitude) ? lighting.latitude : ''}
                  onChange={(event) => onChange({ ...lighting, latitude: Number(event.target.value) })}
                >
                  <option value="" disabled>
                    Other
                  </option>
                  {PLACES.map((place) => (
                    <option key={place.name} value={place.latitude}>
                      {place.name}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  aria-label="Latitude"
                  min="-60"
                  max="65"
                  step="1"
                  value={lighting.latitude}
                  onChange={(event) => onChange({ ...lighting, latitude: Number(event.target.value) })}
                />
              </div>
              <div className="light__row">
                <span>
                  Month <strong>{MONTH_NAMES[lighting.month - 1]}</strong>
                </span>
                <div className="light__months">
                  {MONTH_NAMES.map((name, index) => (
                    <button
                      key={name}
                      type="button"
                      className={index + 1 === lighting.month ? 'light__choice is-current' : 'light__choice'}
                      aria-label={name}
                      aria-pressed={index + 1 === lighting.month}
                      onClick={() => onChange({ ...lighting, month: index + 1 })}
                    >
                      {name[0]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="light__row">
                <span>
                  Time <strong>{formatHour(lighting.hour)}</strong>
                </span>
                <span className="tag tag--grey">{!sun.up ? 'Sun is down' : sunOnWindows(sun, windows) ? 'Sun on a window' : 'No direct sun'}</span>
                <input
                  type="range"
                  aria-label="Time of day"
                  min="4"
                  max="22"
                  step="0.5"
                  value={lighting.hour}
                  onChange={(event) => onChange({ ...lighting, hour: Number(event.target.value) })}
                />
              </label>
              {/* three facts side by side: when the sun rises, when it sets, how high it is now */}
              <dl className="light__facts">
                <div>
                  <dt>Sunrise</dt>
                  <dd>{formatHour(sun.rise)}</dd>
                </div>
                <div>
                  <dt>Sunset</dt>
                  <dd>{formatHour(sun.set)}</dd>
                </div>
                <div>
                  <dt>Sun height</dt>
                  <dd>{sun.up ? `${Math.round(sun.elevation)}°` : 'Down'}</dd>
                </div>
              </dl>
              <p className="feng__note">We use sun time here, where 12:00 is the moment the sun is highest. Your clock may read up to an hour or so differently.</p>
            </>
          )}

          {lighting.fixed.map((light) => (
            <div className="light__fixed" key={light.id}>
              <label className="light__head">
                <strong>{KIND_NAMES[light.kind]}</strong>
                <span className="light__tools">
                  <button
                    type="button"
                    className="light__remove"
                    onClick={() => onChange({ ...lighting, fixed: lighting.fixed.filter((other) => other.id !== light.id) })}
                  >
                    Remove
                  </button>
                  <input
                    type="checkbox"
                    aria-label={`${KIND_NAMES[light.kind]} on`}
                    checked={light.on}
                    onChange={(event) => changeLight({ ...light, on: event.target.checked })}
                  />
                </span>
              </label>
              {light.kind === 'ceiling' ? (
                <div className="light__row">
                  <span>Where it hangs</span>
                  {/* nine spots over the room: the top row is the window wall */}
                  <div className="light__spots">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((spot) => (
                      <button
                        key={spot}
                        type="button"
                        className={spot === light.spot ? 'light__spot is-current' : 'light__spot'}
                        aria-label={`Spot ${spot + 1} of 9`}
                        aria-pressed={spot === light.spot}
                        onClick={() => changeLight({ ...light, spot })}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="light__row">
                    <span>On which wall</span>
                    <Segmented
                      label="On which wall"
                      options={['back', 'left', 'right', 'front'].map((wall) => [wall, wall])}
                      value={light.wall}
                      onChange={(wall) => changeLight({ ...light, wall })}
                      optionClass="light__choice--word"
                    />
                  </div>
                  {light.kind === 'wall' && (
                    <label className="light__row">
                      <span>Along the wall</span>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={light.along}
                        onChange={(event) => changeLight({ ...light, along: Number(event.target.value) })}
                      />
                    </label>
                  )}
                </>
              )}
              <BulbSliders bulb={light} onChange={changeLight} />
            </div>
          ))}

          <div className="light__add">
            {Object.keys(KIND_NAMES).map((kind) => (
              <button
                key={kind}
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onChange({ ...lighting, fixed: [...lighting.fixed, newFixedLight(kind)] })}
              >
                + {KIND_NAMES[kind]}
              </button>
            ))}
          </div>

          <label className="light__head">
            <strong>Lamp bulbs</strong>
            <input
              type="checkbox"
              checked={lighting.lamps.on}
              onChange={(event) => onChange({ ...lighting, lamps: { ...lighting.lamps, on: event.target.checked } })}
            />
          </label>
          {lighting.lamps.on && <BulbSliders bulb={lighting.lamps} onChange={(lamps) => onChange({ ...lighting, lamps })} />}

          <p className="feng__note">
            You can find Kelvin and lumens printed on the bulb or its box. For a sense of scale, an old 60 W bulb gives about 800 lm. Select a lamp in your room if you’d like it to have a bulb of its own.
          </p>
        </div>
      )}
    </div>
  );
}

export default LightingMenu;
