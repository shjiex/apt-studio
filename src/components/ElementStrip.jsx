import ElementTile from './ElementTile.jsx';

// The row of furniture tiles under the stage.
function ElementStrip({ items, pieces, onAdd }) {
  return (
    <div className="strip" aria-label="Furniture to add">
      {items.map((item) => (
        <ElementTile
          key={item.type}
          item={item}
          count={pieces.filter((piece) => piece.type === item.type).length}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

export default ElementStrip;
