// ==UserScript==

// @name         Doubao Dark Mode

// @namespace    https://www.doubao.com/

// @version      1.3.0

// @description  Tasteful dark mode for Doubao — inverts black/white, softens text brightness, keeps images & emoji intact. Toggle: pill button or Alt+D.

// @author       LoSipon

// @match        https://www.doubao.com/*

// @grant        none

// @run-at       document-start

// ==/UserScript==



(function () {

    'use strict';



    /* ─────────────────────────────────────────────────────────

     *  PERSISTENCE  (default: dark mode ON)

     * ───────────────────────────────────────────────────────── */

    const KEY = 'doubao_dm';

    let on = localStorage.getItem(KEY) !== '0';





    /* ─────────────────────────────────────────────────────────

     *  BRIGHTNESS CONSTANTS

     *

     *  PAGE_BR  — applied to the page filter.

     *    Values below 1.0 dim the inverted result, so what was

     *    originally black text (now white after inversion) becomes

     *    a softer off-white instead of a glaring #ffffff.

     *    Pure black backgrounds are unaffected (0 × anything = 0).

     *

     *  MEDIA_BR — applied to every counter-invert filter.

     *    Mathematically: PAGE_BR × MEDIA_BR ≈ 1.000, so the net

     *    transform on images / emoji / bg-images is identity.

     *    (0.85 × 1.1765 = 1.000025 ≈ 1.0 — original colours.)

     * ───────────────────────────────────────────────────────── */

    const PAGE_BR = '0.85';

    const MEDIA_BR = '1.17647';  // 1 / 0.85  (precise to 5 dp)





    /* ─────────────────────────────────────────────────────────

     *  CSS

     * ───────────────────────────────────────────────────────── */

    const CSS = `

/* ── Core inversion: black ↔ white, text brightness softened ── */

html._dm {

  filter: invert(1) hue-rotate(180deg) brightness(${PAGE_BR}) !important;

}



/* ── Restore raster media — double-invert + compensate brightness ── */

html._dm img,

html._dm input[type="image"],

html._dm video,

html._dm canvas,

html._dm picture img,

html._dm svg image,

html._dm iframe,

html._dm embed,

html._dm object {

  filter: invert(1) hue-rotate(180deg) brightness(${MEDIA_BR}) !important;

}



/* ── Restore inline background-image elements (uploaded thumbnails etc.) ──

   Applied via JS to any element whose inline style carries a real image URL.

   Double-invert + compensate → original colours, including children.        */

html._dm ._dm-restore-bg {

  filter: invert(1) hue-rotate(180deg) brightness(${MEDIA_BR}) !important;

}



/* ── Prevent nested double-restore: img inside _dm-restore-bg already restored ── */

html._dm ._dm-restore-bg img,

html._dm ._dm-restore-bg video,

html._dm ._dm-restore-bg canvas {

  filter: none !important;

}



/* ── Restore emoji glyphs ─────────────────────────────────────────────── */

html._dm ._dm-emoji {

  display: inline-block;

  filter: invert(1) hue-rotate(180deg) brightness(${MEDIA_BR}) !important;

}



/* ── Prevent nested double-restore: emoji inside _dm-restore-bg already restored ── */

html._dm ._dm-restore-bg ._dm-emoji {

  filter: none !important;

}



/* ── Slim, low-contrast scrollbar ─────────────────────────────────────── */

html._dm ::-webkit-scrollbar        { width: 5px; height: 5px; }

html._dm ::-webkit-scrollbar-track  { background: transparent; }

html._dm ::-webkit-scrollbar-thumb  {

  background: rgba(255, 255, 255, .18);

  border-radius: 3px;

}

html._dm ::-webkit-scrollbar-thumb:hover {

  background: rgba(255, 255, 255, .36);

}

html._dm ::-webkit-scrollbar-corner { background: transparent; }



/* ── Text selection ──────────────────────────────────────────────────── */

html._dm ::selection {

  background: rgba(100, 160, 255, .35);

  color: inherit;

}



/* ── Focus rings ─────────────────────────────────────────────────────── */

html._dm :focus-visible {

  outline-color: rgba(150, 190, 255, .7);

}



/* ════════════════════════════════════════════════════════════════════════

   TOGGLE PILL

   Lives inside <html>, so the page-level filter applies to it too.

   The element-level filter below cancels it out (double-invert = id;

   double-hue-rotate-180° = id; PAGE_BR × MEDIA_BR ≈ 1.0).

   ════════════════════════════════════════════════════════════════════════ */

#_dm-pill {

  position: fixed;

  bottom: 18px;

  right: 18px;

  z-index: 2147483647;

  display: flex;

  align-items: center;

  justify-content: center;

  width: 32px;

  height: 32px;

  padding: 0;

  border: none;

  border-radius: 50%;

  background: rgba(128, 128, 128, .22);

  backdrop-filter: blur(10px);

  -webkit-backdrop-filter: blur(10px);

  box-shadow:

    0 1px 3px rgba(0, 0, 0, .20),

    0 0  0 1px rgba(128, 128, 128, .15);

  font-size: 15px;

  cursor: pointer;

  user-select: none;

  opacity: .42;

  transition: opacity .18s ease, transform .14s ease;

}

#_dm-pill:hover  { opacity: 1; transform: scale(1.12); }

#_dm-pill:active { transform: scale(.96); }

html._dm #_dm-pill {

  filter: invert(1) hue-rotate(180deg) brightness(${MEDIA_BR}) !important;

}

`;





    /* ─────────────────────────────────────────────────────────

     *  INJECT STYLE AT document-start  (prevents FOUC)

     * ───────────────────────────────────────────────────────── */

    const $style = document.createElement('style');

    $style.id = '_dm-style';

    $style.textContent = CSS;

    document.documentElement.appendChild($style);





    /* ─────────────────────────────────────────────────────────

     *  EMOJI WRAPPING

     *

     *  Wraps each emoji sequence in <span class="_dm-emoji"> so the

     *  CSS counter-filter restores its original colours.

     *  Editable areas (message input) are skipped to avoid

     *  interfering with text entry or the site's React state.

     * ───────────────────────────────────────────────────────── */

    const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?(?:\p{Emoji_Modifier})?)*\uFE0F?|[\u{1F1E0}-\u{1F1FF}]{2}/gu;



    let _busy = false;



    function wrapEmojis(root) {

        if (_busy || !root) return;



        const walker = document.createTreeWalker(

            root,

            NodeFilter.SHOW_TEXT,

            {

                acceptNode(node) {

                    const p = node.parentNode;

                    if (!p) return NodeFilter.FILTER_SKIP;

                    const tag = p.nodeName;

                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {

                        return NodeFilter.FILTER_SKIP;

                    }

                    if (p.classList && p.classList.contains('_dm-emoji')) {

                        return NodeFilter.FILTER_SKIP;

                    }

                    if (p.isContentEditable) {

                        return NodeFilter.FILTER_SKIP;

                    }

                    EMOJI_RE.lastIndex = 0;

                    return EMOJI_RE.test(node.textContent)

                        ? NodeFilter.FILTER_ACCEPT

                        : NodeFilter.FILTER_SKIP;

                }

            }

        );



        const targets = [];

        let n;

        while ((n = walker.nextNode())) targets.push(n);



        _busy = true;

        try {

            for (const textNode of targets) {

                if (!textNode.parentNode) continue;

                EMOJI_RE.lastIndex = 0;

                const text = textNode.textContent;

                const frag = document.createDocumentFragment();

                let lastIdx = 0;

                let m;

                while ((m = EMOJI_RE.exec(text)) !== null) {

                    if (EMOJI_RE.lastIndex === m.index) { EMOJI_RE.lastIndex++; continue; }

                    if (m.index > lastIdx) {

                        frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));

                    }

                    const span = document.createElement('span');

                    span.className = '_dm-emoji';

                    span.textContent = m[0];

                    frag.appendChild(span);

                    lastIdx = EMOJI_RE.lastIndex;

                }

                if (lastIdx < text.length) {

                    frag.appendChild(document.createTextNode(text.slice(lastIdx)));

                }

                textNode.parentNode.replaceChild(frag, textNode);

            }

        } finally {

            _busy = false;

        }

    }





    /* ─────────────────────────────────────────────────────────

     *  BACKGROUND-IMAGE RESTORATION

     *

     *  Problem: when a user inserts an image, Doubao often renders

     *  the preview/thumbnail as a CSS background-image on a <div>.

     *  Those elements are NOT covered by the `img` CSS rule, so

     *  they remain double-inverted (wrong colours).

     *

     *  Fix: mark any element whose *inline* style sets a real image

     *  URL (not a gradient) with the class `_dm-restore-bg`.

     *  The CSS rule for that class applies the same counter-filter

     *  as for <img>, restoring original colours for the element and

     *  all its children (e.g. close-button overlays).

     *

     *  Only inline styles are targeted — background-images in

     *  stylesheet rules are part of the site's UI chrome and should

     *  participate in the dark-mode inversion like everything else.

     * ───────────────────────────────────────────────────────── */

    function markBgImg(el) {

        if (!el || typeof el.style === 'undefined') return;

        const bg = el.style.backgroundImage;

        // Only real image URLs, not CSS gradients or 'none'

        if (bg && bg.includes('url(')) {

            el.classList.add('_dm-restore-bg');

        }

    }



    function fixBgImages(root) {

        if (!root) return;

        markBgImg(root);

        if (typeof root.querySelectorAll === 'function') {

            root.querySelectorAll('[style*="background-image"]').forEach(markBgImg);

        }

    }





    /* ─────────────────────────────────────────────────────────

     *  SYNC  — apply/remove the dark-mode class; update the pill

     * ───────────────────────────────────────────────────────── */

    function sync() {

        document.documentElement.classList.toggle('_dm', on);

        const pill = document.getElementById('_dm-pill');

        if (pill) {

            pill.textContent = on ? '☀️' : '🌙';

            const label = on ? 'Light mode  [Alt+D]' : 'Dark mode  [Alt+D]';

            pill.title = label;

            pill.setAttribute('aria-label', label);

        }

        if (on && document.body) {

            wrapEmojis(document.body);

            fixBgImages(document.body);

        }

    }



    // Apply immediately (before first paint)

    sync();





    /* ─────────────────────────────────────────────────────────

     *  TOGGLE

     * ───────────────────────────────────────────────────────── */

    function toggle() {

        on = !on;

        localStorage.setItem(KEY, on ? '1' : '0');

        sync();

    }





    /* ─────────────────────────────────────────────────────────

     *  KEYBOARD SHORTCUT — Alt+D

     * ───────────────────────────────────────────────────────── */

    document.addEventListener('keydown', e => {

        if (e.altKey && e.key.toLowerCase() === 'd') {

            e.preventDefault();

            toggle();

        }

    });





    /* ─────────────────────────────────────────────────────────

     *  TOGGLE PILL

     * ───────────────────────────────────────────────────────── */

    function mount() {

        if (document.getElementById('_dm-pill')) return;

        const pill = document.createElement('button');

        pill.id = '_dm-pill';

        pill.type = 'button';

        pill.textContent = on ? '☀️' : '🌙';

        const label = on ? 'Light mode  [Alt+D]' : 'Dark mode  [Alt+D]';

        pill.title = label;

        pill.setAttribute('aria-label', label);

        pill.addEventListener('click', toggle);

        document.body.appendChild(pill);

    }





    /* ─────────────────────────────────────────────────────────

     *  MUTATION OBSERVERS

     *

     *  pillObserver    — re-mounts the pill if the SPA re-renders

     *                    and removes it from <body>.

     *

     *  contentObserver — handles two cases:

     *    • childList  — new elements added to the DOM (streaming

     *                   chat responses, file attachment previews).

     *                   Wrap emoji + fix bg-images in each.

     *    • attributes — inline `style` changed on an existing node

     *                   (e.g. Doubao sets background-image after the

     *                   element is already in the DOM).

     *                   Re-evaluate whether it needs _dm-restore-bg.

     * ───────────────────────────────────────────────────────── */

    const pillObserver = new MutationObserver(() => {

        if (!document.getElementById('_dm-pill') && document.body) mount();

    });



    const contentObserver = new MutationObserver(mutations => {

        if (!on || _busy) return;

        for (const mut of mutations) {

            if (mut.type === 'childList') {

                for (const node of mut.addedNodes) {

                    if (node.nodeType === Node.ELEMENT_NODE) {

                        wrapEmojis(node);

                        fixBgImages(node);

                    }

                }

            } else if (mut.type === 'attributes' && mut.attributeName === 'style') {

                // An existing element's inline style changed — re-check its bg-image

                markBgImg(/** @type {Element} */(mut.target));

            }

        }

    });





    /* ─────────────────────────────────────────────────────────

     *  INIT

     * ───────────────────────────────────────────────────────── */

    function init() {

        mount();

        if (on) {

            wrapEmojis(document.body);

            fixBgImages(document.body);

        }



        pillObserver.observe(document.body, { childList: true });



        contentObserver.observe(document.body, {

            childList: true,

            subtree: true,

            attributes: true,

            attributeFilter: ['style']   // only re-fire when `style` changes

        });

    }



    if (document.body) init();

    else document.addEventListener('DOMContentLoaded', init);



})();
