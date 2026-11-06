import React, { useMemo, useState } from 'react';
import { Activity, Droplets, Heart, Wind } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PHYSIOLOGY_DATA } from '../data/anatomyCatalog';
import {
  buildSimulationDashboardSeries,
  computePhysiologyMetrics,
} from '../sim/physiologyMath';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { ConfidenceBadge } from './ConfidenceBadge';

type DashboardChartMode = 'waveforms' | 'trends';

export const SimulationDashboard: React.FC = () => {
  const [chartMode, setChartMode] = useState<DashboardChartMode>('waveforms');

  const params = useSimulatorStore((s) => s.params);
  const simulationTimeSeconds = useSimulatorStore((s) => s.simulationTimeSeconds);
  const colorBlindSafe = useSimulatorStore((s) => s.colorBlindSafe);

  const metrics = useMemo(() => computePhysiologyMetrics(params), [params]);

  // Quantize time to 0.25s buckets so Recharts updates smoothly without excessive DOM churn
  const quantizedTimeSec = Math.floor(simulationTimeSeconds * 4) / 4;

  const series = useMemo(
    () => buildSimulationDashboardSeries(metrics, Math.max(6, quantizedTimeSec), 36),
    [metrics, quantizedTimeSec],
  );

  const hrFact = PHYSIOLOGY_DATA.restingHeartRateAdult;
  const rrFact = PHYSIOLOGY_DATA.respiratoryRateAdult;
  const spo2Fact = PHYSIOLOGY_DATA.arterialOxygenSaturation;

  const hrColor = colorBlindSafe ? '#ea580c' : '#e11d48';
  const rrColor = colorBlindSafe ? '#0284c7' : '#0284c7';
  const spo2Color = colorBlindSafe ? '#7c3aed' : '#059669';

  const hrStatus =
    metrics.heartRateBpm > 100
      ? 'Tachycardic / Exercise'
      : metrics.heartRateBpm < 60
        ? 'Bradycardic'
        : 'Normal Sinus';

  const rrStatus =
    metrics.respiratoryRateBpm > 20
      ? 'Tachypneic / Hyperpnea'
      : metrics.respiratoryRateBpm < 10
        ? 'Bradypneic'
        : 'Eupnea (Normal)';

  const spo2Status =
    metrics.oxygenSaturationPercent >= 95
      ? 'Normoxic (95–100%)'
      : metrics.oxygenSaturationPercent >= 90
        ? 'Mild Hypoxemia'
        : 'Hypoxic Alert';

  return (
    <section
      aria-label="Simulation Dashboard"
      data-testid="simulation-dashboard"
      className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs"
    >
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Simulation Dashboard (Simplified Model)
            </h3>
            <p className="text-[11px] text-slate-500">
              Real-time Heartbeat, Respiration &amp; SpO₂ Recharts Telemetry
            </p>
          </div>
        </div>

        <div
          className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0"
          role="group"
          aria-label="Simulation Dashboard chart mode"
        >
          <button
            type="button"
            onClick={() => setChartMode('waveforms')}
            aria-pressed={chartMode === 'waveforms'}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              chartMode === 'waveforms'
                ? 'bg-white text-sky-700 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waveforms
          </button>
          <button
            type="button"
            onClick={() => setChartMode('trends')}
            aria-pressed={chartMode === 'trends'}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              chartMode === 'trends'
                ? 'bg-white text-sky-700 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vital Trends
          </button>
        </div>
      </div>

      {/* 3 Real-Time Vital KPI Readout Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Heartbeat Card */}
        <div
          data-testid="dashboard-kpi-heartbeat"
          className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-2.5 space-y-1"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
              <Heart className="w-3 h-3 text-rose-600 fill-rose-500/20 shrink-0" />
              <span>Heartbeat</span>
            </span>
            <ConfidenceBadge confidence={hrFact.confidence} compact />
          </div>
          <div className="font-mono text-base font-bold text-slate-900 leading-tight">
            {metrics.heartRateBpm}{' '}
            <span className="text-[11px] font-normal text-slate-500">bpm</span>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between gap-1">
            <span className="truncate">{hrStatus}</span>
            <span className="font-mono text-slate-700 font-semibold shrink-0">
              CO {metrics.cardiacOutputLMin}L
            </span>
          </div>
        </div>

        {/* Respiratory Rate Card */}
        <div
          data-testid="dashboard-kpi-respiration"
          className="bg-sky-50/60 border border-sky-200/80 rounded-lg p-2.5 space-y-1"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">
              <Wind className="w-3 h-3 text-sky-600 shrink-0" />
              <span>Respiration</span>
            </span>
            <ConfidenceBadge confidence={rrFact.confidence} compact />
          </div>
          <div className="font-mono text-base font-bold text-slate-900 leading-tight">
            {metrics.respiratoryRateBpm}{' '}
            <span className="text-[11px] font-normal text-slate-500">br/min</span>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between gap-1">
            <span className="truncate">{rrStatus}</span>
            <span className="font-mono text-slate-700 font-semibold shrink-0">
              TV {metrics.tidalVolumeMl}mL
            </span>
          </div>
        </div>

        {/* Oxygen Saturation (SpO2) Card */}
        <div
          data-testid="dashboard-kpi-spo2"
          className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2.5 space-y-1"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
              <Droplets className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>O₂ Sat</span>
            </span>
            <ConfidenceBadge
              confidence={
                metrics.isStenosisIllustrative
                  ? 'illustrative'
                  : spo2Fact?.confidence ?? 'high'
              }
              compact
            />
          </div>
          <div className="font-mono text-base font-bold text-slate-900 leading-tight">
            {metrics.oxygenSaturationPercent}%{' '}
            <span className="text-[11px] font-normal text-slate-500">SpO₂</span>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between gap-1">
            <span className="truncate">{spo2Status}</span>
            <span className="font-mono text-slate-700 font-semibold shrink-0">
              PaO₂ {metrics.alveolarPo2MmHg}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Real-Time Multi-Parameter Chart */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">
            {chartMode === 'waveforms'
              ? 'Synchronized Plethysmograph (SpO₂), Tidal Volume & ECG Wave'
              : 'Real-Time Heart Rate (bpm), Resp Rate (br/min) & SpO₂ (%) Trend'}
          </span>
          <span className="font-mono text-[10px] text-slate-500">6.0s Window</span>
        </div>

        <div className="w-full h-40" data-testid="simulation-dashboard-chart">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'waveforms' ? (
              <ComposedChart
                data={series}
                margin={{ top: 6, right: 6, left: -22, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  interval={8}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, Math.max(800, metrics.tidalVolumeMl + 100)]}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="pleth"
                  orientation="right"
                  domain={[0, 120]}
                  hide
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[-0.5, 1.4]}
                  hide
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#0f172a',
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="tidalVolumeWaveMl"
                  name="Tidal Volume (mL)"
                  stroke={rrColor}
                  fill={rrColor}
                  fillOpacity={0.18}
                  strokeWidth={1.75}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="pleth"
                  type="monotone"
                  dataKey="plethIndex"
                  name="SpO₂ Pleth Pulse"
                  stroke={spo2Color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ecgMv"
                  name="Heartbeat ECG (mV)"
                  stroke={hrColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={series}
                margin={{ top: 6, right: 6, left: -22, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  interval={8}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="vitals"
                  domain={[0, Math.max(140, metrics.heartRateBpm + 20)]}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="spo2"
                  orientation="right"
                  domain={[80, 100]}
                  hide
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                    color: '#0f172a',
                  }}
                />
                <ReferenceLine
                  yAxisId="spo2"
                  y={95}
                  stroke="#059669"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
                <Area
                  yAxisId="spo2"
                  type="monotone"
                  dataKey="spo2Percent"
                  name="Oxygen Saturation SpO₂ (%)"
                  stroke={spo2Color}
                  fill={spo2Color}
                  fillOpacity={0.16}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="vitals"
                  type="monotone"
                  dataKey="heartRateBpm"
                  name="Heartbeat (bpm)"
                  stroke={hrColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="vitals"
                  type="monotone"
                  dataKey="respiratoryRateBpm"
                  name="Respiratory Rate (br/min)"
                  stroke={rrColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend & Reference Range Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-[10px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: hrColor }}
              />
              <span>Heartbeat ({hrFact.range[0]}–{hrFact.range[1]} bpm)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: rrColor }}
              />
              <span>Resp ({rrFact.range[0]}–{rrFact.range[1]} br/m)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: spo2Color }}
              />
              <span>SpO₂ ({spo2Fact.range[0]}–{spo2Fact.range[1]}%)</span>
            </span>
          </div>
          <span className="font-mono text-slate-500">Source: OpenStax A&amp;P 2e</span>
        </div>
      </div>
    </section>
  );
};
