import { CATEGORY_COLORS } from '../data/catalog.js';
import { asset } from '../lib/paths.js';

// One piece of furniture in the strip. Pressing it adds one to the room, in the
// first open spot. Dragging it onto the room adds one where you let go.
// A small badge shows how many of it are in the room.
function ElementTile({ item, count, onAdd }) {
  // How far the picture leans when the pointer is over the tile, in degrees. It is
  // worked out from the letters of the piece's name, so every tile leans its own way
  // and the same tile leans the same way each time. The result is one of
  // -7, -5, -3, 3, 5 or 7.
  const letters = item.type.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const tilt = [-7, -5, -3, 3, 5, 7][letters % 6];

  return (
    <button
      type="button"
      className={count > 0 ? 'tile is-in-room' : 'tile'}
      aria-label={`Add ${item.name}. ${count} in the room.`}
      onClick={() => onAdd(item.type)}
      // The browser's own drag and drop: say what is being dragged, and the stage reads it on drop.
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/apt-studio-piece', item.type);
        event.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span className="tile__face" style={{ background: CATEGORY_COLORS[item.category] }}>
        <img src={asset(item.image)} alt="" style={{ '--tilt': `${tilt}deg` }} />
        {count > 0 && <span className="tile__check">{count}</span>}
        {item.link && <span className="tile__shop">Shop</span>}
      </span>
      <span className="tile__label">{item.name}</span>
    </button>
  );
}

export default ElementTile;
