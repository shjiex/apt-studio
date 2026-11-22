import Button from './Button.jsx';
import ElementStrip from './ElementStrip.jsx';
import Room3D from './Room3D.jsx';
import SelectionBar from './SelectionBar.jsx';
import { CATALOG } from '../data/catalog.js';
import { getArea, getFit } from '../lib/room.js';

// The left panel: the room on its stage, the controls floating over it, and
// the furniture strip underneath.
function PreviewPanel({
  pinModels,
  room,
  pieces,
  selectedId,
  view,
  showGrid,
  zoom,
  canUndo,
  canRedo,
  onSelect,
  onMove,
  onDragStart,
  onRotate,
  onDuplicate,
  onRemove,
  onAddItem,
  onUndo,
  onRedo,
  onZoom,
  onCanvasReady,
}) {
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);

  return (
    <section className="panel preview" aria-label="Room preview">
      <div className="stage">
        <Room3D
          room={room}
          pieces={pieces}
          selectedId={selectedId}
          view={view}
          showGrid={showGrid}
          zoom={zoom}
          onSelect={onSelect}
          onMove={onMove}
          onDragStart={onDragStart}
          onZoom={onZoom}
          onCanvasReady={onCanvasReady}
        />

        {selectedPiece && (
          <div className="stage__overlay">
            <SelectionBar
              piece={selectedPiece}
              room={room}
              fit={getFit(selectedPiece, pieces, room)}
              onRotate={onRotate}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
            />
          </div>
        )}

        <div className="stage__history">
          <Button variant="white" size="sm" icon="undo" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} />
          <Button variant="white" size="sm" icon="redo" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} />
          <span className="stage__area">{getArea(room)} m²</span>
        </div>

        <div className="stage__zoom">
          <Button variant="white" size="sm" icon="plus" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(zoom * 1.2)} />
          <Button variant="white" size="sm" icon="minus" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(zoom / 1.2)} />
          <Button variant="white" size="sm" icon="fit" aria-label="Fit the room" title="Fit the room" onClick={() => onZoom(1)} />
        </div>
      </div>

      {/* The catalog, then furniture made from moodboard images. */}
      <ElementStrip items={[...CATALOG, ...pinModels]} pieces={pieces} onAdd={onAddItem} />
    </section>
  );
}

export default PreviewPanel;
