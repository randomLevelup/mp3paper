const plotConfig = {
  responsive: true,
  displayModeBar: false,
  displaylogo: false,
};

const plotPalette = {
  ink: '#14323b',
  muted: '#5c6b73',
  grid: 'rgba(20, 50, 59, 0.12)',
  teal: '#0d9488',
  sea: '#0f766e',
  amber: '#d97706',
  sand: '#f4c67a',
  navy: '#164e63',
  rose: '#be123c',
};

const energyColorscale = [
  [0, '#17324d'],
  [0.35, '#0f766e'],
  [0.5, '#fde68a'],
  [0.75, '#f59e0b'],
  [1, '#b91c1c'],
];

const robustColorExtentDefaults = {
  lowerPercentile: 0.05,
  upperPercentile: 0.95,
  padFraction: 0.08,
};

export function createPlottingHelpers({
  graphPolyphase,
  graphPsycho,
  graphBitalloc,
}) {
  const plotSansFont = "Inter, sans-serif";
  let sourceDurationSeconds = 0;

  function setSourceDuration(seconds) {
    const value = Number(seconds);
    sourceDurationSeconds = Number.isFinite(value) && value > 0 ? value : 0;
  }

  function wrapText(str, max = 110) {
    if (!str) return '';
    const words = str.trim().split(/\s+/);
    let lines = [];
    let currentLine = '';
    words.forEach(word => {
      if (currentLine.length + word.length > max) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines.join('<br>');
  }

  function createPlotLayout(title, subtitle = '') {
    const annotations = [];

    if (subtitle) {
      annotations.push({
        text: wrapText(subtitle),
        xref: 'paper',
        yref: 'paper',
        x: 0.5,
        y: 1.05,
        xanchor: 'center',
        yanchor: 'bottom',
        showarrow: false,
        align: 'center',
        font: {
          family: plotSansFont,
          size: 12,
          color: plotPalette.muted,
        },
      });
    }

    return {
      title: {
        text: title,
        x: 0.5,
        xref: 'paper',
        xanchor: 'center',
        y: 0.98,
        yanchor: 'top',
        font: {
          family: plotSansFont,
          size: 20,
          color: plotPalette.ink,
        },
      },
      font: {
        family: 'Inter, sans-serif',
        color: plotPalette.ink,
      },
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
      plot_bgcolor: 'rgba(255, 255, 255, 0.92)',
      margin: { t: 84, r: 24, b: 94, l: 60 },
      hoverlabel: {
        bgcolor: '#fffdf8',
        bordercolor: 'rgba(20, 50, 59, 0.18)',
        font: {
          family: 'Inter, sans-serif',
          color: plotPalette.ink,
        },
      },
      annotations,
    };
  }

  function createAxis(title) {
    return {
      title,
      zeroline: false,
      gridcolor: plotPalette.grid,
      linecolor: 'rgba(20, 50, 59, 0.2)',
      tickcolor: 'rgba(20, 50, 59, 0.2)',
      automargin: true,
    };
  }

  function renderPlot(graphElement, traces, layout) {
    if (!graphElement || typeof Plotly === 'undefined') {
      return;
    }

    graphElement.classList.remove('hidden');
    Plotly.react(graphElement, traces, layout, plotConfig);
  }

  function purgePlot(graphElement) {
    if (!graphElement) {
      return;
    }

    if (typeof Plotly !== 'undefined') {
      try {
        Plotly.purge(graphElement);
      } catch {
        // Ignore purge errors for graphs that have not been initialized yet.
      }
    }

    graphElement.classList.add('hidden');
  }

  function formatSeconds(value, highResolution = false) {
    const s = Number(value || 0);
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    if (highResolution) {
      const tenth = Math.floor((s % 1) * 10);
      return `${mm}:${ss.toString().padStart(2, '0')}.${tenth}`;
    }
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  }

  function getTimeAxis(xValues) {
    const maxTime = xValues.length > 0 ? Math.max(...xValues) : 0;
    const tickCount = 10;
    const upperBound = maxTime > 0 ? maxTime : 1;
    const useHighResolutionLabels = upperBound < 20;

    const tickvals = [];
    const ticktext = [];
    for (let i = 0; i < tickCount; i += 1) {
      const ratio = tickCount > 1 ? i / (tickCount - 1) : 0;
      const t = ratio * upperBound;
      tickvals.push(Number(t.toFixed(3)));
      ticktext.push(formatSeconds(t, useHighResolutionLabels));
    }
    
    return {
      ...createAxis('Time (mm:ss)'),
      tickmode: 'array',
      tickvals,
      ticktext,
    };
  }

  function getFreqAxisTicks(bandCount, isLinear, sampleRateHz) {
    const tickvals = [];
    const ticktext = [];
    const safeSampleRate = sampleRateHz > 0 ? sampleRateHz : 44100;
    const nyquist = safeSampleRate / 2;
    const zMax = 6 * Math.asinh(nyquist / 600);

    for (let i = 1; i <= bandCount; i += 1) {
      if ((i - 1) % 4 === 0 || i === bandCount) {
        tickvals.push(i);
        let freqHz;
        if (isLinear) {
          freqHz = (i - 0.5) * (nyquist / bandCount);
        } else {
          const normalized = (i - 0.5) / bandCount;
          freqHz = 600 * Math.sinh((normalized * zMax) / 6);
        }
        ticktext.push(formatFrequency(freqHz));
      }
    }
    return {
      ...createAxis('Center frequency (approx)'),
      tickmode: 'array',
      tickvals,
      ticktext,
    };
  }

  function groupRecordsByFrame(records) {
    const grouped = new Map();

    records.forEach((record) => {
      const frameIndex = Number.isFinite(record?.frame_index) ? record.frame_index : 0;
      const timeSeconds = Number.isFinite(record?.time_seconds) ? record.time_seconds : 0;
      const collectedIndex = Number.isFinite(record?.collected_index) ? record.collected_index : -1;

      if (!grouped.has(frameIndex)) {
        grouped.set(frameIndex, {
          frameIndex,
          collectedIndex,
          records: [],
          timeSecondsTotal: 0,
          timeSamples: 0,
        });
      }

      const bucket = grouped.get(frameIndex);
      bucket.records.push(record);
      bucket.timeSecondsTotal += timeSeconds;
      bucket.timeSamples += 1;
      if (bucket.collectedIndex < 0 && collectedIndex >= 0) {
        bucket.collectedIndex = collectedIndex;
      }
    });

    return Array.from(grouped.values())
      .map((bucket) => ({
        frameIndex: bucket.frameIndex,
        collectedIndex: bucket.collectedIndex,
        timeSeconds: bucket.timeSamples ? bucket.timeSecondsTotal / bucket.timeSamples : 0,
        records: bucket.records,
      }))
      .sort((a, b) => a.frameIndex - b.frameIndex);
  }

  function stabilizeFrameTimes(groupedFrames) {
    if (!groupedFrames.length) {
      return groupedFrames;
    }

    const hasDuration = Number.isFinite(sourceDurationSeconds) && sourceDurationSeconds > 0;
    if (!hasDuration) {
      return groupedFrames;
    }

    const firstFrame = groupedFrames[0].frameIndex;
    const lastFrame = groupedFrames[groupedFrames.length - 1].frameIndex;
    const frameSpan = lastFrame - firstFrame;

    if (frameSpan <= 0) {
      return groupedFrames.map((group) => ({
        ...group,
        timeSeconds: 0,
      }));
    }

    return groupedFrames.map((group) => ({
      ...group,
      timeSeconds: ((group.frameIndex - firstFrame) / frameSpan) * sourceDurationSeconds,
    }));
  }

  function getMaxBandCount(records, key) {
    return records.reduce((maxBands, record) => {
      const values = Array.isArray(record?.[key]) ? record[key] : [];
      const bandCount = Number.isFinite(record?.band_count)
        ? Math.min(record.band_count, values.length)
        : values.length;
      return Math.max(maxBands, bandCount);
    }, 0);
  }

  function averageSeries(records, key, length) {
    const sums = Array(length).fill(0);
    const counts = Array(length).fill(0);

    records.forEach((record) => {
      const values = Array.isArray(record?.[key]) ? record[key] : [];
      const bandCount = Number.isFinite(record?.band_count)
        ? Math.min(record.band_count, values.length, length)
        : Math.min(values.length, length);

      for (let i = 0; i < bandCount; i += 1) {
        const value = Number(values[i]);
        if (!Number.isFinite(value)) {
          continue;
        }
        sums[i] += value;
        counts[i] += 1;
      }
    });

    return sums.map((sum, index) => (counts[index] ? sum / counts[index] : null));
  }

  function buildFrameSeriesByKey(groupedFrames, key, length) {
    return groupedFrames.map((group) => ({
      frameIndex: group.frameIndex,
      timeSeconds: Number(group.timeSeconds.toFixed(3)),
      series: averageSeries(group.records, key, length),
    }));
  }

  function buildBitallocFrameSeries(groupedBits, groupedPsycho, maxBandCount) {
    const frameCount = Math.min(groupedBits.length, groupedPsycho.length);
    const out = [];

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx += 1) {
      const bitGroup = groupedBits[frameIdx];
      const psychoGroup = groupedPsycho[frameIdx];

      out.push({
        frameIndex: bitGroup.frameIndex,
        timeSeconds: Number(bitGroup.timeSeconds.toFixed(3)),
        bitsSeries: averageSeries(bitGroup.records, 'bits_per_band', maxBandCount),
        energySeries: averageSeries(psychoGroup.records, 'band_energy', maxBandCount),
      });
    }

    return out;
  }

  function formatFrequency(valueHz) {
    const hz = Number(valueHz) || 0;
    if (hz >= 1000) {
      return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz`;
    }
    return `${Math.round(hz)} Hz`;
  }

  function energyToDb(energy) {
    const safeEnergy = Math.max(Number(energy) || 0, 1e-20);
    return 10 * Math.log10(safeEnergy);
  }

  function getFiniteExtent(matrix) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    matrix.forEach((row) => {
      row.forEach((value) => {
        if (!Number.isFinite(value)) {
          return;
        }
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }

    return { min, max };
  }

  function getSortedFiniteValues(values) {
    return values
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }

  function getPercentileFromSorted(sortedValues, percentile) {
    if (!sortedValues.length) {
      return null;
    }
    const p = Math.min(Math.max(percentile, 0), 1);
    const pos = (sortedValues.length - 1) * p;
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) {
      return sortedValues[lower];
    }
    const weight = pos - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  function getRobustExtent(values, options = {}) {
    const {
      lowerPercentile = 0.05,
      upperPercentile = 0.95,
      minSpan = 18,
      padFraction = 0.08,
      fallbackMin = -120,
      fallbackMax = 0,
    } = options;

    const sorted = getSortedFiniteValues(values);
    if (!sorted.length) {
      return { min: fallbackMin, max: fallbackMax };
    }

    const lowQ = getPercentileFromSorted(sorted, lowerPercentile);
    const highQ = getPercentileFromSorted(sorted, upperPercentile);
    if (!Number.isFinite(lowQ) || !Number.isFinite(highQ)) {
      return { min: fallbackMin, max: fallbackMax };
    }

    const rawSpan = Math.max(highQ - lowQ, 0);
    const pad = rawSpan > 0 ? rawSpan * padFraction : minSpan * 0.5;
    let min = lowQ - pad;
    let max = highQ + pad;

    if (max - min < minSpan) {
      const center = (max + min) / 2;
      min = center - minSpan / 2;
      max = center + minSpan / 2;
    }

    return { min, max };
  }

  function flattenFiniteMatrix(matrix) {
    const out = [];
    matrix.forEach((row) => {
      row.forEach((value) => {
        if (Number.isFinite(value)) {
          out.push(value);
        }
      });
    });
    return out;
  }

  function renderPolyphasePlot(records) {
    const groupedFrames = stabilizeFrameTimes(groupRecordsByFrame(records));
    const frameBands = buildFrameSeriesByKey(groupedFrames, 'subband_energy', 32);
    const sampleRateHz = Number(records?.[0]?.sample_rate_hz) || 0;
    const subbandCount = 32;
    const subbandWidthHz = sampleRateHz > 0 ? sampleRateHz / (subbandCount * 2) : 0;
    const xValues = frameBands.map((group) => Number(group.timeSeconds.toFixed(3)));
    const yValues = Array.from({ length: subbandCount }, (_, index) => index + 1);
    const zValues = [];
    const tickvals = [];
    const ticktext = [];

    for (let bandIndex = 0; bandIndex < subbandCount; bandIndex += 1) {
      const row = [];
      const bandNumber = bandIndex + 1;
      const centerHz = (bandIndex + 0.5) * subbandWidthHz;

      if (bandIndex % 4 === 0 || bandIndex === subbandCount - 1) {
        tickvals.push(bandNumber);
        ticktext.push(`${bandNumber} · ${formatFrequency(centerHz)}`);
      }

      frameBands.forEach((group) => {
        const energy = group.series[bandIndex];

        if (!Number.isFinite(energy)) {
          row.push(null);
          return;
        }

        const energyDb = energyToDb(energy);
        row.push(energyDb);
      });

      zValues.push(row);
    }

    const extent = getRobustExtent(flattenFiniteMatrix(zValues), {
      ...robustColorExtentDefaults,
      minSpan: 14,
      fallbackMin: -120,
      fallbackMax: 0,
    });
    const subtitle = `Each row represents one of 32 equal-width frequency bands`;
    const layout = {
      ...createPlotLayout('Subband Energy Spec (Post-Filterbank)', subtitle),
      xaxis: getTimeAxis(xValues),
      yaxis: getFreqAxisTicks(subbandCount, true, sampleRateHz),
      showlegend: false,
    };

    const traces = [{
      type: 'heatmap',
      x: xValues,
      y: yValues,
      z: zValues,
      hovertemplate: 'Subband %{y}<br>Time %{x:.3f}s<br>Energy %{z:.2f} dB<extra></extra>',
      colorscale: energyColorscale,
      showscale: false,
      zmin: extent.min,
      zmax: extent.max,
    }];

    renderPlot(graphPolyphase, traces, layout);

    return `Heatmap shows energy across ${groupedFrames.length} encoded frame(s). The y-axis labels each subband with its corresponding frequency.`;
  }

  function maskingMarginDb(energy, threshold) {
    const safeEnergy = Math.max(Number(energy) || 0, 1e-12);
    const safeThreshold = Math.max(Number(threshold) || 0, 1e-12);
    return 10 * Math.log10(safeEnergy / safeThreshold);
  }

  function renderPsychoPlot(records) {
    const sampleRateHz = Number(records?.[0]?.sample_rate_hz) || 0;
    const groupedFrames = stabilizeFrameTimes(groupRecordsByFrame(records));
    const frameBands = groupedFrames.map((group) => {
      const energyBandCount = getMaxBandCount(group.records, 'band_energy');
      const thresholdBandCount = getMaxBandCount(group.records, 'band_threshold');
      return {
        ...group,
        effectiveBandCount: Math.max(energyBandCount, thresholdBandCount),
        energySeries: averageSeries(group.records, 'band_energy', energyBandCount),
        thresholdSeries: averageSeries(group.records, 'band_threshold', thresholdBandCount),
      };
    });
    const maxBandCount = frameBands.reduce(
      (maxBands, group) => Math.max(maxBands, group.energySeries.length, group.thresholdSeries.length),
      0,
    );
    const longBandLimit = 22;
    const hasShortBlocks = frameBands.some((group) => group.effectiveBandCount > longBandLimit);
    const xValues = frameBands.map((group) => Number(group.timeSeconds.toFixed(3)));
    const yValues = Array.from({ length: maxBandCount }, (_, index) => index + 1);
    const zValues = [];
    const hoverText = [];
    const bgZ = [];
    const bgHoverText = [];

    for (let bandIndex = 0; bandIndex < maxBandCount; bandIndex += 1) {
      const row = [];
      const hoverRow = [];
      const bgRow = [];
      const bgHoverRow = [];

      frameBands.forEach((group) => {
        if (bandIndex >= group.effectiveBandCount) {
          row.push(null);
          hoverRow.push('');
          bgRow.push(1);
          bgHoverRow.push(
            `Band ${bandIndex + 1}<br>Frame ${group.frameIndex}<br>Time ${formatSeconds(group.timeSeconds)}<br><b>N/A — long block type</b><br>Long blocks use ${longBandLimit} critical bands.<br>Short/mixed blocks use up to ${maxBandCount}.`,
          );
          return;
        }

        bgRow.push(null);
        bgHoverRow.push('');

        const energy = group.energySeries[bandIndex];
        const threshold = group.thresholdSeries[bandIndex];

        if (!Number.isFinite(energy) || !Number.isFinite(threshold)) {
          row.push(null);
          hoverRow.push(`Band ${bandIndex + 1}<br>Frame ${group.frameIndex}<br>Time ${formatSeconds(group.timeSeconds)}<br>No sample collected`);
          return;
        }

        const margin = maskingMarginDb(energy, threshold);
        row.push(margin);
        hoverRow.push(
          `Band ${bandIndex + 1}<br>Frame ${group.frameIndex}<br>Time ${formatSeconds(group.timeSeconds)}<br>Masking margin ${margin.toFixed(2)} dB<br>Energy ${energy.toExponential(2)}<br>Threshold ${threshold.toExponential(2)}`,
        );
      });

      zValues.push(row);
      hoverText.push(hoverRow);
      bgZ.push(bgRow);
      bgHoverText.push(bgHoverRow);
    }

    const extent = getFiniteExtent(zValues);
    const blockTypeNote = hasShortBlocks
      ? `Teal cells are more heavily masked, while orange cells are kept closer to their original signal.`
      : '';
    const layout = {
      ...createPlotLayout('Psychoacoustic Masking Spectrogram', `${blockTypeNote}`),
      xaxis: getTimeAxis(xValues),
      yaxis: getFreqAxisTicks(maxBandCount, false, sampleRateHz),
      showlegend: false,
    };

    const traces = [
      {
        type: 'heatmap',
        x: xValues,
        y: yValues,
        z: bgZ,
        text: bgHoverText,
        hovertemplate: '%{text}<extra></extra>',
        hoverongaps: false,
        colorscale: [[0, '#ddd9d0'], [1, '#ddd9d0']],
        showscale: false,
      },
      {
        type: 'heatmap',
        x: xValues,
        y: yValues,
        z: zValues,
        text: hoverText,
        hovertemplate: '%{text}<extra></extra>',
        hoverongaps: false,
        colorscale: energyColorscale,
        showscale: false,
        zmid: 0,
        zmin: extent ? Math.min(extent.min, -24) : -24,
        zmax: extent ? Math.max(extent.max, 24) : 24,
      },
    ];

    renderPlot(graphPsycho, traces, layout);

    return `Heatmap shows masking margin across ${groupedFrames.length} sampled frame(s). Values closer to blue are more heavily masked.`;
  }

  function renderBitallocPlot(records, psychoRecords = null) {
    if (!psychoRecords) {
      return 'Psychoacoustics data is missing.';
    }
    const sampleRateHz = Number(records?.[0]?.sample_rate_hz) || 0;

    const groupedBits = stabilizeFrameTimes(groupRecordsByFrame(records));
    const groupedPsycho = stabilizeFrameTimes(groupRecordsByFrame(psychoRecords));

    const xValues = [];
    const yValues = [];
    const markerSizes = [];
    const markerColors = [];
    const customData = [];

    const maxBandCount = Math.max(
      getMaxBandCount(records, 'bits_per_band'),
      getMaxBandCount(psychoRecords, 'band_energy')
    );

    const frameSeries = buildBitallocFrameSeries(groupedBits, groupedPsycho, maxBandCount);
    let maxBits = 1;

    frameSeries.forEach((frame) => {
      const timeLabel = formatSeconds(frame.timeSeconds);

      for (let bandIdx = 0; bandIdx < maxBandCount; bandIdx += 1) {
        const bits = frame.bitsSeries[bandIdx] || 0;
        const energy = frame.energySeries[bandIdx] || 1e-12;

        if (energy <= 1e-12 && bits <= 0) {
          continue;
        }

        const energyDb = energyToDb(energy);
        const sizedBits = Math.pow(bits, 1.5);

        if (bits > maxBits) {
          maxBits = bits;
        }

        xValues.push(frame.timeSeconds);
        yValues.push(bandIdx + 1);
        markerSizes.push(sizedBits);
        markerColors.push(energyDb);
        customData.push([bits, timeLabel]);
      }
    });

    const sizeRefDenominator = Math.pow(50, 1.5);
    const sizeRef = maxBits > 0 ? (1.5 * Math.pow(maxBits, 1.5)) / sizeRefDenominator : 1;

    const colorExtent = getRobustExtent(markerColors, {
      ...robustColorExtentDefaults,
      minSpan: 12,
      fallbackMin: -120,
      fallbackMax: 0,
    });

    const traces = [
      {
        type: 'scattergl',
        mode: 'markers',
        x: xValues,
        y: yValues,
        marker: {
          symbol: 'square',
          size: markerSizes,
          sizemode: 'area',
          sizeref: sizeRef,
          sizemin: 1,
          color: markerColors,
          colorscale: energyColorscale,
          cmin: colorExtent.min,
          cmax: colorExtent.max,
          showscale: false,
          line: { width: 0 },
        },
        customdata: customData,
        hovertemplate: 'Band %{y}<br>Time %{customdata[1]}<br>Bits Proxy %{customdata[0]:.2f}<br>Energy %{marker.color:.2f} dB<extra></extra>',
      },
    ];

    const layout = {
      ...createPlotLayout('Bit Allocation Map', 'Point size correlates to # allocated bits (thus fidelity) ; color corresponds to energy.'),
      xaxis: getTimeAxis(xValues),
      yaxis: getFreqAxisTicks(maxBandCount, false, sampleRateHz),
      showlegend: false,
    };

    renderPlot(graphBitalloc, traces, layout);
    return `Spectrogram showing bit allocations over ${groupedBits.length} frames.`;
  }

  return {
    setSourceDuration,
    purgePlot,
    renderPolyphasePlot,
    renderPsychoPlot,
    renderBitallocPlot,
  };
}
