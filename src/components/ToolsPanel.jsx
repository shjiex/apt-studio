import ElementStrip from './ElementStrip.jsx';
import Icon from './Icon.jsx';
import LightingPanel from './LightingPanel.jsx';
import Segmented from './Segmented.jsx';
import SurfacesPanel from './SurfacesPanel.jsx';

const NAMES = { furniture: 'Furniture', lighting: 'Lighting', surfaces: 'Floor and walls' };

// The tools section to the left of the room. It holds the lighting panel and the
// floor and walls panel, so they open beside the room and leave it uncovered.
// In the "tools at the side" layout it also holds the furniture, and stays open.
// `tabs` lists which of the three it offers. The cross closes the section.
function ToolsPanel({ tab, tabs, onTab, onClose, items, boardName, pieces, onAddItem, lighting, onLighting, surfaces, onSurfaces, room, onRoomChange }) {
  return (
    <section className="panel tools" aria-label={NAMES[tab]}>
      <header className="tools__head">
        {tabs.length > 1 ? (
          <Segmented label="Tools" options={tabs.map((id) => [id, NAMES[id]])} value={tab} onChange={onTab} />
        ) : (
          <h2 className="tools__title">{NAMES[tab]}</h2>
        )}
        <button type="button" className="side__close" aria-label="Close the tools" title="Close the tools" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </header>

      {tab === 'furniture' && <ElementStrip items={items} pieces={pieces} onAdd={onAddItem} layout="grid" boardName={boardName} />}
      {tab === 'lighting' && <LightingPanel lighting={lighting} onChange={onLighting} windows={room.windows} />}
      {tab === 'surfaces' && <SurfacesPanel surfaces={surfaces} onChange={onSurfaces} room={room} onRoomChange={onRoomChange} />}
    </section>
  );
}

export default ToolsPanel;
