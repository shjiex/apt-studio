import Button from './Button.jsx';

// The download button at the top right of the stage. Pressing it opens two choices:
// a picture of what is on screen, or the room as a file.
// The room file is what pipeline/render_room.py reads to make a photo render.
// Whether the menu is open is kept in Workspace, so only one panel is open at a time.
function DownloadMenu({ onPicture, onRoomFile, isOpen, onToggle, onClose }) {
  // Do the chosen download, then close the menu.
  function choose(action) {
    action();
    onClose();
  }

  return (
    <div className="feng">
      <Button
        variant="glass"
        icon="download"
        aria-label="Download"
        aria-expanded={isOpen}
        title="Download"
        onClick={onToggle}
      />

      {isOpen && (
        <div className="feng__card download-menu">
          <button type="button" className="download-menu__choice" onClick={() => choose(onPicture)}>
            <strong>Picture</strong>
            <span>A picture of what you see on screen now, saved as a PNG.</span>
          </button>
          <button type="button" className="download-menu__choice" onClick={() => choose(onRoomFile)}>
            <strong>Room file</strong>
            <span>Your room and every piece in it, ready for a photo render.</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default DownloadMenu;
