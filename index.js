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

async function loadMp3PaperWasm() {
  try {
    const moduleFactoryImport = await import('./wasm/mp3paper.js');
    const moduleFactory = moduleFactoryImport.default;

    if (typeof moduleFactory !== 'function') {
      console.error('[mp3paper] Expected ES module default export factory function.');
      return;
    }

    const module = await moduleFactory({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return `./wasm/${path}`;
        }
        return path;
      },
    });

    console.log('[mp3paper] wasm module initialized');

    if (typeof module.cwrap === 'function') {
      const examplefunc1 = module.cwrap('examplefunc1', 'number', ['number']);
      const examplefunc2 = module.cwrap('examplefunc2', null, ['number']);

      const resultPtr = examplefunc1(44100);
      console.log('[mp3paper] examplefunc1(44100) returned pointer:', resultPtr);

      examplefunc2(0);
      console.log('[mp3paper] examplefunc2(0) called');
      return;
    }

    if (typeof module._examplefunc1 === 'function') {
      const resultPtr = module._examplefunc1(44100);
      console.log('[mp3paper] _examplefunc1(44100) returned pointer:', resultPtr);

      if (typeof module._examplefunc2 === 'function') {
        module._examplefunc2(0);
        console.log('[mp3paper] _examplefunc2(0) called');
      }
      return;
    }

    console.warn('[mp3paper] Test exports were not found on the module instance.');
  } catch (error) {
    console.error('[mp3paper] Failed to load wasm module:', error);
  }
}

loadMp3PaperWasm();

document.addEventListener('DOMContentLoaded', () => {
  const bitrateSlider = document.getElementById('bitrate');
  const bitrateDisplay = document.getElementById('bitrate-display');

  if (bitrateSlider && bitrateDisplay) {
    bitrateSlider.addEventListener('input', (e) => {
      bitrateDisplay.textContent = `${e.target.value} kbps`;
    });
  }
});
