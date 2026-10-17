<!--
  @component Line chart SVG sederhana — pengganti recharts LineChart.
-->
<script lang="ts">
  export interface LineDatum {
    label: string;
    value: number;
  }

  interface Props {
    /** Data titik garis. */
    data: LineDatum[];
    /** Warna garis. */
    strokeColor?: string;
    /** Tinggi chart dalam px. */
    height?: number;
    /** Tampilkan titik pada tiap data. */
    showDots?: boolean;
  }

  const { data, strokeColor = '#F59E0B', height = 220, showDots = true }: Props = $props();

  const W = 600;
  const H = 300;
  const padL = 36;
  const padB = 44;
  const padT = 18;
  const chartW = W - padL - 12;
  const chartH = H - padT - padB;

  const maxValue = $derived(Math.max(1, ...data.map((d) => d.value)));
  const minValue = $derived(Math.min(0, ...data.map((d) => d.value)));
  const range = $derived(maxValue - minValue || 1);

  const points = $derived(
    data.map((d, i) => {
      const x = data.length === 1 ? padL + chartW / 2 : padL + (i / (data.length - 1)) * chartW;
      const y = padT + chartH - ((d.value - minValue) / range) * chartH;
      return { x, y, datum: d };
    })
  );
  const pathD = $derived(points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '));
  const areaD = $derived(
    pathD + ` L${points[points.length - 1]?.x ?? 0},${padT + chartH} L${points[0]?.x ?? 0},${padT + chartH} Z`
  );
  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minValue + range * t)));
</script>

<div class="w-full" style="height: {height}px;">
  <svg viewBox="0 0 {W} {H}" class="w-full h-full" role="img" aria-label="Grafik garis">
    {#each ticks as t}
      {@const y = padT + chartH - ((t - minValue) / range) * chartH}
      <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="var(--color-border)" stroke-dasharray="3 3" stroke-width="1" />
      <text x={padL - 6} y={y + 4} text-anchor="end" font-size="10" fill="var(--color-muted-foreground)">{t}</text>
    {/each}
    {#if points.length > 0}
      <path d={areaD} fill={strokeColor} opacity="0.12" />
      <path d={pathD} fill="none" stroke={strokeColor} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      {#if showDots}
        {#each points as p}
          <circle cx={p.x} cy={p.y} r="4" fill={strokeColor} stroke="var(--color-card)" stroke-width="2">
            <title>{p.datum.label}: {p.datum.value}</title>
          </circle>
        {/each}
      {/if}
      {#each points as p, i}
        {#if i % Math.ceil(points.length / 8) === 0}
          <text x={p.x} y={H - padB + 16} text-anchor="middle" font-size="10" fill="var(--color-muted-foreground)">
            {p.datum.label.length > 10 ? p.datum.label.slice(0, 10) + '…' : p.datum.label}
            <title>{p.datum.label}</title>
          </text>
        {/if}
      {/each}
    {/if}
  </svg>
</div>
