import { useState } from 'react';
import Icon from './Icon.jsx';
import { getItem } from '../data/catalog.js';
import { asset } from '../lib/paths.js';

// The short site name of a link, such as "amazon.com".
export function siteOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

// The small icon of the site a link goes to. Most sites serve one at
// /favicon.ico. If it does not load, the site's first letter is shown instead.
export function SiteIcon({ site }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="site-icon">{site[0]}</span>;
  return <img className="site-icon" src={`https://${site}/favicon.ico`} alt="" onError={() => setFailed(true)} />;
}

// 249 -> "$249", 249.5 -> "$249.50"
export function formatPrice(price) {
  return `$${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

// The Shop tab of the side panel. It lists every piece you would buy for the room
// (not the ones marked Own): first those with a shop link or a price, with a button
// that opens the product page, then the rest, each with a small button that opens the
// piece so a link or a price can be added. At the foot is what the priced pieces cost
// together. `onSelect` is told the id of the piece whose button was pressed.
function ShopList({ pieces, onSelect }) {
  const yours = pieces.filter((piece) => !piece.existing);
  const hasDetails = (piece) => piece.link || getItem(piece.type).link || piece.price > 0;
  // the pieces with a link or a price come first
  const inOrder = [...yours.filter(hasDetails), ...yours.filter((piece) => !hasDetails(piece))];
  const priced = yours.filter((piece) => piece.price > 0);
  const total = priced.reduce((sum, piece) => sum + piece.price, 0);
  return (
    <div className="shop">
      {yours.length === 0 && <p className="dialog__body">Furniture you add to the room is listed here.</p>}

      <ul className="shop-list">
        {inOrder.map((piece) => {
          const item = getItem(piece.type);
          const link = piece.link || item.link;
          return (
            <li key={piece.id} className="shop-row">
              <img src={asset(item.image)} alt="" />
              <span className="shop-row__text">
                <strong>{item.name}</strong>
                {link && (
                  <span className="shop-row__site">
                    <SiteIcon site={siteOf(link)} />
                    {siteOf(link)}
                  </span>
                )}
              </span>
              {piece.price > 0 && <strong className="shop-row__price">{formatPrice(piece.price)}</strong>}
              {link && (
                <a className="btn btn--secondary btn--sm" href={link} target="_blank" rel="noreferrer">
                  Open
                  <Icon name="open" size={16} />
                </a>
              )}
              {/* no link and no price yet: the tag opens the piece, where both are added */}
              {!hasDetails(piece) && (
                <button type="button" className="icon-action" aria-label={`Add a link or a price to the ${item.name}`} title="Add a link or a price" onClick={() => onSelect(piece.id)}>
                  <Icon name="tag" size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* what the priced pieces cost together, and how many that covers */}
      {priced.length > 0 && (
        <div className="shop-total">
          <span>
            Total for {priced.length} {priced.length === 1 ? 'piece' : 'pieces'}
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
      )}
    </div>
  );
}

export default ShopList;
