import Icon from './Icon.jsx';

const LABELS = { fits: 'Fits', tight: 'Tight', blocked: 'Blocked' };
const ICONS = { fits: 'check', tight: 'warning', blocked: 'close' };

// Says whether a piece fits where it stands. Always a word, never colour alone.
function FitTag({ fit }) {
  return (
    <span className={`fit-tag fit-tag--${fit}`}>
      <Icon name={ICONS[fit]} size={14} />
      {LABELS[fit]}
    </span>
  );
}

export default FitTag;
