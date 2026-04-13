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

export function createPlottingHelpers({
  graphPolyphase,
  graphPsycho,
  graphBitalloc,
}) {
  function createPlotLayout(title, subtitle = '') {
    const annotations = [];

    if (subtitle) {
      annotations.push({
        text: subtitle,
        xref: 'paper',
        yref: 'paper',
        x: 0,
        y: 1.12,
        xanchor: 'left',
        yanchor: 'bottom',
        showarrow: false,
        align: 'left',
        font: {
          family: 'Inter, sans-serif',
          size: 12,
          color: plotPalette.muted,
        },
      });
    }

    return {
      title: {
        text: title,
        x: 0,
        xanchor: 'left',
        y: 0.98,
        yanchor: 'top',
        font: {
          family: 'Inter, sans-serif',
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
      margin: { t: 122, r: 24, b: 94, l: 60 },
      hoverlabel: {
        bgcolor: '#fffdf8',
        bordercolor: 'rgba(20, 50, 59, 0.18)',
        font: {
          family: 'Inter, sans-serif',
          color: plotPalette.ink,
        },
      },
      legend: {
        orientation: 'h',
        yanchor: 'top',
        y: -0.2,
        xanchor: 'left',
        x: 0,
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

  function formatSeconds(value) {
    return `${Number(value || 0).toFixed(2)}s`;
  }

  function describeSampling(groupedFrames) {
    if (!groupedFrames.length) {
      return 'No sampled frames available.';
    }

    const firstFrame = groupedFrames[0].frameIndex;
    const lastFrame = groupedFrames[groupedFrames.length - 1].frameIndex;

    return `Collecting every encoded frame. Frame span ${firstFrame}-${lastFrame}.`;
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

  function averageField(records, key) {
    let total = 0;
    let count = 0;

    records.forEach((record) => {
      const value = Number(record?.[key]);
      if (!Number.isFinite(value)) {
        return;
      }
      total += value;
      count += 1;
    });

    return count ? total / count : null;
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

  function renderPolyphasePlot(records) {
    const groupedFrames = groupRecordsByFrame(records);
    const frameBands = groupedFrames.map((group) => ({
      ...group,
      energySeries: averageSeries(group.records, 'subband_energy', 32),
    }));
    const sampleRateHz = Number(records?.[0]?.sample_rate_hz) || 0;
    const subbandCount = 32;
    const subbandWidthHz = sampleRateHz > 0 ? sampleRateHz / (subbandCount * 2) : 0;
    const xValues = frameBands.map((group) => Number(group.timeSeconds.toFixed(3)));
    const yValues = Array.from({ length: subbandCount }, (_, index) => index + 1);
    const zValues = [];
    const hoverText = [];
    const tickvals = [];
    const ticktext = [];

    for (let bandIndex = 0; bandIndex < subbandCount; bandIndex += 1) {
      const row = [];
      const hoverRow = [];
      const bandNumber = bandIndex + 1;
      const lowHz = bandIndex * subbandWidthHz;
      const highHz = (bandIndex + 1) * subbandWidthHz;
      const centerHz = lowHz + subbandWidthHz / 2;

      if (bandIndex % 4 === 0 || bandIndex === subbandCount - 1) {
        tickvals.push(bandNumber);
        ticktext.push(`${bandNumber} · ${formatFrequency(centerHz)}`);
      }

      frameBands.forEach((group) => {
        const energy = group.energySeries[bandIndex];

        if (!Number.isFinite(energy)) {
          row.push(null);
          hoverRow.push(`Subband ${bandNumber}<br>Frame ${group.frameIndex}<br>Time ${formatSeconds(group.timeSeconds)}<br>No sample collected`);
          return;
        }

        const energyDb = energyToDb(energy);
        row.push(energyDb);
        hoverRow.push(
          `Subband ${bandNumber}<br>Center ${formatFrequency(centerHz)}<br>Range ${formatFrequency(lowHz)}-${formatFrequency(highHz)}<br>Frame ${group.frameIndex}<br>Time ${formatSeconds(group.timeSeconds)}<br>Energy ${energyDb.toFixed(2)} dB<br>Mean-square ${energy.toExponential(2)}`,
        );
      });

      zValues.push(row);
      hoverText.push(hoverRow);
    }

    const extent = getFiniteExtent(zValues);
    const subtitle = `${describeSampling(groupedFrames)} Each row is one of the 32 equal-width polyphase subbands.${sampleRateHz > 0 ? ` Derived from a ${formatFrequency(sampleRateHz)} sample rate.` : ''}`;
    const layout = {
      ...createPlotLayout('Polyphase Subband Energy Heatmap', subtitle),
      xaxis: createAxis('Time (seconds)'),
      yaxis: {
        ...createAxis('Subband index / center frequency'),
        tickmode: 'array',
        tickvals,
        ticktext,
      },
      showlegend: false,
    };

    const traces = [{
      type: 'heatmap',
      x: xValues,
      y: yValues,
      z: zValues,
      text: hoverText,
      hovertemplate: '%{text}<extra></extra>',
      colorscale: [
        [0, '#17324d'],
        [0.35, '#0f766e'],
        [0.5, '#f7f0d8'],
        [0.75, '#f59e0b'],
        [1, '#b91c1c'],
      ],
      colorbar: {
        title: 'Energy (dB)',
      },
      zmin: extent ? extent.min : -120,
      zmax: extent ? extent.max : 0,
    }];

    renderPlot(graphPolyphase, traces, layout);

    return `Heatmap shows subband energy across ${groupedFrames.length} encoded frame(s). The y-axis pairs each subband number with its center frequency.`;
  }

  function maskingMarginDb(energy, threshold) {
    const safeEnergy = Math.max(Number(energy) || 0, 1e-12);
    const safeThreshold = Math.max(Number(threshold) || 0, 1e-12);
    return 10 * Math.log10(safeEnergy / safeThreshold);
  }

  function renderPsychoPlot(records) {
    const groupedFrames = groupRecordsByFrame(records);
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
      ? ` Long-block frames produce ${longBandLimit} critical bands; short/mixed blocks expand to ${maxBandCount}. Gray cells mark bands that do not exist for a given block type.`
      : '';
    const layout = {
      ...createPlotLayout('Psychoacoustic Masking Heatmap', `${describeSampling(groupedFrames)}${blockTypeNote}`),
      xaxis: createAxis('Time (seconds)'),
      yaxis: createAxis('Critical band index'),
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
        colorscale: [
          [0, '#17324d'],
          [0.35, '#0f766e'],
          [0.5, '#f7f0d8'],
          [0.75, '#f59e0b'],
          [1, '#b91c1c'],
        ],
        colorbar: {
          title: 'Margin (dB)',
        },
        zmid: 0,
        zmin: extent ? Math.min(extent.min, -24) : -24,
        zmax: extent ? Math.max(extent.max, 24) : 24,
      },
    ];

    renderPlot(graphPsycho, traces, layout);

    return `Heatmap shows masking margin across ${groupedFrames.length} sampled frame(s). Positive values indicate bands that sit further above the masking threshold.`;
  }

  function renderBitallocPlot(records) {
    const groupedFrames = groupRecordsByFrame(records);
    const xValues = groupedFrames.map((group) => Number(group.timeSeconds.toFixed(3)));
    const totalBits = groupedFrames.map((group) => averageField(group.records, 'total_bits'));
    const mainDataBits = groupedFrames.map((group) => averageField(group.records, 'part2_3_length'));
    const reservoirBits = groupedFrames.map((group) => averageField(group.records, 'reservoir_size'));
    const targetBits = groupedFrames.map((group) => averageField(group.records, 'target_bits'));
    const maxBandCount = getMaxBandCount(records, 'bits_per_band');
    const bandIndices = Array.from({ length: maxBandCount }, (_, index) => index + 1);
    const scaleFactorActivity = averageSeries(records, 'bits_per_band', maxBandCount).map((value) => value ?? 0);
    const hasBandProxyData = scaleFactorActivity.some((value) => value > 0);

    const traces = [
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Target bits',
        x: xValues,
        y: targetBits,
        line: { width: 2.5, color: plotPalette.amber },
        marker: { size: 6, color: plotPalette.amber },
        xaxis: 'x',
        yaxis: 'y',
        hovertemplate: 'Time %{x:.2f}s<br>Target bits %{y:.1f}<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Main data bits',
        x: xValues,
        y: mainDataBits,
        line: { width: 2.5, color: plotPalette.teal },
        marker: { size: 6, color: plotPalette.teal },
        xaxis: 'x',
        yaxis: 'y',
        hovertemplate: 'Time %{x:.2f}s<br>Main data bits %{y:.1f}<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Reservoir size',
        x: xValues,
        y: reservoirBits,
        line: { width: 2.5, color: plotPalette.navy },
        marker: { size: 6, color: plotPalette.navy },
        xaxis: 'x',
        yaxis: 'y',
        hovertemplate: 'Time %{x:.2f}s<br>Reservoir %{y:.1f}<extra></extra>',
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Total bits',
        x: xValues,
        y: totalBits,
        line: { width: 2, dash: 'dot', color: plotPalette.rose },
        xaxis: 'x',
        yaxis: 'y',
        hovertemplate: 'Time %{x:.2f}s<br>Total bits %{y:.1f}<extra></extra>',
      },
    ];

    if (hasBandProxyData) {
      traces.push({
        type: 'bar',
        name: 'Scale-factor activity',
        x: bandIndices,
        y: scaleFactorActivity,
        marker: {
          color: scaleFactorActivity,
          colorscale: [
            [0, '#d7f3ef'],
            [0.55, '#0d9488'],
            [1, '#115e59'],
          ],
          line: {
            color: 'rgba(17, 94, 89, 0.25)',
            width: 1,
          },
        },
        xaxis: 'x2',
        yaxis: 'y2',
        hovertemplate: 'Band %{x}<br>Average scale-factor activity %{y:.2f}<extra></extra>',
      });
    }

    const baseLayout = createPlotLayout(
      'Bit Allocation Budget',
      `${describeSampling(groupedFrames)} ${hasBandProxyData ? 'Lower panel shows scale-factor activity, which is a proxy rather than literal bits-per-band.' : 'Per-band proxy is empty for this sample set.'}`,
    );
    const layout = {
      ...baseLayout,
      xaxis: {
        ...createAxis('Time (seconds)'),
        domain: [0, 1],
        anchor: 'y',
      },
      yaxis: {
        ...createAxis('Bits'),
        domain: hasBandProxyData ? [0.44, 1] : [0, 1],
        anchor: 'x',
      },
      xaxis2: {
        ...createAxis('Scale-factor band index'),
        domain: [0, 1],
        anchor: 'y2',
      },
      yaxis2: {
        ...createAxis('Average activity'),
        domain: [0, 0.24],
        anchor: 'x2',
      },
      annotations: [
        ...(baseLayout.annotations || []),
        hasBandProxyData
          ? {
              text: 'Per-frame bit budget',
              xref: 'paper',
              yref: 'paper',
              x: 0,
              y: 1.04,
              showarrow: false,
              font: { family: 'Inter, sans-serif', size: 12, color: plotPalette.muted },
            }
          : {
              text: 'Per-frame bit budget',
              xref: 'paper',
              yref: 'paper',
              x: 0,
              y: 1.04,
              showarrow: false,
              font: { family: 'Inter, sans-serif', size: 12, color: plotPalette.muted },
            },
        hasBandProxyData
          ? {
              text: 'Per-band scale-factor activity proxy',
              xref: 'paper',
              yref: 'paper',
              x: 0,
              y: 0.31,
              showarrow: false,
              font: { family: 'Inter, sans-serif', size: 12, color: plotPalette.muted },
            }
          : {
              text: 'Per-band proxy is empty. Collect quantizer or Huffman bits per band for a truer allocation view.',
              xref: 'paper',
              yref: 'paper',
              x: 0,
              y: 0.08,
              showarrow: false,
              align: 'left',
              font: { family: 'Inter, sans-serif', size: 12, color: plotPalette.muted },
            },
      ],
    };

    renderPlot(graphBitalloc, traces, layout);

    return hasBandProxyData
      ? `Showing frame-level bit budget dynamics across ${groupedFrames.length} sampled frame(s), plus a lower-band activity proxy.`
      : `Showing frame-level bit budget dynamics across ${groupedFrames.length} sampled frame(s). The current WASM data does not yet expose a meaningful per-band allocation trace.`;
  }

  return {
    purgePlot,
    renderPolyphasePlot,
    renderPsychoPlot,
    renderBitallocPlot,
  };
}
