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
  logout: 'M15 12H4m0 0l4-4m-4 4l4 4M11 5h8v14h-8',
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
