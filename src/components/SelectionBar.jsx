import Button from './Button.jsx';
import FitTag from './FitTag.jsx';
import { getItem } from '../data/catalog.js';
import { getWallDistances } from '../lib/room.js';

// Shown over the stage while a piece is selected: its name and size, how far
// it is from the two nearest walls, whether it fits, and what you can do to it.
function SelectionBar({ piece, room, fit, onRotate, onDuplicate, onRemove }) {
  const item = getItem(piece.type);
  const gaps = getWallDistances(piece, room);
  const side = gaps.left <= gaps.right ? ['left', gaps.left] : ['right', gaps.right];
  const depth = gaps.back <= gaps.front ? ['back', gaps.back] : ['front', gaps.front];
  const toCm = (metres) => Math.round(metres * 100);

  return (
    <div className="selection-bar">
      <span className="selection-bar__name">{item.name}</span>
      <span className="selection-bar__size">
        {toCm(item.size.w)} × {toCm(item.size.d)} cm
        {piece.existing && ' · already yours'}
      </span>
      <span className="selection-bar__size">
        {toCm(side[1])} cm to {side[0]} wall · {toCm(depth[1])} cm to {depth[0]} wall
      </span>
      <FitTag fit={fit} />
      <Button variant="secondary" size="sm" icon="rotate" onClick={() => onRotate(piece.id)}>
        Rotate
      </Button>
      <Button variant="secondary" size="sm" icon="copy" onClick={() => onDuplicate(piece.id)}>
        Duplicate
      </Button>
      <Button variant="secondary" size="sm" icon="trash" onClick={() => onRemove(piece.id)}>
        Remove
      </Button>
    </div>
  );
}

export default SelectionBar;
