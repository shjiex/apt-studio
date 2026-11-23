// Loads the pins of a public Pinterest board.
//
// This uses the feed behind Pinterest's own board-embed widget. It needs no
// key and works from the browser, but it only reads PUBLIC boards and returns
// at most 50 pins. Pinterest's full API (v5) needs an approved developer app
// and a server to keep the app secret, which this project does not have yet.

const WIDGET_URL = 'https://widgets.pinterest.com/v3/pidgets/boards';

// Words that come first in a Pinterest address but are not a person's name.
const NOT_A_PERSON = ['pin', 'search', 'ideas', 'today', 'explore', 'business', 'settings', 'login', 'signup'];
// Tabs of a profile page. They come second in the address, where a board's name would be.
const PROFILE_TABS = ['_saved', '_created', '_pins', '_boards', 'pins', 'boards', 'followers', 'following'];

// Reads what someone pasted and says which board it is.
// Returns { username, board } for a board link, or { problem } with a sentence
// to show when it is something else (a pin, a profile, a short link, not a link).
// It accepts the link with or without https, from any country's Pinterest
// (pinterest.co.uk, br.pinterest.com), with a section after the board, and inside
// a longer text such as the message the Pinterest app writes when you share.
export function readBoardLink(text) {
  const example = 'Paste a board link, like pinterest.com/yourname/your-board';
  // Take the part of the text that is the link.
  const found = text.match(/(https?:\/\/)?[\w.-]*(pinterest\.[a-z.]+|pin\.it)\/[^\s]*/i);
  if (!found) return { problem: example };
  let url;
  try {
    url = new URL(found[0].startsWith('http') ? found[0] : `https://${found[0]}`);
  } catch (error) {
    return { problem: example };
  }
  // pin.it links are short links. Only Pinterest knows where they lead, and a web
  // page is not allowed to follow them and read the answer.
  if (url.hostname === 'pin.it') {
    return { problem: 'That is a short link. Open it, then copy the link from the address bar of the board.' };
  }
  const parts = url.pathname.split('/').filter((part) => part !== '');
  if (parts[0] === 'pin') return { problem: 'That link is one pin. Paste the link of the board it is saved on.' };
  if (parts.length === 0 || NOT_A_PERSON.includes(parts[0])) return { problem: example };
  if (parts.length === 1 || PROFILE_TABS.includes(parts[1])) {
    return { problem: 'That link is a profile. Open one of its boards and paste that link.' };
  }
  return { username: parts[0], board: parts[1] };
}

// The older name for the same check: the board, or null when it is not a board link.
export function parseBoardUrl(text) {
  const read = readBoardLink(text);
  return read.problem ? null : read;
}

// Pinterest writes some characters as codes in its descriptions: &amp; for &, and
// a number such as &#8217; for a curly apostrophe. This turns them back and trims the ends.
function tidy(text) {
  return (text || '')
    .replace(/&#(\d+);/g, (code, number) => String.fromCodePoint(Number(number)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

// Fetches the board and returns it in the shape the moodboard uses.
// Throws an Error with a message that is safe to show to the person.
export async function fetchBoard(username, board) {
  // Give up after 15 seconds, so the button does not say "Loading pins" for ever.
  const stopper = new AbortController();
  const timer = setTimeout(() => stopper.abort(), 15000);
  let response;
  try {
    response = await fetch(`${WIDGET_URL}/${username}/${board}/pins/`, { signal: stopper.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Pinterest took too long to answer. Try again in a moment.');
    }
    // The shared test link runs on a page that is not allowed to talk to other
    // sites, so the request never leaves the browser there. Say so, in place of
    // blaming the person's connection.
    if (import.meta.env.VITE_DEMO) {
      throw new Error('This test link can’t reach Pinterest, because the page it runs on blocks other sites. Connecting a board works when the app runs from your computer.');
    }
    throw new Error('We couldn’t reach Pinterest. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 404) {
    throw new Error('Board not found. Check the link, and make sure the board is public.');
  }
  if (response.status === 429) {
    throw new Error('Pinterest is asking us to slow down. Try again in a minute.');
  }
  if (!response.ok) {
    throw new Error('Pinterest did not answer. Try again in a moment.');
  }

  // The answer should hold the board, its owner and its pins. If Pinterest ever
  // changes the feed, say so plainly in place of a crash.
  let data;
  try {
    data = (await response.json()).data;
  } catch (error) {
    data = null;
  }
  if (!data || !data.board || !Array.isArray(data.pins)) {
    throw new Error('Pinterest sent an answer we couldn’t read. Try again in a moment.');
  }
  const { board: boardInfo, user, pins } = data;

  return {
    source: 'pinterest',
    boardName: tidy(boardInfo.name) || board,
    boardUrl: `https://www.pinterest.com${boardInfo.url || `/${username}/${board}/`}`,
    owner: user ? user.full_name : username,
    // How many pins the board has in all. The feed gives at most 50 of them.
    pinCount: boardInfo.pin_count || pins.length,
    images: pins
      // The feed gives each picture in up to three widths: 236, 237 and 564 pixels.
      // The moodboard shows cards about 260 pixels wide, twice that on a sharp
      // screen, so the widest one is used when it is there.
      .map((pin) => ({ pin, picture: pin.images && (pin.images['564x'] || pin.images['237x'] || pin.images['236x']) }))
      .filter(({ picture }) => picture && picture.url)
      .map(({ pin, picture }) => ({
        id: pin.id,
        src: picture.url,
        width: picture.width,
        height: picture.height,
        color: pin.dominant_color || '#EFEEEB',
        description: tidy(pin.description) || 'Pin',
        link: `https://www.pinterest.com/pin/${pin.id}/`,
      })),
  };
}
