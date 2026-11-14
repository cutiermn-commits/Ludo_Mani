// Board geometry for a standard 15x15 Ludo board.
// Coordinates are [col, row], 0..14, origin top-left.

export type Color = 'red' | 'green' | 'yellow' | 'blue';
export const COLORS: Color[] = ['red', 'green', 'yellow', 'blue']; // clockwise turn order

export type Cell = readonly [number, number];

/** Number of squares on the shared outer track. */
export const TRACK_LENGTH = 52;
/** Progress value of the last shared-track square before a colour's home column. */
export const LAST_TRACK_PROGRESS = 50;
/** Progress value when a token has reached the centre (finished). */
export const FINISHED = 56;
/** Progress value of a token still in its base. */
export const IN_BASE = -1;

function seg(from: Cell, to: Cell): Cell[] {
  const out: Cell[] = [];
  const dx = Math.sign(to[0] - from[0]);
  const dy = Math.sign(to[1] - from[1]);
  let [x, y] = from;
  out.push([x, y]);
  while (x !== to[0] || y !== to[1]) {
    x += dx;
    y += dy;
    out.push([x, y]);
  }
  return out;
}

/** The 52-square loop, clockwise, starting at red's start square (1,6). */
export const TRACK: Cell[] = [
  ...seg([1, 6], [5, 6]),
  ...seg([6, 5], [6, 0]),
  [7, 0],
  ...seg([8, 0], [8, 5]),
  ...seg([9, 6], [14, 6]),
  [14, 7],
  ...seg([14, 8], [9, 8]),
  ...seg([8, 9], [8, 14]),
  [7, 14],
  ...seg([6, 14], [6, 9]),
  ...seg([5, 8], [0, 8]),
  [0, 7],
  [0, 6],
];

if (TRACK.length !== TRACK_LENGTH) {
  throw new Error(`Track must have ${TRACK_LENGTH} cells, got ${TRACK.length}`);
}

/** Index into TRACK of each colour's start square. */
export const START_INDEX: Record<Color, number> = { red: 0, green: 13, yellow: 26, blue: 39 };

/** Safe squares: the four start squares plus the four star squares (start + 8). */
export const SAFE_INDICES: ReadonlySet<number> = new Set(
  COLORS.flatMap((c) => [START_INDEX[c], (START_INDEX[c] + 8) % TRACK_LENGTH]),
);

/** Five home-column cells per colour, ordered from track towards centre. */
export const HOME_COLUMN: Record<Color, Cell[]> = {
  red: seg([1, 7], [5, 7]),
  green: seg([7, 1], [7, 5]),
  yellow: seg([13, 7], [9, 7]),
  blue: seg([7, 13], [7, 9]),
};

/** Top-left corner of each colour's 6x6 base area. */
export const BASE_ORIGIN: Record<Color, Cell> = {
  red: [0, 0],
  green: [9, 0],
  yellow: [9, 9],
  blue: [0, 9],
};

/** Cell (fractional) where each of the four base tokens sits. */
export function baseSlot(color: Color, tokenIndex: number): Cell {
  const [ox, oy] = BASE_ORIGIN[color];
  const offsets: Cell[] = [
    [1.5, 1.5],
    [3.5, 1.5],
    [1.5, 3.5],
    [3.5, 3.5],
  ];
  const [dx, dy] = offsets[tokenIndex];
  return [ox + dx, oy + dy];
}

/** Absolute TRACK index for a token on the shared track, or null if not on it. */
export function trackIndex(color: Color, progress: number): number | null {
  if (progress < 0 || progress > LAST_TRACK_PROGRESS) return null;
  return (START_INDEX[color] + progress) % TRACK_LENGTH;
}

/** Board cell for a token. Finished tokens return the centre cell (7,7). */
export function cellFor(color: Color, tokenIndex: number, progress: number): Cell {
  if (progress === IN_BASE) return baseSlot(color, tokenIndex);
  if (progress === FINISHED) return [7, 7];
  const ti = trackIndex(color, progress);
  if (ti !== null) return TRACK[ti];
  return HOME_COLUMN[color][progress - LAST_TRACK_PROGRESS - 1];
}
