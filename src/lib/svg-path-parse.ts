import { Point } from "./cnc-relief";

/**
 * Parses the straight-line subset of SVG path data (M/L/Z, absolute or
 * relative, plus the H/V shorthands) into closed polygons. This is exactly
 * what this app's own laser SVG export writes (see svg.ts's
 * straightPathData) — deliberately not a general SVG path parser: curves
 * (C/S/Q/T/A) aren't supported, so a path containing them is rejected with
 * a clear error rather than silently flattened or mis-read.
 */
export function parseStraightSvgPaths(svgOrPathData: string): Point[][] {
  const pathDataMatches = [...svgOrPathData.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  const dataStrings = pathDataMatches.length > 0 ? pathDataMatches : [svgOrPathData];

  const polygons: Point[][] = [];
  for (const d of dataStrings) {
    polygons.push(...parsePathData(d));
  }
  if (polygons.length === 0) throw new Error("No path data found — paste an SVG containing at least one <path> element, or raw path 'd' data.");
  return polygons;
}

const UNSUPPORTED_COMMAND = /[CcSsQqTtAa]/;

function parsePathData(d: string): Point[][] {
  if (UNSUPPORTED_COMMAND.test(d)) {
    throw new Error("This path contains curves (C/S/Q/T/A) — only straight-line paths (M/L/H/V/Z) are supported.");
  }

  const tokens = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polygons: Point[][] = [];
  let current: Point[] = [];
  let cursor: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  let i = 0;
  let command = "";

  function readNumber(): number {
    const value = Number(tokens[i]);
    if (Number.isNaN(value)) throw new Error(`Malformed path data near token "${tokens[i]}".`);
    i += 1;
    return value;
  }

  while (i < tokens.length) {
    if (/^[MLHVZmlhvz]$/.test(tokens[i])) {
      command = tokens[i];
      i += 1;
    }
    switch (command) {
      case "M":
      case "L": {
        const x = readNumber();
        const y = readNumber();
        cursor = [x, y];
        break;
      }
      case "m":
      case "l": {
        const dx = readNumber();
        const dy = readNumber();
        cursor = [cursor[0] + dx, cursor[1] + dy];
        break;
      }
      case "H": {
        cursor = [readNumber(), cursor[1]];
        break;
      }
      case "h": {
        cursor = [cursor[0] + readNumber(), cursor[1]];
        break;
      }
      case "V": {
        cursor = [cursor[0], readNumber()];
        break;
      }
      case "v": {
        cursor = [cursor[0], cursor[1] + readNumber()];
        break;
      }
      case "Z":
      case "z": {
        if (current.length > 0) polygons.push(current);
        current = [];
        cursor = start;
        continue;
      }
      default:
        throw new Error(`Unsupported path command "${command}".`);
    }

    if (command === "M" || command === "m") {
      if (current.length > 0) polygons.push(current);
      current = [cursor];
      start = cursor;
      // Subsequent coordinate pairs after an M are implicit L commands.
      command = command === "M" ? "L" : "l";
    } else {
      current.push(cursor);
    }
  }
  if (current.length > 2) polygons.push(current);

  return polygons.filter((p) => p.length >= 3);
}
