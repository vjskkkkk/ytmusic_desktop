// Liquid Glass helpers: the transparency level, press lighting, and edge lensing for the
// floating bars. See styles/glass.css and .claude/skills/liquid-glass.

const root = document.documentElement;

// 0 = solid surfaces, 100 = clearest glass (settings "Glass" slider).
export function applyGlass(level) {
  const v = Number.isFinite(level) ? Math.min(100, Math.max(0, level)) : 60;
  root.style.setProperty('--lg-clarity', String(v / 100));
  if (v === 0) root.dataset.glass = 'off';
  else delete root.dataset.glass;
}

// Interactive illumination: the pressed control lights from the point of contact.
document.addEventListener('pointerdown', (e) => {
  const el = e.target instanceof Element ? e.target.closest('.lg-ctl, .lg-primary, .lg-selected') : null;
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--press-x', `${e.clientX - r.left}px`);
  el.style.setProperty('--press-y', `${e.clientY - r.top}px`);
}, { passive: true });

// ---------- edge lensing ----------
// A filter inside backdrop-filter only sees the backdrop, not the element's shape, so the
// displacement map is drawn from the element's own rounded outline: flat in the middle, bending
// light only in a band along the rim (skill section 17.2). Chromium only; glass.css gates it.

const SVG_NS = 'http://www.w3.org/2000/svg';
let defs = null;
function svgDefs() {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

// R/G encode the x/y displacement (128 = none). Points inward at the rim, so the backdrop is
// sampled from further inside and appears to swell outward toward the edge, as through a lens.
function lensMap(width, height, radius, bevel) {
  const k = 0.5; // half resolution; the map is smooth, and it is stretched back up
  const w = Math.max(2, Math.round(width * k));
  const h = Math.max(2, Math.round(height * k));
  const r = Math.min(radius, width / 2, height / 2);
  const band = Math.max(2, bevel);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const bx = width / 2;
  const by = height / 2;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const px = (i + 0.5) / k - bx;
      const py = (j + 0.5) / k - by;
      const qx = Math.abs(px) - bx + r;
      const qy = Math.abs(py) - by + r;
      // distance inside the rounded rectangle, and the inward direction to its nearest edge
      let d;
      let gx = 0;
      let gy = 0;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1;
        d = r - len;
        gx = (-qx / len) * Math.sign(px);
        gy = (-qy / len) * Math.sign(py);
      } else if (qx > qy) {
        d = r - qx;
        gx = -Math.sign(px);
      } else {
        d = r - qy;
        gy = -Math.sign(py);
      }
      let n = 0;
      if (d > 0 && d < band) {
        // biconvex profile h(d) = sqrt(d(2b - d)); its slope, turned into a unit normal's tilt
        const slope = (band - d) / Math.sqrt(Math.max(d * (2 * band - d), 1e-3));
        n = slope / Math.sqrt(1 + slope * slope);
      }
      const o = (j * w + i) * 4;
      img.data[o] = Math.round(128 + gx * n * 127);
      img.data[o + 1] = Math.round(128 + gy * n * 127);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

let lensCount = 0;

// Svelte action: <div class="lg-regular lg-lens" use:lens={{ radius: 18, bevel: 14, strength: 26 }}>
export function lens(node, opts = {}) {
  const id = `lg-lens-${++lensCount}`;
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  const image = document.createElementNS(SVG_NS, 'feImage');
  image.setAttribute('result', 'map');
  image.setAttribute('preserveAspectRatio', 'none');
  const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
  disp.setAttribute('in', 'SourceGraphic');
  disp.setAttribute('in2', 'map');
  disp.setAttribute('xChannelSelector', 'R');
  disp.setAttribute('yChannelSelector', 'G');
  filter.append(image, disp);
  svgDefs().appendChild(filter);

  let o = opts;
  let size = '';
  function draw() {
    const { width, height } = node.getBoundingClientRect();
    if (width < 4 || height < 4) return;
    const key = `${Math.round(width)}x${Math.round(height)}:${o.radius}:${o.bevel}:${o.strength}`;
    if (key === size) return;
    size = key;
    for (const el of [filter, image]) {
      el.setAttribute('x', '0');
      el.setAttribute('y', '0');
      el.setAttribute('width', String(width));
      el.setAttribute('height', String(height));
    }
    image.setAttribute('href', lensMap(width, height, o.radius ?? 18, o.bevel ?? 14));
    disp.setAttribute('scale', String(o.strength ?? 26));
    node.style.setProperty('--lg-lens', `url(#${id})`);
  }

  let timer;
  const ro = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(draw, 120); // window drags resize continuously; redraw once it settles
  });
  ro.observe(node);
  draw();

  return {
    update(next) {
      o = next || {};
      draw();
    },
    destroy() {
      ro.disconnect();
      clearTimeout(timer);
      filter.remove();
      node.style.removeProperty('--lg-lens');
    },
  };
}
