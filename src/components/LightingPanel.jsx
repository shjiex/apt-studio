import Segmented from './Segmented.jsx';
import { MONTH_NAMES, PLACES, formatHour, getSun, kelvinToColor, nameOfKelvin, newFixedLight, sunOnWindows } from '../lib/light.js';
import Slider from './Slider.jsx';
import Icon from './Icon.jsx';
import { WALL_NAMES } from '../lib/room.js';

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
        <Slider
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
        <Slider
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
        <Slider
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

// The two choices every on and off row in this panel uses, as [id, words] for Segmented.
const ON_OFF = [
  [true, 'On'],
  [false, 'Off'],
];

// The lighting panel. It opens in the tools section to the left of the room.
// It is built the same way as the floor and walls panel: one card for each part
// (daylight, the lamp bulbs, and each light fixed to the room), a bold name and an
// On or Off choice at the top of each card, and the finer settings folded away
// inside the card, so the panel stays short until you ask for the detail.
// The room changes as you move the controls.
function LightingPanel({ lighting, onChange, windows }) {
  const sun = getSun(lighting);

  // Replace one fixed light with a changed copy.
  function changeLight(changed) {
    onChange({ ...lighting, fixed: lighting.fixed.map((light) => (light.id === changed.id ? changed : light)) });
  }

  // Take one fixed light out of the room.
  function removeLight(id) {
    onChange({ ...lighting, fixed: lighting.fixed.filter((other) => other.id !== id) });
  }

  return (
    <div className="tool-body light">
      {/* Daylight: the time and the month are in view, where the home is sits in a fold. */}
      <div className="light__fixed">
        <div className="light__row">
          <strong>Daylight</strong>
          <Segmented
            label="Daylight"
            options={ON_OFF}
            value={lighting.daylight}
            onChange={(daylight) => onChange({ ...lighting, daylight })}
            optionClass="surface__choice"
          />
        </div>
        {lighting.daylight && (
          <>
            <label className="light__row">
              <span>
                Time <strong>{formatHour(lighting.hour)}</strong>
              </span>
              <span className="tag tag--grey">
                {!sun.up ? 'Sun is down' : sunOnWindows(sun, windows) ? 'Sun on a window' : 'No direct sun'}
              </span>
              <Slider
                aria-label="Time of day"
                min="4"
                max="22"
                step="0.5"
                value={lighting.hour}
                onChange={(event) => onChange({ ...lighting, hour: Number(event.target.value) })}
              />
            </label>
            {/* the month as a slider from January (1) to December (12), like the time above it */}
            <label className="light__row">
              <span>
                Month <strong>{MONTH_NAMES[lighting.month - 1]}</strong>
              </span>
              <Slider
                aria-label="Month"
                min="1"
                max="12"
                step="1"
                value={lighting.month}
                onChange={(event) => onChange({ ...lighting, month: Number(event.target.value) })}
              />
            </label>

            {/* <details> is the browser's own fold: pressing the summary line opens and closes it. */}
            <details className="advanced advanced--inner">
              <summary>Place and sun</summary>
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
                  Where{' '}
                  <strong>
                    {Math.abs(Math.round(lighting.latitude))}° {lighting.latitude >= 0 ? 'N' : 'S'}
                  </strong>
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
                <Slider
                  aria-label="Latitude"
                  min="-60"
                  max="65"
                  step="1"
                  value={lighting.latitude}
                  onChange={(event) => onChange({ ...lighting, latitude: Number(event.target.value) })}
                />
              </div>
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
            </details>
          </>
        )}
      </div>

      {/* Lamp bulbs: the bulb shared by every lamp in the room. Its sliders sit in a fold. */}
      <div className="light__fixed">
        <div className="light__row">
          <strong>Lamp bulbs</strong>
          <Segmented
            label="Lamp bulbs"
            options={ON_OFF}
            value={lighting.lamps.on}
            onChange={(on) => onChange({ ...lighting, lamps: { ...lighting.lamps, on } })}
            optionClass="surface__choice"
          />
        </div>
        {lighting.lamps.on && (
          <details className="advanced advanced--inner">
            <summary>Colour and brightness</summary>
            <BulbSliders bulb={lighting.lamps} onChange={(lamps) => onChange({ ...lighting, lamps })} />
          </details>
        )}
      </div>

      {/* Lights fixed to the room: one card each, like a window or a door. */}
      {lighting.fixed.map((light) => (
        <div className="light__fixed" key={light.id}>
          <div className="light__row">
            <strong>{KIND_NAMES[light.kind]}</strong>
            <button
              type="button"
              className="icon-action icon-action--danger"
              aria-label={`Remove ${KIND_NAMES[light.kind]}`}
              title="Remove"
              onClick={() => removeLight(light.id)}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
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
            <div className="light__row">
              <span>Wall</span>
              <Segmented
                label="Wall"
                options={Object.entries(WALL_NAMES)}
                value={light.wall}
                onChange={(wall) => changeLight({ ...light, wall })}
                optionClass="surface__choice"
              />
            </div>
          )}
          {/* The bulb, and for a wall light its place along the wall, are folded away. */}
          <details className="advanced advanced--inner">
            <summary>{light.kind === 'wall' ? 'Position, colour and brightness' : 'Colour and brightness'}</summary>
            {light.kind === 'wall' && (
              <label className="light__row">
                <span>Along the wall</span>
                <Slider
                  aria-label="Along the wall"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={light.along}
                  onChange={(event) => changeLight({ ...light, along: Number(event.target.value) })}
                />
              </label>
            )}
            <BulbSliders bulb={light} onChange={changeLight} />
          </details>
          <div className="light__row">
            <span>Light</span>
            <Segmented
              label={`${KIND_NAMES[light.kind]} on or off`}
              options={ON_OFF}
              value={light.on}
              onChange={(on) => changeLight({ ...light, on })}
              optionClass="surface__choice"
            />
          </div>
        </div>
      ))}

      {/* one button for each kind of light you can fix to the room */}
      <div className="light__add">
        {Object.keys(KIND_NAMES).map((kind) => (
          <button
            key={kind}
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => onChange({ ...lighting, fixed: [...lighting.fixed, newFixedLight(kind)] })}
          >
            <Icon name="plus" size={16} />
            {KIND_NAMES[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LightingPanel;
