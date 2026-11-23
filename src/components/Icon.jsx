// Small line icons drawn as inline SVG so they take the text colour.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 19h14',
  ruler: 'M4 16L16 4l4 4L8 20zM9 11l2 2M12 8l2 2M6 14l2 2',
  rotate: 'M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  undo: 'M9 14L5 10l4-4M5 10h9a5 5 0 0 1 0 10h-3',
  grid: 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01',
  upload: 'M12 20V9m0 0l-4 4m4-4l4 4M5 5h14',
  warning: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  redo: 'M15 14l4-4-4-4M19 10h-9a5 5 0 0 0 0 10h3',
  minus: 'M5 12h14',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  measure: 'M4 9h16M4 15h16M9 4v16M15 4v16',
  pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  open: 'M8 16L16 8M9 8h7v7',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  logout: 'M15 12H4m0 0l4-4m-4 4l4 4M11 5h8v14h-8',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.5 16.5L20 20',
  // the top bar, the panels and the fields of a selected piece
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  door: 'M6 21V4h12v17M3 21h18M14.5 12.5h.01',
  window: 'M4 4h16v16H4zM12 4v16M4 12h16',
  chevron: 'M6 9l6 6 6-6',
  sidebar: 'M4 5h16v14H4zM9 5v14',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  width: 'M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4',
  height: 'M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4',
  depth: 'M5 19L19 5M19 5h-6M19 5v6M5 19h6M5 19v-6',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  frame: 'M5 3h14v18H5zM8 6h8v12H8z',
  scan: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16',
  plant: 'M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z',
  // the home and one icon per kind of room (see lib/rooms.js)
  home: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6',
  bed: 'M3 6v13M3 15h18v4M7 15v-4h10a4 4 0 0 1 4 4',
  sofa: 'M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3zM6 18v2M18 18v2',
  kitchen: 'M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21v-8M17 13c-2-2-2-8 0-10v10',
  dining: 'M4 10h16M12 10v9M8 19h8M2 6v13M22 6v13',
  desk: 'M3 8h18M5 8v11M19 8v11M13 8v6h6',
  bath: 'M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M8 19l-1 2M16 19l1 2',
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export default Icon;
