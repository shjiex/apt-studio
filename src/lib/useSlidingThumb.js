import { useLayoutEffect, useRef, useState } from 'react';

// A custom hook. A hook is a function that uses React's own hooks (useState,
// useRef, useLayoutEffect); writing one lets two components share the same
// behaviour without copying it.
//
// ViewSwitch and Segmented both show a row of options with one dark "thumb"
// behind the chosen one. This hook finds where the chosen option is, so the thumb
// can be drawn there, and stretches the thumb a little whenever the choice
// changes, so it seems to flow from the old option to the new one.
//
// Give it the id of the chosen option. It gives back three things:
//   thumb      where the thumb belongs, as { left, top, width, height } in pixels (null until the
//              first measure). A row uses left and width. A column (the view switch) uses top and height.
//   thumbRef   goes on the thumb element as its ref, so the hook can animate it
//   remember   remember(id) goes on each option's button as its ref, so the hook can measure it
//
// The row itself must be `position: relative` in CSS, so that "left" is counted
// from the row's own edge.
// `watch` is optional: any value that changes when the options change size (for the room
// tabs, the room names), so the thumb is measured again then.
export function useSlidingThumb(chosen, watch) {
  const buttons = useRef({}); // the option buttons, by id
  const thumbRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  // Measure the chosen button and move the thumb onto it. useLayoutEffect runs
  // before the browser paints, so the thumb never shows in the wrong place.
  useLayoutEffect(() => {
    function measure() {
      const button = buttons.current[String(chosen)];
      if (button) {
        setThumb({ left: button.offsetLeft, top: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight });
      }
    }
    measure();
    // the labels get wider when the web font arrives, so measure once more then
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [chosen, watch]);

  // The stretch: wider and flatter a third of the way through, then back, like a
  // drop of liquid being pulled along. Skipped the first time (nothing has moved
  // yet) and for people who have asked their system for less motion.
  const isFirst = useRef(true);
  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (thumbRef.current && thumbRef.current.animate && !lessMotion) {
      thumbRef.current.animate([{ scale: '1 1' }, { scale: '1.14 0.86', offset: 0.35 }, { scale: '1 1' }], {
        duration: 420,
        easing: 'ease-out',
      });
    }
  }, [chosen]);

  // remember('3d') makes the function React calls with that button's element.
  // Ids are kept as text, so true and false work as ids too.
  function remember(id) {
    return (element) => {
      buttons.current[String(id)] = element;
    };
  }

  return { thumb, thumbRef, remember };
}
