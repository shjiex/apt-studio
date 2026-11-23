import Icon from './Icon.jsx';
import { getFengShui } from '../lib/fengshui.js';

// An icon for a check, picked by what its title is about, so a line can be
// recognised before it is read.
function iconFor(check) {
  const title = check.title.toLowerCase();
  if (title.includes('bed')) return 'bed';
  if (title.includes('desk')) return 'desk';
  if (title.includes('door')) return 'open';
  if (title.includes('window') || title.includes('light') || title.includes('lamp')) return 'bulb';
  if (title.includes('rug')) return 'layers';
  if (title.includes('walk') || title.includes('floor') || title.includes('room to')) return 'measure';
  return 'compass';
}

// The room's score as a round button in the corner of the preview, the same size
// as the zoom buttons above it: just the number, with a ring that fills as the
// score rises. Pressing it opens the card.
//
// The card eases you in. It shows ONE thing to do first (the failed check worth
// the most points) with its tip. Everything else is folded away: the other things
// to improve, and the checks that already pass.
//
// Whether the card is open is kept in Workspace, so only one panel is open at a time.
function FengShuiCard({ pieces, room, isOpen, onToggle }) {
  const result = getFengShui(pieces, room);

  const possible = result.checks.reduce((sum, check) => sum + check.points, 0);
  const failing = result.checks.filter((check) => !check.passes).sort((a, b) => b.points - a.points);
  const passing = result.checks.filter((check) => check.passes);
  const [first, ...others] = failing;
  // how much the score would rise if this check passed
  const gainOf = (check) => Math.round((check.points / possible) * 100);

  return (
    <div className="feng">
      <button
        type="button"
        className="feng__circle"
        // the ring: ink up to the score
        style={{ '--score': `${result.score * 3.6}deg` }}
        aria-expanded={isOpen}
        aria-label={`Room score ${result.score} out of 100`}
        title="Room score"
        onClick={onToggle}
      >
        <span className="feng__inner">
          <strong>{result.score}</strong>
        </span>
      </button>

      {isOpen && (
        <div className="feng__card">
          <div className="feng__head">
            <strong>{result.score}</strong>
            <span>Room score, out of 100</span>
          </div>

          {first ? (
            <div className="feng__first">
              <span className="feng__eyebrow">Do this first</span>
              <div className="feng__line">
                <Icon name={iconFor(first)} size={16} />
                <strong>{first.title}</strong>
                <span className="feng__gain">+{gainOf(first)}</span>
              </div>
              <p>{first.tip}</p>
            </div>
          ) : (
            <div className="feng__line">
              <Icon name="check" size={16} />
              <strong>Every check passes.</strong>
            </div>
          )}

          {/* <details> is the browser's own fold: closed until its summary is pressed */}
          {others.length > 0 && (
            <details className="feng__fold">
              <summary>
                <Icon name="plus" size={14} />
                {others.length} more to improve
              </summary>
              {others.map((check) => (
                <details key={check.title} className="feng__item">
                  <summary className="feng__line">
                    <Icon name={iconFor(check)} size={16} />
                    {check.title}
                    <span className="feng__gain">+{gainOf(check)}</span>
                  </summary>
                  <p>{check.tip}</p>
                </details>
              ))}
            </details>
          )}

          {passing.length > 0 && (
            <details className="feng__fold">
              <summary>
                <Icon name="plus" size={14} />
                {passing.length} already good
              </summary>
              {passing.map((check) => (
                <div key={check.title} className="feng__line feng__line--good">
                  <Icon name={iconFor(check)} size={16} />
                  {check.title}
                  <Icon name="check" size={14} />
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default FengShuiCard;
