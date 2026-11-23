// One slider for the whole app, drawn as glass: a soft track with a clear, rounded
// thumb. It is the browser's own range input, so the keyboard and screen readers
// work as usual. The filled part of the track cannot be styled in every browser, so
// this works out how far along the value is (0% to 100%) and hands it to the CSS as
// --fill, which draws the fill with a gradient.
function Slider({ min, max, value, ...rest }) {
  const fill = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;
  return <input type="range" className="slider" min={min} max={max} value={value} style={{ '--fill': `${fill}%` }} {...rest} />;
}

export default Slider;
