import { Doc } from '../_generated/dataModel';
import { Motion, Position } from '../types';
import {
  getPoseFromMotion,
  getRemainingPathFromMotion,
  manhattanDistance,
  roundPosition,
} from './physics';

export function findRoute(
  walls: boolean[][],
  startMotion: Motion,
  otherPlayerMotion: Motion[],
  end: Position,
  ts: number,
) {
  let distance = 0;

  const startPose = getPoseFromMotion(startMotion, ts);
  // TODO: If they were partially along some path, include that in the new
  // route, adjusting the start time so we stay in the same place.
  let current = roundPosition(startPose.position);
  const route: Position[] = [current];
  // Try to maintain their direction.
  let horizontal = !(startPose.orientation === 90 || startPose.orientation === 270);
  // TODO: handle walls
  while (current.x !== end.x || current.y !== end.y) {
    const next = { ...current };
    if (current.x !== end.x && horizontal) {
      // bias towards maintainng character direction
      next.x = end.x;
      distance += Math.abs(current.x - end.x);
    } else if (current.y !== end.y) {
      next.y = end.y;
      distance += Math.abs(current.y - end.y);
    } else {
      next.x = end.x;
      distance += Math.abs(current.x - end.x);
    }
    route.push(next);
    current = next;
    horizontal = !horizontal;
  }
  return { route, distance };
}

export function wallsFromWorld(world: Doc<'worlds'>): boolean[][] {
  const walls: boolean[][] = [];
  for (let y = 0; y < world.height; y++) {
    walls[y] = [];
    for (let x = 0; x < world.width; x++) {
      walls[y][x] = false;
      if (world.walls[y][x] != -1) {
        walls[y][x] = true;
      }
    }
  }
  return walls;
}

// Assumes all motion has started in the past or currently.
// Otherwise we'd need to know how far we'd go before it starts.
// Assumes one square move per time unit, all together.
export function findCollision(
  route: Position[],
  otherMotion: Motion[],
  ts: number,
  strikeZone: number,
) {
  const densePath = makeDensePath(route);
  // Make Position[] for each player, starting at ts
  const otherPlayerPaths = otherMotion
    .map((motion) => getRemainingPathFromMotion(motion, ts))
    .map(makeDensePath);

  // For each position index, check if any other player is nearby.
  for (const [idx, pos] of densePath.entries()) {
    for (const otherPlayerPath of otherPlayerPaths) {
      // Assume the player will stop where the end walking
      const otherPlayerPos = otherPlayerPath[idx] ?? otherPlayerPath.at(-1);
      if (manhattanDistance(pos, otherPlayerPos) <= strikeZone) {
        // Return the first index where there is a collision
        return idx;
      }
    }
  }
  return null;
}

export function makeDensePath(path: Position[]): Position[] {
  if (path.length <= 1) return path;
  const densePath = [];
  for (const [idx, nextPos] of path.slice(1).entries()) {
    const pos = path[idx];
    if (pos.x < nextPos.x) {
      for (let x = pos.x; x < nextPos.x; x++) {
        densePath.push({ x, y: pos.y });
      }
    } else {
      for (let x = pos.x; x > nextPos.x; x--) {
        densePath.push({ x, y: pos.y });
      }
    }
    if (pos.y < nextPos.y) {
      for (let y = pos.y; y < nextPos.y; y++) {
        densePath.push({ x: pos.x, y });
      }
    } else {
      for (let y = pos.y; y > nextPos.y; y--) {
        densePath.push({ x: pos.x, y });
      }
    }
  }
  densePath.push(path[path.length - 1]);
  return densePath;
}
