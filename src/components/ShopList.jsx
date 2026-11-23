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

// The Shop tab of the side panel. It lists every piece in the room that has a shop
// link or a price, with a button that opens the product page and, at the foot, what
// the priced pieces cost together. Pieces with neither are named underneath.
function ShopList({ pieces }) {
  const yours = pieces.filter((piece) => !piece.existing);
  const hasDetails = (piece) => piece.link || getItem(piece.type).link || piece.price > 0;
  const linked = yours.filter(hasDetails);
  const unlinked = yours.filter((piece) => !hasDetails(piece));
  const priced = yours.filter((piece) => piece.price > 0);
  const total = priced.reduce((sum, piece) => sum + piece.price, 0);
  return (
    <div className="shop">
      {linked.length === 0 && <p className="dialog__body">Add a link or a price to a piece to start your list.</p>}

      <ul className="shop-list">
        {linked.map((piece) => {
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

      {unlinked.length > 0 && (
        <p className="dialog__body">
          No link or price yet for {unlinked.map((piece) => getItem(piece.type).name).join(', ')}.
        </p>
      )}
    </div>
  );
}

export default ShopList;
