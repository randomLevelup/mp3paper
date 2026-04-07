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

    if (typeof module._mp3_init === 'function') {
      module._mp3_init(44100, 2);
      console.log('[mp3paper] state engine and LAME initialized');
      
      const uploadStatus = document.getElementById('upload-status');
      const btnUpload = document.getElementById('btn-upload');
      const btnExample = document.getElementById('btn-example');
      const btnEncode = document.getElementById('btn-encode');

      async function loadWavData(buffer, filename) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(buffer);
        
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        
        // Interleave the float channels into 16-bit PCM
        const interleaved = new Int16Array(length * numChannels);
        for (let i = 0; i < numChannels; i++) {
          const channelData = audioBuffer.getChannelData(i);
          for (let j = 0; j < length; j++) {
            let val = channelData[j];
            val = Math.max(-1, Math.min(1, val));
            interleaved[j * numChannels + i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
          }
        }
        
        // Update module with actual sample rate and channel count
        module._mp3_init(audioBuffer.sampleRate, numChannels);

        const uint8Array = new Uint8Array(interleaved.buffer);
        const ptr = module._mp3_alloc_buffer(uint8Array.length);
        module.HEAPU8.set(uint8Array, ptr);
        
        module._mp3_load_data(ptr, uint8Array.length);
        module._mp3_free_buffer(ptr);
        
        uploadStatus.textContent = `Loaded: ${filename} (${(uint8Array.length / 1024).toFixed(1)} KB)`;
      }

      if (btnUpload) {
        btnUpload.addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.wav';
          input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            uploadStatus.textContent = "Loading file...";
            const buffer = await file.arrayBuffer();
            await loadWavData(buffer, file.name);
          };
          input.click();
        });
      }

      if (btnExample) {
        btnExample.addEventListener('click', async () => {
          try {
            uploadStatus.textContent = "Downloading example...";
            const response = await fetch('example.wav');
            if (!response.ok) throw new Error("Could not fetch example.wav");
            const buffer = await response.arrayBuffer();
            await loadWavData(buffer, 'example.wav');
          } catch (err) {
            console.error(err);
            uploadStatus.textContent = "Error loading example.wav";
          }
        });
      }

      const bitrateSlider = document.getElementById('bitrate');
      const bitrateDisplay = document.getElementById('bitrate-display');

      if (bitrateSlider && bitrateDisplay) {
        bitrateSlider.addEventListener('input', (e) => {
          const kbps = parseInt(e.target.value, 10);
          bitrateDisplay.textContent = `${kbps} kbps`;
          module._mp3_set_bitrate(kbps);
        });
      }

      if (btnEncode) {
        btnEncode.addEventListener('click', () => {
          const cbPtr = module.addFunction((stateCode, dataPtr) => {
            const json = module.UTF8ToString(dataPtr);
            console.log(`[mp3paper] encode callback state=${stateCode}`, json);
          }, 'vii');
          module._mp3_encode(cbPtr);
          module.removeFunction(cbPtr);
        });
      }

      return;
    }

    console.warn('[mp3paper] mp3 initialization exports were not found.');
  } catch (error) {
    console.error('[mp3paper] Failed to load wasm module:', error);
  }
}

loadMp3PaperWasm();
