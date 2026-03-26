const sectionBorderQuery = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
const sectionBorderDefault = 'rgba(15, 118, 110, 0.25)';
let rafId = null;
let latestCursor = null;

// Cache the sections to avoid querying the DOM on every mouse move
const sections = Array.from(document.querySelectorAll('.section'));

function updateSectionBorders() {
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const distanceToBox = getDistanceToBorder(latestCursor, rect);

    if (distanceToBox < 100) {
      const intensity = 1 - distanceToBox / 100;
      section.style.borderColor = `rgba(13, 148, 136, ${intensity})`;
      return;
    }

    section.style.borderColor = sectionBorderDefault;
  });

  rafId = null;
}

function handlePointerMove(event) {
  if (!sectionBorderQuery.matches) {
    return;
  }

  // Skip if the cursor hasn't actually moved (e.g. some browsers fire mousemove on scroll)
  if (latestCursor && latestCursor.x === event.clientX && latestCursor.y === event.clientY) {
    return;
  }

  latestCursor = { x: event.clientX, y: event.clientY };

  if (rafId === null) {
    rafId = window.requestAnimationFrame(updateSectionBorders);
  }
}

function resetSectionBorders() {
  sections.forEach((section) => {
    section.style.borderColor = sectionBorderDefault;
  });
}

document.addEventListener('mousemove', handlePointerMove);
sectionBorderQuery.addEventListener('change', resetSectionBorders);
window.addEventListener('blur', resetSectionBorders);

function getDistanceToBorder(point, rect) {
  if (!point) {
    return Number.POSITIVE_INFINITY;
  }

  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.sqrt(dx * dx + dy * dy);
}
