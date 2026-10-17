<!--
  @component Donut chart SVG sederhana — pengganti recharts PieChart+Pie.
-->
<script lang="ts">
  export interface DonutDatum {
    name: string;
    value: number;
    color: string;
  }

  interface Props {
    /** Data segmen donat. */
    data: DonutDatum[];
    /** Diameter chart dalam px. */
    size?: number;
    /** Ketebalan ring donat dalam px. */
    thickness?: number;
  }

  const { data, size = 170, thickness = 30 }: Props = $props();

  const total = $derived(data.reduce((s, d) => s + d.value, 0) || 1);
  const r = $derived(size / 2 - thickness / 2 - 4);
  const C = $derived(2 * Math.PI * r);

  interface Segment { datum: DonutDatum; dash: string; offset: number; }
  const segments = $derived.by(() => {
    let acc = 0;
    const gap = 0.02; // celah antar segmen (fraksi)
    return data.map((d) => {
      const frac = d.value / total;
      const seg: Segment = {
        datum: d,
        dash: `${Math.max(0, (frac - gap) * C)} ${C}`,
        offset: -acc * C,
      };
      acc += frac;
      return seg;
    });
  });
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Grafik donat">
  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" stroke-width={thickness} opacity="0.3" />
  {#each segments as seg}
    <circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={seg.datum.color}
      stroke-width={thickness}
      stroke-dasharray={seg.dash}
      stroke-dashoffset={seg.offset}
      transform="rotate(-90 {size / 2} {size / 2})"
      stroke-linecap="butt"
    >
      <title>{seg.datum.name}: {seg.datum.value}</title>
    </circle>
  {/each}
  <text x={size / 2} y={size / 2 - 4} text-anchor="middle" font-size="20" font-weight="800" fill="var(--color-text)">
    {total}
  </text>
  <text x={size / 2} y={size / 2 + 14} text-anchor="middle" font-size="10" fill="var(--color-muted-foreground)">
    Total
  </text>
</svg>
