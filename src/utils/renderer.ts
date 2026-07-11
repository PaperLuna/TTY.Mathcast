import { marked } from "marked";
import type { Beat, StoredImage, ComputedState } from "@/types";
import { THEMES, FONT_VAL } from "@/utils/constants";

// Configure marked: GFM + line breaks
marked.setOptions({ breaks: true, gfm: true });

/** Escape HTML special characters */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Render text as Markdown, protecting LaTeX expressions from being
 * mangled by the Markdown parser (marked would eat backslashes in \(…\) etc.).
 * After Markdown → HTML, LaTeX delimiters are restored so KaTeX auto-render
 * can pick them up.
 */
function renderMarkdown(text: string): string {
  const mathBlocks: string[] = [];
  const PH = (i: number) => `@@KATEXBLOCK${i}@@`;

  // Protect \[...\] (display math, may span multiple lines)
  let p = text.replace(/\\\[([\s\S]*?)\\\]/g, (m) => {
    const i = mathBlocks.length;
    mathBlocks.push(m);
    return PH(i);
  });

  // Protect $$...$$ (display math, may span multiple lines)
  p = p.replace(/\$\$([\s\S]*?)\$\$/g, (m) => {
    const i = mathBlocks.length;
    mathBlocks.push(m);
    return PH(i);
  });

  // Protect \(...\) (inline math)
  p = p.replace(/\\\(([\s\S]*?)\\\)/g, (m) => {
    const i = mathBlocks.length;
    mathBlocks.push(m);
    return PH(i);
  });

  // Protect $...$ (inline math, single line only)
  p = p.replace(/\$([^\$\n]+?)\$/g, (m) => {
    const i = mathBlocks.length;
    mathBlocks.push(m);
    return PH(i);
  });

  // ── Auto-wrap bare LaTeX commands ─────────────────────
  // Users often write raw \angle, \tan, \frac{1}{2} etc. without
  // $ delimiters.  Wrap them so KaTeX can pick them up.
  // Only runs on text that is NOT already inside a math block
  // (those were protected above and replaced with placeholders).
  p = p.replace(
    /\\[a-zA-Z]{2,}(?:\{[^{}]*\}(?:\{[^{}]*\})?)?/g,
    (m) => {
      const i = mathBlocks.length;
      mathBlocks.push(`$${m}$`);
      return PH(i);
    }
  );

  // Parse Markdown → HTML
  let html = marked.parse(p) as string;

  // Restore LaTeX expressions
  html = html.replace(/@@KATEXBLOCK(\d+)@@/g, (_, idx) => mathBlocks[+idx]);

  return html;
}

/** Check whether a step contains a display-math block (\[...\] or $$...$$) */
function hasDisplayMath(text: string): boolean {
  return /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/.test(text);
}

/** Generate CSS for background-image fit modes */
export function fitStyle(fit: string): string {
  switch (fit) {
    case "cover":
      return "background-size:cover;background-repeat:no-repeat;background-position:center;";
    case "fill":
      return "background-size:100% 100%;background-repeat:no-repeat;background-position:center;";
    case "zoom":
      return "background-size:150%;background-repeat:no-repeat;background-position:center;";
    case "repeat":
      return "background-size:auto;background-repeat:repeat;background-position:top left;";
    case "auto":
      return "background-size:auto;background-repeat:no-repeat;background-position:center;";
    default:
      return "background-size:contain;background-repeat:no-repeat;background-position:center;";
  }
}

