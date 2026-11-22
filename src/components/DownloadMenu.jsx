import { useState } from 'react';
import Button from './Button.jsx';

// The download button in the top bar. Pressing it opens two choices:
// a picture of what is on screen, or the room as a file.
// The room file is what pipeline/render_room.py reads to make a photo render.
function DownloadMenu({ onPicture, onRoomFile }) {
  const [isOpen, setIsOpen] = useState(false);

  function choose(action) {
    action();
    setIsOpen(false);
  }

  return (
    <div className="feng">
      <Button
        variant="secondary"
        icon="download"
        aria-label="Download"
        aria-expanded={isOpen}
        title="Download"
        onClick={() => setIsOpen(!isOpen)}
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
