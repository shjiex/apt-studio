// A number input whose unit sits directly to the right of the digits.
// The input is only as wide as what is typed, so the unit follows the number.
// How: the wrapper also draws the typed text invisibly (see .field__sizer in
// app.css), and the input stretches to exactly that width.
function NumberField({ id, label, value, unit, error, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={error ? 'field__well has-error' : 'field__well'}>
        <span className="field__sizer" data-value={value === '' ? '0' : value}>
          <input
            id={id}
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </span>
        <span className="field__unit">{unit}</span>
      </div>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export default NumberField;