/** Compute the cumulative state at a given beat index */
export function computeState(
  upto: number,
  beats: Beat[],
  leftImages: StoredImage[],
  rightImages: StoredImage[]
): ComputedState {
  const center: string[] = [];
  const right: string[] = [];
  let left: StoredImage | null = null;
  let rimg: StoredImage | null = null;

  for (let i = 0; i <= upto && i < beats.length; i++) {
    const b = beats[i];

    if (b.type === "pagebreak") {
      // Track images (page breaks preserve image state)
      if (b.leftImgIndex != null && b.leftImgIndex >= 0)
        left = leftImages[b.leftImgIndex];
      if (b.rightImgIndex != null && b.rightImgIndex >= 0)
        rimg = rightImages[b.rightImgIndex];

      if (i < upto) {
        // Past a pagebreak — reset columns for new page
        center.length = 0;
        right.length = 0;
      }
      // If i === upto (currently AT a pagebreak beat), keep accumulated
      // content so the viewer sees the completed page before transition.
      continue;
    }

    if (b.type === "center") center.push(b.text);
    else right.push(b.text);

    if (b.leftImgIndex != null && b.leftImgIndex >= 0)
      left = leftImages[b.leftImgIndex];
    if (b.rightImgIndex != null && b.rightImgIndex >= 0)
      rimg = rightImages[b.rightImgIndex];
  }

  return {
    center,
    right,
    left,
    rimg,
    lastType: upto >= 0 && upto < beats.length ? beats[upto].type : null,
    page: 1,
  };
}

