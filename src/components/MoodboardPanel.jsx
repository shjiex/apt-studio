import { Link } from 'react-router-dom';
import AccountButton from './AccountButton.jsx';
import Button from './Button.jsx';

// The inspiration board on the right, laid out like a Pinterest board:
// a big board name, then pins in columns. Pressing a pin picks it, shown by a
// border inside the image.
// Each image aims at ONE object. If a 3D model was made from it, a frame shows
// where that object is and a button under the image puts it in the room.
function MoodboardPanel({ moodboard, pickedIds, pinModels, user, onTogglePick, onAddItem, onConnect, onLogOut }) {
  const isPinterest = moodboard.source === 'pinterest';

  return (
    <section className="panel moodboard" aria-label="Moodboard">
      <header className="board-header">
        <div>
          <h1>{isPinterest ? moodboard.boardName : 'Moodboard'}</h1>
          <p className="board-header__meta">
            {isPinterest ? (
              <>
                <a href={moodboard.boardUrl} target="_blank" rel="noreferrer">
                  {moodboard.owner} on Pinterest
                </a>
                {' · '}
              </>
            ) : (
              'Sample photos · '
            )}
            {moodboard.images.length} Pins · {pickedIds.length} picked
          </p>
        </div>
        <div className="board-header__actions">
          <Button
            variant="secondary"
            icon="pin"
            aria-label={isPinterest ? 'Change Pinterest board' : 'Connect a Pinterest board'}
            title={isPinterest ? 'Change Pinterest board' : 'Connect a Pinterest board'}
            onClick={onConnect}
          />
          <AccountButton user={user} onLogOut={onLogOut} />
        </div>
      </header>

      {isPinterest && !user && (
        <p className="board-notice">
          <Link to="/login">Log in</Link> to keep this board and your picks.
        </p>
      )}

      <div className="pin-grid">
        {moodboard.images.map((image) => {
          const isPicked = pickedIds.includes(image.id);
          const model = pinModels.find((candidate) => candidate.pinId === image.id);
          return (
            <div className="pin-card" key={image.id}>
              <button
                type="button"
                className={isPicked ? 'pin is-picked' : 'pin'}
                aria-pressed={isPicked}
                onClick={() => onTogglePick(image.id)}
              >
                <span className="pin__image" style={{ background: image.color }}>
                  <img
                    src={image.src}
                    alt={image.description}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                  />
                  {model && (
                    <span
                      className="pin__target"
                      style={{
                        left: `${model.box[0] * 100}%`,
                        top: `${model.box[1] * 100}%`,
                        width: `${(model.box[2] - model.box[0]) * 100}%`,
                        height: `${(model.box[3] - model.box[1]) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className="pin__title">{image.description}</span>
              </button>
              {model && (
                <button type="button" className="pin__add" onClick={() => onAddItem(model.type)}>
                  <img src={model.image} alt="" />
                  Add this {model.name.toLowerCase()} in 3D
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default MoodboardPanel;
