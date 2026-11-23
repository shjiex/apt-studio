import { useRef } from 'react';
import Button from './Button.jsx';
import DownloadMenu from './DownloadMenu.jsx';
import ElementStrip from './ElementStrip.jsx';
import FengShuiCard from './FengShuiCard.jsx';
import Icon from './Icon.jsx';
import Room3D from './Room3D.jsx';
import ViewSwitch from './ViewSwitch.jsx';
import { CATALOG } from '../data/catalog.js';
import { getArea } from '../lib/room.js';
import { formatArea } from '../lib/units.js';
import Slider from './Slider.jsx';

// After this many passes the realistic picture has no grain left that you can see.
const SHARP_AT = 64;

// The middle of the screen: the room on its stage with glass controls floating over
// it, and under it a card with the furniture to add.
// Where each control sits follows the Figma frame 216:4506. Top right: download, then
// the view switch. Right: zoom, then the room score. Bottom left: undo, redo and the
// floor area. Bottom middle: the measurement grid, lighting, and floor and walls.
// showStrip is false when the furniture is in the tools section at the side.
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
  onRemove,
  onAddItem,
  onUndo,
  onRedo,
  onZoom,
  onCanvasReady,
  isScoreOpen,
  onToggleScore,
  roomId,
  startView,
  onView,
  onGrid,
  openTool,
  onTool,
  isDownloadOpen,
  onToggleDownload,
  onCloseDownload,
  onRoomFile,
  showStrip,
  units,
  onEdit,
  onDropItem,
}) {
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);
  // The element that holds the Rotate and Remove buttons. Room3D moves it every
  // frame so it stays over the selected piece (see ActionsAnchor in Room3D.jsx).
  const actionsRef = useRef(null);

  // A furniture tile was dropped on the stage. ElementTile put the piece's type in
  // the drag (dataTransfer), and Workspace turns the drop's place into a spot on the floor.
  function handleDrop(event) {
    const type = event.dataTransfer.getData('text/apt-studio-piece');
    if (!type) return;
    event.preventDefault();
    onDropItem(type, event.clientX, event.clientY);
  }


  return (
    <section className="preview" aria-label="Room preview">
      {/* onDragOver has to say "yes, you may drop here" (preventDefault), or the browser refuses the drop. */}
      <div className="stage" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
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
          units={units}
          actionsRef={actionsRef}
          onEdit={onEdit}
        />

        {/* Rotate and Remove float over the selected piece. Remove is red so it is easy to spot. */}
        {selectedPiece && (
          <div className="stage__actions" ref={actionsRef}>
            <button type="button" className="stage__action" aria-label="Rotate" title="Rotate (R)" onClick={() => onRotate(selectedPiece.id)}>
              <Icon name="rotate" size={18} />
            </button>
            <button
              type="button"
              className="stage__action stage__action--remove"
              aria-label="Remove"
              title="Remove (Delete)"
              onClick={() => onRemove(selectedPiece.id)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}
        {/* Inside the room: switch on the realistic picture, and see how far it has cleared up. */}
        {view === 'inside' && (
          <div className="stage__real">
            <Button variant={realistic ? 'primary' : 'white'} size="sm" icon="eye" aria-pressed={realistic} onClick={() => onRealistic(!realistic)}>
              Realistic
            </Button>
            {/* How far the realistic picture has come. It counts up to SHARP_AT passes, so you
                can see it is working and when it is done. */}
            {realistic && (
              <span className="stage__passes" role="status">
                {passes >= SHARP_AT ? 'Sharp' : `Sharpening ${Math.round((passes / SHARP_AT) * 100)}%`}
              </span>
            )}
            {/* While the realistic picture is on: make it lighter or darker, and save it as it is now. */}
            {realistic && (
              <label className="stage__bright">
                Brightness
                <Slider
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
          </div>
        )}

        <div className="stage__corner">
          <DownloadMenu
            onPicture={onSavePicture}
            onRoomFile={onRoomFile}
            isOpen={isDownloadOpen}
            onToggle={onToggleDownload}
            onClose={onCloseDownload}
          />
          <ViewSwitch view={view} onChange={onView} />
        </div>
        <div className="stage__tools">
          <Button
            variant={showGrid ? 'primary' : 'glass'}
            icon="measure"
            aria-pressed={showGrid}
            title="Measurement grid"
            onClick={onGrid}
          >
            <span className="stage__word">Grid</span>
          </Button>
          <Button
            variant={openTool === 'lighting' ? 'primary' : 'glass'}
            icon="bulb"
            aria-expanded={openTool === 'lighting'}
            title="Lighting"
            onClick={() => onTool('lighting')}
          >
            <span className="stage__word">Lighting</span>
          </Button>
          <Button
            variant={openTool === 'surfaces' ? 'primary' : 'glass'}
            icon="layers"
            aria-expanded={openTool === 'surfaces'}
            title="Floor, walls, windows and doors"
            onClick={() => onTool('surfaces')}
          >
            <span className="stage__word">Floor and walls</span>
          </Button>
        </div>
        <div className="stage__history">
          <Button variant="white" size="sm" icon="undo" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} />
          <Button variant="white" size="sm" icon="redo" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} />
          <span className="stage__area">{formatArea(getArea(room), units)}</span>
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

      {/* The catalog, then furniture made from moodboard images, in a card of its own. */}
      {showStrip && (
        <div className="panel strip-card">
          <ElementStrip items={[...CATALOG, ...pinModels]} pieces={pieces} onAdd={onAddItem} />
        </div>
      )}
    </section>
  );
}

export default PreviewPanel;