/** Build the inner HTML for the stage at a given beat index */
export function buildStageHTML(
  upto: number,
  beats: Beat[],
  leftImages: StoredImage[],
  rightImages: StoredImage[],
  opts: {
    theme: string;
    leftFit: string;
    colW: number[];
    stepFontSize: number;
    stepFontFamily: string;
    titleFontSize: number;
    titleFontFamily: string;
    stepGap: number;
    title: string;
    W: number;
    H: number;
    leftImgOffset: number;
    rightImgOffset: number;
  }
): string {
  const s = computeState(upto, beats, leftImages, rightImages);
  const th = THEMES[opts.theme] || THEMES.white;

  const leftHtml = s.left
    ? `<div class="col-fill" style="background-image:url('${s.left.url}');${fitStyle(opts.leftFit)}background-position-y:${opts.leftImgOffset}%;"></div>`
    : `<div class="ph">左栏图片<br>（在打轴里指定）</div>`;

  // ── Build step-lines, skipping empty beats ────────────
  const centerNonEmpty = s.center.filter((t) => t.trim());
  const rightNonEmpty = s.right.filter((t) => t.trim());

  const centerLines = centerNonEmpty.length
    ? centerNonEmpty
        .map(
          (t, i) =>
            `<div class="step-line ${hasDisplayMath(t) ? "formula-block " : ""}${
              i === centerNonEmpty.length - 1 && s.lastType === "center"
                ? "new-line"
                : "old-line"
            }">${renderMarkdown(t)}</div>`
        )
        .join("")
    : `<div class="ph">在左侧输入解题步骤</div>`;

  const rightLines = rightNonEmpty.length
    ? rightNonEmpty
        .map(
          (t, i) =>
            `<div class="step-line ${hasDisplayMath(t) ? "formula-block " : ""}${
              i === rightNonEmpty.length - 1 && s.lastType === "right"
                ? "new-line"
                : "old-line"
            }">${renderMarkdown(t)}</div>`
        )
        .join("")
    : "";

  const rightColClass = s.rimg ? "col col-right has-rimg" : "col col-right";
  const rightCol = s.rimg
    ? `<div class="col-body img-half" style="justify-content:center;align-items:center"><img src="${s.rimg.url}" class="col-img" style="object-position:50% ${opts.rightImgOffset}%;"></div>
       <div class="col-body steps">${rightLines}</div>`
    : `<div class="col-body steps" style="flex:1">${rightLines}</div>`;

  const titleHtml = opts.title.trim()
    ? `<div class="stage-title">${esc(opts.title)}</div>`
    : "";

	  return `
	  <style>
    #stage{background:${th.bg};color:${th.text};font-family:${FONT_VAL.sans};display:flex;flex-direction:column;
      padding:12px 20px 0;}
    #stage .stage-title{flex:0 0 84px;height:84px;margin-top:8px;margin-bottom:8px;display:flex;align-items:center;
      padding:0 40px;font-size:${opts.titleFontSize}px;font-family:${opts.titleFontFamily};font-weight:700;
      letter-spacing:1px;color:${th.text};border-top:8px solid ${th.accent};border-bottom:1px solid ${th.border};}
    #stage .stage-grid{display:grid;grid-template-columns:${opts.colW[0]}fr ${opts.colW[1]}fr ${opts.colW[2]}fr;flex:1;min-height:0;
      gap:0;padding-bottom:12px;}
	    #stage .col{display:flex;flex-direction:column;min-height:0;background:${th.bg};}
	    #stage .col-left{border-right:1px solid ${th.border};}
	    #stage .col-center{border-right:1px solid ${th.border};}
	    #stage .col-right{}
	    #stage .col-body{padding:20px 24px;flex:1;min-height:0;display:flex;flex-direction:column;gap:${opts.stepGap}px;background:${th.bg};}
	    #stage .img-half{flex:1 1 55%;min-height:0;}
	    #stage .col-right.has-rimg .steps{flex:1 1 45%;min-height:0;}
	    #stage .col-right:not(.has-rimg) .steps{flex:1;min-height:0;}
	    #stage .col-fill{width:100%;height:100%;border-radius:12px;background-color:${th.panel};}
	    #stage .col-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px;background:${th.panel};}
	    #stage .steps{overflow:hidden;justify-content:flex-start;}
	    #stage .step-line{font-size:${opts.stepFontSize}px;font-family:${opts.stepFontFamily};line-height:1.45;padding:6px 12px;border-radius:8px;
	      background:${th.panel};border:1px solid ${th.border};}
    #stage .step-line.formula-block{padding:3px 10px;line-height:1.25;}
    #stage .step-line .katex-display{margin:0.25em 0;font-size:0.72em;}
    #stage .step-line .katex-display > .katex{margin:0 auto;}
    #stage .step-line p:first-child{margin-top:0;} #stage .step-line p:last-child{margin-bottom:0;}
    #stage .step-line h1{font-size:1.3em;font-weight:700;margin:.3em 0 .2em;}
    #stage .step-line h2{font-size:1.15em;font-weight:700;margin:.3em 0 .2em;}
    #stage .step-line h3{font-size:1.05em;font-weight:700;margin:.3em 0 .2em;}
    #stage .step-line h4, #stage .step-line h5, #stage .step-line h6{font-size:1em;font-weight:700;margin:.2em 0 .1em;}
    #stage .step-line ul, #stage .step-line ol{margin:.2em 0;padding-left:1.4em;}
    #stage .step-line li{margin:.1em 0;}
    #stage .step-line code{font-family:${FONT_VAL.mono};background:${th.border};padding:1px 4px;border-radius:3px;font-size:.88em;}
    #stage .step-line pre{margin:.3em 0;padding:.4em .6em;border-radius:6px;background:${th.border};overflow-x:auto;}
    #stage .step-line pre code{background:none;padding:0;}
    #stage .step-line blockquote{border-left:3px solid ${th.accent};margin:.3em 0;padding:.1em .8em;opacity:.85;}
    #stage .step-line table{border-collapse:collapse;margin:.3em 0;}
    #stage .step-line th, #stage .step-line td{border:1px solid ${th.border};padding:3px 7px;}
    #stage .step-line hr{border:none;border-top:1px solid ${th.border};margin:.4em 0;}
    #stage .step-line img{max-width:100%;border-radius:6px;}
    #stage .step-line a{color:${th.accent};}
    #stage .old-line{color:${th.text};opacity:.82;border-color:transparent;background:transparent;}
    #stage .new-line{color:${th.red};font-weight:700;border-color:${th.red};}
    #stage .ph{margin:auto;color:${th.muted};font-size:22px;text-align:center;line-height:1.6;
      border:2px dashed ${th.border};border-radius:14px;padding:32px 40px;}
    #stage .stage-footer{flex:0 0 28px;height:28px;margin-top:0;border-top:8px solid ${th.accent};
      margin-left:20px;margin-right:20px;}
  </style>
  ${titleHtml}
  <div class="stage-grid">
    <div class="col col-left"><div class="col-body img-half">${leftHtml}</div></div>
    <div class="col col-center"><div class="col-body steps">${centerLines}</div></div>
    <div class="${rightColClass}">${rightCol}</div>
  </div>
  <div class="stage-footer"></div>`;
}
