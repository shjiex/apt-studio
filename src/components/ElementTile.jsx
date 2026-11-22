import { CATEGORY_COLORS } from '../data/catalog.js';

// One piece of furniture in the strip. Pressing it adds one to the room.
// A small badge shows how many of it are in the room.
function ElementTile({ item, count, onAdd }) {
  return (
    <button
      type="button"
      className={count > 0 ? 'tile is-in-room' : 'tile'}
      aria-label={`Add ${item.name}. ${count} in the room.`}
      onClick={() => onAdd(item.type)}
    >
      <span className="tile__face" style={{ background: CATEGORY_COLORS[item.category] }}>
        <img src={item.image} alt="" />
        {count > 0 && <span className="tile__check">{count}</span>}
      </span>
      <span className="tile__label">{item.name}</span>
    </button>
  );
}

export default ElementTile;
