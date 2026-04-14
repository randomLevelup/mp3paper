import { createPlottingHelpers } from './plotting.js';

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
      const infoEncode = document.getElementById('info-encode');
      const btnPolyphase = document.getElementById('btn-polyphase');
      const infoPolyphase = document.getElementById('info-polyphase');
      const btnPsycho = document.getElementById('btn-psycho');
      const infoPsycho = document.getElementById('info-psycho');
      const btnBitalloc = document.getElementById('btn-bitalloc');
      const infoBitalloc = document.getElementById('info-bitalloc');
      const audioResult = document.getElementById('audio-result');
      const graphPolyphase = document.getElementById('graph-polyphase');
      const graphPsycho = document.getElementById('graph-psycho');
      const graphBitalloc = document.getElementById('graph-bitalloc');
      let psychoDataCache = null;
      let resultAudioUrl = null;

      const MP3_STATE = {
        IDLE: 0,
        LAME_INITIALIZED: 1,
        FILE_LOADED: 2,
        ENCODING_STARTED: 3,
        ENCODING_COMPLETE: 4,
        POLYPHASE_COMPLETE: 5,
        PSYCHO_COMPLETE: 6,
        BITALLOC_COMPLETE: 7,
        ERROR_STATE: 8,
      };

      const {
        setSourceDuration,
        purgePlot,
        renderPolyphasePlot,
        renderPsychoPlot,
        renderBitallocPlot,
      } = createPlottingHelpers({
        graphPolyphase,
        graphPsycho,
        graphBitalloc,
      });

      function cleanWasmMessage(payload) {
        if (typeof payload !== 'string') {
          return '';
        }
        return payload.replace(/^Error:\s*/i, '').trim();
      }

      function parseJsonPayload(payload) {
        try {
          return JSON.parse(payload);
        } catch {
          return null;
        }
      }

      function getGuidanceMessage(stepKey, stateCode, payload) {
        const cleaned = cleanWasmMessage(payload);
        const normalized = cleaned.toLowerCase();

        if (stepKey === 'encode') {
          if (normalized.includes('no audio data loaded')) {
            return 'No audio data loaded. Upload a WAV file first.';
          }
          if (stateCode === MP3_STATE.IDLE || stateCode === MP3_STATE.LAME_INITIALIZED) {
            return 'No audio data loaded. Upload a WAV file first.';
          }
          return cleaned || 'Encoding failed. Upload a WAV file and try again.';
        }

        if (stepKey === 'polyphase') {
          if (normalized.includes('encode not complete')) {
            return 'Run Encode first, then run Polyphase.';
          }
          return cleaned || 'Polyphase is not ready yet. Complete Encode first.';
        }

        if (stepKey === 'psycho') {
          if (normalized.includes('polyphase step not ready')) {
            return 'Run Polyphase first, then run Psychoacoustics.';
          }
          return cleaned || 'Psychoacoustics is not ready yet. Complete Polyphase first.';
        }

        if (stepKey === 'bitalloc') {
          if (normalized.includes('psycho step not ready')) {
            return 'Run Psychoacoustics first, then run Bit Allocation.';
          }
          return cleaned || 'Bit Allocation is not ready yet. Complete Psychoacoustics first.';
        }

        return cleaned || 'Operation failed. Please try again.';
      }

      function runWasmStep({ stepKey, expectedState, invoke, onSuccess, onError }) {
        const cbPtr = module.addFunction((stateCode, dataPtr) => {
          const payload = dataPtr ? module.UTF8ToString(dataPtr) : '';
          console.log(`[mp3paper] ${stepKey} callback state=${stateCode}`, payload);

          if (stateCode === expectedState) {
            onSuccess(payload, stateCode);
            return;
          }

          const message = getGuidanceMessage(stepKey, stateCode, payload);
          onError(message, stateCode, payload);
        }, 'vii');

        invoke(cbPtr);
        module.removeFunction(cbPtr);
      }

      function clearRenderedAudio() {
        setSourceDuration(0);
        purgePlot(graphPolyphase);
        purgePlot(graphPsycho);
        purgePlot(graphBitalloc);
        
        if (infoEncode) infoEncode.textContent = 'Ready to encode once a WAV file is loaded.';
        if (infoPolyphase) infoPolyphase.textContent = 'Waiting for Run...';
        if (infoPsycho) infoPsycho.textContent = 'Waiting for Run...';
        if (infoBitalloc) infoBitalloc.textContent = 'Waiting for Run...';

        if (btnPolyphase) {
          btnPolyphase.classList.add('hidden');
          btnPolyphase.textContent = 'Run';
        }
        if (btnPsycho) {
          btnPsycho.classList.add('hidden');
          btnPsycho.textContent = 'Run';
        }
        if (btnBitalloc) {
          btnBitalloc.classList.add('hidden');
          btnBitalloc.textContent = 'Run';
        }
        
        if (!audioResult) {
          return;
        }
        audioResult.pause();
        audioResult.removeAttribute('src');
        audioResult.load();
        audioResult.classList.add('hidden');
        if (resultAudioUrl) {
          URL.revokeObjectURL(resultAudioUrl);
          resultAudioUrl = null;
        }
      }

      function renderEncodedAudio() {
        if (!audioResult) {
          return;
        }
        if (typeof module._mp3_get_result_data !== 'function' || typeof module._mp3_get_result_size !== 'function') {
          console.warn('[mp3paper] result-data exports are unavailable.');
          return;
        }

        const size = module._mp3_get_result_size();
        const ptr = module._mp3_get_result_data();
        if (!ptr || size <= 0) {
          console.warn('[mp3paper] encoded result buffer is empty.');
          return;
        }

        const copiedBytes = new Uint8Array(module.HEAPU8.subarray(ptr, ptr + size));
        const blob = new Blob([copiedBytes], { type: 'audio/mpeg' });
        if (resultAudioUrl) {
          URL.revokeObjectURL(resultAudioUrl);
        }
        resultAudioUrl = URL.createObjectURL(blob);
        audioResult.src = resultAudioUrl;
        audioResult.classList.remove('hidden');
      }

      async function loadWavData(buffer, filename) {
        clearRenderedAudio();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(buffer);
        setSourceDuration(audioBuffer.duration);
        
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
          if (infoEncode) infoEncode.textContent = 'Encoding...';

          runWasmStep({
            stepKey: 'encode',
            expectedState: MP3_STATE.ENCODING_COMPLETE,
            invoke: (cbPtr) => {
              module._mp3_encode(cbPtr);
            },
            onSuccess: () => {
              if (infoEncode) {
                infoEncode.textContent = 'Encoding complete. Scroll down to run the next steps.';
              }

              if (btnPolyphase) {
                if (!btnPolyphase.classList.contains('hidden')) {
                  btnPolyphase.textContent = 'Update';
                } else {
                  btnPolyphase.classList.remove('hidden');
                }
              }
              if (btnPsycho && !btnPsycho.classList.contains('hidden')) btnPsycho.textContent = 'Update';
              if (btnBitalloc && !btnBitalloc.classList.contains('hidden')) btnBitalloc.textContent = 'Update';

              if (audioResult && !audioResult.classList.contains('hidden')) {
                renderEncodedAudio();
              }
            },
            onError: (message) => {
              if (infoEncode) infoEncode.textContent = message;
            },
          });
        });
      }

      if (btnPolyphase) {
        btnPolyphase.addEventListener('click', () => {
          runWasmStep({
            stepKey: 'polyphase',
            expectedState: MP3_STATE.POLYPHASE_COMPLETE,
            invoke: (cbPtr) => module._mp3_step_polyphase(cbPtr),
            onSuccess: (payload) => {
              const data = parseJsonPayload(payload);
              if (!Array.isArray(data)) {
                if (infoPolyphase) infoPolyphase.textContent = 'Polyphase returned invalid data. Try Encode again.';
                return;
              }
              if (infoPolyphase) infoPolyphase.textContent = renderPolyphasePlot(data);
              if (btnPsycho) btnPsycho.classList.remove('hidden');
              console.log('[mp3paper] polyphase:', data);
            },
            onError: (message) => {
              if (infoPolyphase) infoPolyphase.textContent = message;
            },
          });
        });
      }

      if (btnPsycho) {
        btnPsycho.addEventListener('click', () => {
          runWasmStep({
            stepKey: 'psycho',
            expectedState: MP3_STATE.PSYCHO_COMPLETE,
            invoke: (cbPtr) => module._mp3_step_psycho(cbPtr),
            onSuccess: (payload) => {
              const data = parseJsonPayload(payload);
              if (!Array.isArray(data)) {
                if (infoPsycho) infoPsycho.textContent = 'Psychoacoustics returned invalid data. Retry Polyphase first.';
                return;
              }
              psychoDataCache = data;
              if (infoPsycho) infoPsycho.textContent = renderPsychoPlot(data);
              if (btnBitalloc) btnBitalloc.classList.remove('hidden');
              console.log('[mp3paper] psycho:', data);
            },
            onError: (message) => {
              if (infoPsycho) infoPsycho.textContent = message;
            },
          });
        });
      }

      if (btnBitalloc) {
        btnBitalloc.addEventListener('click', () => {
          runWasmStep({
            stepKey: 'bitalloc',
            expectedState: MP3_STATE.BITALLOC_COMPLETE,
            invoke: (cbPtr) => module._mp3_step_bitalloc(cbPtr),
            onSuccess: (payload) => {
              const data = parseJsonPayload(payload);
              if (!Array.isArray(data)) {
                if (infoBitalloc) infoBitalloc.textContent = 'Bit Allocation returned invalid data. Retry Psychoacoustics first.';
                return;
              }
              if (infoBitalloc) infoBitalloc.textContent = renderBitallocPlot(data, psychoDataCache);
              renderEncodedAudio();
              console.log('[mp3paper] bitalloc:', data);
            },
            onError: (message) => {
              if (infoBitalloc) infoBitalloc.textContent = message;
            },
          });
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
