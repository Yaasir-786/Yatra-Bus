export const SEAT_COLUMNS = ['A', 'B', 'C', 'D'] as const;

export function buildAllSeatLabels(totalSeats: number): string[] {
  const labels: string[] = [];
  const rows = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = (r - 1) * 4 + c;
      if (idx < totalSeats) {
        labels.push(`${r}${SEAT_COLUMNS[c]}`);
      }
    }
  }
  return labels;
}
