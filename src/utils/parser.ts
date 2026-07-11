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
  // ── Stage vertical layout ──────────────────────────────
  // stage padding-top:        12px
  // title (if present):       84px + 8mt + 8mb + 8bt + 1bb = 109px
  // grid padding-bottom:      12px
  // footer:                   28px + 8bt = 36px
  // col-body vertical padding: 20px + 20px = 40px
  const titleH = hasTitle ? 109 : 0;
  const chrome = titleH + 12 + 12 + 36 + 40;  // total non-content vertical space

  // ── Single line height ────────────────────────────────
  // .step-line: font-size * line-height(1.45) + padding-top(6) + padding-bottom(6)
  //           + border-top(1) + border-bottom(1) + gap
  const lineH = stepFontSize * 1.45 + 14 + stepGap;

  const availH = H - chrome;
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
 * remaining beats start fresh on a new "page", always filling center first.
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
  stepGap: number,
  colW: number[],
  hasRightImages: boolean
): Beat[] {
  const maxCenter = computeMaxLines(hasTitle, H, stepFontSize, stepGap);

  // ── Right-column capacity ──────────────────────────────
  // 1) Narrower column → text wraps more, so each beat consumes
  //    more vertical space.  Scale beat weight by inverse width ratio.
  //    (default: center 48fr, right 30fr → wrapFactor ≈ 48/30 = 1.6)
  const wrapFactor = colW[1] > 0 ? colW[1] / colW[2] : 1.6;

  // 2) When a right image is present, the text area is restricted to
  //    45 % of the column height (image takes the other 55 % via
  //    .img-half / .steps flex split).
  //    Check if ANY beat actually assigns a right image.
  const beatsHaveRightImage = beats.some(
    (b) => b.rightImgIndex != null && b.rightImgIndex >= 0
  );
  const imageHeightFactor = hasRightImages && beatsHaveRightImage ? 0.45 : 1.0;
  const maxRight = Math.max(1, Math.floor(maxCenter * imageHeightFactor));

  const result: Beat[] = [];
  let centerW = 0;
  let rightW = 0;

  for (const beat of beats) {
    const w = beatWeight(beat);
    const rw = w * wrapFactor;

    // ── Always try center first ──────────────────────────
    // If center has room, place there regardless of original beat type.
    // Right column is only used when center is already full.
    if (centerW + w <= maxCenter) {
      result.push({ ...beat, type: "center" });
      centerW += w;
    } else if (beat.type === "right" && rightW + rw <= maxRight) {
      // Center full, beat originally wanted right, and right has room
      result.push(beat);
      rightW += rw;
    } else if (rightW + rw <= maxRight) {
      // Center full → spill to right
      result.push({ ...beat, type: "right" });
      rightW += rw;
    } else {
      // Both full → page break, start fresh in center
      result.push(makePageBreak(beat));
      centerW = 0;
      rightW = 0;
      result.push({ ...beat, type: "center" });
      centerW += w;
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
