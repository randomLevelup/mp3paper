const cardBorderQuery = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
const cardBorderDefault = 'rgba(15, 118, 110, 0.25)';
let rafId = null;
let latestCursor = null;

// Cache the cards to avoid querying the DOM on every mouse move
const cards = Array.from(document.querySelectorAll('.card'));

function updateCardBorders() {
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const distanceToBox = getDistanceToBorder(latestCursor, rect);

    if (distanceToBox < 100) {
      const intensity = 1 - distanceToBox / 100;
      card.style.borderColor = `rgba(13, 148, 136, ${intensity})`;
      return;
    }

    card.style.borderColor = cardBorderDefault;
  });

  rafId = null;
}

function handlePointerMove(event) {
  if (!cardBorderQuery.matches) {
    return;
  }

  // Skip if the cursor hasn't actually moved (e.g. some browsers fire mousemove on scroll)
  if (latestCursor && latestCursor.x === event.clientX && latestCursor.y === event.clientY) {
    return;
  }

  latestCursor = { x: event.clientX, y: event.clientY };

  if (rafId === null) {
    rafId = window.requestAnimationFrame(updateCardBorders);
  }
}

function resetCardBorders() {
  cards.forEach((card) => {
    card.style.borderColor = cardBorderDefault;
  });
}

document.addEventListener('mousemove', handlePointerMove);
cardBorderQuery.addEventListener('change', resetCardBorders);
window.addEventListener('blur', resetCardBorders);

function getDistanceToBorder(point, rect) {
  if (!point) {
    return Number.POSITIVE_INFINITY;
  }

  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.sqrt(dx * dx + dy * dy);
}
