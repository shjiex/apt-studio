// Loads the pins of a public Pinterest board.
//
// This uses the feed behind Pinterest's own board-embed widget. It needs no
// key and works from the browser, but it only reads PUBLIC boards and returns
// at most 50 pins. Pinterest's full API (v5) needs an approved developer app
// and a server to keep the app secret, which this project does not have yet.

const WIDGET_URL = 'https://widgets.pinterest.com/v3/pidgets/boards';

// Turns "https://www.pinterest.com/someone/my-board/" into
// { username: 'someone', board: 'my-board' }. Returns null if it is not a board link.
export function parseBoardUrl(text) {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  let url;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch (error) {
    return null;
  }
  if (!url.hostname.includes('pinterest.')) return null;
  const parts = url.pathname.split('/').filter((part) => part !== '');
  if (parts.length < 2) return null;
  // Links such as /pin/123 or /search/... are not boards.
  if (['pin', 'search', 'ideas', 'today'].includes(parts[0])) return null;
  return { username: parts[0], board: parts[1] };
}

// Fetches the board and returns it in the shape the moodboard uses.
// Throws an Error with a message that is safe to show to the person.
export async function fetchBoard(username, board) {
  let response;
  try {
    response = await fetch(`${WIDGET_URL}/${username}/${board}/pins/`);
  } catch (error) {
    // The shared test link runs on a page that is not allowed to talk to other
    // sites, so the request never leaves the browser there. Say so, in place of
    // blaming the person's connection.
    if (import.meta.env.VITE_DEMO) {
      throw new Error('This test link can’t reach Pinterest, because the page it runs on blocks other sites. Connecting a board works when the app runs from your computer.');
    }
    throw new Error('We couldn’t reach Pinterest. Check your connection and try again.');
  }
  if (response.status === 404) {
    throw new Error('Board not found. Check the link, and make sure the board is public.');
  }
  if (!response.ok) {
    throw new Error('Pinterest did not answer. Try again in a moment.');
  }

  const result = await response.json();
  const { board: boardInfo, user, pins } = result.data;

  return {
    source: 'pinterest',
    boardName: boardInfo.name,
    boardUrl: `https://www.pinterest.com${boardInfo.url}`,
    owner: user.full_name,
    images: pins
      .filter((pin) => pin.images && pin.images['237x'])
      .map((pin) => ({
        id: pin.id,
        src: pin.images['237x'].url,
        width: pin.images['237x'].width,
        height: pin.images['237x'].height,
        color: pin.dominant_color || '#EFEEEB',
        description: pin.description || 'Pin',
        link: `https://www.pinterest.com/pin/${pin.id}/`,
      })),
  };
}
