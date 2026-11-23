import Button from './Button.jsx';
import ElementStrip from './ElementStrip.jsx';
import FengShuiCard from './FengShuiCard.jsx';
import Room3D from './Room3D.jsx';
import SelectionBar from './SelectionBar.jsx';
import { CATALOG } from '../data/catalog.js';
import { getArea, getFit } from '../lib/room.js';

// The left panel: the room on its stage, the controls floating over it, and
// the furniture strip underneath.
function PreviewPanel({
  lighting,
  surfaces,
  realistic,
  passes,
  brightness,
  onBrightness,
  onSavePicture,
  onRoomChange,
  onRealistic,
  onPasses,
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
  onSetLink,
  onAddItem,
  onUndo,
  onRedo,
  onZoom,
  onCanvasReady,
  isScoreOpen,
  onToggleScore,
  roomId,
  startView,
}) {
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);

  return (
    <section className="panel preview" aria-label="Room preview">
      <div className="stage">
        <Room3D
          room={room}
          roomId={roomId}
          startView={startView}
          pieces={pieces}
          selectedId={selectedId}
          view={view}
          showGrid={showGrid}
          lighting={lighting}
          surfaces={surfaces}
          realistic={realistic}
          brightness={brightness}
          onPasses={onPasses}
          onRoomChange={onRoomChange}
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
              onSetLink={onSetLink}
            />
          </div>
        )}

        {/* Inside the room: switch on the realistic picture, and see how far it has cleared up. */}
        {view === 'inside' && (
          <div className="stage__real">
            <Button variant={realistic ? 'primary' : 'white'} size="sm" icon="eye" aria-pressed={realistic} onClick={() => onRealistic(!realistic)}>
              Realistic
            </Button>
            {realistic && <span className="stage__passes">{passes < 1 ? 'Starting' : `${passes} ${passes === 1 ? 'pass' : 'passes'}`}</span>}
            {/* While the realistic picture is on: make it lighter or darker, and save it as it is now. */}
            {realistic && (
              <label className="stage__bright">
                Brightness
                <input
                  type="range"
                  aria-label="Brightness of the realistic picture"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={brightness}
                  onChange={(event) => onBrightness(Number(event.target.value))}
                />
              </label>
            )}
            {realistic && (
              <Button variant="white" size="sm" icon="download" onClick={onSavePicture}>
                Save picture
              </Button>
            )}
            {!realistic && <span className="stage__passes">Drag to look around, or click the floor to stand there.</span>}
          </div>
        )}

        <div className="stage__history">
          <Button variant="white" size="sm" icon="undo" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} />
          <Button variant="white" size="sm" icon="redo" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} />
          <span className="stage__area">{getArea(room)} m²</span>
        </div>

        <div className="stage__score">
          <FengShuiCard pieces={pieces} room={room} isOpen={isScoreOpen} onToggle={onToggleScore} />
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
