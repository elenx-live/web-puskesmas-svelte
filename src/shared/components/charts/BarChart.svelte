<!--
  @component Bar chart SVG sederhana — pengganti recharts BarChart.
  Tooltip via title bawaan browser.
-->
<script lang="ts">
  export interface BarDatum {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    /** Data bar: label sumbu-x dan nilai. */
    data: BarDatum[];
    /** Warna default bar. */
    barColor?: string;
    /** Tinggi chart dalam px. */
    height?: number;
    /** Label nilai di atas bar. */
    showValues?: boolean;
  }

  const { data, barColor = '#F59E0B', height = 220, showValues = true }: Props = $props();

  const maxValue = $derived(Math.max(1, ...data.map((d) => d.value)));
  const W = 600;
  const H = 300;
  const padL = 36;
  const padB = 44;
  const padT = 18;
  const chartW = W - padL - 12;
  const chartH = H - padT - padB;
  const slot = $derived(data.length > 0 ? chartW / data.length : chartW);
  const barW = $derived(Math.min(48, slot * 0.55));

  // Garis grid Y (4 tick)
  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t)));
</script>

<div class="w-full" style="height: {height}px;">
  <svg viewBox="0 0 {W} {H}" class="w-full h-full" role="img" aria-label="Grafik batang">
    {#each ticks as t}
      {@const y = padT + chartH - (t / maxValue) * chartH}
      <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="var(--color-border)" stroke-dasharray="3 3" stroke-width="1" />
      <text x={padL - 6} y={y + 4} text-anchor="end" font-size="10" fill="var(--color-muted-foreground)">{t}</text>
    {/each}
    {#each data as d, i}
      {@const bh = (d.value / maxValue) * chartH}
      {@const x = padL + slot * i + (slot - barW) / 2}
      {@const y = padT + chartH - bh}
      <rect x={x} y={y} width={barW} height={bh} rx="6" fill={d.color || barColor} opacity="0.9">
        <title>{d.label}: {d.value}</title>
      </rect>
      {#if showValues && bh > 16}
        <text x={x + barW / 2} y={y + 14} text-anchor="middle" font-size="10" font-weight="700" fill="#fff">{d.value}</text>
      {/if}
      <text x={x + barW / 2} y={H - padB + 16} text-anchor="middle" font-size="10" fill="var(--color-muted-foreground)">
        {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
        <title>{d.label}</title>
      </text>
    {/each}
  </svg>
</div>
