import type { Beat } from "@/types";

/** Check if a beat text contains display math (formulas take more space) */
function isFormulaBeat(beat: Beat): boolean {
  return /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/.test(beat.text);
}

/** Get the visual weight of a beat line (formulas = 1.6, normal = 1) */
function beatWeight(beat: Beat): number {
  return isFormulaBeat(beat) ? 1.6 : 1;
}

/** Compute max lines the center column can hold based on font size and resolution */
export function computeMaxLines(
  hasTitle: boolean,
  H: number,
  stepFontSize: number,
  stepGap: number
): number {
  const titleH = hasTitle ? 92 : 0;
  const padV = 48;
  const bottomReserve = 36;
  const availH = H - titleH - padV - bottomReserve;
  const lineH = stepFontSize * 1.5 + 16 + stepGap;
  return Math.max(1, Math.floor(availH / lineH));
}

/**
 * Pre-process step text so that multi-line LaTeX display-math blocks
 * (\[...\] and $$...$$) are collapsed into a single logical line.
 * Without this, a display equation spanning 3 lines would be split
 * into 3 separate beats and the delimiters would be broken.
 *
 * Lines starting with '>>' are treated as "continuation" lines (right
 * column) and are split independently of math blocks.
 */
function preprocessSteps(text: string): string[] {
  const rawLines = text.split("\n");
  const result: string[] = [];
  let buffer = "";
  let inMath = false; // inside \[...\]
  let inDollar = false; // inside $$...$$

  const flushBuffer = () => {
    if (buffer.trim()) result.push(buffer);
    buffer = "";
  };

  for (const line of rawLines) {
    if (inMath) {
      buffer += "\n" + line;
      if (line.includes("\\]")) {
        inMath = false;
        flushBuffer();
      }
      continue;
    }
    if (inDollar) {
      buffer += "\n" + line;
      if (line.includes("$$")) {
        inDollar = false;
        flushBuffer();
      }
      continue;
    }

    // Check if this line opens a multi-line \[...\] block
    if (line.includes("\\[") && !line.includes("\\]")) {
      buffer = line;
      inMath = true;
      continue;
    }
    // Check if this line opens a multi-line $$...$$ block
    if (line.includes("$$") && line.split("$$").length < 3) {
      // odd number of $$ means unclosed
      buffer = line;
      inDollar = true;
      continue;
    }

    result.push(line);
  }

  // Flush any remaining buffer
  if (buffer.trim()) result.push(buffer);

  return result;
}

/** Parse step text into beats, preserving image/duration settings from old beats */
export function parseText(
  stepsText: string,
  oldBeats: Beat[],
  hasTitle: boolean,
  H: number,
  stepFontSize: number,
  stepGap: number
): Beat[] {
  const main = preprocessSteps(stepsText);
  const maxC = computeMaxLines(hasTitle, H, stepFontSize, stepGap);
  const beats: Beat[] = [];
  let ni = 0;
  let centerCount = 0;

  const push = (type: Beat["type"], text: string) => {
    const o = oldBeats[ni];
    beats.push({
      type,
      text,
      leftImgIndex: o ? o.leftImgIndex : null,
      rightImgIndex: o ? o.rightImgIndex : null,
      duration: o ? o.duration : type === "center" ? 3.5 : 3,
    });
    ni++;
  };

  main.forEach((line) => {
    line = line.trim();
    if (!line) return;
    // Display-math blocks are taller than a normal text line, so consume more budget
    const isFormula = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/.test(line);
    const weight = isFormula ? 1.6 : 1;
    if (centerCount + weight <= maxC) {
      push("center", line);
      centerCount += weight;
    } else {
      push("right", line);
    }
  });

  return beats;
}

/**
 * Insert page-break beats into the beat list when both center and right
 * columns would overflow. After a pagebreak, both columns reset and
 * remaining beats start fresh on a new "page".
 *
 * Page breaks preserve image/duration settings:
 *   - A pagebreak inherits its leftImgIndex/rightImgIndex from the
 *     preceding beat (so images stay on screen during the transition).
 *   - Subsequent beats on the new page continue the oldBeats index
 *     sequence, so image assignments survive re-parsing.
 */
export function insertPageBreaks(
  beats: Beat[],
  hasTitle: boolean,
  H: number,
  stepFontSize: number,
  stepGap: number
): Beat[] {
  const maxCenter = computeMaxLines(hasTitle, H, stepFontSize, stepGap);
  const maxRight = maxCenter; // Same column height

  const result: Beat[] = [];
  let centerW = 0; // cumulative weight in center column
  let rightW = 0; // cumulative weight in right column

  for (const beat of beats) {
    const w = beatWeight(beat);

    if (beat.type === "center") {
      if (centerW + w <= maxCenter) {
        result.push(beat);
        centerW += w;
      } else if (rightW + w <= maxRight) {
        // Center is full → move this beat to right column
        result.push({ ...beat, type: "right" });
        rightW += w;
      } else {
        // Both columns full → insert page break, then place the beat
        result.push(makePageBreak(beat));
        centerW = 0;
        rightW = 0;
        // Place on new page (start in center if it fits, else right)
        if (w <= maxCenter) {
          result.push(beat);
          centerW += w;
        } else {
          result.push({ ...beat, type: "right" });
          rightW += w;
        }
      }
    } else {
      // beat.type === "right"
      if (rightW + w <= maxRight) {
        result.push(beat);
        rightW += w;
      } else if (centerW + w <= maxCenter) {
        // Right is full → move this beat to center column
        result.push({ ...beat, type: "center" });
        centerW += w;
      } else {
        // Both columns full → insert page break, then place on right
        result.push(makePageBreak(beat));
        centerW = 0;
        rightW = 0;
        result.push(beat);
        rightW += w;
      }
    }
  }

  return result;
}

/** Create a pagebreak beat that inherits image state from preceding beat */
function makePageBreak(prev: Beat): Beat {
  return {
    type: "pagebreak",
    text: "",
    leftImgIndex: prev.leftImgIndex,
    rightImgIndex: prev.rightImgIndex,
    duration: 1.5,
  };
}
