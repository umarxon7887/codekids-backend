function seededRandom(seed) {
  let s = seed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
export function generateMaze(seed, size = 7) {
  const rng = seededRandom(seed);
  const grid = Array(size).fill(null).map(() => Array(size).fill(1));
  const stack = []; grid[0][0] = 0; stack.push({ x: 0, y: 0 });
  const directions = [{ dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }];
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    for (const dir of directions) {
      const nx = current.x + dir.dx, ny = current.y + dir.dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === 1) neighbors.push({ x: nx, y: ny, dx: dir.dx, dy: dir.dy });
    }
    if (neighbors.length > 0) {
      const chosen = neighbors[Math.floor(rng() * neighbors.length)];
      grid[chosen.y][chosen.x] = 0; grid[current.y + chosen.dy / 2][current.x + chosen.dx / 2] = 0;
      stack.push({ x: chosen.x, y: chosen.y });
    } else { stack.pop(); }
  }
  grid[size - 1][size - 1] = 3;
  const powerups = [], types = ['speed', 'shield', 'time', 'hint'];
  for (let i = 0; i < 3 + Math.floor(rng() * 3); i++) {
    let px, py;
    do { px = Math.floor(rng() * size); py = Math.floor(rng() * size); } 
    while (grid[py][px] !== 0 || (px === 0 && py === 0) || (px === size - 1 && py === size - 1));
    grid[py][px] = 2; powerups.push({ x: px, y: py, type: types[Math.floor(rng() * types.length)] });
  }
  return { size, start: { x: 0, y: 0 }, finish: { x: size - 1, y: size - 1 }, grid, powerups };
}
