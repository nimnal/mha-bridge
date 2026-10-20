/* MHA Bridge dashboard card for the mha_bridge integration (Geely Monjaro / ECARX head unit).
 *
 *   type: custom:mha-card          tabbed card (Overview / Climate / Body / Comfort / Data); keys tabs, default_tab, remember_tab (default false: always opens on default_tab), height
 *   type: custom:mha-card-full     the long card: everything one under another
 *   type: custom:mha-card-compact  one tile
 *   type: custom:mha-card-mini     small square
 *   type: custom:mha-card-panel    whole screen (three columns with the map)
 *   view: side | top               (mha-card, mha-card-full, mha-card-panel) the car from the side or from above
 *
 * Every key is optional - see README.md for the full list with defaults:
 * name, hide_name, prefix, tracker, tank_size, show_parked, rhd, view,
 * fuel_warn, fuel_critical, fuel_color_ok / _warn / _critical,
 * nav (yandex, maps, osm, apple, here), nav_mode, nav_travel, hide, confirm_open, buttons,
 * car_image, car_image_top, car_image_facing, car_image_hotspots,
 * car_color, arch_color (wheel-arch trim: black | original | body | any colour), chrome_delete { front_bumper, rear_bumper, doors, rails, windows }.
 * wheels (side view, both wheels at once): type1 = original, type2 .. type5 = other rim designs.
 * tap_action (a tap on the card itself, default none) and car_tap_action (a tap on the car, default: open the full card in a window on the compact card, none elsewhere): expand | none | navigate (navigation_path) | url (url_path; a path starting with / opens inside Home Assistant) | more-info (entity) | call-service / perform-action (service, data, target) | toggle (entity); e.g. car_tap_action: { action: navigate, navigation_path: /lovelace/car-panel }.
 * wheel_spin: true - the rims turn on the side view, at the speed of a 20" wheel (rolling circumference wheel_circumference, m, default 2.29); wheel_spin_entity: any speed sensor to use instead of the car's own.
 * accent (theme colour: green, blue, orange, ... or any CSS colour), warn_color, critical_color; text_size (text size by kind of element).
 * popup_card: mha-card-full (default) | mha-card | mha-card-compact | mha-card-mini - the card shown in the window that opens on a tap (expand); popup_map: true | false - the map in that window on / off (omitted = as on the card).
 * zoom: overall size of any card, 0.5 .. 2 (panel: trims the automatic fit, e.g. 0.85 to get rid of scrolling); panel also has scale (absolute).
 * panel layout: with `map` on it is three columns (car | controls | map in the right third), needs a screen of at least 768 x 384 css-px;
 *   `panel_min_width: 900` - narrower than 900 css-px the panel becomes the tabbed card. `rotate: off|auto|always` - on a phone held upright (or in a narrow column) the panel becomes the tabbed card (off, default); auto = it turns itself into landscape instead; always = turns on a computer too.
 * map: true | { entity, zoom, aspect_ratio, theme_mode, hours_to_show, height, tab } - the Home Assistant map built into the card; stable_tabs: false - let the picture size follow each tab; headlights: false - no lamp glow while the engine runs.
 * demo: true - run on a built-in model of the car instead of the real entities; every control works, nothing is sent to the car.
 *
 * The visual layer - styles, the car drawing and the icon set - is taken from the
 * Geely Connect cards (https://github.com/YossiKon/geely-connect), Copyright (c) 2026
 * Yossi Koncha, released under the MIT License (see LICENSE-geely-connect).
 */
"use strict";

(() => {
  const ACCENT = "var(--geely-accent, #2fd6a4)";
  const AMBER = "var(--geely-warn, #e8a13a)";
  const ON_TEXT = `color-mix(in srgb, ${ACCENT} 76%, var(--primary-text-color, #1c1c1e))`;
  const WARN_TEXT = `color-mix(in srgb, ${AMBER} 76%, var(--primary-text-color, #1c1c1e))`;

  /* ------------------------------------------------------------ helpers -- */

  const NUM = (st) => {
    if (!st) return null;
    const v = parseFloat(st.state);
    return Number.isFinite(v) ? v : null;
  };
  const OK = (st) => st && st.state !== "unavailable" && st.state !== "unknown";
  const UNIT = (st) => (st && st.attributes.unit_of_measurement) || "";
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  /* --------------------------------------------------------- the car ----- */
  /* A generic electric crossover, side profile, drawn here - painted body,
   * glass band with a reflection streak, aero wheels, LED lamps, a charge
   * port that lights while charging, and amber indicator dots over the
   * hood / doors / trunk that appear when something is open.
   * Gradient ids are safe: each card lives in its own shadow root. */
  const CAR_SVG = (cls, open = {}) => `
    <svg class="car ${cls}" viewBox="0 0 760 300" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gp" x1="0" y1="29" x2="0" y2="262" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#dde2e8"/>
          <stop offset=".42" stop-color="#b3bac4"/>
          <stop offset=".78" stop-color="#87909b"/>
          <stop offset="1" stop-color="#6d7681"/>
        </linearGradient>
        <linearGradient id="gg" x1="0" y1="33" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#3d4653"/>
          <stop offset="1" stop-color="#1c222b"/>
        </linearGradient>
        <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#e7ebef"/>
          <stop offset="1" stop-color="#b9c0c8"/>
        </linearGradient>
        <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <clipPath id="gc">
          <path d="M149 73 C165 56 190 45 220 40 C280 35 360 34 430 38
            C444 39 452 41 458 44 C478 55 504 74 520 88 L521 97
            C462 96 400 95 340 94 C300 93 260 92 230 90
            C200 88 170 82 149 73 Z"/>
        </clipPath>
        <mask id="arches">
          <rect x="0" y="0" width="760" height="300" fill="#fff"/>
          <circle cx="186" cy="199" r="70" fill="#000"/>
          <circle cx="574" cy="199" r="70" fill="#000"/>
        </mask>
      </defs>

      <ellipse class="shadow" cx="381" cy="268" rx="320" ry="11" filter="url(#soft)"/>
      <ellipse class="glow" cx="381" cy="263" rx="300" ry="9" filter="url(#soft)"/>

      <g mask="url(#arches)">
        <path class="paint" d="
          M70 189
          C62 176 60 170 60 165
          C60 152 60 145 61 138
          C63 128 66 121 70 117
          L80 100
          C84 86 94 64 108 52
          C112 44 114 40 118 36
          C126 32 140 33 159 34
          C210 30 300 29 360 31
          C400 31 435 33 462 38
          C486 50 512 74 536 88
          C566 96 604 103 639 110
          C658 113 676 120 690 130
          C698 137 701 148 701 160
          C701 175 700 185 697 196
          C694 206 688 213 676 217
          C640 220 600 221 560 221
          L240 221
          C180 220 130 218 101 215
          C88 212 76 201 70 189 Z"/>
        <path class="rocker" d="M248 209 L510 209 L510 222 L248 222 Z"/>
      </g>

      <path class="cladding" d="M116 210 A70 70 0 0 1 256 210"/>
      <path class="cladding" d="M504 210 A70 70 0 0 1 644 210"/>

      <path class="paint" d="M466 35 C460 26 450 24 442 27 L443 35 Z"/>

      <path class="crease" d="M121 109 C250 106 500 106 632 111"/>
      <path class="haunch" d="M246 143 C320 158 430 152 502 136"/>

      <path class="glass" d="M149 73 C165 56 190 45 220 40 C280 35 360 34 430 38
        C444 39 452 41 458 44 C478 55 504 74 520 88 L521 97
        C462 96 400 95 340 94 C300 93 260 92 230 90
        C200 88 170 82 149 73 Z"/>
      <path class="streak" clip-path="url(#gc)" d="M380 42 L330 92 M420 41 L368 93"/>

      <path class="mirror" d="M506 90 C502 82 509 76 518 77 C526 78 529 84 526 90
        L524 96 C516 98 509 96 506 90 Z"/>

      <rect class="handle" x="214" y="110" width="26" height="5" rx="2.5"/>
      <rect class="handle" x="350" y="111" width="26" height="5" rx="2.5"/>
      <rect class="handle" x="646" y="192" width="46" height="23" rx="7"/>

      <path class="headlight" d="M634 111 C655 114 672 119 684 126 L679 135
        C665 128 648 123 630 120 Z"/>
      <path class="taillight" d="M63 103 L118 108 L117 117 L64 113 Z"/>
      <rect class="port" x="510" y="118" width="13" height="12" rx="4"/>
      <circle class="portdot" cx="516.5" cy="124" r="3"/>

      <g class="wheel-g" transform="translate(186 199)">${_WHEEL}</g>
      <g class="wheel-g" transform="translate(574 199)">${_WHEEL}</g>

      <circle class="ind ${open.trunk ? "on" : ""}" cx="95" cy="92" r="7"/>
      <circle class="ind ${open.rear ? "on" : ""}" cx="258" cy="120" r="7"/>
      <circle class="ind ${open.front ? "on" : ""}" cx="392" cy="118" r="7"/>
      <circle class="ind ${open.hood ? "on" : ""}" cx="598" cy="116" r="7"/>
    </svg>`;

  /* ------------------------------------------- the owner's own car ----- */
  /* A photograph instead of the drawing. The drawing is live UI - lamps and
   * open-panel markers - and a flat image is not, so the state is put back as
   * an overlay: percentages of the image box rather than SVG coordinates, so
   * one set of positions fits any side profile of roughly the same crop.
   *
   * Measured against a manufacturer side render, front at the LEFT, which is
   * how these are almost always shot. `car_image_facing: right` mirrors them
   * for an image of a car facing the other way - the way the drawing faces -
   * and `car_image_hotspots` overrides any of them for an image framed
   * differently. `ground` is where the drawing's shadow and charge glow sit:
   * the bottom edge, because a transparent cut-out is cropped at the tyres. */
  const PHOTO_SPOTS = {
    // Measured off the lamps themselves rather than judged by eye: the tail
    // lamp from its red pixels, the headlight from the dark lens, the charge
    // flap from the two vertical edges of its outline in the quarter panel.
    headlight: [8.5, 45.5], taillight: [94.3, 37.3], port: [86.2, 39.5],
    hood: [15, 38], front: [50, 37], rear: [75, 37], trunk: [91, 24],
    ground: [50, 100],
  };

  const CAR_PHOTO = (cls, open, cfg, lamps) => {
    const right = String(cfg.car_image_facing || "").toLowerCase() === "right";
    const base = {};
    for (const k in PHOTO_SPOTS) {
      const [x, y] = PHOTO_SPOTS[k];
      base[k] = [right ? Math.round((100 - x) * 10) / 10 : x, y];
    }
    const S = Object.assign(base, cfg.car_image_hotspots || {});
    const at = (k) => `left:${S[k][0]}%; top:${S[k][1]}%`;
    const lamp = (k, on) =>
      `<i class="lamp ${k}${on ? " on" : ""}" style="${at(k)}"></i>`;
    const ind = (k) =>
      `<i class="pind${open[k] ? " on" : ""}" style="${at(k)}"></i>`;
    return `
      <div class="photo ${cls}">
        <i class="ground shadow" style="${at("ground")}"></i>
        <i class="ground glow" style="${at("ground")}"></i>
        <img src="${esc(cfg.car_image)}" alt=""${cfg.car_image_flip ? ' style="transform:scaleX(-1)"' : ""}>
        ${cfg.lampfx ? (() => { const F = LAMP_FX.side, fl = !!cfg.car_image_flip, l = fl ? 100 - F.l - F.w : F.l, st = `left:${l}%; top:${F.t}%; width:${F.w}%;${fl ? " transform:scaleX(-1);" : ""}`;
          return `<img class="lfx glow${lamps.tail ? " on" : ""}" src="${F.glow}" alt="" style="${st}"><img class="lfx${lamps.tail ? " on" : ""}" src="${F.fill}" alt="" style="${st}">`; })() : ""}
        ${cfg.spin ? `<span class="wspin"${cfg.car_image_flip ? ' style="transform:scaleX(-1)"' : ""} data-spin="${esc(cfg.spin)}"></span>` : ""}
        <span class="lamps">
          ${lamp("headlight", lamps.head)}${cfg.lampfx ? "" : lamp("taillight", lamps.tail)}
          <i class="lamp port" style="${at("port")}"></i>
          ${ind("hood")}${ind("front")}${ind("rear")}${ind("trunk")}
        </span>
      </div>`;
  };

  const _WHEEL = `
      <circle class="tire" r="62"/>
      <circle class="disc" r="42"/>
      <g class="spokes">
        <path d="M-6 -40 L-1 -41 L3 -12 L-4 -11 Z"/>
        <path d="M2 -41 L7 -40 L6 -32 L4 -13 Z" opacity=".45"/>
        <path d="M-6 -40 L-1 -41 L3 -12 L-4 -11 Z" transform="rotate(72)"/>
        <path d="M2 -41 L7 -40 L6 -32 L4 -13 Z" opacity=".45" transform="rotate(72)"/>
        <path d="M-6 -40 L-1 -41 L3 -12 L-4 -11 Z" transform="rotate(144)"/>
        <path d="M2 -41 L7 -40 L6 -32 L4 -13 Z" opacity=".45" transform="rotate(144)"/>
        <path d="M-6 -40 L-1 -41 L3 -12 L-4 -11 Z" transform="rotate(216)"/>
        <path d="M2 -41 L7 -40 L6 -32 L4 -13 Z" opacity=".45" transform="rotate(216)"/>
        <path d="M-6 -40 L-1 -41 L3 -12 L-4 -11 Z" transform="rotate(288)"/>
        <path d="M2 -41 L7 -40 L6 -32 L4 -13 Z" opacity=".45" transform="rotate(288)"/>
      </g>
      <circle class="rimring" r="42"/>
      <circle class="hubcap" r="8"/>`;


  /* Top view for the cockpit card - the same EX5 proportions (4615 x 1901
   * mm), front pointing up. Every openable part carries its status right
   * where it sits on the body: pressures beside each wheel, doors on their
   * sills, hood / sunroof / trunk on their panels. */
  /* Wheel centres on the top picture: labels sit level with them, outside the body. */
  const WHEEL_Y = { f: 162, r: 550 };
  const CAR_TOP_SVG = (cls, d) => {
    const w = d.words;
    const stat = (open) => (open == null ? w.unknown : open ? w.open : w.closed);
    const statM = (open) => (open == null ? w.unknown : open ? w.openM : w.closedM);
    const cl = (open) => (open ? "tv-stat open" : "tv-stat");
    /* the glass roof is cut in two by a line: the sunroof sits over the front half, the blind over the rear half */
    const ROOF_Y = { s: 358, b: 452 };
    const mo = d.mo || { door: {}, win: {}, hood: "", trunk: "", sunroof: "", shade: "" };
    return `
    <svg class="cartop ${cls}${d.show && d.show.tires === false ? " no-tires" : ""}" viewBox="0 0 400 720" fill="none" aria-hidden="true"${d.tc ? ` style="--tc:${d.tc}"` : ""}>
      <defs>
        <radialGradient id="tlh"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset=".45" stop-color="#cfe4ff" stop-opacity=".45"/><stop offset="1" stop-color="#cfe4ff" stop-opacity="0"/></radialGradient>
        <filter id="tbm" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
        <filter id="tlw" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5.5"/></filter><filter id="tlm" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2"/></filter>
        <linearGradient id="tlb" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffdf7" stop-opacity=".9"/><stop offset="1" stop-color="#fffdf7" stop-opacity="0"/></linearGradient>
        <radialGradient id="tlt"><stop offset="0" stop-color="#ff4a4a" stop-opacity=".95"/><stop offset=".45" stop-color="#ff2a2a" stop-opacity=".45"/><stop offset="1" stop-color="#ff2a2a" stop-opacity="0"/></radialGradient>
        <filter id="tsoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>

      <ellipse class="glow" cx="200" cy="368" rx="150" ry="330" filter="url(#tsoft)"/>

      <rect class="tire" x="74" y="112" width="24" height="100" rx="10"/>
      <rect class="tire" x="302" y="112" width="24" height="100" rx="10"/>
      <rect class="tire" x="74" y="500" width="24" height="100" rx="10"/>
      <rect class="tire" x="302" y="500" width="24" height="100" rx="10"/>

      <image class="topimg"${d.mirror ? ' transform="translate(400 0) scale(-1 1)"' : ""} href="${esc(d.src)}" x="36" y="25" width="328" height="670"
             preserveAspectRatio="xMidYMid meet"/>
      ${d.lights ? `<g class="lampsT" pointer-events="none">
        <g filter="url(#tbm)">${LAMP_TOP.beams.map(([x, y]) => `<path d="M${x - 6} ${y} L${x + 6} ${y} L${x + 13 + (x > 200 ? 3 : -3)} ${y - 46} L${x - 13 + (x > 200 ? 3 : -3)} ${y - 46} Z" fill="url(#tlb)"/>`).join("")}</g>
        <path d="${LAMP_TOP.head}" fill="#fffdf6" opacity=".5" filter="url(#tlw)"/><path d="${LAMP_TOP.head}" fill="#fffdf8" opacity=".9" filter="url(#tlm)"/></g>` : ""}
      ${d.lights ? `<g class="lampsR" pointer-events="none"><image href="${LAMP_FX.top.glow}" x="${LAMP_FX.top.x}" y="${LAMP_FX.top.y}" width="${LAMP_FX.top.w}" height="${LAMP_FX.top.h}" style="mix-blend-mode:screen"/><image href="${LAMP_FX.top.fill}" x="${LAMP_FX.top.x}" y="${LAMP_FX.top.y}" width="${LAMP_FX.top.w}" height="${LAMP_FX.top.h}"/></g>` : ""}

      <circle class="ind ${d.doors.fl ? "on" : ""}" cx="90" cy="312" r="6" data-z="391"/>
      <circle class="ind ${d.doors.rl ? "on" : ""}" cx="90" cy="440" r="6" data-z="-502"/>
      <circle class="ind ${d.doors.fr ? "on" : ""}" cx="310" cy="312" r="6" data-z="391"/>
      <circle class="ind ${d.doors.rr ? "on" : ""}" cx="310" cy="440" r="6" data-z="-502"/>

      <text class="tv-val${d.low.fl ? " crit" : ""}"${d.more.fl} x="30" y="${WHEEL_Y.f - 3}" data-z="1520" data-dy="-3" text-anchor="middle">${d.tires.fl.split(" ")[0]}</text>
      <text class="tv-lab${d.low.fl ? " crit" : ""}"${d.more.fl} x="30" y="${WHEEL_Y.f + 12}" data-z="1520" data-dy="+12" text-anchor="middle">${esc((d.tires.fl.split(" ")[1] || "").toUpperCase())} ${esc(d.labels.fl)}</text>
      <text class="tv-val${d.low.fr ? " crit" : ""}"${d.more.fr} x="370" y="${WHEEL_Y.f - 3}" data-z="1520" data-dy="-3" text-anchor="middle">${d.tires.fr.split(" ")[0]}</text>
      <text class="tv-lab${d.low.fr ? " crit" : ""}"${d.more.fr} x="370" y="${WHEEL_Y.f + 12}" data-z="1520" data-dy="+12" text-anchor="middle">${esc((d.tires.fr.split(" ")[1] || "").toUpperCase())} ${esc(d.labels.fr)}</text>
      <text class="tv-val${d.low.rl ? " crit" : ""}"${d.more.rl} x="30" y="${WHEEL_Y.r - 3}" data-z="-1307" data-dy="-3" text-anchor="middle">${d.tires.rl.split(" ")[0]}</text>
      <text class="tv-lab${d.low.rl ? " crit" : ""}"${d.more.rl} x="30" y="${WHEEL_Y.r + 12}" data-z="-1307" data-dy="+12" text-anchor="middle">${esc((d.tires.rl.split(" ")[1] || "").toUpperCase())} ${esc(d.labels.rl)}</text>
      <text class="tv-val${d.low.rr ? " crit" : ""}"${d.more.rr} x="370" y="${WHEEL_Y.r - 3}" data-z="-1307" data-dy="-3" text-anchor="middle">${d.tires.rr.split(" ")[0]}</text>
      <text class="tv-lab${d.low.rr ? " crit" : ""}"${d.more.rr} x="370" y="${WHEEL_Y.r + 12}" data-z="-1307" data-dy="+12" text-anchor="middle">${esc((d.tires.rr.split(" ")[1] || "").toUpperCase())} ${esc(d.labels.rr)}</text>

      ${!d.show.doors ? "" : `
      <text class="${cl(d.doors.fl)}"${mo.door.fl} x="66" y="317" data-z="356" text-anchor="end">${esc(stat(d.doors.fl))}</text>
      <text class="${cl(d.doors.rl)}"${mo.door.rl} x="66" y="445" data-z="-537" text-anchor="end">${esc(stat(d.doors.rl))}</text>
      <text class="${cl(d.doors.fr)}"${mo.door.fr} x="334" y="317" data-z="356">${esc(stat(d.doors.fr))}</text>
      <text class="${cl(d.doors.rr)}"${mo.door.rr} x="334" y="445" data-z="-537">${esc(stat(d.doors.rr))}</text>
`}
      ${!d.show.windows ? "" : [["fl", 66, 317, "end"], ["rl", 66, 445, "end"], ["fr", 334, 317, "start"], ["rr", 334, 445, "start"]].map(([k, x, y, a]) => {
        const v = d.win && d.win[k];
        const txt = v == null ? w.unknown : v <= 0 ? w.winClosed : v >= 100 ? w.winOpen : Math.round(v) + "%";
        return `<text class="tv-win${v > 0 ? " open" : ""}"${mo.win[k]} x="${x}" y="${y + 14}" data-z="${Math.round((368 - y) / 0.1434)}" data-dy="14" text-anchor="${a}">${esc(w.win)} ${esc(txt)}</text>`;
      }).join("")}

      ${!d.show.hood ? "" : `
      <text class="tv-lab onbody"${mo.hood} x="200" y="122" data-z="1715" text-anchor="middle">${esc(w.hood)}</text>
      <text class="${cl(d.hood)} onbody"${mo.hood} x="200" y="142" data-z="1576" text-anchor="middle">${esc(statM(d.hood))}</text>
      `}
      ${!d.show.roof ? "" : `
      <text class="tv-lab onglass"${mo.sunroof} x="200" y="${ROOF_Y.s}" data-z="${Math.round(150 - (ROOF_Y.s - 346) * 6.9)}" text-anchor="middle">${esc(w.sunroof)}</text>
      <text class="${cl(d.sunroof)} onglass"${mo.sunroof} x="${200}" y="${ROOF_Y.s + 20}" data-z="${Math.round(150 - (ROOF_Y.s + 20 - 346) * 6.9)}" text-anchor="middle">${esc(d.roofTxt || w.unknown)}</text>`}
      ${!d.show.roof ? "" : `
      <text class="tv-lab onglass"${mo.shade} x="200" y="${ROOF_Y.b}" data-z="${Math.round(150 - (ROOF_Y.b - 346) * 6.9)}" text-anchor="middle">${esc(w.shade.charAt(0).toUpperCase() + w.shade.slice(1))}</text>
      <text class="${cl(d.shadeVal > 0)} onglass"${mo.shade} x="200" y="${ROOF_Y.b + 20}" data-z="${Math.round(150 - (ROOF_Y.b + 20 - 346) * 6.9)}" text-anchor="middle">${esc(d.shadeTxt || w.unknown)}</text>`}
      ${!d.show.trunk ? "" : `
      <text class="tv-lab onbody"${mo.trunk} x="200" y="634" data-z="-1855" text-anchor="middle">${esc(d.bootWord)}</text>
      <text class="${cl(d.trunk)} onbody"${mo.trunk} x="200" y="654" data-z="-1994" text-anchor="middle">${esc(statM(d.trunk))}</text>
      `}
    </svg>`;
  };

  /* ===================================================== 3D top view ======
   * The Monjaro model (car3d.bin, ~1.3 MB, Int16 positions + Int8 normals, split into
   * body / four doors / door glass / hood / tailgate / sunroof glass / sunshade) is drawn
   * with three.js (three.module.min.js, loaded on demand). Doors, hood and tailgate swing
   * on their hinges, window glass drops into the door, the sunroof slides or tilts. If
   * WebGL or the files are unavailable the flat picture stays - nothing else changes. */
  /* the real lamp outlines of the Monjaro seen from above (taken off the 3D model, SVG units of the 400x720 top view), and the two light sources of each head lamp */
  const LAMP_TOP = { head: "M276.2 24.4 L276.4 25.4 L278.9 27.5 L278.6 30.5 L285.1 35.6 L289.1 39.6 L291.1 40.6 L311.5 63.2 L311.4 64.4 L303.1 65.2 L300.4 67.9 L303.8 65.2 L309.1 64.6 L312.8 65.0 L319.1 74.4 L320.4 82.2 L321.6 83.4 L324.2 72.8 L323.2 63.4 L307.0 49.0 L282.1 29.6Z M123.6 24.4 L117.8 29.6 L92.9 49.0 L76.6 63.4 L75.6 72.8 L78.2 83.4 L79.5 82.2 L80.8 74.4 L87.1 65.0 L90.8 64.6 L96.1 65.2 L99.5 67.9 L96.8 65.2 L88.5 64.4 L88.4 63.2 L96.5 53.9 L107.5 42.5 L107.6 41.8 L110.8 39.6 L114.2 36.0 L121.4 30.2 L121.0 27.5 L123.5 25.4Z", beams: [[112.2, 37.8], [89.5, 59.7], [310.5, 59.7], [287.8, 37.8]] };
  /* The tail-lamp glow is the designer's own Photoshop layer, carried over as it is (outer glow + colour overlay + inner glow baked into two pictures:
   * `fill` is the lamp itself, `glow` is the outer glow drawn with the screen blend). Positions: SVG units of the top view, percent of the side picture. */
  const LAMP_FX = {
    top: { x: 59.6, y: 600.34, w: 280.51, h: 91.44, fill: "data:image/png;base64,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jnqD6BjM2gZrwa0FWMeLlDwVDrOjDD56AHzM3f+jW3ryhtkdurLiLVD4OIvCx49n38w2J/jTuao+dG3O7wfwPhjON6Ii4iTIUyROIuIkgeMAj4OcA3AU5NHHiTkAR8zsGMyPwHDIgG+b+SswvPnJe+8Z6WNlItKMP/nM75UgVpFxKYErQKwAY/w6chzAOKzuIlr/2TqAdQzowb1jhrIOHl7QUID4FoBHnkrpi6kovmCwZ2+Y3THUnUSHlcLHWRQ+3j73b5q5EGYfWEO+H+R1jLiKDNZBhCcAnmLwKBAnUIeP06dojjxRz5DMffdl/hKAl9zt9U/e+/v6ZiEiP9CffOZ3pyK4GsDlYFwKYOq6ekZjAvWMxukZjnqjKLxrbh3ASjOrA4d5MvdnYfboQbNHQD580+7ZF5sb1eKi8HEWhY93zn0bbh0neR2AD64l1sJwDcCSxAkgTiJYz4pEHCVwDIwjqDetHgVwGMBxGI6CeA2wb8PsVTM7/E/+4Pc1KyJyjvvj3/nMJMgrAF4Dw6rriHEAkzhzGcV83IA23HsGdOBWAl6aoQPYPIgn9xseA/CwmT3+sc/dOdfooBYxhY+zKHwMzv23binc7D0A3n8tYx0j1rC+VOlEHUR4CsAciONAHANwmMSxJ8g5gHOsQ8kRAC8Z8DJgr33qD/9AsyIi54A//u3/qQQ4QeBCAP8FgEvfBywDbBJmXTMsnFDxHgxdAB2DteFWmnnL3N8w9yeeMn8UwCNBPnPTnTu16X1AFD7OovDRrD0bZy6JiOvWgtcDeA+Ad7E+ynvCDMdJHAfjGMk5MI49ThwFYg7ECQDfBLAfwCuf+sPPq7GZyCL1x7/9OysB/Px1wE/DMAn4mBnGYN41s3GYt83QI9EFUC+lAM8DeGI/7FF3f/Tmu2afb3IM57phCR/DkTykcTffNfsNAN8AsBcA9mycWUJgnQHvmza7xICjB8g3yDhC8khBzhE8bMAxgC8DOHTLPXcreIgsYkVZHgXwxEHYtwmMG2zSzCbMbGKt+STMlgKYOEg+R+ARAx67+a7ZQwBwdbOly5AZmpkPEREROTd40wWIiIjIuUXhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQGSuFDREREBkrhQ0RERAZK4UNEREQG6v8HAUCVz/YD68sAAAAASUVORK5CYII=", glow: "data:image/png;base64,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" },
    side: { l: -3.93, t: 17.98, w: 19.31, fill: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG0AAABTCAYAAACViImLAAAGXUlEQVR4nO3cX4gdVx3A8e/vd2bm/snu3ezGsI22Nhhj40MDVpsHRXxJKfjnQXxRqfXFgFQUrAERBB8UGooglCJC7IMi6lPxKahQ/9BWTNBK1TeViG3ZGONmu7v3z8ycc34+3LvbRgNJimTvgfOByy5zZ4Y758vMPTOwKw8VBVladK8/QHbrcrQE5WgJytESlKMlKEdLUI6WoBwtQTlagnK0BOVoCcrREpSjJShHS1COlqAcLUE5WoJytATlaAnK0RKUoyUoR0tQjpagHC1BOVqCcrQE5WgJytESlKMlKEdLUI6WoBwtQTlagubmz0C/e/bs7u/PP3l2QYmDaGBmrP3jImVZ0qk60tYTMYv4ppZOfyG6slTEUVadaGYOMMOsHY8ttLUzM1s6cEAOHzlq3V6Ptm2qGK0uC11780c+GG7lM37m1Kn/92G/IXMTbccPHz1dnej2v4FvH8RM1Yy3xCB+axRj8GLRAAMwxiMREQoQQRBRK50jYhJjBItmhsho2+yfazQLC7L09negwkvtwYOPjZ99/pne+99ne3zIt2zuoiEsurb+QCeEY9juMia+RQARmS4SoTBDzYhmKFAoqIEYVOooig6FcziEEAMyHLH14gu0Mb5NjH0X77pr68hkfGH/AyeTCjd/0Yy+qg40BBCgrgFYESW+viJQieAMEMEAZ0YRpmu5ECjMwCkUJaIVZsZC23Clqd1WjCdWLv79ifOXLn3xwQdO/mYPjvQNm8eJSD+KulqEGqF2jkahFqEVveY1FGVTlW1VahHGIgxnr5EqoxiZjCfY9iYyHOLaFkVYrbosukKCxfuPjkff/skjnzv5l+99X/b6wG/W/J1psFgMFjtlv7e7wBCIkebVTbSqEKcQIgiE8Yho0Dl8mNg0oDLbBloDVcdwewteeZn+ZESv28OJcIcr8MHLmHj8uHNP/PH8b78MnDv66YdvaXKyF+Yumqo7VA2WOuW+/myJ4euaNhrN5iZlWeI6HQwDM9oQsLrGLl8m+Pa6+3RlRa3KetvQj5FFEZbUsYzgEfHYO+917lsvnD/fHxw48PTqhz90/R3NibmK9qNHT0tRde+ZrK11xypY65GiAO+pgVHwMBzOJo+RUE+I3uNUadevYKJgETGbTfyNnWueAF1R1CK1CR5YFmHVYBNj0+KRe+HxX5w713tv3fzg7o991O/VONzIXEUzKO9zxXtM6Vg9IdYT1MA3EzxQTdfBDESgXxR0qopCwMfIsPVYjK/f3zXEIq1BKcrV4BGDgTpWEAYIa9hb3yV8/bmf/7Q3HtdPHXvo481tPPybNlfRgJWirY8To8a2RkUJzRiH0GMngiEYIkolgsbIJEYa76lmOzGmB1YCDsFjtECcvSc2DftvoI2B/aoUKHcAaxbvvF/d1/7w7C8XMHvy2Kc+Mb69Q3Bj8xZtFZGVMgQKUQwIBotm10z2KwSLhjQNFUIE1oF69v7Ouj2EHoKbrbOBMeK1S2YBjDAsBpbF6IhjBWXd4up9ql+Jz/1qcGHj6pkTn39keBvH4IbmbcpfxhDwKogIPgSCwBhmZ4sxwVjH2MDYALaADsJBlEVgACwAXaDG2CTSMr35fhPCwdml8OBsm0MoSyhqhoqxLMIhVQpj2an7wv4/v/jVX595fLBnI3Idc3Om/fhLpwUwrco2NDVqxiS0IIJX0AgT2A1ggCAMMa4C+0Uop89MUJleEgPTaf9YQExQjA5CxWuXyp2frQgBsNmZ2BPYxAaoPvzSxb/97vffOfs0//s1uSfmJhoiYLHv9i0oIXiB1sahMfAjqCfgIwSZ3qEhEA1zAjFg8i+zUsGBqUyHdnbHRtw2tIRy3/T5SNlAEUFbCB7aCGE60Yw7X4fFbPtXgafUuZ+9+7OnjFMX9mZs/svcRDMzUdXxM5cvffOeO++edHu99ZfXXrnivd+ovd82sxqobXpyBEEQVQHETQe4sOkE04Epu5d+EZmeqJ0IfUQWndBn+qhyIjBSaERoBSlFpAssGCYGfzX40yfPPDZX03/J/6QzPfM2EcluQo6WoBwtQTlagnK0BOVoCcrREpSjJShHS1COlqAcLUE5WoJytATlaAnK0RKUoyUoR0tQjpagHC1BOVqCcrQE5WgJytESlKMlKEdLUI6WoBwtQTlagnK0BOVoCcrREpSjJShHS9B/ALdzkpl6re0dAAAAAElFTkSuQmCC", glow: "data:image/png;base64,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" },
  };
  const CAR3D_BIN = "/mha_bridge/car3d.bin?v=1";
  const CAR3D_THREE = "/mha_bridge/three.module.min.js?v=160";
  const CAR3D_S0 = 0.1434;             // svg units per mm at rest (4.77 m = 684 of 720)
  const CAR3D_HINGE = {                // mm, model space: +Z front, +X car's left, Y up
    doorF: [876, 1015], doorR: [880, -86],
    hood: [1150, 1160], tail: [1625, -1585], roof: [1650, 285],
  };
  const CAR3D_ANGLE = { doorF: 28, doorR: 28, hood: 58, tail: 100, tilt: 7 };
  const CAR3D_MAT = {
    paint: { m: 0.35, r: 0.36 }, glass: { c: 0x10161d, m: 0.9, r: 0.06, a: 0.55 }, mirror: { c: 0xaab2ba, m: 1, r: 0.05 },
    chrome: { c: 0xd2d6da, m: 1, r: 0.18 }, metal: { c: 0x6c727a, m: 0.8, r: 0.45 }, black: { c: 0x15171b, m: 0.1, r: 0.6 },
    lens_head: { c: 0xe9eff6, m: 0.2, r: 0.1, a: 0.85 }, lens_red: { c: 0xa5161e, m: 0.2, r: 0.25 }, lens_red_off: { c: 0xa5161e, m: 0.2, r: 0.25 }, lens_white: { c: 0xe2e4e6, m: 0.1, r: 0.3 },
    fabric: { c: 0x77746d, m: 0, r: 0.9 }, shade: { c: 0xa9a59d, m: 0, r: 0.95 }, leather: { c: 0x3b342f, m: 0, r: 0.6 },
  };
  let _c3dLib = null;
  const car3dLoad = () => _c3dLib || (_c3dLib = (async () => {
    const [T, buf] = await Promise.all([import(CAR3D_THREE), fetch(CAR3D_BIN, { credentials: "omit" }).then((r) => {
      if (!r.ok) throw new Error("car3d.bin " + r.status); return r.arrayBuffer(); })]);
    const hl = new DataView(buf).getUint32(0, true);
    const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
    const base = 4 + hl, parts = {};
    for (const p of hdr.parts) {
      const g = new T.BufferGeometry();
      const pos = new Int16Array(buf, base + p.off, p.nv * 3 + 0), nrm = new Int8Array(buf, base + p.off + p.nv * 6, p.nv * 4);
      const P = new Float32Array(p.nv * 3), N = new Float32Array(p.nv * 3);
      for (let i = 0; i < p.nv; i++) {
        P[i * 3] = pos[i * 3] * hdr.scale; P[i * 3 + 1] = pos[i * 3 + 1] * hdr.scale; P[i * 3 + 2] = pos[i * 3 + 2] * hdr.scale;
        N[i * 3] = nrm[i * 4] / 127; N[i * 3 + 1] = nrm[i * 4 + 1] / 127; N[i * 3 + 2] = nrm[i * 4 + 2] / 127;
      }
      g.setAttribute("position", new T.BufferAttribute(P, 3)); g.setAttribute("normal", new T.BufferAttribute(N, 3));
      g.setIndex(new T.BufferAttribute(p.i32 ? new Uint32Array(buf, base + p.ioff, p.ni) : new Uint16Array(buf, base + p.ioff, p.ni), 1));
      (parts[p.part] = parts[p.part] || []).push({ cls: p.cls, geo: g });
    }
    return { T, parts };
  })().catch((e) => { _c3dLib = null; throw e; }));

  class Car3D {
    constructor(lib) {
      const T = (this.T = lib.T);
      this.lib = lib;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "car3d";
      this.r = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: "low-power" });
      this.r.outputColorSpace = T.SRGBColorSpace;
      this.r.toneMapping = T.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.05;
      this.scene = new T.Scene();
      this.scene.environment = this._env();
      this.sun = new T.DirectionalLight(0xffffff, 1.6); this.sun.position.set(-900, 3000, 1400); this.scene.add(this.sun);
      this.scene.add(new T.HemisphereLight(0xdfe8f2, 0x20242a, 0.7));
      this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 100, 8000);
      this.cam.up.set(0, 0, 1);
      this.root = new T.Group(); this.scene.add(this.root);
      this.mats = {}; this.cur = {}; this.tgt = {}; this.s = CAR3D_S0; this.mirror = false;
      this._build(); this.setState({}, true);
      this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this.canvas);
      this.canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
      this.canvas.addEventListener("webglcontextrestored", () => this.draw());
    }
    _env() {
      const T = this.T, sc = new T.Scene();
      const sky = new T.Mesh(new T.SphereGeometry(50, 24, 12), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false,
        vertexShader: "varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
        fragmentShader: "varying vec3 p; void main(){ float h=normalize(p).y; vec3 c=mix(vec3(.16,.17,.19),vec3(.82,.88,.95),smoothstep(-.2,.9,h)); gl_FragColor=vec4(c,1.); }" }));
      sc.add(sky);
      const box = (w, h, x, y, z, i) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(i, i, i), side: T.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
      box(30, 12, 0, 40, 0, 5); box(14, 30, -35, 10, 10, 3); box(14, 30, 35, 10, -10, 3);
      const pm = new T.PMREMGenerator(this.r), tex = pm.fromScene(sc, 0.03).texture; pm.dispose(); return tex;
    }
    _mat(cls) {
      const T = this.T, d = CAR3D_MAT[cls] || CAR3D_MAT.black;
      const m = new T.MeshStandardMaterial({ color: d.c != null ? d.c : 0x555a66, metalness: d.m, roughness: d.r, side: T.DoubleSide,
        transparent: d.a != null, opacity: d.a != null ? d.a : 1, depthWrite: d.a == null, envMapIntensity: cls === "paint" ? 0.55 : 1 });
      return (this.mats[cls] = m);
    }
    _mesh(cls, geo) { return new this.T.Mesh(geo, this.mats[cls] || this._mat(cls)); }
    /* A group that rotates about a hinge line (axis through [hx, hy, hz] along `axis`). */
    _hinge(parent, hx, hy, hz) {
      const T = this.T, piv = new T.Group(), inner = new T.Group();
      piv.position.set(hx, hy, hz); inner.position.set(-hx, -hy, -hz); piv.add(inner); parent.add(piv); return { piv, inner };
    }
    _fill(grp, part, skipTransp) {
      for (const p of this.lib.parts[part] || []) { const m = this._mesh(part === "tailgate" && p.cls === "lens_red" ? "lens_red_off" : p.cls, p.geo); m.renderOrder = p.cls === "glass" || p.cls === "lens_head" ? 2 : 0; grp.add(m); }
    }
    _build() {
      const T = this.T, R = this.root;
      this.n = {};
      const body = new T.Group(); this._fill(body, "body"); R.add(body);
      for (const s of ["L", "R"]) for (const f of ["F", "R"]) {
        const key = "door_" + f + s, [hx, hz] = CAR3D_HINGE[f === "F" ? "doorF" : "doorR"], sx = s === "L" ? 1 : -1;
        const h = this._hinge(R, sx * hx, 0, hz); this._fill(h.inner, key);
        const g = this._hinge(h.inner, 0, 1140, 0); this._fill(g.inner, key + "_glass");
        this.n[key] = { piv: h.piv, sx, f }; this.n[key + "_glass"] = g.piv;
      }
      const hd = this._hinge(R, 0, CAR3D_HINGE.hood[0], CAR3D_HINGE.hood[1]); this._fill(hd.inner, "hood"); this.n.hood = hd.piv;
      const tg = this._hinge(R, 0, CAR3D_HINGE.tail[0], CAR3D_HINGE.tail[1]); this._fill(tg.inner, "tailgate"); this.n.tail = tg.piv;
      const sr = new T.Group(); R.add(sr); const srh = this._hinge(sr, 0, CAR3D_HINGE.roof[0], CAR3D_HINGE.roof[1]);
      this._fill(srh.inner, "sunroof"); this.n.sr = sr; this.n.srTilt = srh.piv;
      this._fill(R, "sunshade");
      /* lamp glow (engine running). The glow is drawn in the shape of the real lamps: the footprint of the model's own lens meshes (seen from above)
       * is rasterised, blurred and laid over the car, so the Monjaro's full-width tail bar and the swept head lamps glow as they really are. */
      this.glow = [];
      const raster = (items, rgb, x0, x1, z0, z1, k) => {
        const cv = document.createElement("canvas"); cv.width = Math.round((x1 - x0) * k); cv.height = Math.round((z1 - z0) * k);
        const cx = cv.getContext("2d"); cx.fillStyle = cx.strokeStyle = rgb; cx.lineWidth = 0.8; cx.lineJoin = "round";
        for (const [part, cls] of items) for (const p of this.lib.parts[part] || []) { if (p.cls !== cls) continue;
          const pos = p.geo.attributes.position, ix = p.geo.index, n = ix ? ix.count : pos.count, at = (i) => (ix ? ix.getX(i) : i);
          for (let i = 0; i + 2 < n; i += 3) { cx.beginPath();
            for (let j = 0; j < 3; j++) { const v = at(i + j), px = (pos.getX(v) - x0) * k, py = (pos.getZ(v) - z0) * k; j ? cx.lineTo(px, py) : cx.moveTo(px, py); }
            cx.closePath(); cx.fill(); cx.stroke(); } }
        return cv;
      };
      const blur = (cv, r) => { /* cheap, portable blur: shrink and enlarge with smoothing, twice */
        let cur = cv;
        for (let pass = 0; pass < 2; pass++) {
          const sm = document.createElement("canvas"); sm.width = Math.max(2, Math.round(cur.width / r)); sm.height = Math.max(2, Math.round(cur.height / r));
          const sx = sm.getContext("2d"); sx.imageSmoothingEnabled = true; sx.drawImage(cur, 0, 0, sm.width, sm.height);
          const big = document.createElement("canvas"); big.width = cv.width; big.height = cv.height;
          const bx = big.getContext("2d"); bx.imageSmoothingEnabled = true; bx.drawImage(sm, 0, 0, big.width, big.height); cur = big; }
        return cur;
      };
      const plane = (cv, x0, x1, z0, z1, additive) => {
        const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
        const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
          blending: additive ? T.AdditiveBlending : T.NormalBlending }));
        m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 1500, (z0 + z1) / 2); m.renderOrder = 9; m.visible = false; R.add(m); this.glow.push(m); return m;
      };
      const K = 0.4, X0 = -1050, X1 = 1050;
      /* head: the swept lamp glows in its own shape, and every lamp throws two beams forward (two lenses per side) */
      { const Z0 = -0 + 1700, Z1 = 2560, items = [["body", "lens_head"]], mk = (rgb) => raster(items, rgb, X0, X1, Z0, Z1, K);
        const cv = document.createElement("canvas"); cv.width = Math.round((X1 - X0) * K); cv.height = Math.round((Z1 - Z0) * K); const cx = cv.getContext("2d");
        cx.globalAlpha = 0.4; cx.drawImage(blur(mk("rgb(255,252,244)"), 20), 0, 0); cx.globalAlpha = 0.6; cx.drawImage(blur(mk("rgb(255,253,248)"), 5), 0, 0);
        plane(cv, X0, X1, Z0, Z1, true); }
      /* the headlight beam: a cone that runs forward from the lamp and fades out (neutral white, no light behind the lamp) */
      const beamTex = (() => {
        const W = 128, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const cx = cv.getContext("2d"), im = cx.createImageData(W, H);
        for (let y = 0; y < H; y++) { const t = y / (H - 1), half = 8 + 54 * t, along = Math.pow(1 - t, 1.5), start = Math.min(1, t * 14);
          for (let x = 0; x < W; x++) { const dx = (x - 63.5) / half, k = Math.abs(dx) < 1 ? Math.pow(1 - dx * dx, 1.4) : 0, i = (y * W + x) * 4;
            im.data[i] = 255; im.data[i + 1] = 253; im.data[i + 2] = 247; im.data[i + 3] = Math.round(255 * 0.95 * k * along * start); } }
        cx.putImageData(im, 0, 0); return new T.CanvasTexture(cv);
      })();
      const beam = (x, z, sx) => {
        const L = 520, Wd = 300, grp = new T.Group(), m = new T.Mesh(new T.PlaneGeometry(Wd, L),
          new T.MeshBasicMaterial({ map: beamTex, blending: T.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, side: T.DoubleSide }));
        m.rotation.x = -Math.PI / 2; m.position.set(0, 0, L / 2 - 60); m.renderOrder = 9;
        grp.add(m); grp.position.set(x, 1500, z); grp.rotation.y = sx * 0.08; grp.visible = false; R.add(grp); this.glow.push(grp);
      };
      { /* two light sources per lamp: split the lamp's lens vertices into two clusters (outer-rear and inner-front) and start a beam at each centre */
        const pts = []; for (const p of this.lib.parts.body || []) if (p.cls === "lens_head") { const pos = p.geo.attributes.position; for (let i = 0; i < pos.count; i++) pts.push([pos.getX(i), pos.getZ(i)]); }
        for (const sx of [1, -1]) { const q = pts.filter((v) => v[0] * sx > 0); if (q.length < 4) { beam(sx * 700, 2100, sx); continue; }
          let a = q.reduce((m, v) => (v[1] < m[1] ? v : m)), b = q.reduce((m, v) => (v[1] > m[1] ? v : m)), ca = a, cb = b;
          for (let it = 0; it < 6; it++) { const A = [], B = []; q.forEach((v) => (Math.hypot(v[0] - ca[0], v[1] - ca[1]) <= Math.hypot(v[0] - cb[0], v[1] - cb[1]) ? A : B).push(v));
            const mean = (L) => (L.length ? [L.reduce((s, v) => s + v[0], 0) / L.length, L.reduce((s, v) => s + v[1], 0) / L.length] : ca); ca = mean(A); cb = mean(B); }
          beam(ca[0], ca[1] + 40, sx); beam(cb[0], cb[1] + 40, sx); } }
      /* the sliding blind itself is not in the model: a fabric sheet over the glass opening, pulled back when opened */
      const shp = this._hinge(R, 0, 1585, -1045), sheet = new T.Mesh(new T.PlaneGeometry(864, 1327), this._mat("shade"));
      sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, 1585, -1045 + 663); shp.inner.add(sheet); this.n.shade = shp.piv;
      const tyre = new T.CylinderGeometry(373, 373, 241, 28, 1); tyre.rotateZ(Math.PI / 2);
      for (const [x, z] of [[809, 1520], [-809, 1520], [809, -1307], [-809, -1307]]) {
        const m = this._mesh("black", tyre); m.position.set(x, 372, z); R.add(m);
      }
    }
    /* st: doors{fl,fr,rl,rr}, win{fl,fr,rl,rr} (0..100 open), hood, trunk, sunroof (0..100), tilt, shade (0..100),
     * color [r,g,b], chrome (color or null), rhd - all by screen side (fl = front-left on the card). */
    setState(st, now) {
      const T = this.T, b = (v) => (v ? 1 : 0), n = (v) => (isFinite(+v) ? Math.max(0, Math.min(100, +v)) / 100 : 0);
      const t = this.tgt;
      for (const k of ["fl", "fr", "rl", "rr"]) { t["d_" + k] = b(st.doors && st.doors[k]); t["w_" + k] = n(st.win && st.win[k]); }
      t.hood = b(st.hood); t.trunk = b(st.trunk); t.roof = n(st.sunroof); t.tilt = b(st.tilt); t.shade = n(st.shade);
      (this.glow || []).forEach((g) => { g.visible = !!st.lights; });
      { const on = !!st.lights, lh = this.mats.lens_head || this._mat("lens_head"), lr = this.mats.lens_red || this._mat("lens_red");
        lh.emissive.setHex(on ? 0xfff3cf : 0); lh.emissiveIntensity = on ? 1.6 : 0; lh.opacity = on ? 1 : 0.85;
        lr.emissive.setHex(0); lr.emissiveIntensity = 0; }
      if (!!st.rhd !== this.mirror) { this.mirror = !!st.rhd; this.root.scale.x = this.mirror ? -1 : 1; }
      const rgb = st.color || [83, 89, 105];
      (this.mats.paint || this._mat("paint")).color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, T.SRGBColorSpace);
      const cm = this.mats.chrome || this._mat("chrome"), cc = st.chrome;
      if (cc && cc.length) cm.color.setRGB(cc[0] / 255, cc[1] / 255, cc[2] / 255, T.SRGBColorSpace); else cm.color.setHex(CAR3D_MAT.chrome.c);
      cm.metalness = cc ? 0.5 : 1;
      { const fc = st.fabric || [58, 86, 86]; (this.mats.leather || this._mat("leather")).color.setRGB(fc[0] / 255, fc[1] / 255, fc[2] / 255, T.SRGBColorSpace); }
      if (now) { Object.assign(this.cur, t); this._apply(); this.draw(); } else this._kick();
    }
    _kick() { if (!this._raf) this._raf = requestAnimationFrame(() => this._tick()); }
    _tick() {
      this._raf = 0; let moving = false;
      for (const k in this.tgt) { const d = this.tgt[k] - (this.cur[k] || 0);
        if (Math.abs(d) > 0.002) { this.cur[k] = (this.cur[k] || 0) + d * 0.16 + Math.sign(d) * 0.002; moving = true; } else this.cur[k] = this.tgt[k]; }
      this._apply(); this.draw(); if (moving) this._kick();
    }
    _apply() {
      const c = this.cur, rad = (a) => (a * Math.PI) / 180, A = CAR3D_ANGLE;
      /* screen-left is +X (car's left) unless mirrored for a right-hand-drive car */
      const side = (scr) => (scr === "l" ? (this.mirror ? "R" : "L") : (this.mirror ? "L" : "R"));
      let half = 1130;
      for (const k of ["fl", "fr", "rl", "rr"]) {
        const f = k[0].toUpperCase(), sd = side(k[1]), key = "door_" + f + sd, nd = this.n[key];
        const a = (f === "F" ? A.doorF : A.doorR) * (c["d_" + k] || 0);
        nd.piv.rotation.y = -nd.sx * rad(a);
        const gl = this.n[key + "_glass"]; gl.scale.y = Math.max(0.001, 1 - (c["w_" + k] || 0));
        const hx = CAR3D_HINGE[f === "F" ? "doorF" : "doorR"][0], len = f === "F" ? 1130 : 1100;
        half = Math.max(half, hx + len * Math.sin(rad(a)) + 60);
      }
      this.n.hood.rotation.x = -rad(A.hood * (c.hood || 0));
      this.n.tail.rotation.x = rad(A.tail * (c.trunk || 0));
      const roof = c.roof || 0;
      this.n.sr.position.set(0, roof > 0 ? 45 * Math.min(1, roof * 3) : 0, -roof * 720);
      this.n.srTilt.rotation.x = roof > 0 ? 0 : rad(A.tilt * (c.tilt || 0));
      this.n.shade.scale.z = Math.max(0.001, 1 - (c.shade || 0));
      this.s = CAR3D_S0;   // the body never changes size or position: the doors are kept inside the frame by their angle
      if (this.onScale) this.onScale(this.s);
    }
    _resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min((window.devicePixelRatio || 1) * ((this.canvas.getRootNode().host || {})._zoom || 1), 3);
      this.r.setPixelRatio(dpr); this.r.setSize(w, h, false); this.draw();
    }
    draw() {
      const s = this.s, c = this.cam, zc = -8 / s;
      /* The picture is framed like the SVG overlay (viewBox 400x720, "meet"): whatever shape the box has, the car keeps its proportions. */
      const bw = this.canvas.clientWidth, bh = this.canvas.clientHeight, ar = bw > 0 && bh > 0 ? bw / bh : 400 / 720;
      let hx = 200 / s, hy = 360 / s;
      if (ar >= 400 / 720) hx = hy * ar; else hy = hx / ar;
      c.left = -hx; c.right = hx; c.top = hy; c.bottom = -hy; c.updateProjectionMatrix();
      c.position.set(0, 4000, zc); c.lookAt(0, 0, zc);
      this.r.render(this.scene, c);
    }
    dispose() {
      try { this._ro.disconnect(); cancelAnimationFrame(this._raf); this.r.dispose(); this.r.forceContextLoss(); } catch (e) { /* gone already */ }
    }
  }

  /* Labels follow the car when the view zooms out for open doors: y = 368 - s * z(mm). */
  const car3dLayout = (svg, s) => svg.querySelectorAll("[data-z]").forEach((el) => {
    const y = 368 - s * Number(el.dataset.z) + Number(el.dataset.dy || 0);
    el.setAttribute(el.tagName === "circle" ? "cy" : "y", y.toFixed(1));
  });

  /* ============================ the cabin picture ==============================
   * The Climate and Comfort tabs show the cabin photo from above (original proportions,
   * soft vignette). The teal fabric and the bronze trim are recoloured at run time through
   * two masks (cabin_fabric / cabin_trim). On top of the photo an SVG layer draws the live
   * state: seat heating / ventilation, steering-wheel heating, air flow, defrost, ambient
   * light, massage. The Data tab shows the cockpit photo the same way. */
  const CAB_URL = {
    cabin: ["/mha_bridge/cabin.webp?v=1", "/mha_bridge/cabin_mask.png?v=1"],
    cockpit: ["/mha_bridge/cockpit.webp?v=1", "/mha_bridge/cockpit_mask.png?v=1"],
  };
  const CAB_LM = { cabin: [0.2160, 0.3611], cockpit: [0.1765, 0.3239] };   // mean luminance of the original fabric / trim
  const CAB_FABRIC = { green: null, teal: null, original: null,
    light_gray: [150, 152, 156], light_grey: [150, 152, 156], lightgray: [150, 152, 156], light: [150, 152, 156],
    dark_gray: [66, 69, 74], dark_grey: [66, 69, 74], darkgray: [66, 69, 74], dark: [66, 69, 74],
    gray: [66, 69, 74], grey: [66, 69, 74], graphite: [66, 69, 74] };
  const CAB_TRIM = { bronze: null, silver: [182, 187, 194], steel: [182, 187, 194], chrome: [182, 187, 194], gold: [196, 160, 92] };
  const cabColor = (v, table) => {
    if (v == null || v === "") return null;
    const k = String(v).toLowerCase().trim().replace(/[\s-]+/g, "_");
    return Object.prototype.hasOwnProperty.call(table, k) ? table[k] : parseColor(v);
  };
  /* soft highlight roll-off so light colours do not blow out on the bright cushion edges */
  const cabKnee = (v) => (v < 150 ? v : 150 + 95 * Math.tanh((v - 150) / 95));
  const _cabLib = {};
  const cabLoad = (kind) => _cabLib[kind] || (_cabLib[kind] = (async () => {
    const grab = async (url) => {
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) throw new Error(url + " " + r.status);
      const bmp = await createImageBitmap(await r.blob());
      const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height;
      const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(bmp, 0, 0);
      return cx.getImageData(0, 0, cv.width, cv.height);
    };
    const [img, mask] = await Promise.all([grab(CAB_URL[kind][0]), grab(CAB_URL[kind][1])]);
    return { img, mask, w: img.width, h: img.height, cache: {} };
  })().catch((e) => { delete _cabLib[kind]; throw e; }));
  /* The photo with the fabric / trim recoloured; null = keep the original colour. Cached per colour pair. */
  const cabRender = (lib, kind, fabric, trim) => {
    const key = (fabric ? fabric.join() : "-") + "|" + (trim ? trim.join() : "-");
    if (lib.cache[key]) return lib.cache[key];
    const { img, mask, w, h } = lib, src = img.data, M = mask.data;
    const out = new ImageData(new Uint8ClampedArray(src), w, h), o = out.data, lf = CAB_LM[kind][0], lb = CAB_LM[kind][1];
    if (fabric || trim) {
      for (let i = 0; i < o.length; i += 4) {
        const af = fabric ? M[i] : 0, at = trim ? M[i + 1] : 0;
        if (!af && !at) continue;
        const r0 = src[i], g0 = src[i + 1], b0 = src[i + 2], L = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255;
        let r = r0, g = g0, b = b0;
        if (af) { const a = af / 255, k = Math.min(L / lf, 2.2); r += (cabKnee(fabric[0] * k) - r) * a; g += (cabKnee(fabric[1] * k) - g) * a; b += (cabKnee(fabric[2] * k) - b) * a; }
        if (at) { const a = at / 255, k = Math.min(L / lb, 2.2); r += (cabKnee(trim[0] * k) - r) * a; g += (cabKnee(trim[1] * k) - g) * a; b += (cabKnee(trim[2] * k) - b) * a; }
        o[i] = r; o[i + 1] = g; o[i + 2] = b;
      }
    }
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").putImageData(out, 0, 0);
    const keys = Object.keys(lib.cache); if (keys.length > 3) delete lib.cache[keys[0]];
    return (lib.cache[key] = cv);
  };

  /* ---- the live layer, in photo pixels (cabin 1121x768, cockpit 1610x768) ---- */
  const CAB_SEAT = "M318 300 L340 266 L485 262 L508 300 L506 395 L480 440 L440 492 L300 498 L255 470 L238 432 L262 382 L300 372Z";
  const cabMir = (s) => `<g transform="translate(1121 0) scale(-1 1)">${s}</g>`;
  const cabTemp = (t) => {
    if (t == null || !isFinite(t)) return "#bcd3e4";
    const stops = [[17, [74, 168, 255]], [22, [214, 228, 240]], [28, [255, 138, 61]]];
    if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (t - t0) / (t1 - t0);
        return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(",")})`;
      }
    }
    return `rgb(${stops[2][1]})`;
  };
  const AMB_HEX = { red: "#ff3b30", orange: "#ff8a00", amber: "#ffb300", honey: "#ffc94a", yellow: "#ffe94a", lime: "#b5e61d", green: "#2ee66b",
    mint: "#3de8b0", turquoise: "#1fd8d8", sky: "#4db8ff", blue: "#3a6bff", purple: "#a259ff", pink: "#ff5fa8" };
  const CAB_DEFS = `<defs>
    <filter id="cb-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="cb-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <linearGradient id="cb-df" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".6"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient>
    <linearGradient id="cb-dr" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".6"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient>
  </defs>`;
  /* Smoke-like puffs: soft radial-gradient discs that rise / drift, swell and fade (CSS animation, no filters). */
  const cbRnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const cabClimate = (o) => {
    const f = o.fx, grads = {}, H = [], V = [], A = [], dots = [];
    const gr = (col) => {
      const id = "cbg" + String(col).replace(/[^0-9a-z]/gi, "");
      grads[id] = `<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="1"/><stop offset=".5" stop-color="${col}" stop-opacity=".5"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
      return id;
    };
    const puff = (col, x, y, r, dx, dy, dur, k, n, op, e) =>
      `<circle class="cb-puff" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gr(col)})" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--o:${op};--e:${e || 1.8};animation-duration:${dur.toFixed(2)}s;animation-delay:${(-dur * k / n).toFixed(2)}s"/>`;
    /* seat areas: [x0, y0, x1, y1] of the back + cushion */
    const FRONT = [262, 270, 508, 492], REAR = [296, 540, 466, 696];
    const rearPath = "M300 540 L460 530 L470 600 L462 696 L300 696 L292 600Z";
    const seat = (heat, vent, box, path, dotsX, dotsY, seed) => {
      const [x0, y0, x1, y1] = box;
      if (f.heat && heat) {
        H.push(`<path d="${path}" fill="#ff7a33" opacity="${[0, 0.2, 0.34, 0.5][heat]}" filter="url(#cb-blur)"/>`);
        const n = 4 + heat * 3;
        for (let i = 0; i < n; i++) {
          const rx = cbRnd(seed + i * 3), ry = cbRnd(seed + i * 3 + 1), rz = cbRnd(seed + i * 3 + 2);
          H.push(puff(i % 3 ? "#ff8a3d" : "#ffc58a", x0 + 25 + rx * (x1 - x0 - 50), y0 + (y1 - y0) * (0.45 + ry * 0.5), 15 + rz * 13,
            (rx - 0.5) * 34, -(55 + rz * 55), 3.4 + rz * 1.6, i, n, 0.55 + heat * 0.1, 1.9));
        }
      }
      if (f.vent && vent) {
        V.push(`<path d="${path}" fill="#3fb2ff" opacity="${[0, 0.18, 0.3, 0.44][vent]}" filter="url(#cb-blur)"/>`);
        const n = 6 + vent * 4;
        for (let i = 0; i < n; i++) {
          const rx = cbRnd(seed + 40 + i * 3), ry = cbRnd(seed + 41 + i * 3), rz = cbRnd(seed + 42 + i * 3);
          V.push(puff(i % 2 ? "#7fd4ff" : "#e4f6ff", x0 + 20 + rx * (x1 - x0 - 40), y0 + (y1 - y0) * (0.3 + ry * 0.6), 7 + rz * 8,
            (rx - 0.5) * 60, -(40 + rz * 36), 1.5 + rz * 1.0, i, n, 0.5 + vent * 0.12, 2.3));
        }
      }
      const lvl = f.heat && heat ? heat : f.vent && vent ? vent : 0, col = f.heat && heat ? "#ff8a3d" : "#5ec4ff";
      if (lvl) for (let i = 0; i < 3; i++) dots.push(`<circle cx="${dotsX + i * 26}" cy="${dotsY}" r="6.5" fill="${i < lvl ? col : "none"}" stroke="${col}" stroke-width="2" opacity="${i < lvl ? 1 : 0.4}"/>`);
    };
    /* run fn and mirror whatever it added to the given group arrays */
    const mirrored = (fn) => {
      const b = [H.length, V.length, A.length, dots.length]; fn();
      [[H, b[0]], [V, b[1]], [A, b[2]], [dots, b[3]]].forEach(([arr, from]) => { if (arr.length > from) arr.splice(from, arr.length - from, cabMir(arr.slice(from).join(""))); });
    };
    seat(o.heat.l, o.vent.l, FRONT, CAB_SEAT, 354, 516, 1); mirrored(() => seat(o.heat.r, o.vent.r, FRONT, CAB_SEAT, 354, 516, 7));
    if (o.hasRear) { seat(o.heatR.l, 0, REAR, rearPath, 336, 716, 21); mirrored(() => seat(o.heatR.r, 0, REAR, rearPath, 336, 716, 29)); }
    if (f.wheel && o.wheel) {
      H.push(`<g class="cb-pulse"><ellipse cx="402" cy="152" rx="71" ry="60" fill="none" stroke="#ff7a33" stroke-width="14" opacity="${[0, 0.45, 0.65, 0.9][o.wheel]}" filter="url(#cb-soft)"/>
        <ellipse cx="402" cy="152" rx="71" ry="60" fill="none" stroke="#ffb067" stroke-width="3" opacity=".8"/></g>`);
      for (let i = 0; i < 3 + o.wheel * 2; i++) { const a = cbRnd(60 + i) * 6.283; H.push(puff("#ffb067", 402 + Math.cos(a) * 66, 152 + Math.sin(a) * 56, 9 + cbRnd(70 + i) * 6, Math.cos(a) * 16, Math.sin(a) * 14 - 8, 2.8, i, 3 + o.wheel * 2, 0.6, 1.8)); }
    }
    /* Air flow like the head unit's own animation: soft translucent ribbons that leave the vent, fan out along a
     * gentle curve and fade. Each ribbon is two round-capped strokes (wide and faint + narrow core) painted with a
     * gradient that fades along the flow; a travelling dash (pathLength 100) moves it, no filters needed. */
    const stream = (x0, y0, x1, y1, col, n, seed, r0, spread, dur, soft) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
      const gx = x1 + dx * 0.55, gy = y1 + dy * 0.55;
      const id = "cbl" + [x0, y0, x1, y1].map(Math.round).join("_") + String(col).replace(/[^0-9a-z]/gi, "");
      grads[id] = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${gx.toFixed(0)}" y2="${gy.toFixed(0)}"><stop offset="0" stop-color="${col}" stop-opacity="1"/><stop offset=".45" stop-color="${col}" stop-opacity=".6"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
      const m = Math.max(4, Math.round(n * 0.7));
      let out = "";
      for (let i = 0; i < m; i++) {
        const j = cbRnd(seed + i * 2) - 0.5, z = cbRnd(seed + i * 2 + 1), c = cbRnd(seed + i * 5 + 3) - 0.5;
        const sx = x0 + px * j * spread * 0.5, sy = y0 + py * j * spread * 0.5;
        const ex = gx + px * j * spread * 3.2, ey = gy + py * j * spread * 3.2;
        const cx = (sx + ex) / 2 + px * c * len * 0.9, cy = (sy + ey) / 2 + py * c * len * 0.9;
        const d = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
        const w = r0 * 0.5 * (0.7 + z * 0.9), du = dur * (0.9 + z * 0.5), st = `animation-duration:${du.toFixed(2)}s;animation-delay:${(-du * (i / m + z * 0.25)).toFixed(2)}s`;
        out += [[2.6, 0.11], [1.3, 0.18], [0.45, 0.42]].map(([k, o]) =>
          `<path class="cb-rib" pathLength="100" d="${d}" stroke="url(#${id})" stroke-width="${(w * k).toFixed(1)}" opacity="${(o * soft).toFixed(2)}" style="${st}"/>`).join("");
      }
      return out;
    };
    const slit = (x, y, w, col) => `<rect class="cb-pulse" x="${x}" y="${y}" width="${w}" height="7" rx="3.5" fill="${col}" opacity=".95" filter="url(#cb-soft)"/><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="3" rx="1.5" fill="#fff" opacity=".55"/>`;
    const cl = cabTemp(o.tl), cr = cabTemp(o.tr), cw = cabTemp(o.tl != null && o.tr != null ? (o.tl + o.tr) / 2 : o.tl != null ? o.tl : o.tr);
    /* only a known, running fan animates: unavailable / unknown / off draw nothing */
    if (f.air && o.fan != null && o.fan > 0) {
      const nf = o.fan, cnt = 5 + nf, dur = Math.max(1.0, 3.0 - 0.2 * nf);
      const m = String(o.flow || "all");
      const face = m === "face" || m === "face_leg" || m === "face_window" || m === "all" || m === "auto";
      const leg = m === "leg" || m === "face_leg" || m === "leg_window" || m === "all" || m === "auto";
      const win = m === "window" || m === "face_window" || m === "leg_window" || m === "all";
      const soft = m === "auto" ? 0.65 : 1;
      /* dash grilles: outer vent + the centre vent aimed at the occupant */
      const half = (col, sd) => {
        let s = "";
        if (face) {
          s += slit(300, 125, 46, col) + slit(508, 156, 56, col);
          s += stream(322, 132, 372, 256, col, cnt, sd, 15, 26, dur, soft) + stream(528, 162, 432, 262, col, cnt + 2, sd + 30, 16, 30, dur, soft);
        }
        if (leg) s += stream(402, 206, 372, 266, col, Math.ceil(cnt * 0.8), sd + 50, 13, 24, dur, soft);
        return s;
      };
      A.push(half(cl, 100)); mirrored(() => A.push(half(cr, 140)));
      if (win) [380, 470, 560, 651, 742].forEach((x, k) => A.push(stream(x, 62, x, 4, x < 480 ? cl : x > 640 ? cr : cw, Math.ceil(cnt * 0.7), 200 + k * 9, 13, 18, dur, soft)));
    }
    /* rear passengers: face from the centre-tunnel grilles, feet along the floor */
    if (f.air && o.rearFlow && o.rearOn !== false && o.fan != null && o.fan > 0) {
      /* the fan is shared by the whole cabin: the rear only has its own temperature and air direction */
      const nf = o.fan, cnt = 4 + nf, dur = Math.max(1.1, 3.2 - 0.2 * nf);
      const rl = o.trl != null ? cabTemp(o.trl) : cw, rr = o.trr != null ? cabTemp(o.trr) : cw;
      const rf = o.rearFlow, face = rf === "face" || rf === "face_leg", leg = rf === "leg" || rf === "face_leg";
      const side = (sd, c) => {
        let s = "";
        if (face) s += slit(526, 427, 32, c) + stream(540, 456, 420, 540, c, cnt, sd, 15, 26, dur, 1);
        if (leg) s += stream(534, 452, 452, 506, c, Math.ceil(cnt * 0.8), sd + 40, 14, 40, dur * 1.1, 0.7, 2.2) + stream(540, 470, 470, 528, c, Math.ceil(cnt * 0.5), sd + 80, 12, 30, dur * 1.2, 0.6, 2.2);
        return s;
      };
      A.push(side(300, rl)); mirrored(() => A.push(side(340, rr)));
    }
    if (f.defrost) {
      if (o.dfF) {
        H.push(`<rect x="320" y="0" width="490" height="70" fill="url(#cb-df)" class="cb-pulse" filter="url(#cb-soft)"/>`);
        for (let i = 0; i < 12; i++) H.push(puff("#ffa665", 330 + cbRnd(300 + i) * 470, 66, 10 + cbRnd(320 + i) * 8, (cbRnd(340 + i) - 0.5) * 20, -52, 2.6 + cbRnd(360 + i), i, 12, 0.7, 1.9));
      }
      if (o.dfR) {
        H.push(`<rect x="230" y="700" width="660" height="68" fill="url(#cb-dr)" class="cb-pulse" filter="url(#cb-soft)"/>`);
        for (let i = 0; i < 14; i++) H.push(puff("#ffa665", 240 + cbRnd(400 + i) * 640, 752, 10 + cbRnd(420 + i) * 8, (cbRnd(440 + i) - 0.5) * 20, -34, 2.6 + cbRnd(460 + i), i, 14, 0.7, 1.9));
      }
    }
    const grp = (arr, k) => arr.length ? `<g opacity="${o.op[k]}">${arr.join("")}</g>` : "";
    const gd = Object.values(grads).join("");
    return (gd ? `<defs>${gd}</defs>` : "") + grp(V, "vent") + grp(H, "heat") + grp(A, "air") + dots.join("");
  };
  const cabComfort = (o) => {
    const f = o.fx, out = [];
    if (f.ambient && o.amb.on) {
      const col = AMB_HEX[o.amb.color] || "#7fd0ff", op = (0.4 + 0.6 * o.amb.bright).toFixed(2);
      const lines = ["M286 138 L352 142", "M478 152 C520 160 600 160 640 154 L832 148", "M272 168 L212 360", "M172 420 L100 690", "M850 166 L912 358", "M945 416 L1030 690"];
      const cls = o.amb.effect === "breathe" ? "cb-pulse" : o.amb.effect === "gradient" ? "cb-hue" : "";
      out.push(`<g class="${cls}" opacity="${op}">` + lines.map((d) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" opacity=".55" filter="url(#cb-soft)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`).join("") + `</g>`);
    }
    if (f.massage) {
      const ring = (cx, lvl) => {
        const dur = [0, 2.4, 1.7, 1.1][lvl] || 1.7;
        return [0, 1, 2].map((i) => `<circle class="cb-ring" cx="${cx}" cy="350" r="92" fill="none" stroke="#ffa066" stroke-width="5" style="animation-duration:${dur}s;animation-delay:${(-i * dur / 3).toFixed(2)}s"/>`).join("");
      };
      if (o.mas.l) out.push(ring(412, o.mas.ll));
      if (o.mas.r) out.push(ring(709, o.mas.lr));
    }
    return out.join("");
  };
  const cabinOverlay = (o, mode) => CAB_DEFS + (mode === "comfort" ? cabComfort(o) : cabClimate(o));
  const cockpitOverlay = (o) => o.on ? `<defs><filter id="ck-b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>
    <rect x="446" y="116" width="96" height="84" rx="10" fill="#7fd0ff" opacity=".34" filter="url(#ck-b)"/>
    <rect x="668" y="134" width="620" height="80" rx="14" fill="#7fd0ff" opacity=".16" filter="url(#ck-b)"/>` : "";

  /* ----------------------------------------------------------- icons ----- */
  /* One cohesive hand-drawn stroke set - 24px grid, 1.8 stroke, round caps. */

  const ICONS = {
    nav: `<path d="M20 4 10.5 20l-1.2-6.3L3 12.5z"/>`,
    // Parking Comfort keeps the cabin liveable while the car sits, which is
    // what mdi:sleep says on the switch itself - so a crescent, not the
    // climate fan it was borrowing.
    sleep: `<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z"/>`,
    driving: `<path d="M3.5 14.5h17M5 14.5l1.7-4.6A2 2 0 0 1 8.6 8.5h6.8a2 2 0 0 1 1.9 1.4l1.7 4.6"/>
              <path d="M4.5 14.5v3h3v-3M16.5 14.5v3h3v-3"/>
              <circle cx="7.5" cy="15.6" r="1.1"/><circle cx="16.5" cy="15.6" r="1.1"/>`,
    lock: `<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/>
           <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.4"/>`,
    unlock: `<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/>
             <path d="M16 10.5V7.5a4 4 0 0 0-7.6-1.7"/><circle cx="12" cy="15.2" r="1.4"/>`,
    climate: `<circle cx="12" cy="12" r="1.9"/>
              <path d="M12 9.7C12 6.6 10.9 4.6 8.9 4.8 7.2 5 6.9 7 8.3 8.3c.9.9 2.2 1.3 3.7 1.4z"/>
              <path d="M12 9.7C12 6.6 10.9 4.6 8.9 4.8 7.2 5 6.9 7 8.3 8.3c.9.9 2.2 1.3 3.7 1.4z" transform="rotate(120 12 12)"/>
              <path d="M12 9.7C12 6.6 10.9 4.6 8.9 4.8 7.2 5 6.9 7 8.3 8.3c.9.9 2.2 1.3 3.7 1.4z" transform="rotate(240 12 12)"/>`,
    defrost: `<path d="M4.5 12.5c0-4.5 3.4-7.5 7.5-7.5s7.5 3 7.5 7.5"/>
              <path d="M8.3 12c-1 2-1 3.5 0 5.5M12 12c-1 2-1 3.5 0 5.5M15.7 12c-1 2-1 3.5 0 5.5"/>`,
    vent: `<rect x="4.5" y="5" width="15" height="12" rx="2"/>
           <path d="M4.5 9.5h15M12 21v-6.2M9.6 17.2 12 14.8l2.4 2.4"/>`,
    trunk: `<path d="M4.5 19v-6l3-2h9l3 3v5"/><path d="M4.5 16h15"/>
            <path d="M7.5 11 12 4.8l7 3.2"/><circle cx="16.5" cy="18" r="0"/>`,
    find: `<path d="M12 20.5s-6-5.1-6-9.5a6 6 0 0 1 12 0c0 4.4-6 9.5-6 9.5z"/>
           <circle cx="12" cy="10.8" r="2.2"/>`,
    refresh: `<path d="M18.6 9A7 7 0 1 0 19 13"/><path d="M19.2 4.6V9h-4.4"/>`,
    bolt: `<path d="M12.8 3.5 6.5 13h4l-1.3 7.5L15.5 11h-4z"/>`,
    charge: `<path d="M7 20v-9.5a5 5 0 0 1 10 0V20"/><path d="M9.5 6V3.5M14.5 6V3.5"/>
             <path d="M12.7 11.5 10.4 15h3.2l-2.3 3.5"/>`,
    tire: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>
           <path d="M12 4v2.6M12 17.4V20M4 12h2.6M17.4 12H20"/>`,
    heat: `<path d="M12 4c2 3.2 5 5 5 8.6a5 5 0 0 1-10 0C7 9 10 7.2 12 4z"/>
           <path d="M12 20.5v-3"/>`,
    seatheat: `<path d="M6.5 4.5v7.5a2.5 2.5 0 0 0 2.5 2.5h6"/>
               <path d="M6.5 12h6a3 3 0 0 1 3 3v4.5"/>
               <path d="M13 5c-.8 1.2-.8 2 0 3.2M16.5 5c-.8 1.2-.8 2 0 3.2"/>`,
    seatvent: `<path d="M6.5 4.5v7.5a2.5 2.5 0 0 0 2.5 2.5h6"/>
               <path d="M6.5 12h6a3 3 0 0 1 3 3v4.5"/>
               <path d="M13.5 5l2.5 2.5M16 5l-2.5 2.5"/>`,
    roof: `<path d="M4 14.5c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5"/>
           <path d="M8 10.5h8M9.5 6.9v3.6M14.5 6.9v3.6"/>`,
    shade: `<path d="M4 14.5c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5"/>
            <path d="M6 12h12M8.5 12c0 2.5 1.5 4 3.5 4s3.5-1.5 3.5-4"/>`,
    window: `<rect x="4" y="6.5" width="16" height="11" rx="1.5"/>
             <path d="M12 6.5v11M4 12h16"/>`,
    fresh: `<path d="M5 9.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>
            <path d="M5 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>
            <path d="M5 18.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>`,
    steering: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>
               <path d="M12 4v6M6.2 15l4.4-2.5M17.8 15l-4.4-2.5"/>`,
    minus: `<path d="M6 12h12"/>`,
    /* window / roof / blind end stops: glass up to the stop = closed, glass down from it = open */
    shut: `<path d="M12 19V8M7.5 11.5 12 7l4.5 4.5M5 4.5h14"/>`,
    full: `<path d="M12 5v11M7.5 12.5 12 17l4.5-4.5M5 19.5h14"/>`,
    plus: `<path d="M12 6v12M6 12h12"/>`,
    cool: `<path d="M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75 4.6 16.25"/>`,
    trip: `<path d="M5 19c6 0 3-7 9-7 4.5 0 3.5-5.5 5-7"/>
           <circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>`,
    fuel: `<path d="M5.5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14"/><path d="M4 20h10.5"/>
           <path d="M14.5 10h2l2 2v5a1.5 1.5 0 0 1-3 0v-7.5"/><path d="M6.5 7h5v4h-5z"/>`,
  };
  ICONS.ambient = `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.4 10.9c.6.5.9 1.1.9 1.8V16h5v-.3c0-.7.3-1.3.9-1.8A6 6 0 0 0 12 3z"/>`;
  ICONS.massage = `<path d="M7 4.5v7a2.5 2.5 0 0 0 2.5 2.5H15"/><path d="M7 12h6a3 3 0 0 1 3 3v4.5"/>
                   <path d="M13.5 4c1 1 1 2 0 3s-1 2 0 3M17 4c1 1 1 2 0 3s-1 2 0 3"/>`;
  ICONS.purify = `<path d="M5 10c0-2.8 2.2-5 5-5h4a5 5 0 0 1 5 5v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>
                  <path d="M8.5 11h7M8.5 14.5h7M12 8v0"/>`;
  /* Climate button icons: Material Design Icons (Apache-2.0, https://pictogrammers.com/library/mdi/), 24px filled paths.
   * The steering wheel is composed with the heat-wave glyph so it reads as "heated". */
  const MDI = {
    auto: "M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22C12.4 22 12.7 22 13.1 21.9L15.4 15.3L14.8 14.7C15.5 14 16 13 16 11.9C16 11.2 15.8 10.5 15.4 9.9L17.6 7.7C18.5 9 19 10.4 19 12H20C20.3 12 20.6 12.1 20.8 12.2C20.8 12.2 20.9 12.2 20.9 12.3C21.3 12.5 21.7 12.9 21.9 13.4C22 12.9 22 12.5 22 12C22 6.5 17.5 2 12 2M14 8.6C13.4 8.2 12.7 8 12 8C9.8 8 8 9.8 8 12C8 13.1 8.4 14.1 9.2 14.8L7.1 16.9C5.8 15.7 5 13.9 5 12C5 8.1 8.1 5 12 5C13.6 5 15 5.5 16.2 6.4L14 8.6M20 14H18L14.8 23H16.7L17.4 21H20.6L21.3 23H23.2L20 14M17.8 19.7L19 16L20.2 19.7H17.8Z",
    ac: "M14.46 9.41L11 7.38V5.12L12.71 3.41L11.29 2L10 3.29L8.71 2L7.29 3.41L9 5.12V7.38L6.5 8.82L4.5 7.69L3.92 5.36L2 5.88L2.47 7.65L.7 8.12L1.22 10.05L3.55 9.43L5.55 10.56V13.45L3.55 14.58L1.22 13.96L.7 15.89L2.47 16.36L2 18.12L3.93 18.64L4.55 16.31L6.55 15.18L9 16.62V18.88L7.29 20.59L8.71 22L10 20.71L11.29 22L12.7 20.59L11 18.88V16.62L14.46 14.61M7.5 10.56L10 9.11L12.5 10.56V13.44L10 14.89L7.5 13.44M19 5C17.89 5 17 5.89 17 7V13.76C16.36 14.33 16 15.15 16 16C16 17.66 17.34 19 19 19S22 17.66 22 16C22 15.15 21.64 14.33 21 13.77V7C21 5.89 20.11 5 19 5M19 6C19.55 6 20 6.45 20 7V8H18V7C18 6.45 18.45 6 19 6",
    defrost: "M15,23C14.7,23 14.5,22.9 14.3,22.7C13.9,22.3 14,21.7 14.4,21.3V21.3C14.9,20.9 16.1,19.5 16.1,18.4C16.1,17.8 15.7,17.2 15.3,16.5C14.8,15.7 14.1,14.7 14.1,13.5C14.1,11.2 15.4,10.3 15.6,10.2C16.1,9.9 16.7,10.1 17,10.5C17.3,11 17.1,11.6 16.7,11.9V11.9C16.7,11.9 16.2,12.3 16.2,13.5C16.2,14.1 16.6,14.7 17,15.4C17.5,16.2 18.2,17.2 18.2,18.4C18.2,20.6 16.1,22.6 15.9,22.8C15.5,22.9 15.2,23 15,23M11.7,22.7C11.9,22.5 14,20.5 14,18.3C14,17.1 13.4,16.1 12.8,15.3C12.4,14.6 12,14 12,13.4C12,12.2 12.5,11.8 12.5,11.8V11.8C13,11.5 13.1,10.9 12.8,10.4C12.5,9.9 11.9,9.8 11.4,10.1C11.2,10.2 9.9,11.1 9.9,13.4C9.9,14.6 10.5,15.6 11.1,16.4C11.5,17.1 11.9,17.7 11.9,18.3C11.9,19.4 10.7,20.8 10.2,21.2V21.2C9.8,21.6 9.8,22.2 10.1,22.6C10.3,22.8 10.6,22.9 10.8,22.9C11.2,23 11.5,22.9 11.7,22.7M7.7,22.7C7.9,22.5 10,20.5 10,18.3C10,17.1 9.4,16.1 8.8,15.3C8.4,14.7 8,14.1 8,13.4C8,12.2 8.5,11.8 8.5,11.8V11.8C9,11.5 9.1,10.9 8.8,10.4C8.6,10 7.9,9.9 7.5,10.1C7.3,10.2 6,11.1 6,13.4C6,14.6 6.6,15.6 7.2,16.4C7.6,17.1 8,17.7 8,18.3C8,19.4 6.8,20.8 6.3,21.2V21.2C5.9,21.6 5.9,22.2 6.2,22.6C6.5,22.9 6.7,23 7,23C7.2,23 7.5,22.9 7.7,22.7M12,3C9.4,3 1,3.3 1,7C1,9.4 2.2,15.4 2.8,18H4L4.8,18H5V16H4.4C3.8,13.1 3,8.8 3,7C3,6 7.4,5 12,5C16.6,5 21,6 21,7C21,8.8 20.2,13.1 19.6,16H19V18H19.2L20,18H21.2C21.8,15.4 23,9.4 23,7C23,3.3 14.6,3 12,3Z",
    defrost_rear: "M10,18.3C10,20.5 7.9,22.5 7.7,22.7C7.5,22.9 7.2,23 7,23C6.7,23 6.5,22.9 6.2,22.6C5.9,22.2 5.9,21.6 6.3,21.2C6.8,20.8 8,19.4 8,18.3C8,17.7 7.6,17.1 7.2,16.4C6.6,15.6 6,14.6 6,13.4C6,11.1 7.3,10.2 7.5,10.1C7.9,9.9 8.6,10 8.8,10.4C9.1,10.9 9,11.5 8.5,11.8C8.5,11.8 8,12.2 8,13.4C8,14.1 8.4,14.7 8.8,15.3C9.4,16.1 10,17.1 10,18.3M12,13.4C12,12.2 12.5,11.8 12.5,11.8C13,11.5 13.1,10.9 12.8,10.4C12.5,9.9 11.9,9.8 11.4,10.1C11.2,10.2 9.9,11.1 9.9,13.4C9.9,14.6 10.5,15.6 11.1,16.4C11.5,17.1 11.9,17.7 11.9,18.3C11.9,19.4 10.7,20.8 10.2,21.2C9.8,21.6 9.8,22.2 10.1,22.6C10.3,22.8 10.6,22.9 10.8,22.9C11.2,23 11.5,22.9 11.7,22.7C11.9,22.5 14,20.5 14,18.3C14,17.1 13.4,16.1 12.8,15.3C12.4,14.6 12,14 12,13.4M20,3H4A2,2 0 0,0 2,5V16A2,2 0 0,0 4,18H5V16H4V5H20V16H19V18H20A2,2 0 0,0 22,16V5A2,2 0 0,0 20,3M16.2,13.5C16.2,12.3 16.7,11.9 16.7,11.9C17.1,11.6 17.3,11 17,10.5C16.7,10.1 16.1,9.9 15.6,10.2C15.4,10.3 14.1,11.2 14.1,13.5C14.1,14.7 14.8,15.7 15.3,16.5C15.7,17.2 16.1,17.8 16.1,18.4C16.1,19.5 14.9,20.9 14.4,21.3C14,21.7 13.9,22.3 14.3,22.7C14.5,22.9 14.7,23 15,23C15.2,23 15.5,22.9 15.9,22.8C16.1,22.6 18.2,20.6 18.2,18.4C18.2,17.2 17.5,16.2 17,15.4C16.6,14.7 16.2,14.1 16.2,13.5Z",
    heat: "M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z",
    cool: "M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z",
  };
  const MDI_STEERING = `<g transform="translate(-0.6 4.2) scale(.8)"><path d="M13,19.92C14.8,19.7 16.35,18.95 17.65,17.65C18.95,16.35 19.7,14.8 19.92,13H16.92C16.7,14 16.24,14.84 15.54,15.54C14.84,16.24 14,16.7 13,16.92V19.92M10,8H14L17,11H19.92C19.67,9.05 18.79,7.38 17.27,6C15.76,4.66 14,4 12,4C10,4 8.24,4.66 6.73,6C5.21,7.38 4.33,9.05 4.08,11H7L10,8M11,19.92V16.92C10,16.7 9.16,16.24 8.46,15.54C7.76,14.84 7.3,14 7.08,13H4.08C4.3,14.77 5.05,16.3 6.35,17.6C7.65,18.9 9.2,19.67 11,19.92M12,2C14.75,2 17.1,3 19.05,4.95C21,6.9 22,9.25 22,12C22,14.75 21,17.1 19.05,19.05C17.1,21 14.75,22 12,22C9.25,22 6.9,21 4.95,19.05C3,17.1 2,14.75 2,12C2,9.25 3,6.9 4.95,4.95C6.9,3 9.25,2 12,2Z"/></g><g transform="translate(11.6 -2.4) scale(.6)"><path d="M8.5 4.5L5.4 9.5L8.5 14.7L5.2 20.5L3.4 19.6L6.1 14.7L3 9.5L6.7 3.6L8.5 4.5M14.7 4.4L11.6 9.5L14.7 14.5L11.4 20.3L9.6 19.4L12.3 14.5L9.2 9.5L12.9 3.5L14.7 4.4M21 4.4L17.9 9.5L21 14.5L17.7 20.3L15.9 19.4L18.6 14.5L15.5 9.5L19.2 3.5L21 4.4"/></g>`;
  const icon = (name) =>
   MDI[name] ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="${MDI[name]}"/></svg>`
   : name === "steering" ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${MDI_STEERING}</svg>`
   :
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const iconFilled = (name) =>
    `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${ICONS[name]}</svg>`;

  const BASE_CSS = `
    :host { display: block; }
    * { box-sizing: border-box; margin: 0; }
    .shell {
      position: relative; overflow: hidden;
      /* Makes the card itself the thing narrow-width rules are measured
       * against - see the @container rule below. The card is as narrow inside
       * a desktop dashboard column as it is on a phone, and a viewport media
       * query cannot tell the two apart. */
      container-type: inline-size;
      border-radius: var(--ha-card-border-radius, 12px);
      background:
        radial-gradient(120% 90% at 85% -10%,
          color-mix(in srgb, ${ACCENT} 9%, transparent), transparent 60%),
        var(--ha-card-background, var(--card-background-color, #fff));
      border: 1px solid var(--divider-color, rgba(120,130,140,.2));
      color: var(--primary-text-color, #1c1c1e);
      padding: 18px 20px 16px;
      font-family: var(--ha-card-font-family, var(--paper-font-body1_-_font-family, inherit));
    }
    .micro {
      font-size: 10px; font-weight: 600; letter-spacing: .18em;
      text-transform: uppercase; color: var(--secondary-text-color, #7a7f87);
      display: flex; align-items: center; gap: 6px;
    }
    .micro svg { width: 13px; height: 13px; opacity: .8; }
    .hairline { border: 0; border-top: 1px solid var(--divider-color, rgba(120,130,140,.18)); margin: 14px 0 12px; }
    .num { font-weight: 200; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; line-height: 1; }

    .car { width: 100%; height: auto; display: block; }
    /* The compact card's car is a doorway to the full one. */
    .carwrap.expandable { cursor: pointer; border-radius: 10px; outline: none;
      transition: transform .18s ease, filter .18s ease; }
    .carwrap.expandable:hover { transform: translateY(-1px); filter: brightness(1.06); }
    .carwrap.expandable:focus-visible { box-shadow: 0 0 0 2px ${ACCENT}; }
    /* the photo variant - see CAR_PHOTO */
    /* isolation: the ground shadow sits at z-index -1, behind the image but
     * still inside this box. The bottom margin is the room the drawing keeps
     * under its tyres for the same shadow. */
    .photo { position: relative; width: 100%; line-height: 0; isolation: isolate;
      margin-bottom: 3%; }
    .photo img { width: 100%; height: auto; display: block; }
    /* A wrong path must not leave lamps floating over a broken-image glyph. */
    .photo.broken img { visibility: hidden; }
    .photo.broken .lamps, .photo.broken .ground { display: none; }
    /* CAR_SVG's .shadow and .glow ellipses, in the photo's proportions. */
    .photo .ground { position: absolute; z-index: -1; border-radius: 50%;
      transform: translate(-50%,-50%); filter: blur(5px); }
    .photo .ground.shadow { width: 84%; height: 7%; background: rgba(0,0,0,.28); }
    .photo .ground.glow { width: 79%; height: 6%; background: transparent; }
    .photo.charging .ground.glow {
      background: color-mix(in srgb, ${ACCENT} 38%, transparent); }
    .photo .lamps { position: absolute; inset: 0; pointer-events: none; }
    .photo .lamp, .photo .pind {
      position: absolute; transform: translate(-50%,-50%); border-radius: 50%;
    }
    .photo .lamp { opacity: 0; transition: opacity .45s ease; }
    .photo .lamp.on { opacity: 1; }
    .photo .lamp.headlight { width: 13%; height: 19%; filter: blur(2px);
      background: radial-gradient(ellipse at center,
        rgba(255,250,235,.95), rgba(205,230,255,.4) 45%, transparent 70%); }
    .photo .lamp.taillight { width: 11%; height: 17%; filter: blur(2px);
      background: radial-gradient(ellipse at center,
        rgba(255,80,80,.95), rgba(225,40,40,.4) 45%, transparent 70%); }
    .photo .wspin { position: absolute; inset: 0; pointer-events: none; line-height: 0; }
    .photo .wspin i { position: absolute; display: block; aspect-ratio: 1; }
    .photo .wspin img { position: absolute; inset: 0; width: 100%; height: 100%; will-change: transform; }
    .photo .lfx { position: absolute; height: auto; opacity: 0; transition: opacity .45s ease; pointer-events: none; }
    .photo .lfx.on { opacity: 1; } .photo .lfx.glow { mix-blend-mode: screen; }
    .photo .lamp.port { width: 9%; height: 17%; filter: blur(1.5px);
      background: radial-gradient(ellipse at center,
        ${ACCENT}, transparent 65%); }
    .photo.plugged .lamp.port { opacity: .4; }
    .photo.braked .lamp.taillight { opacity: .38; }
    .photo .lamp.taillight.on { opacity: 1; }
    .photo.charging .lamp.port { opacity: 1; }
    .photo .pind { width: 13px; height: 13px; background: ${AMBER};
      opacity: 0; transition: opacity .3s ease;
      box-shadow: 0 0 9px 2px ${AMBER}; }
    .photo .pind.on { opacity: 1; animation: geely-blink 1.4s ease infinite; }
    .car .shadow { fill: rgba(0,0,0,.28); }
    .car .glow { fill: transparent; transition: fill .5s ease; }
    .car .paint { fill: var(--geely-car-paint, url(#gp)); stroke: rgba(0,0,0,.18); stroke-width: 1.5; }
    .car .rocker { fill: rgba(0,0,0,.18); }
    .car .crease { stroke: rgba(255,255,255,.4); stroke-width: 1.6; fill: none; }
    .car .glass { fill: url(#gg); }
    .car .streak { stroke: rgba(255,255,255,.14); stroke-width: 7; stroke-linecap: round; }
    .car .ducktail { stroke: rgba(0,0,0,.4); stroke-width: 4; stroke-linecap: round; }
    .car .haunch { stroke: rgba(255,255,255,.28); stroke-width: 2.5; fill: none; }
    .car .pillar { stroke: rgba(0,0,0,.4); stroke-width: 4; }
    .car .mirror { fill: #6d7681; stroke: rgba(0,0,0,.2); }
    .car .handle { fill: rgba(0,0,0,.25); }
    .car .headlight { fill: #eef4fa; stroke: rgba(0,0,0,.12); }
    .car .taillight { fill: #d05252; opacity: .9; }
    .car.lights .headlight { fill: #fffbe8; filter: drop-shadow(0 0 5px rgba(255,248,215,.95)) drop-shadow(0 0 14px rgba(190,220,255,.75)); }
    .car.lights .taillight { fill: #ff4040; opacity: 1; filter: drop-shadow(0 0 5px rgba(255,60,60,.95)) drop-shadow(0 0 12px rgba(255,40,40,.7)); }
    .car .port { fill: rgba(0,0,0,.22); }
    .car .portdot { fill: rgba(255,255,255,.35); transition: fill .3s ease; }
    .car .tire { fill: #20242a; }
    .car .disc { fill: none; stroke: #4a525b; stroke-width: 9; }
    .car .hubcap { fill: #cfd5db; }
    .car .cladding { stroke: #262b31; stroke-width: 14; fill: none; }
    .car .mirror { fill: #3a424d; }
    .car .spokes path { fill: #cfd5db; }
    .car .disc { fill: #23272d; }
    .car .rimring { fill: none; stroke: #b9c0c8; stroke-width: 2.5; }
    .car .ind { fill: ${AMBER}; opacity: 0; transition: opacity .3s ease; }
    .car .ind.on { opacity: 1; animation: geely-blink 1.4s ease infinite; }
    @keyframes geely-blink { 50% { opacity: .35; } }
    .car.charging .glow { fill: color-mix(in srgb, ${ACCENT} 38%, transparent); }
    .car.charging .portdot { fill: ${ACCENT}; filter: drop-shadow(0 0 4px ${ACCENT}); }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 999px;
      border: 1px solid var(--divider-color, rgba(120,130,140,.25));
      color: var(--secondary-text-color, #7a7f87); white-space: nowrap;
    }
    .chip svg { width: 12px; height: 12px; }
    .chip.on {
      color: ${ON_TEXT};
      border-color: color-mix(in srgb, ${ACCENT} 55%, transparent);
      background: color-mix(in srgb, ${ACCENT} 15%, transparent);
      font-weight: 600;
    }
    .chip.crit {
      color: var(--tc, var(--geely-critical, #e5484d));
      border-color: color-mix(in srgb, var(--tc, var(--geely-critical, #e5484d)) 60%, transparent);
      background: color-mix(in srgb, var(--tc, var(--geely-critical, #e5484d)) 14%, transparent);
      font-weight: 600;
    }
    .chip.warn {
      color: ${WARN_TEXT};
      border-color: color-mix(in srgb, ${AMBER} 55%, transparent);
      background: color-mix(in srgb, ${AMBER} 15%, transparent);
      font-weight: 600;
    }
    /* A clickable chip whose lit fraction (--lvl 0..1) shows how far open the
     * windows are - a vent crack lights a sliver, fully down lights it all. */
    .chip.lvl {
      color: ${ON_TEXT}; font-weight: 600; cursor: pointer;
      border-color: color-mix(in srgb, ${ACCENT} 55%, transparent);
      background: linear-gradient(to right,
        color-mix(in srgb, ${ACCENT} 22%, transparent) calc(var(--lvl, 0) * 100%),
        transparent calc(var(--lvl, 0) * 100%));
    }
    .chip.lvl:hover { border-color: color-mix(in srgb, ${ACCENT} 80%, transparent); }
    .win-menu { background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
      color: var(--primary-text-color, #e6e6e6); border-radius: 16px; padding: 16px;
      display: flex; flex-direction: column; gap: 10px; min-width: 220px;
      box-shadow: 0 18px 50px -12px rgba(0,0,0,.6); }
    .win-menu h4 { margin: 0 0 2px; font-size: 13px; font-weight: 600; }
    .win-menu button { font: inherit; padding: 12px; border-radius: 12px; cursor: pointer;
      border: 1px solid color-mix(in srgb, ${ACCENT} 45%, transparent);
      background: color-mix(in srgb, ${ACCENT} 14%, transparent); color: ${ON_TEXT}; }
    .win-menu button:hover { background: color-mix(in srgb, ${ACCENT} 26%, transparent); }
    .actions { display: flex; gap: 8px; justify-content: space-between; }
    .act {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 10px 2px 8px; border-radius: 14px; border: 1px solid var(--divider-color, rgba(120,130,140,.2));
      background: transparent; color: var(--primary-text-color); cursor: pointer;
      transition: transform .08s ease, border-color .15s ease, color .15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .act svg { width: 21px; height: 21px; }
    .act span { font-size: 9.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
                color: var(--secondary-text-color); }
    .act:active { transform: scale(.94); }
    .act:hover { border-color: color-mix(in srgb, currentColor 35%, transparent); }
    /* Active state. It used to be a 45%-tinted outline and a coloured icon,
     * which on the mini and strip cards - where the labels are hidden - left an
     * "on" button almost indistinguishable from an off one. A state worth
     * showing is worth showing properly: a filled tint so it reads as solid, a
     * firmer edge, a soft lift, and the label joining in rather than staying
     * grey. Same language for amber, so "active" and "needs a look" are told
     * apart by hue and never by intensity. */
    .act.on {
      color: ${ON_TEXT};
      border-color: color-mix(in srgb, ${ACCENT} 60%, transparent);
      background: color-mix(in srgb, ${ACCENT} 16%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, ${ACCENT} 22%, transparent),
                  0 3px 14px -8px color-mix(in srgb, ${ACCENT} 90%, transparent);
    }
    .act.on span { color: ${ON_TEXT}; }
    .act.on svg { opacity: 1; }
    .act.on:hover { background: color-mix(in srgb, ${ACCENT} 24%, transparent); }
    .act.armed {
      color: ${WARN_TEXT};
      border-color: ${AMBER};
      background: color-mix(in srgb, ${AMBER} 18%, transparent);
      animation: geely-arm 1s ease infinite;
    }
    .act.armed span { color: ${WARN_TEXT}; }
    .act[disabled] { opacity: .35; pointer-events: none; }

    /* Navigation links. Deliberately quieter than the command buttons beside
     * them: they open a map app rather than doing anything to the car. */
    .cbtn.nav { text-decoration: none; color: var(--secondary-text-color); }
    .cbtn.nav:hover { color: var(--primary-text-color); }
    /* The same link as an icon button (#87). An anchor inherits what a button
     * does not - the underline and the card's line height - and either would
     * set it apart from the buttons beside it. */
    .act.nav { text-decoration: none; line-height: normal; }

    /* The second bar, on a car with a tank. Deliberately not the accent
     * colour: the two bars must not be mistaken for one another at a glance. */
    .bar.fuel { margin-top: 4px; }
    .bar.fuel i { background: var(--geely-fuel, #8b93a1); }

    /* While the car is moving. Amber rather than red: nothing is wrong, the
     * controls are simply not available yet. */
    .driving {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 14px; padding: 9px 12px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, ${AMBER} 40%, transparent);
      background: color-mix(in srgb, ${AMBER} 12%, transparent);
      color: ${AMBER};
    }
    .driving svg { width: 20px; height: 20px; flex: none; }
    .driving span {
      display: flex; flex-direction: column; gap: 1px; min-width: 0;
      font-size: 11px; line-height: 1.35;
      color: var(--secondary-text-color, #7a7f87);
    }
    .driving b {
      font-size: 10px; font-weight: 700; letter-spacing: .18em;
      text-transform: uppercase; color: ${AMBER};
    }
    /* Every disabled control reads the same, whichever class the card used. */
    .blocked { opacity: .35 !important; pointer-events: none; filter: saturate(.4); }
    @keyframes geely-arm { 50% { border-color: color-mix(in srgb, ${AMBER} 35%, transparent); } }
    .bar { position: relative; height: 5px; border-radius: 999px; overflow: hidden;
           background: color-mix(in srgb, currentColor 12%, transparent); }
    .bar > i { position: absolute; inset: 0 auto 0 0; border-radius: 999px;
               background: var(--fc, ${ACCENT}); transition: width .6s ease; }
    .bar.low > i { background: var(--fc, ${AMBER}); }
    .bar.crit > i { background: var(--fc, var(--geely-critical, #e5484d)); }
    .bar.charging > i::after {
      content: ""; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
      animation: geely-shimmer 1.6s linear infinite;
    }
    @keyframes geely-shimmer { from { transform: translateX(-100%);} to { transform: translateX(100%);} }
    .unavail { opacity: .5; }
    .crow { display:flex; gap:8px; align-items:stretch; margin-top:8px; }
    .crow.wrap { flex-wrap: wrap; }
    .temp { display:flex; align-items:center; gap:2px; flex:none;
            border:1px solid var(--divider-color, rgba(120,130,140,.25));
            border-radius:14px; padding:2px; }
    .temp.on {
      border-color: color-mix(in srgb, ${ACCENT} 60%, transparent);
      background: color-mix(in srgb, ${ACCENT} 12%, transparent);
    }
    .temp.on .tval { color: ${ON_TEXT}; }
    .temp .tval { min-width:52px; text-align:center; font-size:16px; font-weight:600;
                  font-variant-numeric: tabular-nums; }
    .csub { margin-top:10px; }
    .cstep { border:none; background:none; color:var(--primary-text-color);
             width:40px; height:40px; border-radius:12px; cursor:pointer;
             display:flex; align-items:center; justify-content:center;
             -webkit-tap-highlight-color: transparent; }
    .cstep:active { transform: scale(.92); }
    .cstep svg { width:16px; height:16px; }
    .cbtn { display:flex; align-items:center; gap:6px; padding:10px 12px;
            border:1px solid var(--divider-color, rgba(120,130,140,.25));
            border-radius:14px; background:none; cursor:pointer;
            color: var(--primary-text-color); font: inherit; font-size:12px;
            min-height:40px; -webkit-tap-highlight-color: transparent;
            transition: transform .1s ease; }
    .cbtn:active { transform: scale(.95); }
    .cbtn svg { width:17px; height:17px; }
    svg { flex:none; } button svg, .micro svg, .chip svg, .opn-h svg { flex:none; min-width:0; aspect-ratio:1/1; }
    .cbtn b { font-weight:600; font-size:11px; color: var(--secondary-text-color); }
    .cbtn.on {
      color:${ON_TEXT};
      border-color: color-mix(in srgb, ${ACCENT} 60%, transparent);
      background: color-mix(in srgb, ${ACCENT} 16%, transparent);
      box-shadow: 0 3px 14px -8px color-mix(in srgb, ${ACCENT} 90%, transparent);
    }
    /* The level - Low / Medium / High - is the whole point of a seat button, so
     * it gets the strongest treatment on the card. */
    .cbtn.on b { color:${ON_TEXT}; font-weight: 700; }
    /* Seat / wheel heat show their LEVEL as a proportional fill: full at the
     * top level (identical to .on), a third and two-thirds of the button
     * width at the lower ones, nothing when off - so the setting reads at a
     * glance, not just from the label. --lvl is 0..1. The button carries both
     * the on and lvl classes; defined after .on, this rule wins the background,
     * and the on class keeps it counting as an active button everywhere else. */
    .cbtn.lvl {
      color:${ON_TEXT};
      border-color: color-mix(in srgb, ${ACCENT} 60%, transparent);
      background: linear-gradient(to right,
        color-mix(in srgb, ${ACCENT} 16%, transparent) calc(var(--lvl, 0) * 100%),
        transparent calc(var(--lvl, 0) * 100%));
      box-shadow: 0 3px 14px -8px color-mix(in srgb, ${ACCENT} 90%, transparent);
      transition: background .3s ease;
    }
    .cbtn.lvl b { color:${ON_TEXT}; font-weight: 700; }
    @media (hover: hover) {
      .cstep:hover, .cmini:hover { background: rgba(120,130,140,.15); }
    }
    /* The temperature stepper and the two rapid presets are one row, and on a
     * phone the third one dropped to a line of its own, leaving a gap beside
     * the second (#29). The row is pinned to a single line here and the
     * horizontal padding pays for it - nothing vertical changes, so every tap
     * target keeps its height, and the steppers keep their width.
     *
     * Only this row. The seat and air rows carry three to five buttons and are
     * meant to wrap; forcing them onto one line would truncate every label.
     * If a card is narrow enough that these labels still do not fit, they
     * ellipsise rather than wrap, which is the behaviour that was asked for. */
    @container (max-width: 380px) {
      .crow.temprow { flex-wrap: nowrap; gap: 6px; }
      .crow.temprow .cbtn { padding: 10px 9px; min-width: 0; }
      .crow.temprow .cbtn span {
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .crow.temprow .temp .tval { min-width: 46px; }
    }
    /* Phone: three steppers (driver, passenger, fan) share the row equally and
     * shrink to fit - the fan one used to be pushed off the right edge. */
    @container (max-width: 440px) {
      .crow.temprow { flex-wrap: nowrap; gap: 6px; }
      .crow.temprow .tcol { flex: 1 1 0; min-width: 0; }
      .crow.temprow .temp { width: 100%; box-sizing: border-box; }
      .crow.temprow .cstep { width: 26px; height: 38px; flex: none; }
      .crow.temprow .cstep svg { width: 14px; height: 14px; }
      .crow.temprow .temp .tval { min-width: 0; flex: 1; font-size: 14px; letter-spacing: -.02em; white-space: nowrap; }
    }
    /* Very narrow: driver and passenger share one line, the fan gets the next. */
    @container (max-width: 300px) {
      .crow.temprow { flex-wrap: wrap; }
      .crow.temprow .tcol { flex: 1 1 40%; }
      .crow.temprow .tcol:nth-child(3) { flex: 1 1 100%; }
      .crow.temprow .cstep { width: 34px; }
      .crow.temprow .temp .tval { font-size: 15px; }
    }
    /* Phone: the climate tab stays short - seat buttons two per row, the eight air-flow modes four per row,
     * the rear block as a two-column grid (temperature and fan on top, four switches below). */
    @container (max-width: 440px) {
      .crow.seats .cbtn { flex: 1 1 calc(50% - 4px); min-width: 0; padding: 9px 8px; gap: 5px; }
      .crow.seats .cbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .crow.flow { gap: 6px; }
      .crow.flow .cbtn { flex: 1 1 calc(25% - 6px); min-width: 0; justify-content: center; text-align: center;
        padding: 9px 2px; font-size: 11.5px; line-height: 1.15; }
    }
    /* The rear block: every control is one cell of a two-column grid, all the same shape and height. */
    .crow.rear { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .crow.rear .tcol { min-width: 0; display: flex; }
    .crow.rear .temp { width: 100%; box-sizing: border-box; min-height: 48px; }
    .crow.rear .temp .tval { flex: 1; min-width: 0; }
    .crow.rear .cstep { height: 44px; }
    .crow.rear .cbtn { min-width: 0; min-height: 48px; justify-content: center; padding: 10px 6px; }
    .crow.rear .cbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cpair { display:flex; align-items:center; gap:6px; padding:4px 6px 4px 12px;
             border:1px solid var(--divider-color, rgba(120,130,140,.25));
             border-radius:14px; font-size:12px; }
    .cpair svg { width:17px; height:17px; }
    .cpair.on {
      color:${ON_TEXT};
      border-color: color-mix(in srgb, ${ACCENT} 60%, transparent);
      background: color-mix(in srgb, ${ACCENT} 14%, transparent);
    }
    .ctime { display:flex; align-items:center; gap:7px; padding:0 6px 0 12px;
             border:1px solid var(--divider-color, rgba(120,130,140,.25));
             border-radius:14px; font-size:12px; color: var(--secondary-text-color); }
    .ctime input { border:none; background:none; color: var(--primary-text-color);
                   font: inherit; font-size:13px; font-variant-numeric: tabular-nums;
                   padding:9px 2px; min-height:38px; cursor:pointer; width:74px; }
    .ctime input:focus { outline:none; }
    .ctime input::-webkit-calendar-picker-indicator { filter: invert(.5); cursor:pointer; }
    .cmini { border:1px solid var(--divider-color, rgba(120,130,140,.3));
             background:none; color:var(--primary-text-color); font:inherit;
             font-size:11.5px; padding:8px 11px; min-height:34px; border-radius:10px;
             cursor:pointer; -webkit-tap-highlight-color: transparent; }
    .cmini:active { transform: scale(.95); }
    .cartop { display: block; width: 100%; }
    .cartop .paint { fill: var(--geely-car-paint, url(#tp)); stroke: rgba(0,0,0,.18); stroke-width: 1.5; }
    .cartop .glass { fill: url(#tg); }
    .cartop .tire { fill: #23272e; }
    .cartop .mirror { fill: #3a424d; }
    .cartop .seam { stroke: rgba(0,0,0,.22); stroke-width: 1.6; fill: none; }
    .cartop .headlight { fill: #eef4fa; stroke: rgba(0,0,0,.1); }
    .cartop .lightbar { fill: #d05252; opacity: .85; }
    .cartop .glow { fill: transparent; transition: fill .5s ease; }
    .cartop.charging .glow { fill: color-mix(in srgb, ${ACCENT} 30%, transparent); }
    .cartop.charging .portdot { fill: ${ACCENT}; filter: drop-shadow(0 0 4px ${ACCENT}); }
    .cartop .port { fill: rgba(0,0,0,.28); }
    .cartop .portdot { fill: rgba(255,255,255,.35); }
    .cartop .ind { fill: ${AMBER}; opacity: 0; }
    .cartop .ind.on { opacity: 1; animation: geely-blink 1.4s ease infinite; }
    .cartop .sunline { fill: rgba(255,255,255,.22); }
    .cartop .sunline.open { fill: ${AMBER}; }
    .cartop text { font-family: inherit; }
    .carwrap.cabinflat, .carwrap.cockpit { position: relative; max-width: 340px; margin: 8px auto 0; }
    .carwrap .flip { position: relative; }
    .cabimg { display: block; width: 100%; height: auto;
      -webkit-mask-image: radial-gradient(ellipse 78% 80% at 50% 50%, #000 58%, transparent 100%);
      mask-image: radial-gradient(ellipse 78% 80% at 50% 50%, #000 58%, transparent 100%); }
    .cabsvg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    .cabcap { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); padding: 3px 12px; border-radius: 999px;
      background: rgba(8,10,14,.62); color: #eef2f6; font-size: 13px; font-weight: 600; letter-spacing: .02em;
      font-variant-numeric: tabular-nums; backdrop-filter: blur(4px); white-space: nowrap; }
    .cabcap i { font-style: normal; font-weight: 500; opacity: .7; font-size: 11px; }
    .cb-stream { animation: cb-flow 1.8s linear infinite; }
    .cb-rise { animation: cb-flow 1.5s linear infinite; }
    .cb-rib { fill: none; stroke-linecap: round; stroke-dasharray: 55 45; stroke-dashoffset: 55; animation: cb-rib 2.4s cubic-bezier(.35,.1,.55,1) infinite; }
    @keyframes cb-rib { 0% { stroke-dashoffset: 55; } 100% { stroke-dashoffset: -100; } }
    .cb-puff { transform-box: fill-box; transform-origin: center; opacity: 0; animation: cb-puff 3s ease-out infinite; }
    @keyframes cb-puff { 0% { transform: translate(0,0) scale(.35); opacity: 0; } 20% { opacity: var(--o, .7); } 100% { transform: translate(var(--dx), var(--dy)) scale(var(--e, 1.8)); opacity: 0; } }
    @keyframes cb-flow { from { stroke-dashoffset: 56; } to { stroke-dashoffset: 0; } }
    .cb-pulse { animation: cb-pulse 2.6s ease-in-out infinite; }
    @keyframes cb-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    .cb-hue { animation: cb-hue 9s linear infinite; }
    @keyframes cb-hue { to { filter: hue-rotate(360deg); } }
    .cb-ring { transform-box: fill-box; transform-origin: center; animation: cb-ring 1.7s ease-out infinite; }
    @keyframes cb-ring { 0% { transform: scale(.2); opacity: .8; } 100% { transform: scale(1); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cb-stream, .cb-rise, .cb-puff, .cb-pulse, .cb-hue, .cb-ring, .cb-rib { animation: none; } .cb-puff { opacity: .45; } .cb-rib { stroke-dashoffset: 0; } }
    .carwrap.top { position: relative; }
    .carwrap.top canvas.car3d { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .carwrap.top svg.cartop { position: relative; }
    .cartop.no-tires .tv-val, .cartop.no-tires .tv-lab:not(.onbody):not(.onglass) { display: none; }
    .cartop.has3d .topimg, .cartop.has3d .tire, .cartop.has3d .glow, .cartop.has3d .lampsT { display: none; }
    .cartop.has3d .tv-lab.onbody, .cartop.has3d .tv-lab.onglass { fill: var(--secondary-text-color); }
    .cartop.has3d .tv-stat.onbody, .cartop.has3d .tv-stat.onglass { fill: var(--primary-text-color); }
    .cartop.has3d .tv-stat.open.onbody, .cartop.has3d .tv-stat.open.onglass { fill: ${AMBER}; }
    .cartop.has3d .tv-win.onglass { fill: var(--secondary-text-color); }
    .cartop.has3d text { paint-order: stroke; stroke: rgba(8,10,14,.65); stroke-width: 3.2px; stroke-linejoin: round; }
    .tv-val { font-size: 21px; font-weight: 600; fill: var(--primary-text-color);
              font-variant-numeric: tabular-nums; }
    .cartop [data-more] { cursor: pointer; }
    .tv-val.crit, .tv-lab.crit { fill: var(--tc, var(--geely-critical, #e5484d)); }
    .tv-lab { font-size: 12.5px; letter-spacing: .1em; fill: var(--secondary-text-color); }
    .tv-stat { font-size: 17px; font-weight: 700; fill: var(--primary-text-color); }
    .tv-lab.onbody { fill: #6b7280; }
    .tv-win { font-size: 12.5px; font-weight: 600; fill: var(--secondary-text-color); }
    .tv-win.open { fill: ${AMBER}; }
    .tv-stat.onbody { fill: #3a4149; }
    .tv-stat.open.onbody { fill: #b97a14; }
    .tv-stat.open { fill: ${AMBER}; font-weight: 600; animation: geely-blink 1.4s ease infinite; }
    .tv-lab.onglass { fill: rgba(255,255,255,.55); }
    .tv-stat.onglass { fill: rgba(255,255,255,.8); }
    .tv-stat.open.onglass { fill: ${AMBER}; }
  `;

  const NAV_APPS = {
    maps: {
      label: "Maps",
      url: (at, mode) => "https://www.google.com/maps/dir/?api=1&destination=" + at
        + (mode ? "&travelmode=" + mode : ""),
      locate: (at) => "https://www.google.com/maps/search/?api=1&query=" + at,
    },
    yandex: {
      // rtext=~lat,lon routes from the phone's own position (the empty start point) to the car;
      // pt=lon,lat drops a marker on it. rtt: auto | pd (walking) | mt (transit) | bc (bicycle).
      label: "Yandex Maps",
      url: (at, mode) => "https://yandex.ru/maps/?rtext=~" + at
        + (mode ? "&rtt=" + (mode === "walking" ? "pd" : mode === "transit" ? "mt"
          : mode === "bicycling" ? "bc" : "auto") : ""),
      locate: (at) => { const p = at.split(","); return "https://yandex.ru/maps/?pt=" + p[1] + "," + p[0] + "&z=17&l=map"; },
    },
    apple: {
      label: "Apple Maps",
      url: (at, mode) => "https://maps.apple.com/?daddr=" + at
        + (mode === "walking" ? "&dirflg=w"
          : mode === "transit" ? "&dirflg=r"
          : mode ? "&dirflg=d" : ""),
      locate: (at) => "https://maps.apple.com/place?coordinate=" + at,
    },
    osm: {
      // OpenStreetMap's own router: `route=;lat,lon` leaves the start empty (the page offers
      // "my location"). Engines: car, foot, bike; there is no public transit, so it falls back to car.
      label: "OpenStreetMap",
      url: (at, mode) => "https://www.openstreetmap.org/directions?engine="
        + (mode === "walking" ? "fossgis_osrm_foot" : mode === "bicycling" ? "fossgis_osrm_bike" : "fossgis_osrm_car")
        + "&route=%3B" + encodeURIComponent(at),
      locate: (at) => { const p = at.split(","); return "https://www.openstreetmap.org/?mlat=" + p[0] + "&mlon=" + p[1]
        + "#map=17/" + p[0] + "/" + p[1]; },
    },
    here: {
      // share.here.com opens the HERE WeGo app when it is installed and the web
      // map when it is not. `m=w` is its walking flag; `/l/` is a location
      // where `/r/` is a route.
      label: "HERE",
      url: (at, mode) => "https://share.here.com/r/" + at
        + (mode === "walking" ? "?m=w" : mode ? "?m=d" : ""),
      locate: (at) => "https://share.here.com/l/" + at,
    },
  };

  /* Unchanged for anyone who has not asked: two links, not four. */
  const DEFAULT_NAV = ["yandex", "maps"];

  /* Own keys only: `buttons: [constructor]` must not find Object's. */
  const IS_NAV = (k) => Object.prototype.hasOwnProperty.call(NAV_APPS, k);

  /* =====================================================================
   * MHA Bridge card - data layer and rendering for the mha_bridge integration.
   * Visual layer above (CSS, car drawing, icons) is reused from Geely
   * Connect, (c) 2026 Yossi Koncha, MIT - see LICENSE-geely-connect.
   * ===================================================================== */

  ICONS.ac = `<path d="M12 3.5v17M5 7.5l14 9M19 7.5l-14 9"/>
              <path d="M9.6 4.6 12 6.3l2.4-1.7M9.6 19.4 12 17.7l2.4 1.7"/>`;
  ICONS.auto = `<path d="M5 18 10.2 6h1.6L17 18"/><path d="M7.2 13.6h7.6"/><path d="M19.5 8v3M18 9.5h3"/>`;
  ICONS.recirc = `<path d="M5 12a7 7 0 0 1 11.6-5.2L19 9"/><path d="M19.2 4.8V9h-4.2"/>
                  <path d="M19 12a7 7 0 0 1-11.6 5.2L5 15"/><path d="M4.8 19.2V15H9"/>`;
  ICONS.fan = ICONS.climate;
  ICONS.engine = `<path d="M5 9h2.5l1.5-2h5l1.5 2H19v7h-2l-1.5 2h-7L7 16H5z"/><path d="M3 11.5v2.5M21 11v3"/>`;

  const DOMAIN_ID = "mha_bridge";
  const TANK_L = 60;
  const HOLD_MS = 800;
  const AMBIENT_HEX = { red: "#ff0000", orange: "#ff3e00", amber: "#ff8d00", honey: "#ffb40f", yellow: "#ffe71e",
    lime: "#ebff26", green: "#00ff2c", mint: "#00ffa4", turquoise: "#00feff", sky: "#00baff", blue: "#006aff",
    purple: "#7f4eff", pink: "#ff23db" };
  const TEMP_SETTLE_MS = 700;


  /* ------------------------------------------------------- car colour
   * The side view is a traced vector whose body shading lives in its fills. To
   * paint it another colour (`car_color`) the body fills - bluish, saturated
   * enough, mid-tone - are remapped in HSL (hue and saturation replaced,
   * lightness stretched towards the target) so the highlights and shadows
   * survive; glass, chrome, tyres and wheels are grey and are left alone. */
  const BASE_RGB = [83, 89, 105];
  const _toHsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, sat, l];
  };
  const _fromHsl = ([h, sat, l]) => {
    h = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    const f = (t) => {
      t = (t + 1) % 1;
      return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255));
  };
  const _hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  /* Any CSS colour -> [r, g, b], or null. A canvas does the parsing. */
  const parseColor = (value) => {
    if (!value) return null;
    try {
      const cx = document.createElement("canvas").getContext("2d");
      cx.fillStyle = "#010203";
      cx.fillStyle = String(value);
      let v = cx.fillStyle;
      if (v === "#010203" && !/^#0?1/i.test(String(value).trim())) return null;
      if (v[0] === "#") return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
      const m = v.match(/[\d.]+/g);
      return m && m.length >= 3 ? m.slice(0, 3).map((n) => Math.round(+n)) : null;
    } catch (err) { return null; }
  };
  const _BASE_HSL = _toHsl(BASE_RGB);
  const _isBody = ([h, sat, l], relaxed) => relaxed === 2
    ? sat >= 0.03 && h >= 170 && h <= 260 && l >= 0.08 && l <= 0.985   /* inside the hand-made paint outline */
    : relaxed    ? sat >= 0.05 && h >= 214 && h <= 250 && l >= 0.10 && l <= 0.985
    : sat >= 0.10 && h >= 214 && h <= 250 && l >= 0.12 && l <= 0.86;
  /* Chrome delete. The side picture has its chrome paths tagged by group
   * (z="f|b|d|r|w"). `chrome_delete` darkens any of the five groups:
   *   chrome_delete: true                      - all five, fully black
   *   chrome_delete: { doors: 1, windows: 0.6, rails: "body", front_bumper: "#202020", rear_bumper: false }
   * a number 0..1 = how far towards gloss black, a colour = repaint the chrome in
   * that colour keeping its shading, "body" = the car_color. */
  const CHROME_ZONES = { front_bumper: "f", rear_bumper: "b", doors: "d", rails: "r", windows: "w" };
  /* Wheel-arch trim (the flares round the wheels) is its own zone "a": arch_color is
   * "black" (default), "original" (the colours of the source photo, untouched by
   * car_color), "body" (follows car_color) or any colour. */
  const ARCH_BLACK = [20, 20, 20];
  const _archSpec = (cfg) => {
    const v = cfg && cfg.arch_color;
    if (v == null || v === "" || v === true) return ARCH_BLACK;
    const t = String(v).trim().toLowerCase();
    if (t === "body") return "body";
    if (t === "original" || t === "photo" || v === false) return "original";
    return parseColor(v) || ARCH_BLACK;
  };
  const _chromeSpec = (cfg) => {
    const out = _chromeDelete(cfg) || {};
    const a = _archSpec(cfg);
    if (a) out.a = a;
    return Object.keys(out).length ? out : null;
  };
  const _chromeDelete = (cfg) => {
    const v = cfg && cfg.chrome_delete;
    if (v == null || v === false) return null;
    const out = {};
    for (const [name, z] of Object.entries(CHROME_ZONES)) {
      let x = v === true ? 1 : typeof v === "object" ? v[name] : undefined;
      if (x == null || x === false || x === 0 || x === "off" || x === "") continue;
      if (x === true) x = 1;
      if (typeof x === "string" && /^\d*\.?\d+$/.test(x.trim())) x = Number(x);
      if (typeof x === "number") out[z] = Math.max(0, Math.min(1, x));
      else if (String(x).toLowerCase() === "body") out[z] = "body";
      else { const c = parseColor(x); if (c) out[z] = c; }
    }
    return Object.keys(out).length ? out : null;
  };
  /* wheels: type1 (the originals in the picture) .. type5. Returns the number 2..5 or 0. */
  const _wheelType = (cfg) => {
    const m = /^(?:type)?\s*(\d+)$/i.exec(String(cfg && cfg.wheels != null ? cfg.wheels : "").trim());
    const n = m ? Number(m[1]) : 0;
    return n >= 2 && n <= 5 ? n : 0;
  };
  const _svgKey = (url, rgb, chrome, wheels) =>
    url + "|" + (rgb ? rgb.join(",") : "-") + "|" + (chrome ? JSON.stringify(chrome) : "") + (wheels ? "|w" + wheels : "");
  const recolorSvg = (text, rgb, relaxed, chrome) => {
    const [ht, st, lt] = _toHsl(rgb || BASE_RGB), [, sb, lb] = _BASE_HSL;
    /* The side picture marks its paint paths itself (p="1", from a hand-made mask),
     * so glass, tyres, wheels and lamps can never be repainted. A picture without
     * marks (the top view) falls back to the colour test. */
    const marked = / p="1"/.test(text);
    return text.replace(/fill="#([0-9a-f]{6})"( z="([a-z])")?( p="1")?/gi, (m, hx, zz, z, pp) => {
      const c = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16)), hsl = _toHsl(c);
      const spec = chrome && z ? chrome[z] : undefined;
      if (spec !== undefined) {
        if (typeof spec === "number") {
          return `fill="${_hex(c.map((v) => Math.round(v * (1 - 0.9 * spec) + 10 * spec)))}"`;
        }
        const [th, ts, tl] = spec === "body" ? [ht, st, lt] : _toHsl(spec);
        const nl = Math.max(0, Math.min(1, tl + (hsl[2] - 0.6) * 0.35));
        return `fill="${_hex(_fromHsl([th, ts, nl]))}"`;
      }
      if (!rgb || (marked ? !pp : !_isBody(hsl, relaxed))) return `fill="#${hx}"`;
      const [, sat, l] = hsl;
      const ns = st === 0 ? 0 : Math.min(1, sat * (st / sb));
      const nl = lt >= lb ? l + (lt - lb) * Math.min(1, l / lb + 0.15) : l * (lt / lb);
      return `fill="${_hex(_fromHsl([ht, ns, Math.max(0, Math.min(1, nl))]))}"`;
    });
  };
  /* The side picture is one group of traced paths plus clip outlines drawn from
   * hand-made masks (cp = paint, cr / cw / cd / cf / cb = rails, window frames,
   * doors, front and rear bumper trim). The picture is painted three times:
   * as is, then recoloured inside the paint outline only, then the trim groups
   * on top, darkened as asked - so the trim is always above the paint and the
   * glass, tyres, wheels and lamps are never reached by car_color. */
  const _darkenSvg = (text, spec, rgb, onlyChrome) => {
    const [ht, st, lt] = _toHsl(rgb || BASE_RGB);
    return text.replace(/fill="#([0-9a-f]{6})"/gi, (m, hx) => {
      const c = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16));
      if (onlyChrome) {          /* bright, or grey, or not paint-coloured at all */
        const [h0, s0, l0] = _toHsl(c);
        if (!(l0 >= 0.55 || (l0 >= 0.35 && (s0 < 0.11 || h0 < 200 || h0 > 262)))) return m;
      }
      if (typeof spec === "number") {
        return `fill="${_hex(c.map((v) => Math.round(v * (1 - 0.9 * spec) + 10 * spec)))}"`;
      }
      const [th, ts, tl] = spec === "body" ? [ht, st, lt] : _toHsl(spec);
      const nl = Math.max(0, Math.min(1, tl + (_toHsl(c)[2] - 0.6) * 0.35));
      return `fill="${_hex(_fromHsl([th, ts, nl]))}"`;
    });
  };
  const composeSvg = (text, rgb, chrome, wheels) => {
    const a = text.indexOf('<g id="b">'), b = text.lastIndexOf("</g>");
    if (a < 0 || b < a) return recolorSvg(text, rgb, true, chrome);
    /* wheel designs sit in <defs> as <g id="wtN">; the chosen one is drawn over both rims */
    const wheel = wheels && text.includes(`id="wt${wheels}"`) ? `<use href="#wt${wheels}"/>` : "";
    const body = text.slice(a + 10, b);
    let out = text.slice(0, a) + "<g>" + body + "</g>";
    if (rgb) out += '<g clip-path="url(#cp)">' + recolorSvg(body, rgb, 2, null) + "</g>";
    if (chrome) {
      if (chrome.a !== undefined) {          /* wheel-arch trim: exact outline, under the other trim */
        out += '<g clip-path="url(#ca)">' + (chrome.a === "original" ? body : _darkenSvg(body, chrome.a, rgb)) + "</g>";
      }
      for (const z of Object.keys(chrome)) {
        if (z === "a") continue;
        /* the exact outline darkens everything under it; a margin around it only
         * takes the chrome-coloured paths, so the tips of a moulding cannot show */
        out += `<g clip-path="url(#x${z})">` + _darkenSvg(body, chrome[z], rgb, true) + "</g>"
          + `<g clip-path="url(#c${z})">` + _darkenSvg(body, chrome[z], rgb) + "</g>";
      }
    }
    out += text.slice(b + 4);
    return wheel ? out.replace(/<\/svg>\s*$/, wheel + "</svg>") : out;
  };

  /* Roof gradient of the top view, from the same colour. */
  const paintStops = (value) => {
    const rgb = parseColor(value) || BASE_RGB, [h, sat, l] = _toHsl(rgb);
    const mk = (dl, ds = 1) => _hex(_fromHsl([h, Math.min(1, sat * ds), Math.max(0.03, Math.min(0.92, l + dl))]));
    return { hi: mk(0.16, 0.9), mid: mk(0.05), lo: mk(-0.09) };
  };
  /* The flat top view is a render of the 3D model (car-top.webp) with a paint mask (car-top-mask.webp). Repainting uses the same lightness stretch as recolorSvg. */
  const _topPaint = new Map();
  const loadTopPaint = (url, rgb) => {
    const key = url + "|" + rgb.join(",");
    if (_topPaint.has(key)) return _topPaint.get(key);
    const img = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
    const job = Promise.all([img(url), img(url.replace(/car-top\.webp/, "car-top-mask.webp"))]).then(([a, m]) => {
      const w = a.naturalWidth, h = a.naturalHeight, mk = (i) => { const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(i, 0, 0, w, h); return [c, x, x.getImageData(0, 0, w, h)]; };
      const [ca, xa, da] = mk(a), [, , dm] = mk(m), p = da.data, q = dm.data;
      const [ht, st, lt] = _toHsl(rgb), [, sb, lb] = _BASE_HSL;
      for (let i = 0; i < p.length; i += 4) {
        const k = q[i] / 255; if (k < 0.02) continue;
        const [, sat, l] = _toHsl([p[i], p[i + 1], p[i + 2]]);
        const ns = st === 0 ? 0 : Math.min(1, sat * (st / sb));
        const nl = lt >= lb ? l + (lt - lb) * Math.min(1, l / lb + 0.15) : l * (lt / lb);
        const n = _fromHsl([ht, ns, Math.max(0, Math.min(1, nl))]);
        for (let j = 0; j < 3; j++) p[i + j] = Math.round(p[i + j] * (1 - k) + n[j] * k);
      }
      xa.putImageData(da, 0, 0);
      return new Promise((ok) => ca.toBlob((b) => ok(URL.createObjectURL(b)), "image/png"));
    });
    _topPaint.set(key, job); job.catch(() => _topPaint.delete(key));
    return job;
  };
  /* rim sprites of car-side.svg (wtN), plus a rotation-smeared copy for speed; cached per picture and design */
  const _wheelSprites = new Map();
  const loadWheelSprites = (url, type) => {
    const key = url + "|" + type;
    if (_wheelSprites.has(key)) return _wheelSprites.get(key);
    const job = fetch(url, { credentials: "omit" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => {
      const m = new RegExp(`<g id="wt${type}">([\\s\\S]*?)</g>`).exec(t);
      const sharp = m ? [...m[1].matchAll(/href="(data:[^"]+)"/g)].map((x) => x[1]) : [];
      if (sharp.length < 2) throw new Error("no sprites");
      return Promise.all(sharp.map((u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; }))).then((imgs) => {
        const smear = imgs.map((im) => {
          const n = 60, cv = document.createElement("canvas"); cv.width = cv.height = im.naturalWidth; const cx = cv.getContext("2d"), c = cv.width / 2;
          for (let k = 0; k < n; k++) { cx.globalAlpha = 1 / (k + 1); cx.save(); cx.translate(c, c); cx.rotate((k / n) * Math.PI * 2); cx.drawImage(im, -c, -c); cx.restore(); }
          return cv.toDataURL("image/png");
        });
        return { sharp, smear };
      });
    });
    _wheelSprites.set(key, job); job.catch(() => _wheelSprites.delete(key));
    return job;
  };
  const _svgCache = new Map();
  const loadCarSvg = (url, rgb, chrome, wheels) => {
    const key = _svgKey(url, rgb, chrome, wheels);
    if (_svgCache.has(key)) return _svgCache.get(key);
    const job = fetch(url, { credentials: "omit" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((t) => URL.createObjectURL(new Blob([composeSvg(t, rgb, chrome, wheels)], { type: "image/svg+xml" })));
    _svgCache.set(key, job);
    job.then((u) => _svgCache.set(key, u), () => _svgCache.delete(key));
    return job;
  };

  /* The car photo is served by the integration. Percentages are of the image box
   * (front of the car on the right), measured on car-side.svg. */
  /* Cars shipped with the integration are chosen by key (car_image: monjaro).
   * Anything else in car_image is taken as a path or URL of your own picture.
   * `facing` is the way the car looks in the shipped side picture; car_image_facing
   * (left | right) turns it the other way, hotspots included. */
  const CAR_LIBRARY = {
    /* ?v= changes whenever a picture does, so a copy cached by the browser is never reused */
    monjaro: { side: "/mha_bridge/car-side.svg?v=8", top: "/mha_bridge/car-top.webp?v=1", facing: "right" },
  };
  const CAR_DEFAULT = "monjaro";
  const CAR_SPOTS = {
    front: [57.6, 37.5], rear: [35.1, 37.5], hood: [83, 34], trunk: [11.5, 21],
    ground: [50, 100], headlight: [93, 45.5], taillight: [5, 38], port: [-60, -60],
  };

  /* key -> [domain, English entity-id suffix]. The suffix is only the fallback:
   * entities are normally found by platform + translation_key, which survives
   * a rename of the entity id. */
  const ENT = {
    connected: ["binary_sensor", "car_connection"], engine_running: ["binary_sensor", "engine_running"],
    door_fl: ["binary_sensor", "driver_door"], door_fr: ["binary_sensor", "front_passenger_door"],
    door_rl: ["binary_sensor", "rear_left_door"], door_rr: ["binary_sensor", "rear_right_door"],
    hood: ["binary_sensor", "hood"], trunk: ["binary_sensor", "trunk"],
    speed: ["sensor", "speed"], speed_ipk: ["sensor", "speed_instrument_cluster"],
    fuel_level: ["sensor", "fuel_level"], odometer: ["sensor", "odometer"], range: ["sensor", "range"],
    temp_outside: ["sensor", "outside_temperature"], temp_inside: ["sensor", "cabin_temperature"],
    rpm: ["sensor", "engine_speed"], ignition: ["sensor", "ignition"], gear: ["sensor", "gear"],
    belt_driver: ["sensor", "driver_seat_belt"], belt_passenger: ["sensor", "passenger_seat_belt"],
    tire_fl: ["sensor", "tire_front_left"], tire_fr: ["sensor", "tire_front_right"],
    tire_rl: ["sensor", "tire_rear_left"], tire_rr: ["sensor", "tire_rear_right"],
    temp_driver: ["number", "driver_temperature"], temp_passenger: ["number", "passenger_temperature"],
    fan_speed: ["select", "fan_speed"], blowing_mode: ["select", "airflow"], circulation: ["select", "air_source"],
    seat_heat_driver: ["select", "driver_seat_heating"], seat_heat_passenger: ["select", "passenger_seat_heating"],
    seat_vent_driver: ["select", "driver_seat_ventilation"], seat_vent_passenger: ["select", "passenger_seat_ventilation"],
    seat_heat_rear_left: ["select", "rear_left_seat_heating"], seat_heat_rear_right: ["select", "rear_right_seat_heating"],
    rear_blowing_mode: ["select", "rear_airflow"],
    rear_temperature: ["number", "rear_temperature"],
    steering_heat: ["select", "steering_wheel_heating"],
    ac: ["switch", "a_c"], climate_auto: ["switch", "climate_auto"],
    defrost_front: ["switch", "windshield_defrost"], defrost_rear: ["switch", "rear_window_defrost"],
    /* exist only if the car reports the function (see README) */
    win_fl: ["cover", "driver_window"], win_fr: ["cover", "front_passenger_window"],
    win_rl: ["cover", "rear_left_window"], win_rr: ["cover", "rear_right_window"],
    sunroof: ["cover", "sunroof"], sunshade: ["cover", "panoramic_sunshade"],
    sunroof_tilt: ["switch", "sunroof_tilt"], central_lock: ["binary_sensor", "central_lock"],
    rear_power: ["switch", "rear_climate"], rear_auto: ["switch", "rear_climate_auto"],
    climate_lock: ["switch", "rear_climate_panel_lock"], g_clean: ["switch", "air_cleaning_g_clean"],
    massage_driver: ["switch", "driver_massage"], massage_passenger: ["switch", "passenger_massage"],
    massage_level_driver: ["select", "driver_massage_intensity"],
    massage_level_passenger: ["select", "passenger_massage_intensity"],
    massage_program_driver: ["select", "driver_massage_program"],
    massage_program_passenger: ["select", "passenger_massage_program"],
    ambient_power: ["switch", "ambient_light"], ambient_brightness: ["number", "ambient_brightness"],
    ambient_mode: ["select", "ambient_mode"], ambient_effect: ["select", "ambient_effect"],
    ambient_color: ["select", "ambient_colour"],
  };
  const KEYS = Object.keys(ENT);

  const STR = {
    en: {
      "status.parked": "Parked", "status.driving": "Driving{speed}", "status.engine_on": "Parked · Engine on",
      "status.openings": "{count} opening{plural} open", "status.offline": "Car offline · last known data",
      "label.range": "Range", "label.inside": "inside", "label.out": "{temp}° out", "label.fuel": "{l} L",
      "act.auto": "Auto", "act.ac": "A/C", "act.defrost": "Windshield heat", "act.rear": "Rear window heat",
      "act.recirc": "Recirc", "act.gclean": "Air cleaning", "act.wheel": "Wheel heat", "act.maxheat": "Max heat", "act.maxcool": "Max cool",
      "tip.maxheat": "Sets both zones to the maximum temperature and switches Auto on",
      "tip.maxcool": "Sets both zones to the minimum temperature and switches A/C and Auto on",
      "section.map": "Map", "map.locate": "To the car", "map.fail": "The map could not be loaded", "section.navigate": "Navigate to the car", "section.locate": "Where the car is",
      "section.climate": "Climate", "label.driver": "Driver", "label.passenger": "Passenger",
      "label.fan": "Fan", "section.airflow": "Air flow", "section.seat_heating": "Heating: seats, steering wheel, glass",
      "section.seat_cooling": "Seat cooling", "section.driving": "Driving", "section.tires": "Tires",
      "section.vehicle": "Vehicle", "tooltip.cooler": "Cooler", "tooltip.warmer": "Warmer",
      "tooltip.less": "Slower", "tooltip.more": "Faster",
      "row.speed": "Speed", "row.speed_ipk": "Speed (cluster)", "row.rpm": "Engine speed", "row.gear": "Gear",
      "row.ignition": "Ignition", "row.engine": "Engine", "row.odometer": "Odometer", "row.fuel": "Fuel level",
      "row.range": "Range", "row.outside": "Outside", "row.cabin": "Cabin", "row.belts": "Seat belts",
      "val.running": "Running", "val.stopped": "Stopped", "val.buckled": "Buckled", "val.unbuckled": "Unbuckled",
      "label.synced": "Synced {time}", "label.maps": "Google Maps",
      "lvl.off": "Off", "lvl.1": "Low", "lvl.2": "Medium", "lvl.3": "High",
      "flow.face": "Face", "flow.leg": "Feet", "flow.face_leg": "Face+feet", "flow.window": "Screen",
      "flow.face_window": "Face+screen", "flow.leg_window": "Feet+screen", "flow.all": "All", "flow.auto": "Auto",
      "tire.fl": "Front L", "tire.fr": "Front R", "tire.rl": "Rear L", "tire.rr": "Rear R",
      "tire.short.fl": "FL", "tire.short.fr": "FR", "tire.short.rl": "RL", "tire.short.rr": "RR",
      "topview.open": "Open", "topview.closed": "Closed", "topview.unknown": "—",
      "topview.tilt": "Tilted", "topview.open_m": "Open", "topview.closed_m": "Closed", "topview.shade_open": "open", "topview.shade": "blind", "topview.win": "window", "topview.win_closed": "shut", "topview.win_open": "open", "topview.hood": "Hood", "topview.trunk": "Tailgate", "topview.sunroof": "Sunroof",
      "chip.engine_on": "Engine on", "chip.climate_on": "Climate on", "chip.n_open": "{count} open",
      "chip.low_fuel": "Low fuel", "chip.tire_low": "Tire pressure", "chip.critical_fuel": "Fuel almost out", "chip.driving": "Driving", "chip.parked": "Parked",
      "label.yandex": "Yandex Maps", "label.temp_in": "{temp}° in",
      "tooltip.open_the_full_card": "Open the full card",
      "section.windows": "Windows & roof", "section.rear": "Rear climate & air", "section.ambient": "Ambient light",
      "section.massage": "Massage",
      "win.fl": "Driver", "win.fr": "Passenger", "win.rl": "Rear left", "win.rr": "Rear right",
      "win.sunroof": "Sunroof", "win.sunshade": "Sunshade", "win.closed": "Closed", "win.open": "Open",
      "win.tilt": "Tilt", "win.vent": "Ventilation", "win.open_f": "Open", "win.shut": "Close", "win.full": "Open fully", "topview.vent": "Vent", "win.close_all": "Close all",
      "lock.locked": "Locked", "lock.unlocked": "Unlocked", "lock.unknown": "Lock unknown",
      "status.unlocked": "unlocked", "status.windows_open": "{count} window(s) open",
      "chip.unlocked": "Unlocked", "chip.windows_open": "Windows open",
      "confirm.open": "Open it? The car cannot be watched from here.",
      "rear.power": "Rear climate", "rear.auto": "Rear Auto", "rear.lock": "Panel lock", "rear.gclean": "Air cleaning",
      "rear.fan": "Rear fan", "rear.temp": "Rear temperature", "rear.temp_left": "Rear left", "rear.temp_right": "Rear right",
      "amb.power": "Light", "amb.brightness": "Brightness", "amb.mode": "Mode", "amb.effect": "Effect",
      "amb.colour": "Colour",
      "amb.mode.drive": "Drive", "amb.mode.custom": "Custom", "amb.mode.music": "Music", "amb.mode.weather": "Weather",
      "amb.effect.static": "Static", "amb.effect.gradient": "Gradient", "amb.effect.breathe": "Breathe",
      "col.red": "Red", "col.orange": "Orange", "col.amber": "Amber", "col.honey": "Honey", "col.yellow": "Yellow",
      "col.lime": "Lime", "col.green": "Green", "col.mint": "Mint", "col.turquoise": "Turquoise", "col.sky": "Sky",
      "col.blue": "Blue", "col.purple": "Purple", "col.pink": "Pink",
      "mas.level": "Intensity", "mas.program": "Program",
      "section.presets": "Presets", "preset.winter": "Winter", "preset.summer": "Summer", "preset.defog": "Defog", "preset.comfort": "Comfort", "preset.vent": "Ventilate", "preset.off": "All off", "toast.preset": "Preset applied: {name}",
      "tab.overview": "Overview", "tab.climate": "Climate", "tab.body": "Body", "tab.comfort": "Comfort", "tab.data": "Data",
      "section.doors": "Doors",
      "mas.p.1": "1", "mas.p.2": "2", "mas.p.3": "3", "mas.p.4": "4", "mas.p.5": "5", "mas.p.6": "6", "mas.p.7": "7", "mas.p.8": "8",
      "status.render_failed": "Render failed: {error}",
      "status.no_car": "No MHA Bridge entities found. Add the integration, or set <code>prefix:</code> "
        + "(e.g. <code>geely_monjaro</code> for <code>sensor.geely_monjaro_speed</code>).",
    },
    ru: {
      "status.parked": "Стоянка", "status.driving": "В движении{speed}", "status.engine_on": "Стоянка · двигатель работает",
      "status.openings": "Открыто: {count}", "status.offline": "Нет связи · последние данные",
      "label.range": "Запас хода", "label.inside": "в салоне", "label.out": "{temp}° снаружи", "label.fuel": "{l} л",
      "act.auto": "Авто", "act.ac": "A/C", "act.defrost": "Обогрев лобового", "act.rear": "Обогрев заднего",
      "act.recirc": "Рецирк.", "act.gclean": "Очистка", "act.wheel": "Обогрев руля", "act.maxheat": "Макс. тепло", "act.maxcool": "Макс. холод",
      "tip.maxheat": "Ставит максимальную температуру обеим зонам и включает Авто",
      "tip.maxcool": "Ставит минимальную температуру обеим зонам и включает A/C и Авто",
      "section.map": "Карта", "map.locate": "К машине", "map.fail": "Не удалось загрузить карту", "section.navigate": "Проложить маршрут к машине", "section.locate": "Где машина",
      "section.climate": "Климат", "label.driver": "Водитель", "label.passenger": "Пассажир",
      "label.fan": "Вентилятор", "section.airflow": "Потоки воздуха", "section.seat_heating": "Обогрев: сиденья, руль, стёкла",
      "section.seat_cooling": "Вентиляция сидений", "section.driving": "Движение", "section.tires": "Шины",
      "section.vehicle": "Автомобиль", "tooltip.cooler": "Холоднее", "tooltip.warmer": "Теплее",
      "tooltip.less": "Тише", "tooltip.more": "Сильнее",
      "row.speed": "Скорость", "row.speed_ipk": "Скорость (приборка)", "row.rpm": "Обороты", "row.gear": "Передача",
      "row.ignition": "Зажигание", "row.engine": "Двигатель", "row.odometer": "Пробег", "row.fuel": "Топливо",
      "row.range": "Запас хода", "row.outside": "Снаружи", "row.cabin": "В салоне", "row.belts": "Ремни",
      "val.running": "Работает", "val.stopped": "Заглушен", "val.buckled": "Пристёгнут", "val.unbuckled": "Не пристёгнут",
      "label.synced": "Обновлено {time}", "label.maps": "Google Карты",
      "lvl.off": "Выкл", "lvl.1": "Слабо", "lvl.2": "Средне", "lvl.3": "Сильно",
      "flow.face": "Лицо", "flow.leg": "Ноги", "flow.face_leg": "Лицо+ноги", "flow.window": "Стекло",
      "flow.face_window": "Лицо+стекло", "flow.leg_window": "Ноги+стекло", "flow.all": "Все", "flow.auto": "Авто",
      "tire.fl": "Перед. лев.", "tire.fr": "Перед. прав.", "tire.rl": "Зад. лев.", "tire.rr": "Зад. прав.",
      "tire.short.fl": "ПЛ", "tire.short.fr": "ПП", "tire.short.rl": "ЗЛ", "tire.short.rr": "ЗП",
      "topview.open": "Открыта", "topview.closed": "Закрыта", "topview.unknown": "—",
      "topview.tilt": "Наклон", "topview.open_m": "Открыт", "topview.closed_m": "Закрыт", "topview.shade_open": "откр.", "topview.shade": "шторка", "topview.win": "окно", "topview.win_closed": "закр.", "topview.win_open": "откр.", "topview.hood": "Капот", "topview.trunk": "Багажник", "topview.sunroof": "Люк",
      "chip.engine_on": "Двигатель работает", "chip.climate_on": "Климат включён", "chip.n_open": "Открыто: {count}",
      "chip.low_fuel": "Мало топлива", "chip.tire_low": "Давление в шинах", "chip.critical_fuel": "Топливо на исходе", "chip.driving": "В движении", "chip.parked": "Стоянка",
      "label.yandex": "Яндекс Карты", "label.temp_in": "{temp}° в салоне",
      "tooltip.open_the_full_card": "Открыть полную карточку",
      "section.windows": "Окна и люк", "section.rear": "Задний климат и воздух", "section.ambient": "Атмосферная подсветка",
      "section.massage": "Массаж",
      "win.fl": "Водитель", "win.fr": "Пассажир", "win.rl": "Задн. левое", "win.rr": "Задн. правое",
      "win.sunroof": "Люк", "win.sunshade": "Шторка", "win.closed": "Закрыто", "win.open": "Открыто",
      "win.tilt": "Наклон", "win.vent": "Проветривание", "win.open_f": "Открыта", "win.shut": "Закрыть", "win.full": "Открыть полностью", "topview.vent": "Проветр.", "win.close_all": "Закрыть всё",
      "lock.locked": "Заперта", "lock.unlocked": "Не заперта", "lock.unknown": "Замок: нет данных",
      "status.unlocked": "не заперта", "status.windows_open": "открыто окон: {count}",
      "chip.unlocked": "Не заперта", "chip.windows_open": "Окна открыты",
      "confirm.open": "Открыть? Из дома за машиной не уследить.",
      "rear.power": "Задний климат", "rear.auto": "Задний Авто", "rear.lock": "Блок. панели", "rear.gclean": "Очистка воздуха",
      "rear.fan": "Задний вентилятор", "rear.temp": "Температура сзади", "rear.temp_left": "Сзади слева", "rear.temp_right": "Сзади справа",
      "amb.power": "Подсветка", "amb.brightness": "Яркость", "amb.mode": "Режим", "amb.effect": "Эффект",
      "amb.colour": "Цвет",
      "amb.mode.drive": "Драйв", "amb.mode.custom": "Свой цвет", "amb.mode.music": "Музыка", "amb.mode.weather": "Погода",
      "amb.effect.static": "Статика", "amb.effect.gradient": "Градиент", "amb.effect.breathe": "Дыхание",
      "col.red": "Красный", "col.orange": "Оранжевый", "col.amber": "Янтарный", "col.honey": "Медовый", "col.yellow": "Жёлтый",
      "col.lime": "Лаймовый", "col.green": "Зелёный", "col.mint": "Мятный", "col.turquoise": "Бирюзовый", "col.sky": "Небесный",
      "col.blue": "Синий", "col.purple": "Фиолетовый", "col.pink": "Розовый",
      "mas.level": "Интенсивность", "mas.program": "Программа",
      "section.presets": "Пресеты", "preset.winter": "Зима", "preset.summer": "Лето", "preset.defog": "Запотело", "preset.comfort": "Комфорт", "preset.vent": "Проветрить", "preset.off": "Всё выкл", "toast.preset": "Пресет применён: {name}",
      "tab.overview": "Обзор", "tab.climate": "Климат", "tab.body": "Кузов", "tab.comfort": "Комфорт", "tab.data": "Данные",
      "section.doors": "Двери",
      "status.render_failed": "Ошибка отрисовки: {error}",
      "status.no_car": "Сущности MHA Bridge не найдены. Добавьте интеграцию или укажите <code>prefix:</code> "
        + "(например, <code>geely_monjaro</code> для <code>sensor.geely_monjaro_speed</code>).",
    },
  };

  const CARD_CSS = `
    .head { display:flex; align-items:baseline; justify-content:space-between; }
    .title { font-size:14px; font-weight:600; letter-spacing:.02em; display:flex; align-items:center; gap:8px; }
    .dot { width:6px; height:6px; border-radius:50%; background:${ACCENT}; }
    .dot.off { background:${AMBER}; }
    .status { font-size:12px; color: var(--secondary-text-color); margin-top:3px; }
    .status.warn { color:${AMBER}; }
    .hero { display:flex; align-items:flex-end; gap:16px; margin:14px 0 6px; }
    .hero .n { font-size:62px; }
    .hero .u { font-size:15px; color: var(--secondary-text-color); margin-left:4px; }
    .hero .side { margin-left:auto; text-align:right; }
    .hero .side .num { font-size:26px; }
    .hero .side .u2 { font-size:11px; color: var(--secondary-text-color); }
    .carwrap { margin:10px auto 0; max-width:470px; }
    .actions { display:grid; grid-template-columns:repeat(4, 1fr); }
    .actions.pre { grid-template-columns:repeat(3, 1fr); }
    .act ha-icon { --mdc-icon-size:21px; width:21px; height:21px; display:block; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:2px 26px; }
    .row { display:flex; justify-content:space-between; align-items:baseline; gap:8px;
           font-size:12.5px; padding:5px 0; color: var(--secondary-text-color); }
    .row.clk { cursor:pointer; padding:5px 6px; margin:0 -6px; border-radius:8px; }
    .mapbox { position:relative; margin-top:8px; border-radius:14px; overflow:hidden; background:rgba(120,130,140,.1);
              border:1px solid var(--divider-color, rgba(120,130,140,.25)); isolation:isolate; min-height:120px; }
    slot[name=map]::slotted(.mapcard) { display:block; width:100%; height:100%;
      --ha-card-border-radius:0px; --ha-card-border-width:0px; --ha-card-box-shadow:none; --ha-card-background:transparent; }
    .maplocate { position:absolute; top:10px; right:10px; z-index:900; width:34px; height:34px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
      background:var(--card-background-color, #fff); color:var(--primary-text-color); box-shadow:0 1px 5px rgba(0,0,0,.45); padding:0; }
    .maplocate:hover { color:${ACCENT}; }
    .mapbox.fill { margin-top:0; min-height:0; height:auto; flex:1 1 0; }
    .mapbox.fill slot[name=map]::slotted(.mapcard) { position:absolute; inset:0; height:auto; }
    slot[name=map]::slotted(.mapfail) { display:flex; align-items:center; justify-content:center; height:100%; font-size:12px; color:var(--secondary-text-color); text-decoration:none; }
    .row.clk:hover, .tires .t.clk:hover { background: rgba(120,130,140,.14); }
    .tires .t.clk { cursor:pointer; }
    .row.clk:focus-visible, .tires .t.clk:focus-visible { outline:2px solid ${ACCENT}; outline-offset:1px; }
    .row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .row b { font-weight:500; color: var(--primary-text-color);
             font-variant-numeric: tabular-nums; white-space:nowrap; }
    @container (max-width: 380px) {
      .grid { grid-template-columns:minmax(0,1fr); }
      .row b { overflow:hidden; text-overflow:ellipsis; }
    }
    .row.accent b { color:${ACCENT}; }
    .row.warn b { color:${AMBER}; }
    .tires { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; text-align:center; }
    .tires .t { border:1px solid var(--divider-color, rgba(120,130,140,.2));
                border-radius:12px; padding:8px 4px 6px; }
    .tires .t.crit { border-color: color-mix(in srgb, var(--tc, var(--geely-critical, #e5484d)) 70%, transparent);
                     background: color-mix(in srgb, var(--tc, var(--geely-critical, #e5484d)) 12%, transparent); }
    .tires .t.crit b, .tires .t.crit i { color: var(--tc, var(--geely-critical, #e5484d)); font-weight:600; }
    .tires .t b { font-size:15px; font-weight:400; font-variant-numeric:tabular-nums; }
    .tires .t i { font-style:normal; font-size:9px; color:var(--secondary-text-color); margin-left:2px; }
    .tires .t .micro { margin-top:3px; font-size:8.5px; justify-content:center; text-align:center;
                       letter-spacing:.05em; white-space:nowrap; }
    @container (max-width: 380px) { .tires .t .micro { font-size:7.5px; letter-spacing:.02em; } }
    .sec { margin-top:2px; }
    .footer { display:flex; justify-content:space-between; margin-top:10px; }
    .footer .micro { letter-spacing:.1em; }
    .tcol .micro { margin:0 0 5px 2px; }
    .temp.fan .tval { min-width:40px; }
    .offline { margin:10px 0 0; }
    /* ---- windows, rear climate, ambient light, massage ---- */
    .closeall { display:flex !important; flex-direction:row !important; text-transform:none !important; align-items:center; justify-content:center; gap:8px; width:100%; margin-top:8px; padding:11px 14px;
      min-height:44px; border-radius:14px; font:inherit; font-size:14px; font-weight:700; letter-spacing:.02em; cursor:pointer;
      color: var(--primary-text-color); background: color-mix(in srgb, ${ACCENT} 10%, transparent);
      border:1.5px solid color-mix(in srgb, ${ACCENT} 55%, transparent); }
    .closeall svg { width:18px; height:18px; }
    .closeall span { font-size:14px !important; font-weight:700; color:inherit !important; letter-spacing:.02em; text-transform:none !important; }
    .closeall.act { background: color-mix(in srgb, ${ACCENT} 22%, transparent); border-color:${ACCENT}; color:${ACCENT}; }
    .closeall:active { transform: scale(.985); }
    /* Windows laid out like the seats: rear-left under the driver, rear-right under the passenger. Two columns, or three when there
     * is room (never four): the sunroof and the blind then stand in the third column, otherwise they go in a row below. */
    .opn-wrap { container-type:inline-size; margin-top:8px; }
    .opn-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
    .opn-grid .o-win_fl { grid-area:1/1; } .opn-grid .o-win_fr { grid-area:1/2; }
    .opn-grid .o-win_rl { grid-area:2/1; } .opn-grid .o-win_rr { grid-area:2/2; }
    .opn-grid.k2 .o-sunroof { grid-area:3/1; } .opn-grid.k2 .o-sunshade { grid-area:3/2; }
    .opn-grid.k1 .o-sunroof, .opn-grid.k1 .o-sunshade { grid-area:3/1/4/3; }
    @container (min-width: 540px) {
      .opn-grid.k1, .opn-grid.k2 { grid-template-columns:repeat(3, minmax(0,1fr)); }
      .opn-grid.k2 .o-sunroof { grid-area:1/3; } .opn-grid.k2 .o-sunshade { grid-area:2/3; }
      .opn-grid.k1 .o-sunroof, .opn-grid.k1 .o-sunshade { grid-area:1/3/3/4; }
    }
    @container (max-width: 339px) {
      .opn-grid { grid-template-columns:minmax(0,1fr); }
      .opn-grid .opn { grid-area:auto !important; }
    }
    .opn { display:flex; flex-direction:column; justify-content:space-between; border:1px solid var(--divider-color, rgba(120,130,140,.25)); border-radius:14px; padding:9px 10px; }
    .opn.open { border-color: color-mix(in srgb, ${ACCENT} 50%, transparent);
                background: color-mix(in srgb, ${ACCENT} 8%, transparent); }
    .opn-h { display:flex; flex-wrap:wrap; align-items:center; gap:2px 7px; font-size:12px; }
    .opn-h svg { width:16px; height:16px; opacity:.85; }
    .opn-h span { flex:1 1 auto; white-space:nowrap; }
    .opn-h b { margin-left:auto; font-weight:700; font-variant-numeric: tabular-nums; white-space:nowrap; }
    .opn-b { display:flex; gap:4px; margin-top:8px; }
    .opn-b .cbtn svg { width:17px; height:17px; }
    .opn-b .cbtn { flex:1; justify-content:center; padding:7px 0; min-height:34px; font-size:11px; border-radius:11px; }
    .lockchip { display:inline-flex; align-items:center; gap:5px; margin-left:8px; padding:2px 8px;
                border-radius:99px; font-size:11px; font-weight:600; vertical-align:middle;
                border:1px solid var(--divider-color, rgba(120,130,140,.25)); }
    .lockchip svg { width:12px; height:12px; }
    .lockchip.ok { color:${ON_TEXT}; border-color: color-mix(in srgb, ${ACCENT} 55%, transparent); }
    .lockchip.bad { color:${AMBER}; border-color: color-mix(in srgb, ${AMBER} 60%, transparent); }
    .swatches { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .swc { width:28px; height:28px; border-radius:50%; border:2px solid transparent; cursor:pointer; padding:0;
           background: var(--c); box-shadow: 0 0 0 1px rgba(120,130,140,.35) inset; }
    .swc.sel { border-color: var(--primary-text-color); transform: scale(1.12); }
    .swc:disabled, .swc.blocked { opacity:.45; }
    .mrow { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:8px; }
    .mrow > p { min-width:72px; font-size:12px; }

  `;

  /* ---------------------------------------------------------- demo mode -- */
  /* `demo: true`: the card ignores the real entities and runs on a built-in model of the car.
   * Every control works - it changes the model and the card redraws at once - so you can try
   * every key and every preset without the car. The model is shared by all cards on the page
   * and starts afresh on a page reload. */
  const DEMO = (() => {
    const P = "geely_monjaro", now = () => new Date().toISOString();
    const TK = {car_connection:"connected",engine_running:"engine_running",driver_door:"door_fl",front_passenger_door:"door_fr",rear_left_door:"door_rl",rear_right_door:"door_rr",
 speed:"speed",speed_instrument_cluster:"speed_ipk",fuel_level:"fuel_level",odometer:"odometer",range:"range",outside_temperature:"temp_outside",cabin_temperature:"temp_inside",
 engine_speed:"rpm",ignition:"ignition",gear:"gear",driver_seat_belt:"belt_driver",passenger_seat_belt:"belt_passenger",tire_front_left:"tire_fl",tire_front_right:"tire_fr",
 tire_rear_left:"tire_rl",tire_rear_right:"tire_rr",driver_temperature:"temp_driver",passenger_temperature:"temp_passenger",fan_speed:"fan_speed",airflow:"blowing_mode",air_source:"circulation",
 driver_seat_heating:"seat_heat_driver",passenger_seat_heating:"seat_heat_passenger",driver_seat_ventilation:"seat_vent_driver",passenger_seat_ventilation:"seat_vent_passenger",
 hood:"hood",trunk:"trunk",steering_wheel_heating:"steering_heat",rear_temperature:"rear_temperature",rear_airflow:"rear_blowing_mode",rear_left_seat_heating:"seat_heat_rear_left",rear_right_seat_heating:"seat_heat_rear_right",driver_window:"win_fl",front_passenger_window:"win_fr",rear_left_window:"win_rl",rear_right_window:"win_rr",sunroof:"sunroof",panoramic_sunshade:"sunshade",sunroof_tilt:"sunroof_tilt",central_lock:"central_lock",rear_climate:"rear_power",rear_climate_auto:"rear_auto",rear_climate_panel_lock:"climate_lock",air_cleaning_g_clean:"g_clean",driver_massage:"massage_driver",passenger_massage:"massage_passenger",driver_massage_intensity:"massage_level_driver",passenger_massage_intensity:"massage_level_passenger",driver_massage_program:"massage_program_driver",passenger_massage_program:"massage_program_passenger",ambient_light:"ambient_power",ambient_brightness:"ambient_brightness",ambient_mode:"ambient_mode",ambient_effect:"ambient_effect",ambient_colour:"ambient_color",a_c:"ac",climate_auto:"climate_auto",windshield_defrost:"defrost_front",rear_window_defrost:"defrost_rear"};
    const store = { states: null, entities: null, subs: new Set(), timers: {} };
    const build = () => {
      const st = {};
      const S = (id, state, attrs = {}) => { st[id] = { entity_id: id, state: String(state), attributes: attrs, last_updated: now(), last_changed: now() }; };
      const lv = ["off", "1", "2", "3"], nums = ["off", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      const T = { min: 15.5, max: 28.5, step: 0.5, unit_of_measurement: "°C" };
      S(`binary_sensor.${P}_car_connection`, "on", { device_class: "connectivity" });
      S(`binary_sensor.${P}_engine_running`, "on");
      S(`binary_sensor.${P}_driver_door`, "off"); S(`binary_sensor.${P}_front_passenger_door`, "off");
      S(`binary_sensor.${P}_rear_left_door`, "off"); S(`binary_sensor.${P}_rear_right_door`, "off");
      S(`binary_sensor.${P}_hood`, "off", { device_class: "door" }); S(`binary_sensor.${P}_trunk`, "off", { device_class: "door" });
      S(`binary_sensor.${P}_central_lock`, "on", { device_class: "lock" });
      S(`sensor.${P}_speed`, "0", { unit_of_measurement: "km/h" }); S(`sensor.${P}_speed_instrument_cluster`, "0", { unit_of_measurement: "km/h" });
      S(`sensor.${P}_fuel_level`, "56.8", { unit_of_measurement: "L" }); S(`sensor.${P}_odometer`, "19394", { unit_of_measurement: "km" });
      S(`sensor.${P}_range`, "558", { unit_of_measurement: "km" });
      S(`sensor.${P}_outside_temperature`, "9", { unit_of_measurement: "°C" }); S(`sensor.${P}_cabin_temperature`, "13.2", { unit_of_measurement: "°C" });
      S(`sensor.${P}_engine_speed`, "995", { unit_of_measurement: "rpm" });
      S(`sensor.${P}_ignition`, "on"); S(`sensor.${P}_gear`, "p");
      S(`sensor.${P}_driver_seat_belt`, "buckled"); S(`sensor.${P}_passenger_seat_belt`, "unbuckled");
      S(`sensor.${P}_tire_front_left`, "2.05", { unit_of_measurement: "bar" }); S(`sensor.${P}_tire_front_right`, "2.09", { unit_of_measurement: "bar" });
      S(`sensor.${P}_tire_rear_left`, "2.00", { unit_of_measurement: "bar" }); S(`sensor.${P}_tire_rear_right`, "2.05", { unit_of_measurement: "bar" });
      S(`number.${P}_driver_temperature`, "20", T); S(`number.${P}_passenger_temperature`, "21.5", T); S(`number.${P}_rear_temperature`, "22", T);
      S(`select.${P}_airflow`, "face_leg", { options: ["face", "leg", "face_leg", "window", "face_window", "leg_window", "all", "auto", "off"] });
      S(`select.${P}_rear_airflow`, "face", { options: ["face", "leg", "face_leg"] });
      S(`select.${P}_fan_speed`, "3", { options: nums });
      S(`select.${P}_air_source`, "outside", { options: ["outside", "inside"] });
      for (const [n, v] of [["driver_seat_heating", "3"], ["passenger_seat_heating", "off"], ["rear_left_seat_heating", "off"], ["rear_right_seat_heating", "off"],
        ["driver_seat_ventilation", "off"], ["passenger_seat_ventilation", "2"], ["steering_wheel_heating", "1"]]) S(`select.${P}_${n}`, v, { options: lv });
      for (const n of ["a_c", "climate_auto", "rear_climate", "rear_climate_auto", "rear_climate_panel_lock", "air_cleaning_g_clean", "windshield_defrost", "rear_window_defrost", "sunroof_tilt", "ambient_light", "driver_massage", "passenger_massage"])
        S(`switch.${P}_${n}`, ["a_c", "climate_auto", "rear_climate", "air_cleaning_g_clean", "ambient_light", "driver_massage"].includes(n) ? "on" : "off");
      const cv = (k, pos, dc) => S(`cover.${P}_${k}`, pos > 0 ? "open" : "closed", { current_position: pos, device_class: dc || "window" });
      cv("driver_window", 0); cv("front_passenger_window", 40); cv("rear_left_window", 0); cv("rear_right_window", 0); cv("sunroof", 0); cv("panoramic_sunshade", 100, "shade");
      S(`number.${P}_ambient_brightness`, "60", { min: 0, max: 100, step: 5 });
      S(`select.${P}_ambient_mode`, "custom", { options: ["drive", "custom", "music", "weather"] });
      S(`select.${P}_ambient_effect`, "static", { options: ["static", "gradient", "breathe"] });
      S(`select.${P}_ambient_colour`, "blue", { options: ["red", "orange", "amber", "honey", "yellow", "lime", "green", "mint", "turquoise", "sky", "blue", "purple", "pink"] });
      for (const w of ["driver", "passenger"]) {
        S(`select.${P}_${w}_massage_intensity`, w === "driver" ? "2" : "1", { options: ["1", "2", "3"] });
        S(`select.${P}_${w}_massage_program`, w === "driver" ? "4" : "1", { options: ["1", "2", "3", "4", "5", "6", "7", "8"] });
      }
      S(`device_tracker.${P}`, "not_home", { latitude: 55.7558, longitude: 37.6173 });
      const en = {};
      for (const id in st) { const o = id.split(".")[1].slice(P.length + 1); if (TK[o]) en[id] = { entity_id: id, platform: "mha_bridge", translation_key: TK[o], device_id: "dev1" }; }
      store.states = st; store.entities = en;
    };
    const notify = () => { clearTimeout(store.nt); store.nt = setTimeout(() => store.subs.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }), 0); };
    const put = (id, state, attrs) => {
      const o = store.states[id]; if (!o) return;
      store.states = { ...store.states, [id]: { ...o, state: String(state), attributes: { ...o.attributes, ...(attrs || {}) }, last_updated: now() } };
    };
    const move = (id, target) => {
      clearTimeout(store.timers[id]);
      const step = () => {
        const o = store.states[id]; if (!o) return;
        const cur = Number(o.attributes.current_position) || 0;
        const nxt = cur < target ? Math.min(target, cur + 10) : Math.max(target, cur - 10);
        put(id, nxt > 0 ? "open" : "closed", { current_position: nxt }); notify();
        if (nxt !== target) store.timers[id] = setTimeout(step, 180);
      };
      step();
    };
    const call = (domain, service, data, target) => {
      const d = data || {};
      const ids = [].concat((target && target.entity_id) || d.entity_id || []);
      ids.forEach((id) => {
        const o = store.states[id]; if (!o) return;
        if (domain === "switch" || domain === "input_boolean") {
          const on = service === "toggle" ? o.state !== "on" : service === "turn_on";
          put(id, on ? "on" : "off");
        } else if (domain === "select" && service === "select_option") {
          const opts = o.attributes.options; if (!opts || opts.includes(String(d.option))) put(id, d.option);
        } else if (domain === "number" && service === "set_value") {
          const a = o.attributes; let v = Number(d.value);
          if (Number.isFinite(v)) { if (a.min != null) v = Math.max(a.min, v); if (a.max != null) v = Math.min(a.max, v); put(id, v); }
        } else if (domain === "cover") {
          if (service === "open_cover") move(id, 100);
          else if (service === "close_cover") move(id, 0);
          else if (service === "set_cover_position") move(id, Math.max(0, Math.min(100, Number(d.position) || 0)));
          else if (service === "stop_cover") clearTimeout(store.timers[id]);
        }
      });
      notify();
      return Promise.resolve();
    };
    return {
      hass(real) {
        if (!store.states) build();
        const r = real || {};
        const language = r.language || (r.locale && r.locale.language) || "en";
        const loc = (r.locale && r.locale.language) || language;
        return {
          states: store.states, entities: store.entities, devices: { dev1: { name: "Geely Monjaro" } },
          language, locale: r.locale || { language },
          callService: call,
          formatEntityState: (s) => {
            const u = s.attributes.unit_of_measurement, n = Number(s.state);
            if (u && Number.isFinite(n)) return n.toLocaleString(loc, { maximumFractionDigits: 2 }) + " " + u;
            if (s.entity_id.includes("_gear")) return String(s.state).toUpperCase();
            return s.state;
          },
          __demo: true,
        };
      },
      sub(f) { store.subs.add(f); },
      unsub(f) { store.subs.delete(f); },
    };
  })();

  /* ------------------------------------------- theme colour and text size -- */
  /* `accent` takes a name from this list or any CSS colour ("#ff8a3d", "rgb(...)", "hsl(...)"). */
  const ACCENTS = {
    green: "#2fd6a4", mint: "#3ee0b4", blue: "#3aa0ff", sky: "#4cc3ff", cyan: "#22d3ee", violet: "#9b7bff", purple: "#b36bff",
    pink: "#ff6bb5", red: "#ff5a5f", orange: "#ff8a3d", amber: "#f5b13d", yellow: "#f2d33c", lime: "#a3e635", white: "#e8edf2",
  };
  /* `text_size`: the size of the text, by kind of element. Every key is optional. A value up to 4 is a multiplier (1.2 = 20 % bigger),
   * a bigger number, "14px" or "14" is an exact size in px, "120%" is a multiplier. `all` scales every kind that has no key of its own. */
  const TEXT_KINDS = [
    ["title", ".title"],
    ["status", ".status, .driving span"],
    ["big", ".hero .n, .mid .n"],
    ["side", ".hero .side .num"],
    ["unit", ".hero .u, .hero .u2, .mid .u"],
    ["heading", ".micro"],
    ["button", ".act span, .closeall span, .cbtn, .cbtn span, .cbtn b"],
    ["chip", ".chip"],
    ["tab", ".tab"],
    ["row", ".row, .opn-h"],
    ["stepper", ".tval"],
    ["window", ".opn-b .cbtn, .opn-b .cbtn span"],
    ["tire", ".tires .t b, .tires .t i, .tires .t .micro"],
    ["caption", ".cabcap, .cabcap i"],
    ["label3d", ".tv-val, .tv-lab, .tv-stat, .tv-win"],
  ];
  const TEXT_KIND_KEYS = TEXT_KINDS.map((k) => k[0]);
  const parseSize = (v) => {
    if (v == null || v === "" || v === false) return null;
    const s = String(v).trim().toLowerCase(); let n = parseFloat(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (s.endsWith("%")) return { m: Math.max(0.4, Math.min(4, n / 100)) };
    if (!s.endsWith("px") && n <= 4) return { m: Math.max(0.4, n) };
    return { px: Math.max(5, Math.min(120, n)) };
  };

  /* The card picker uses getStubConfig for the preview and for the config of the card it adds. With the car's
   * entities present the stub is empty (real data); without them the card runs on the built-in demo model, so the
   * preview is never empty (switch `demo` off in the editor once the integration is set up). */
  const hasCar = (hass) => {
    try {
      const st = (hass && hass.states) || {};
      return Object.keys(st).some((id) => id.startsWith("binary_sensor.") && id.endsWith("_car_connection"));
    } catch (e) { return false; }
  };
  class MhaCard extends HTMLElement {
    static getStubConfig(hass) { return hasCar(hass) ? {} : { demo: true }; }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._hass = null;
      this._sig = "";
      this._idmap = null;
      this._idmapFor = null;
      this._pending = {};
      this._timers = {};
      this._holdUntil = 0;
    }

    getCardSize() { return 9; }

    // Sections view: full width by default, never narrower than half.
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    setConfig(config) {
      this._config = config || {};
      if (this._expandDialog) { try { this._expandDialog.close(); } catch (e) { /* not open */ } this._expandDialog.remove(); this._expandDialog = null; this._expandCard = null; }   /* rebuilt with the new config on the next tap */
      this._sig = "";
      this._idmap = null;
      /* Theme colours: `accent` (the main, green by default), `warn_color` (amber), `critical_color` (red). */
      const clr = (v) => { v = String(v == null ? "" : v).trim(); v = ACCENTS[v.toLowerCase()] || v; return v && window.CSS && CSS.supports("color", v) ? v : ""; };
      [["--geely-accent", this._config.accent], ["--geely-warn", this._config.warn_color], ["--geely-critical", this._config.critical_color]]
        .forEach(([n, v]) => { const x = clr(v); if (x) this.style.setProperty(n, x); else this.style.removeProperty(n); });
      /* `zoom`: overall size of the card (0.5 .. 2; 1 = normal). The panel card applies it to its own automatic fit instead. */
      const zm = Number(this._config.zoom);
      this.style.zoom = !this._isPanel && zm >= 0.5 && zm <= 2 && zm !== 1 ? String(zm) : "";
      if (this._config.demo) this.hass = this._realHass || {};
      else if (this._hass) this._safeRender();
    }

    set hass(hass) {
      if (this._config && this._config.demo) {
        this._realHass = hass;
        hass = DEMO.hass(hass);
        if (!this._demoSub) { this._demoSub = () => { this.hass = this._realHass; }; DEMO.sub(this._demoSub); }
      } else if (this._demoSub) { DEMO.unsub(this._demoSub); this._demoSub = null; }
      this._hass = hass;
      if (this._spinEls && this._spinEls.length) this._spinKick();
      if (this._mapEl) { try { this._mapEl.hass = hass; } catch (e) { /* map not ready */ } this._mapOverlay(); }
      if (this._expandCard && this._expandDialog && this._expandDialog.open) this._expandCard.hass = hass;
      try {
        const sig = this._signature();
        if (sig === this._sig) return;
        this._sig = sig;
      } catch (err) { this._sig = "error"; }
      this._safeRender();
    }

    connectedCallback() {
      if (this._config && this._config.demo && !this._demoSub) this.hass = this._realHass || {};
      if (this._sig && this.shadowRoot && this.shadowRoot.querySelector("svg.cartop")) {
        try { this._mount3d(); } catch (err) { this._c3dFail = true; }
      }
    }

    disconnectedCallback() {
      if (this._demoSub) { DEMO.unsub(this._demoSub); this._demoSub = null; }
      if (this._c3d) { this._c3d.dispose(); this._c3d = null; }
      this._spinStop();
      Object.values(this._timers).forEach(clearTimeout);
      this._timers = {};
      if (this._expandDialog) {
        try { this._expandDialog.close(); } catch (e) { /* not open */ }
        this._expandDialog.remove();
        this._expandDialog = null;
        this._expandCard = null;
      }
    }

    /* Applies `text_size` after every render: reads the size each element has, then sets the new one (the rules of the card keep working at any width). */
    _applyText() {
      let ts = this._config.text_size;
      if (ts == null || ts === false) return;
      if (typeof ts !== "object") ts = { all: ts };
      const all = parseSize(ts.all), root = this.shadowRoot;
      if (!root) return;
      const todo = new Map();
      TEXT_KINDS.forEach(([kind, sel]) => {
        const spec = parseSize(ts[kind]) || (all && all.m ? all : null);
        if (!spec) return;
        root.querySelectorAll(sel).forEach((el) => todo.set(el, spec));
      });
      const rows = [];
      todo.forEach((spec, el) => { rows.push([el, spec, spec.px ? 0 : parseFloat(getComputedStyle(el).fontSize) || 0]); });
      rows.forEach(([el, spec, base]) => {
        const px = spec.px || base * spec.m;
        if (px > 0) el.style.setProperty("font-size", Math.round(px * 100) / 100 + "px", "important");
      });
    }

    _safeRender() {
      try { this._mapSave(); this._render(); try { this._mountMap(); } catch (e) { /* the map is optional */ } try { this._applyText(); } catch (e) { /* the text size is cosmetic */ } }
      catch (err) {
        this.shadowRoot.innerHTML = `<style>${BASE_CSS}</style><div class="shell"><p class="micro">MHA Bridge</p>
          <p style="margin-top:8px;font-size:12px">${esc(this._t("status.render_failed", "", { error: err && err.message }))}</p></div>`;
      }
    }

    /* ---------------------------------------------------------- language */
    _lang() {
      const h = this._hass || {};
      const l = String((h.locale && h.locale.language) || h.language || "en").toLowerCase();
      return l.startsWith("ru") ? "ru" : "en";
    }
    _t(key, fallback, subs) {
      let out = (STR[this._lang()] || STR.en)[key];
      if (out == null) out = STR.en[key];
      if (out == null) out = fallback || key;
      if (subs) for (const k in subs) out = out.split(`{${k}}`).join(subs[k]);
      return out;
    }

    /* ------------------------------------------------- entity resolution */
    _prefix() {
      if (this._config.prefix) return this._config.prefix;
      const ids = Object.keys(this._hass.states);
      const hit = ids.find((id) => id.startsWith("binary_sensor.") && id.endsWith("_car_connection"));
      return hit ? hit.slice("binary_sensor.".length, -"_car_connection".length) : null;
    }

    _eid(key) {
      const ents = this._hass.entities;
      if (!this._config.prefix && ents && this._idmapFor !== ents) {
        this._idmapFor = ents;
        const map = {};
        for (const id in ents) {
          const e = ents[id];
          if (e && e.platform === DOMAIN_ID && e.translation_key) map[e.translation_key] = id;
        }
        this._idmap = map;
      }
      if (!this._config.prefix && this._idmap && this._idmap[key]) return this._idmap[key];
      const pre = this._prefix();
      const [dom, suffix] = ENT[key];
      return pre ? `${dom}.${pre}_${suffix}` : null;
    }

    _st(key) {
      const id = this._eid(key);
      return id ? this._hass.states[id] : undefined;
    }

    _found() { return KEYS.some((k) => this._st(k)); }

    _signature() {
      return KEYS.map((k) => {
        const st = this._st(k);
        if (!st) return "-";
        const a = st.attributes || {};
        return `${st.state}~${a.min}~${a.max}~${a.step}~${a.current_position}`;
      }).join("|") + `|${JSON.stringify(this._pending)}|${this._lang()}|${this._holdUntil > Date.now() ? "h" : ""}`
        + `|${this._trackerSig()}`;
    }

    _trackerSig() {
      const st = this._hass.states[this._config.tracker || "device_tracker.geely_monjaro"];
      const a = (st && st.attributes) || {};
      return `${st ? st.state : "-"}~${a.latitude}~${a.longitude}`;
    }

    /* ------------------------------------------------------------ helpers */
    _fmt(st) {
      const h = this._hass;
      if (h && typeof h.formatEntityState === "function") {
        try { const out = h.formatEntityState(st); if (out) return out; } catch (e) { /* raw below */ }
      }
      return `${st.state}${UNIT(st) ? " " + UNIT(st) : ""}`;
    }

    /* Number with a fixed number of decimals in the viewer's language, unit appended. */
    _num(st, decimals) {
      if (!OK(st)) return "—";
      const v = NUM(st);
      if (v == null) return this._fmt(st);
      const txt = v.toLocaleString(this._lang() === "ru" ? "ru-RU" : "en-US",
        { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      return UNIT(st) ? `${txt} ${UNIT(st)}` : txt;
    }

    /* A value that opens Home Assistant's own history dialog (more-info). Switched
     * off with `more_info: false`. */
    _moreAttr(entityId) {
      if (this._config.more_info === false || !entityId) return "";
      return ` data-more="${esc(entityId)}" role="button" tabindex="0"`;
    }

    _row(label, st, opts = {}) {
      if (!st && opts.value == null) return "";
      const value = opts.value != null ? opts.value : OK(st) ? (opts.dec != null ? this._num(st, opts.dec) : this._fmt(st)) : "—";
      const more = this._moreAttr(opts.more || (st && st.entity_id));
      return `<div class="row ${opts.accent ? "accent" : ""} ${opts.warn ? "warn" : ""}${more ? " clk" : ""}"${more}>
          <span>${esc(label)}</span><b>${esc(value)}</b></div>`;
    }

    _hidden(name) {
      const hide = this._config.hide;
      return Array.isArray(hide) && hide.some((h) => String(h).toLowerCase() === name);
    }

    _online() {
      const st = this._st("connected");
      return !st || st.state === "on";
    }

    _title() {
      if (this._config.name) return this._config.name;
      const st = this._st("connected") || this._st("speed");
      const reg = st && this._hass.entities && this._hass.entities[st.entity_id];
      const dev = reg && this._hass.devices && this._hass.devices[reg.device_id];
      return (dev && (dev.name_by_user || dev.name)) || "Geely Monjaro";
    }

    _carAt() {
      const st = this._hass.states[this._config.tracker || "device_tracker.geely_monjaro"];
      const a = (st && st.attributes) || {};
      const lat = Number(a.latitude), lon = Number(a.longitude);
      if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return "";
      return `${lat.toFixed(6)},${lon.toFixed(6)}`;
    }

    /* ---- map: the stock Home Assistant map card, built into this card's own look (`map: true` or { entity, zoom, aspect_ratio, theme_mode, hours_to_show, height, tab }) ---- */
    _mapCfg() {
      const m = this._config.map;
      if (!m || m.enabled === false || m.show === false) return null;
      const o = typeof m === "object" ? m : {};
      const entity = o.entity || this._config.tracker || "device_tracker.geely_monjaro";
      const z = Number(o.zoom != null ? o.zoom : o.default_zoom);
      const ar = String(o.aspect_ratio || "16:10").replace(/\s/g, ""), p = ar.split(/[:/]/).map(Number);
      const ratio = p.length === 2 && p[0] > 0 && p[1] > 0 ? p : [16, 10];
      const th = ["auto", "light", "dark"].includes(o.theme_mode) ? o.theme_mode : "auto";
      /* a colour typed without "#" (ffffff, 2fd6a4) is a hex colour; anything the browser cannot parse is ignored */
      const trailRaw = o.trail_color ? String(o.trail_color).trim() : "";
      const trailColor = /^[0-9a-f]{3,4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(trailRaw) ? "#" + trailRaw : window.CSS && CSS.supports("color", trailRaw) ? trailRaw : "";
      /* the stock map draws a trail only for hours_to_show > 0: a trail colour or width without the hours means "show the trail" (24 h) */
      const hrsSet = o.hours_to_show != null && o.hours_to_show !== "";
      const hrs = hrsSet ? Number(o.hours_to_show) : (trailColor || Number(o.trail_width) > 0) ? 24 : 0;
      const px = Number(o.height);
      const list = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
      const mk = o.marker == null ? "" : String(o.marker).trim(), ms = Number(o.marker_size);
      const num = (v, a, b) => { const n = Number(v); return isFinite(n) && v !== "" && v != null && n >= a && n <= b ? n : 0; };
      const center = ["follow", "fixed"].includes(String(o.center)) ? String(o.center) : "auto";
      return { entity, zoom: z >= 1 && z <= 22 ? z : 15, ratio, theme: th, hours: hrs > 0 ? hrs : 0, px: px > 0 ? px : 0, tab: String(o.tab || "overview"), fill: !!this._mapFill,
        title: o.title == null ? null : String(o.title),
        label: ["name", "state", "attribute", "icon"].includes(String(o.label)) ? String(o.label) : "", labelAttr: o.label_attribute ? String(o.label_attribute) : "", labelUnit: o.label_unit ? String(o.label_unit) : "",
        extra: list(o.entities).filter((e) => e && (typeof e === "string" || e.entity)),
        geo: list(o.geo_location_sources).map(String), autoFit: !!o.auto_fit, fitZones: !!o.fit_zones,
        marker: /^(default|icon|stock)$/i.test(mk) ? "" : mk || "car", markerSize: ms >= 16 && ms <= 160 ? ms : 56, rotate: o.marker_rotate !== false, heading: o.marker_heading ? String(o.marker_heading) : "",
        caption: list(o.caption).map((x) => String(x).toLowerCase()), addrEntity: o.address_entity ? String(o.address_entity) : "",
        trailColor, trailWidth: num(o.trail_width, 1, 12), center, locate: !!o.locate_button };
    }

    _mapHead(c) { return c.title === "" ? "" : `<p class="micro csub">${icon("nav")} ${esc(c.title != null ? c.title : this._t("section.map"))}</p>`; }
    _mapBlock(tab) {
      const c = this._mapCfg();
      if (!c || c.tab !== tab || !this._hass || !this._hass.states[c.entity]) return "";
      const st = c.px ? `height:${c.px}px` : `aspect-ratio:${c.ratio[0]} / ${c.ratio[1]}`;
      return `<hr class="hairline">${this._mapHead(c)}<div class="mapbox" style="${st}"><slot name="map"></slot></div>`;
    }

    _mapSave() {
      try {
        const el = this._mapEl, hm = el && el.isConnected && el.shadowRoot && el.shadowRoot.querySelector("ha-map");
        const lm = hm && hm.leafletMap;
        if (lm && lm.getZoom) this._mapZoom = lm.getZoom();
      } catch (e) { /* the map is optional */ }
    }

    _mountMap() {
      const slot = this.shadowRoot.querySelector(".mapbox"), c = this._mapCfg();
      if (!c) { this._mapDrop(); return; }
      if (!slot) { this._mapShown = false; return; }
      const sig = JSON.stringify([c.entity, c.zoom, c.ratio, c.theme, c.hours, c.px, c.fill, c.label, c.labelAttr, c.labelUnit, c.extra, c.geo, c.autoFit, c.fitZones, c.center === "fixed"]);
      if (this._mapEl && this._mapSig === sig) { this._mapPlace(slot); return; }
      this._mapDrop(); this._mapSig = sig; this._mapZoom = null;
      const car = { entity: c.entity };
      if (c.label) car.label_mode = c.label; if (c.label === "attribute") { if (c.labelAttr) car.attribute = c.labelAttr; if (c.labelUnit) car.unit = c.labelUnit; }
      if (c.center === "fixed") car.focus = false;
      const conf = { type: "map", entities: [car, ...c.extra], default_zoom: c.zoom, theme_mode: c.theme,
        aspect_ratio: c.px || c.fill ? undefined : `${c.ratio[0]}:${c.ratio[1]}` };
      if (c.geo.length) conf.geo_location_sources = c.geo;
      if (c.autoFit) conf.auto_fit = true;
      if (c.fitZones) conf.fit_zones = true;
      if (c.hours) conf.hours_to_show = c.hours;
      const mine = sig, done = (el) => {
        if (this._mapSig !== mine) return;
        this._mapDrop(); el.classList.add("mapcard"); this._mapEl = el;
        try { el.hass = this._hass; } catch (e) { /* not ready */ }
        const sl = this.shadowRoot.querySelector(".mapbox"); if (sl) this._mapPlace(sl);
      };
      const make = (window.loadCardHelpers ? window.loadCardHelpers().then((h) => h.createCardElement(conf)) : Promise.resolve().then(() => {
        const el = document.createElement("hui-map-card"); el.setConfig(conf); return el; }));
      make.then(done).catch(() => {
        const a = document.createElement("a"); a.className = "mapfail";
        a.textContent = this._t("map.fail"); a.href = "#"; a.addEventListener("click", (e) => e.preventDefault()); done(a);
      });
    }

    /* "To the car" button over the map (map.locate_button) */
    _mapLocate(slot) {
      const c = this._mapCfg(); let b = slot.querySelector(".maplocate");
      if (!c || !c.locate) { if (b) b.remove(); return; }
      if (b) return;
      b = document.createElement("button"); b.type = "button"; b.className = "maplocate"; b.title = this._t("map.locate");
      b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>`;
      b.addEventListener("click", (ev) => { ev.stopPropagation(); this._mapGoCar(true); });
      slot.appendChild(b);
    }
    _mapGoCar(animate) {
      try {
        const c = this._mapCfg(), el = this._mapEl, hm = el && el.shadowRoot && el.shadowRoot.querySelector("ha-map"), lm = hm && hm.leafletMap;
        const at = c && this._hass && this._hass.states[c.entity] && this._hass.states[c.entity].attributes;
        if (!lm || !at || at.latitude == null) return;
        lm.setView([Number(at.latitude), Number(at.longitude)], lm.getZoom() || c.zoom, { animate: !!animate });
      } catch (e) { /* the map is optional */ }
    }

    /* Our own layer over the stock map: a custom car marker with a caption (speed, state, address), the follow / fixed
     * centre modes, the colour of the trail. The stock map keeps drawing its entities; we only add and restyle. */
    _mapOverlay() {
      try {
        const c = this._mapCfg(), el = this._mapEl;
        if (!c || !el || !el.isConnected) return;
        const hm = el.shadowRoot && el.shadowRoot.querySelector("ha-map"), lm = hm && hm.leafletMap, L = hm && hm.Leaflet;
        if (!lm || !L) return;
        const ov = this._ov && this._ov.lm === lm ? this._ov : (this._ov = { lm, init: false, marker: null, last: "", obs: null, painted: null, paintKey: "" });
        const st = this._hass && this._hass.states[c.entity], at = (st && st.attributes) || {};
        const lat = Number(at.latitude), lon = Number(at.longitude), ok = at.latitude != null && at.longitude != null && isFinite(lat) && isFinite(lon);
        /* restyle on every redraw of the stock map (it rebuilds its markers and trail whenever the data changes) */
        const restyle = () => {
          try {
            const root = hm.shadowRoot; if (!root) return;
            if (c.marker) root.querySelectorAll("ha-entity-marker").forEach((m) => { if (m.entityId === c.entity) { const h = m.closest(".leaflet-marker-icon") || m.parentElement; if (h) h.style.display = "none"; } });
            if (c.trailColor || c.trailWidth) {
              /* The stock map draws the trail as small circle markers (the dots, interactive) joined by separate polylines (not
               * interactive, so no "leaflet-interactive" class): both are styled through the Leaflet layers of ha-map. The dots shrink
               * to the width of the line (they keep the tooltips). The layers are replaced on every redraw, so style each array once. */
              const layers = Array.isArray(hm._mapPaths) ? hm._mapPaths : null, w = c.trailWidth || 3;
              if (layers && L.CircleMarker) {
                const pk = (c.trailColor || "") + "|" + w;
                if (layers.length && (ov.painted !== layers || ov.paintKey !== pk)) {
                  ov.painted = layers; ov.paintKey = pk;
                  layers.forEach((l) => {
                    try {
                      if (l instanceof L.CircleMarker) {
                        const st = { weight: 1, fillOpacity: 1 }; if (c.trailColor) { st.color = c.trailColor; st.fillColor = c.trailColor; }
                        l.setStyle(st); l.setRadius(Math.max(1, w / 2));
                      } else if (l.setStyle) {
                        const st = { weight: w, lineCap: "round", lineJoin: "round" }; if (c.trailColor) st.color = c.trailColor;
                        l.setStyle(st);
                      }
                    } catch (e) { /* cosmetic */ }
                  });
                }
              } else root.querySelectorAll("path.leaflet-interactive, .leaflet-overlay-pane path[fill=none]").forEach((pa) => {
                const line = pa.getAttribute("fill") === "none";
                if (c.trailColor) { pa.setAttribute("stroke", c.trailColor); if (!line) pa.setAttribute("fill", c.trailColor); }
                if (c.trailWidth && line) pa.setAttribute("stroke-width", String(c.trailWidth));
              });
            }
          } catch (e) { /* cosmetic */ }
        };
        if (!ov.obs && hm.shadowRoot && (c.marker || c.trailColor || c.trailWidth)) { ov.obs = new MutationObserver(restyle); ov.obs.observe(hm.shadowRoot, { childList: true, subtree: true }); }
        restyle();
        if (ok && c.marker) {
          const s = c.markerSize, isCar = c.marker.toLowerCase() === "car", rgb = parseColor(this._config.car_color);
          let car = c.marker;
          if (isCar) {
            const cf = this._config, k = String(cf.car_image_top || (CAR_LIBRARY[String(cf.car_image || "").toLowerCase()] ? cf.car_image : CAR_DEFAULT));
            car = CAR_LIBRARY[k.toLowerCase()] ? CAR_LIBRARY[k.toLowerCase()].top : k;
            /* the little car wears the colour of the car in the card (the same paint mask as the flat top view) */
            if (rgb && /car-top\.webp/.test(car)) {
              const key = car + "|" + rgb.join(","), cache = this._mkPaint || (this._mkPaint = {});
              if (cache[key]) car = cache[key];
              else if (cache[key] === undefined) { cache[key] = null; loadTopPaint(car, rgb).then((u) => { cache[key] = u; this._mapOverlay(); }).catch(() => {}); }
            }
          }
          const w = isCar ? Math.round(s * 0.49) : s;
          let deg = 0;
          if (c.rotate) { for (const k of (c.heading ? [c.heading] : ["heading", "course", "bearing", "direction"])) { const v = Number(at[k]); if (at[k] != null && isFinite(v)) { deg = v; break; } } }
          const fmt = (id) => { const x = this._hass.states[id]; return x ? (this._hass.formatEntityState ? this._hass.formatEntityState(x) : x.state + (x.attributes.unit_of_measurement ? " " + x.attributes.unit_of_measurement : "")) : ""; };
          const parts = c.caption.map((k) => {
            if (k === "speed") { const x = this._st("speed"); return OK(x) ? this._fmt(x) : ""; }
            if (k === "state") return st ? fmt(c.entity) : "";
            if (k === "name") return at.friendly_name || "";
            if (k === "address") { if (c.addrEntity && this._hass.states[c.addrEntity]) return this._hass.states[c.addrEntity].state; return at.address || at.location || at.formatted_address || ""; }
            return "";
          }).filter((x) => x && x !== "unknown" && x !== "unavailable");
          const cap = parts.length ? `<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;white-space:nowrap;padding:2px 9px;border-radius:10px;font:600 12px/1.35 sans-serif;color:#fff;background:rgba(20,24,28,.85);pointer-events:none">${esc(parts.join(" · "))}</div>` : "";
          const html = `<div style="position:relative;width:${w}px;height:${s}px;cursor:pointer"><img src="${esc(car)}" alt="" style="width:100%;height:100%;object-fit:contain;transform:rotate(${deg}deg);filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))">${cap}</div>`;
          const icon = L.divIcon({ className: "mha-mk", html, iconSize: [w, s], iconAnchor: [w / 2, s / 2] });
          if (!ov.marker) {
            ov.marker = L.marker([lat, lon], { icon, zIndexOffset: 1000, keyboard: false }).addTo(lm);
            ov.marker.on("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: c.entity }, bubbles: true, composed: true })));
          } else { ov.marker.setLatLng([lat, lon]); ov.marker.setIcon(icon); }
        } else if (ov.marker) { ov.marker.remove(); ov.marker = null; }
        if (ok) {
          const key = lat + "," + lon;
          if (!ov.init) { ov.init = true; ov.last = key; if (c.center !== "auto") lm.setView([lat, lon], c.zoom, { animate: false }); }
          else if (c.center === "follow" && key !== ov.last) { ov.last = key; lm.panTo([lat, lon], { animate: true }); }
        }
      } catch (e) { /* the overlay is optional */ }
    }

    /* ha-map draws its markers only when its entities change. After the element has been moved (every re-render of
     * the card) or was built in a hidden box, Leaflet is rebuilt but the markers are not: give ha-map a fresh entity
     * list and the real size a few times while it settles, so the car marker is always there. */
    _mapPoke() {
      const el = this._mapEl; if (!el) return;
      [0, 250, 800, 2000, 4500].forEach((ms) => setTimeout(() => {
        try {
          if (!el.isConnected) return;
          const hm = el.shadowRoot && el.shadowRoot.querySelector("ha-map"); if (!hm) return;
          if (hm.leafletMap && hm.leafletMap.invalidateSize) hm.leafletMap.invalidateSize();
          const has = hm.shadowRoot && hm.shadowRoot.querySelector(".leaflet-marker-icon, ha-entity-marker");
          if (!has && Array.isArray(hm.entities) && hm.entities.length) hm.entities = hm.entities.slice();
          this._mapOverlay();
        } catch (e) { /* the map is optional */ }
      }, ms));
    }

    /* a map built while its box was hidden (the expanded dialog) has zero size and shows no marker:
     * once visible, tell Leaflet the real size and centre it on the car */
    _mapRefresh() {
      try {
        const c = this._mapCfg(), el = this._mapEl, hm = el && el.shadowRoot && el.shadowRoot.querySelector("ha-map"), lm = hm && hm.leafletMap;
        if (!lm) return;
        lm.invalidateSize();
        const st = c && this._hass && this._hass.states[c.entity], at = st && st.attributes;
        if (at && at.latitude != null && at.longitude != null) lm.setView([Number(at.latitude), Number(at.longitude)], this._mapZoom || c.zoom, { animate: false });
      } catch (e) { /* the map is optional */ }
    }

    _mapDrop() {
      try { Array.from(this.children).forEach((n) => { if (n.slot === "map") n.remove(); }); } catch (e) { /* nothing to drop */ }
      this._mapEl = null; this._mapShown = false; this._ov = null;
    }

    _mapPlace(slot) {
      const el = this._mapEl;
      if (!el) return;
      /* The map element lives in the light DOM of the card (slot="map"): a render replaces the whole shadow tree, and a map that is
       * moved or rebuilt loses its tiles (it flashes white while the car drives and the card renders every second). */
      if (el.parentNode !== this) { el.slot = "map"; this.appendChild(el); this._mapShown = false; }
      if (!this._mapShown) { this._mapShown = true; this._mapPoke(); }
      this._mapLocate(slot);
      this._mapOverlay();
      try { el.hass = this._hass; } catch (e) { /* not ready */ }
      const z = this._mapZoom;
      if (z) {
        let n = 0;
        const t = setInterval(() => {
          try {
            const hm = el.shadowRoot && el.shadowRoot.querySelector("ha-map"), lm = hm && hm.leafletMap;
            if (lm && lm.setZoom) { clearInterval(t); if (lm.getZoom() !== z) lm.setZoom(z, { animate: false }); return; }
          } catch (e) { clearInterval(t); return; }
          if (++n > 20) clearInterval(t);
        }, 150);
      }
    }

    _navRow() {
      const at = this._carAt();
      if (!at) return "";
      const want = Array.isArray(this._config.nav) ? this._config.nav : DEFAULT_NAV;
      const chosen = want.map((k) => String(k).toLowerCase()).filter(IS_NAV);
      if (!chosen.length) return "";
      const locate = String(this._config.nav_mode || "").toLowerCase() === "locate";
      const heading = locate ? this._t("section.locate") : this._t("section.navigate");
      const link = (k) => {
        const app = NAV_APPS[k];
        const label = k === "maps" ? this._t("label.maps", app.label)
          : k === "yandex" ? this._t("label.yandex", app.label) : app.label;
        const href = locate ? app.locate(at) : app.url(at, this._config.nav_travel ? String(this._config.nav_travel).toLowerCase() : "");
        return `<a class="cbtn nav" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${icon("nav")}<span>${esc(label)}</span></a>`;
      };
      return `<p class="micro csub" style="margin-top:12px">${icon("nav")} ${esc(heading)}</p>
        <div class="crow wrap">${chosen.map(link).join("")}</div>`;
    }

    /* ------------------------------------------------------- car picture */
    /* The engine is running: the head and tail lamps glow (`headlights: false` turns it off). */
    _lightsOn() { return this._config.headlights !== false && this._isOn("engine_running") && !!this._st("engine_running"); }

    _carBody(open) {
      const cfg = this._config, key = String(cfg.car_image || CAR_DEFAULT);
      if (key.toLowerCase() === "drawing") return CAR_SVG(this._lightsOn() ? "lights" : "", open);
      const built = CAR_LIBRARY[key.toLowerCase()];
      let img = built ? built.side : key;
      const look = this._look(false);
      if (built && look && /\.svg(\?|$)/i.test(img)) {
        const hit = _svgCache.get(_svgKey(img, look.rgb, look.chrome, look.wheels));
        if (typeof hit === "string") img = hit;
      }
      const lit = this._lightsOn(), lamps = { head: lit, tail: lit };
      if (!built) {          /* your own picture: facing and hotspots as configured */
        return CAR_PHOTO("", open, { car_image: img, car_image_facing: cfg.car_image_facing,
          car_image_hotspots: cfg.car_image_hotspots }, lamps);
      }
      const want = String(cfg.car_image_facing || "").toLowerCase();
      const flip = (want === "left" || want === "right") && want !== built.facing;
      const spots = {};
      for (const k in CAR_SPOTS) {
        const [x, y] = CAR_SPOTS[k];
        spots[k] = [flip && x >= 0 && x <= 100 ? Math.round((100 - x) * 10) / 10 : x, y];
      }
      return CAR_PHOTO("", open, { car_image: img, car_image_facing: "right", car_image_flip: flip, lampfx: key.toLowerCase() === "monjaro",
        spin: key.toLowerCase() === "monjaro" && cfg.wheel_spin && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? built.side : "",
        car_image_hotspots: Object.assign(spots, cfg.car_image_hotspots || {}) }, lamps);
    }

    /* An unreachable image must fail quietly rather than leaving markers over a broken glyph. */
    /* car_color / chrome_delete as one look; the top view has no chrome groups. */
    _look(top) {
      const rgb = parseColor(this._config.car_color), chrome = top ? null : _chromeSpec(this._config);
      const wheels = top ? 0 : _wheelType(this._config);
      return rgb || chrome || wheels ? { rgb, chrome, wheels } : null;
    }

    /* ---- wheel_spin: the rims of the side view turn at the speed of the car ----
     * The rim sprites sit in car-side.svg (<g id="wtN">, front then rear). They are laid over the picture and turned from a
     * requestAnimationFrame loop (the angle lives on the card, so a re-render does not make the wheel jump). A 20" wheel rolls
     * about 2.29 m per turn; the spokes cannot be followed by the eye above ~1.5 turns a second, so they melt into a smear. */
    _wheelKmh() {
      const c = this._config, id = c.wheel_spin_entity;
      const st = id ? this._hass && this._hass.states[id] : this._st("speed_ipk") || this._st("speed");
      if (!OK(st) || NUM(st) == null) return 0;
      let v = Math.abs(NUM(st));
      if (/mph|mi\/h/i.test(UNIT(st))) v *= 1.609344;
      else if (/m\/s/i.test(UNIT(st))) v *= 3.6;
      return v;
    }
    _wirePhotoSpin() {
      const host = this.shadowRoot && this.shadowRoot.querySelector(".photo .wspin");
      if (!host) { this._spinStop(); return; }
      const url = host.dataset.spin, want = Math.max(1, _wheelType(this._config) || 1);
      loadWheelSprites(url, want).then((sp) => {
        if (!sp || !host.isConnected) return;
        const R = 67.5, W = 1100, H = 399, pos = [[885.5, 303.5], [223.5, 302.5]];
        host.innerHTML = pos.map(([x, y], k) => `<i style="left:${((x - R) / W * 100).toFixed(3)}%;top:${((y - R) / H * 100).toFixed(3)}%;width:${(2 * R / W * 100).toFixed(3)}%">`
          + `<img class="ws-smear" src="${sp.smear[k]}" alt=""><img class="ws-sharp" src="${sp.sharp[k]}" alt=""></i>`).join("");
        this._spinEls = [...host.querySelectorAll("i")].map((i) => ({ sharp: i.querySelector(".ws-sharp"), smear: i.querySelector(".ws-smear") }));
        this._spinApply();
        this._spinKick();
      }).catch(() => {});
    }
    _spinApply() {
      const a = this._spin ? this._spin.a : 0, rps = this._spin ? this._spin.rps : 0;
      const sharp = Math.max(0, Math.min(1, (3.2 - rps) / 2));
      (this._spinEls || []).forEach((e) => {
        if (!e.sharp.isConnected) return;
        e.sharp.style.transform = `rotate(${a.toFixed(2)}deg)`;
        e.sharp.style.opacity = sharp.toFixed(3);
        e.smear.style.opacity = sharp < 1 ? "1" : "0";
      });
    }
    _spinKick() {
      if (!this._spin) this._spin = { a: 0, rps: 0, t: 0, raf: 0 };
      const S = this._spin;
      if (S.raf || !this.isConnected || !this._config.wheel_spin) return;
      S.t = 0;
      const tick = (now) => {
        S.raf = 0;
        if (!this.isConnected || !this._spinEls || !this._spinEls.length || !this._spinEls[0].sharp.isConnected) return;
        const dt = S.t ? Math.min(0.1, (now - S.t) / 1000) : 0; S.t = now;
        const circ = Number(this._config.wheel_circumference) > 0 ? Number(this._config.wheel_circumference) : 2.29;
        const g = this._st("gear"), rev = OK(g) && /^r/i.test(String(g.state));
        S.rps = this._wheelKmh() / 3.6 / circ;
        S.a = (S.a + (rev ? -1 : 1) * S.rps * 360 * dt) % 360;
        this._spinApply();
        if (S.rps > 0.005 && !document.hidden) S.raf = requestAnimationFrame(tick);
      };
      S.raf = requestAnimationFrame(tick);
    }
    _spinStop() { if (this._spin && this._spin.raf) { cancelAnimationFrame(this._spin.raf); this._spin.raf = 0; } this._spinEls = null; }

    _wirePhoto() {
      const top = this.shadowRoot.querySelector("image.topimg");
      if (top && !top.dataset.wired) {
        top.dataset.wired = "1";
        const look = this._look(true), src = top.getAttribute("href") || "";
        if (look && look.rgb && /car-top\.webp/i.test(src)) {
          top.style.visibility = "hidden";
          loadTopPaint(src, look.rgb).then((u) => { top.setAttribute("href", u); top.style.visibility = ""; }, () => { top.style.visibility = ""; });
        } else if (look && /\.svg(\?|$)/i.test(src) && !src.startsWith("blob:")) {
          top.style.visibility = "hidden";
          Promise.resolve(loadCarSvg(src, look.rgb, null)).then((u) => { top.setAttribute("href", u); top.style.visibility = ""; },
                                    () => { top.style.visibility = ""; });
        }
      }
      const img = this.shadowRoot.querySelector(".photo img");
      if (!img || img.dataset.wired) return;
      img.dataset.wired = "1";
      const look = this._look(false), src = img.getAttribute("src") || "";
      if (look && /\.svg(\?|$)/i.test(src) && !src.startsWith("blob:")) {
        img.style.visibility = "hidden";
        Promise.resolve(loadCarSvg(src, look.rgb, look.chrome, look.wheels)).then((u) => { img.src = u; img.style.visibility = ""; },
                                  () => { img.style.visibility = ""; });
      }
      const fail = () => { const box = img.closest(".photo"); if (box) box.classList.add("broken"); };
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener("error", fail, { once: true });
    }

    /* ---------------------------------------------------------- commands */
    _toast(message) {
      this.dispatchEvent(new CustomEvent("hass-notification", {
        detail: { message: `ECARX: ${message}` }, bubbles: true, composed: true }));
    }

    _hold(ms = HOLD_MS) {
      this._holdUntil = Date.now() + ms;
      this._applyGate();
      clearTimeout(this._timers.gate);
      this._timers.gate = setTimeout(() => this._applyGate(), ms + 30);
    }

    _waiting() { return Date.now() < this._holdUntil; }

    _call(domain, service, key, data = {}) {
      const id = this._eid(key);
      if (!id) return Promise.resolve();
      return Promise.resolve(this._hass.callService(domain, service, { entity_id: id, ...data }, undefined, false))
        .catch((err) => this._toast((err && (err.message || err.error)) || "command failed"));
    }

    _options(key) {
      const st = this._st(key);
      return (st && st.attributes && Array.isArray(st.attributes.options)) ? st.attributes.options : [];
    }

    _select(key, option) { return this._call("select", "select_option", key, { option }); }

    _cycle(key) {
      const st = this._st(key);
      const opts = this._options(key);
      if (!st || !opts.length) return;
      const next = opts[(opts.indexOf(st.state) + 1) % opts.length];
      this._select(key, next);
    }

    _stepFan(dir) {
      const st = this._st("fan_speed");
      const opts = this._options("fan_speed");
      if (!st || !opts.length) return;
      const i = opts.indexOf(st.state);
      const next = opts[Math.max(0, Math.min(opts.length - 1, (i < 0 ? 0 : i) + dir))];
      if (next !== st.state) this._select("fan_speed", next);
    }

    _stepTemp(key, dir) {
      const st = this._st(key);
      if (!st) return;
      const a = st.attributes || {};
      const step = Number(a.step) || 0.5;
      const base = this._pending[key] != null ? this._pending[key] : Number(st.state);
      if (!isFinite(base)) return;
      const next = Math.min(Number(a.max) || 30, Math.max(Number(a.min) || 16, base + dir * step));
      this._pending[key] = next;
      this._showTemp(key);
      clearTimeout(this._timers[key]);
      this._timers[key] = setTimeout(() => {
        const target = this._pending[key];
        this._call("number", "set_value", key, { value: target })
          .then(() => { setTimeout(() => { delete this._pending[key]; this._showTemp(key); }, 1500); });
      }, TEMP_SETTLE_MS);
    }

    _showTemp(key) {
      const el = this.shadowRoot.querySelector(`[data-tval="${key}"]`);
      if (!el) return;
      const st = this._st(key);
      const v = this._pending[key] != null ? this._pending[key] : Number(st && st.state);
      el.textContent = isFinite(v) ? `${String(v).replace(/\.0$/, "")}°` : "—°";
    }

    _maxTemp(heat) {
      ["temp_driver", "temp_passenger"].forEach((k) => {
        const st = this._st(k);
        const a = (st && st.attributes) || {};
        const v = heat ? Number(a.max) || 28.5 : Number(a.min) || 15.5;
        if (st) this._call("number", "set_value", k, { value: v });
      });
      setTimeout(() => this._call("switch", "turn_on", "climate_auto"), 250);
      if (!heat) setTimeout(() => this._call("switch", "turn_on", "ac"), 500);
    }

    /* ---- presets: `presets:` is a list (or a map id -> preset) written in the config; nothing is built in ----
     * A preset is a list of steps applied one by one. Steps whose entity does not exist (or
     * whose option the car does not offer) are skipped, so one preset works on every trim. */
    _presetDefs() {
      /* Nothing is built in: a preset exists on the card only if it is written in the card's YAML, with its steps. */
      const MAX = 8, cfg = this._config.presets;
      if (cfg == null || cfg === false) return [];
      if (cfg === true) { this._warnOnce("presets: true no longer adds built-in presets - list each preset with its steps (see the README)"); return []; }
      const slug = (o, i) => String(o.id || o.name || "custom" + i).toLowerCase().replace(/[^a-z0-9а-я_-]+/g, "_");
      let items = [];
      if (Array.isArray(cfg)) {
        items = cfg.map((it) => (it && typeof it === "object" ? { ...it } : { id: it })).map((it, i) => ({ ...it, id: slug(it, i) }));
      } else if (typeof cfg === "object") {
        items = Object.keys(cfg).map((k) => { const v = cfg[k]; return v && typeof v === "object" ? { ...v, id: k } : null; }).filter(Boolean);
      }
      const META = ["id", "name", "icon", "enabled", "base"];
      return items.filter((it) => it.enabled !== false).filter((it) => {
        if (Object.keys(it).some((k) => !META.includes(k))) return true;
        this._warnOnce(`preset "${it.id}" has no steps (temp, ac, windows, actions ...), so it is not shown`);
        return false;
      }).slice(0, MAX).map((it) => ({ icon: "climate", ...it }));
    }
    _warnOnce(msg) { const w = (window.__mhaWarned = window.__mhaWarned || {}); if (!w[msg]) { w[msg] = 1; try { console.warn("mha-card: " + msg); } catch (e) { /* no console */ } } }

    /* ---- one preset as a list of steps. Every key is optional; what is not mentioned is left as it is.
     *   climate:  temp (number | [driver, passenger] | min | max), temp_driver, temp_passenger, rear_temp,
     *             fan, flow, rear_flow, auto, ac, defrost, rear, circ,
     *             seat_heat, seat_heat_driver / _passenger / _rear_left / _rear_right,
     *             seat_vent, seat_vent_driver / _passenger, wheel, rear_climate, g_clean
     *   openings: windows (all four), window_driver / _passenger / _rear_left / _rear_right,
     *             sunroof, sunshade   - closed | open | 0..100 (sunroof also: vent)
     *   other:    ambient (true | false), ambient_brightness, lock is not offered (the car does not report it)
     *   actions:  a list of any Home Assistant service calls
     * Steps whose entity does not exist (or whose option the car does not offer) are skipped. */
    _presetSteps(p) {
      const st = [];
      const sw = (key, v) => { if (v != null && v !== "" && this._has(key)) st.push(() => this._call("switch", this._truthy(v) ? "turn_on" : "turn_off", key)); };
      const sel = (key, v) => {
        if (v == null || v === "" || !this._has(key)) return;
        const o = this._options(key);
        if (!o.length || o.includes(String(v))) st.push(() => this._select(key, String(v)));
      };
      const num = (key, t) => {
        const s0 = this._st(key);
        if (!s0 || t == null || t === "") return;
        const a = s0.attributes || {};
        let v = t === "min" ? (Number(a.min) || 16) : t === "max" ? (Number(a.max) || 28) : Number(t);
        if (!isFinite(v)) return;
        v = Math.min(Number(a.max) || 30, Math.max(Number(a.min) || 0, v));
        st.push(() => this._call("number", "set_value", key, { value: v }));
      };
      const cover = (key, v) => {
        if (v == null || v === "" || !this._has(key)) return;
        if (key === "sunroof" && String(v).toLowerCase() === "vent") {
          if (this._has("sunroof_tilt")) st.push(() => this._call("switch", "turn_on", "sunroof_tilt"));
          return;
        }
        const pos = this._coverTarget(v);
        if (pos == null) return;
        st.push(() => {
          if (pos <= 0) { this._call("cover", "close_cover", key); if (key === "sunroof" && this._isOn("sunroof_tilt")) this._call("switch", "turn_off", "sunroof_tilt"); }
          else if (pos >= 100) this._call("cover", "open_cover", key);
          else this._call("cover", "set_cover_position", key, { position: pos });
        });
      };
      ["temp_driver", "temp_passenger"].forEach((k, i) => {
        const t = p[k] != null ? p[k] : (Array.isArray(p.temp) ? p.temp[i] : p.temp);
        num(k, t);
      });
      num("rear_temperature", p.rear_temp);
      sw("climate_auto", p.auto); sw("ac", p.ac); sw("defrost_front", p.defrost); sw("defrost_rear", p.rear);
      sw("rear_power", p.rear_climate); sw("g_clean", p.g_clean);
      sel("circulation", p.circ); sel("blowing_mode", p.flow); sel("fan_speed", p.fan);
      sel("rear_blowing_mode", p.rear_flow);
      const sh = (k, own, all) => sel(k, own != null ? own : all);
      sh("seat_heat_driver", p.seat_heat_driver, p.seat_heat); sh("seat_heat_passenger", p.seat_heat_passenger, p.seat_heat);
      sh("seat_heat_rear_left", p.seat_heat_rear_left, p.seat_heat); sh("seat_heat_rear_right", p.seat_heat_rear_right, p.seat_heat);
      sh("seat_vent_driver", p.seat_vent_driver, p.seat_vent); sh("seat_vent_passenger", p.seat_vent_passenger, p.seat_vent);
      sel("steering_heat", p.wheel);
      cover("win_fl", p.window_driver != null ? p.window_driver : p.windows);
      cover("win_fr", p.window_passenger != null ? p.window_passenger : p.windows);
      cover("win_rl", p.window_rear_left != null ? p.window_rear_left : p.windows);
      cover("win_rr", p.window_rear_right != null ? p.window_rear_right : p.windows);
      cover("sunroof", p.sunroof); cover("sunshade", p.sunshade);
      sw("ambient_power", p.ambient); num("ambient_brightness", p.ambient_brightness);
      (Array.isArray(p.actions) ? p.actions : []).forEach((a) => {
        const name = a && String(a.action || a.service || ""), dot = name.indexOf(".");
        if (dot < 1) return;
        const target = a.target || (a.entity_id ? { entity_id: a.entity_id } : undefined);
        st.push(() => Promise.resolve(this._hass.callService(name.slice(0, dot), name.slice(dot + 1), a.data || {}, target, false))
          .catch((err) => this._toast((err && (err.message || err.error)) || "command failed")));
      });
      return st;
    }

    _truthy(v) { return !(v === false || v === 0 || /^(off|false|no|0)$/i.test(String(v))); }
    _coverTarget(v) {
      const t = String(v).trim().toLowerCase();
      if (/^(closed?|shut|close)$/.test(t)) return 0;
      if (/^(open|opened|full)$/.test(t)) return 100;
      const n = Number(t.replace("%", ""));
      return isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
    }

    _applyPreset(id) {
      const p = this._presetDefs().find((x) => x.id === id);
      if (!p) return;
      this._presetSteps(p).forEach((fn, i) => setTimeout(fn, i * 300));
      this._toast(this._t("toast.preset", "", { name: this._presetName(p) }));
      this._hold(Math.max(HOLD_MS, this._presetSteps(p).length * 300 + 1200));
    }

    /* icon: a built-in name (heat, cool, defrost, auto, climate, fresh, ...) or any Material Design Icon: mdi:snowflake */
    _presetIcon(p) {
      const ic = String(p.icon || "climate").trim();
      return /^[a-z0-9-]+:[a-z0-9-]+$/i.test(ic) ? `<ha-icon icon="${esc(ic)}"></ha-icon>` : icon(ic);
    }

    _presetName(p) { return p.name || this._t("preset." + p.id, p.id); }

    _presetsBlock(first) {
      if (this._hidden("presets")) return "";
      const defs = this._presetDefs();
      if (!defs.length) return "";
      /* the same tiles as the climate buttons (.act), three to a row */
      /* one row up to 4 tiles; 5-6 tiles: rows of 3; 7-8 tiles: rows of 4 */
      const cols = defs.length <= 4 ? defs.length : defs.length <= 6 ? 3 : 4;
      const head = `<p class="micro${first ? "" : " csub"}">${icon("bolt")} ${esc(this._t("section.presets"))}</p>`;
      return head + `<div class="actions pre" style="margin-top:${first ? 2 : 8}px;grid-template-columns:repeat(${cols},1fr)">${defs.map((p) => `<button class="act"
          data-act="preset:${esc(p.id)}" title="${esc(this._presetName(p))}">${this._presetIcon(p)}<span>${esc(this._presetName(p))}</span></button>`).join("")}</div>`;
    }

    _onAction(act) {
      if (act.startsWith("preset:")) { this._applyPreset(act.slice(7)); return; }
      if (this._waiting()) return;
      switch (act) {
        case "auto": this._call("switch", "toggle", "climate_auto"); break;
        case "ac": this._call("switch", "toggle", "ac"); break;
        case "defrost": this._call("switch", "toggle", "defrost_front"); break;
        case "rear": this._call("switch", "toggle", "defrost_rear"); break;
        case "recirc": {
          const st = this._st("circulation");
          if (st) this._select("circulation", st.state === "inside" ? "outside" : "inside");
          break;
        }
        case "gclean": this._call("switch", "toggle", "g_clean"); break;
        case "wheel": this._cycle("steering_heat"); break;
        case "maxheat": this._maxTemp(true); break;
        case "maxcool": this._maxTemp(false); break;
        case "tempdown_driver": this._stepTemp("temp_driver", -1); return;
        case "tempup_driver": this._stepTemp("temp_driver", 1); return;
        case "tempdown_passenger": this._stepTemp("temp_passenger", -1); return;
        case "tempup_passenger": this._stepTemp("temp_passenger", 1); return;
        case "tempdown_rear": this._stepTemp("rear_temperature", -1); return;
        case "tempup_rear": this._stepTemp("rear_temperature", 1); return;
        case "fandown": this._stepFan(-1); break;
        case "fanup": this._stepFan(1); break;
        case "closeall": this._closeAll(); break;
        default:
          if (act.startsWith("flow:")) this._select("blowing_mode", act.slice(5));
          else if (act.startsWith("cycle:")) this._cycle(act.slice(6));
          else if (act.startsWith("cover:")) { const [, k, p] = act.split(":"); this._setCover(k, Number(p)); }
          else if (act.startsWith("sw:")) this._call("switch", "toggle", act.slice(3));
          else if (act.startsWith("amb:color:")) this._select("ambient_color", act.slice(10));
          else if (act.startsWith("amb:bright:")) this._call("number", "set_value", "ambient_brightness", { value: Number(act.slice(11)) });
          else return;
      }
      this._hold();
    }

    _wire() {
      this.shadowRoot.querySelectorAll("[data-act]").forEach((el) =>
        el.addEventListener("click", () => this._onAction(el.dataset.act)));
      this.shadowRoot.querySelectorAll("[data-more]").forEach((el) => {
        const open = () => this.dispatchEvent(new CustomEvent("hass-more-info",
          { detail: { entityId: el.dataset.more }, bubbles: true, composed: true }));
        el.addEventListener("click", open);
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); }
        });
      });
      this._applyGate();
      this._wirePhoto();
      try { this._wirePhotoSpin(); } catch (err) { /* the rims just stay still */ }
      this._wireExpand();
      try { this._mount3d(); } catch (err) { this._c3dFail = true; }
      try { this._mountFlat(); } catch (err) { /* the picture just stays empty */ }
    }

    _applyGate() {
      const waiting = this._waiting();
      this.shadowRoot.querySelectorAll("[data-act]").forEach((el) => {
        const st = el.dataset.ent ? this._st(el.dataset.ent) : null;
        const gone = el.dataset.ent && (!st || st.state === "unavailable");
        const off = !!gone || (waiting && !/^temp(up|down)/.test(el.dataset.act));
        el.toggleAttribute("disabled", off);
        el.classList.toggle("blocked", off);
      });
    }

    /* --------------------------------------------------------- rendering */
    _actBtn(act, label, ic, ent, on, title) {
      if (this._hidden(act)) return "";
      return `<button class="act ${on ? "on" : ""}" data-act="${act}" data-ent="${ent}"
          title="${esc(title || label)}">${icon(ic)}<span>${esc(label)}</span></button>`;
    }

    _isOn(key) { const st = this._st(key); return !!st && st.state === "on"; }

    /* The top row of the climate tab. By default four buttons: auto, A/C, recirculation, air cleaning.
     * `climate_buttons` picks others (maxheat, maxcool) or fewer. The heated wheel and glass live in the heating section. */
    _climateButtons() {
      const all = ["auto", "ac", "recirc", "gclean", "maxheat", "maxcool"], c = this._config.climate_buttons;
      const on = Array.isArray(c) ? c.map((x) => String(x).toLowerCase()) : ["auto", "ac", "recirc", "gclean"];
      return all.filter((k) => on.includes(k));
    }

    _actionRow() {
      const circ = this._st("circulation");
      const html = {
        auto: () => this._actBtn("auto", this._t("act.auto"), "auto", "climate_auto", this._isOn("climate_auto")),
        ac: () => this._actBtn("ac", this._t("act.ac"), "ac", "ac", this._isOn("ac")),
        recirc: () => this._actBtn("recirc", this._t("act.recirc"), "recirc", "circulation", !!circ && circ.state === "inside"),
        gclean: () => (this._has("g_clean") ? this._actBtn("gclean", this._t("act.gclean"), "purify", "g_clean", this._isOn("g_clean")) : ""),
        maxheat: () => this._actBtn("maxheat", this._t("act.maxheat"), "heat", "temp_driver", false, this._t("tip.maxheat")),
        maxcool: () => this._actBtn("maxcool", this._t("act.maxcool"), "cool", "temp_driver", false, this._t("tip.maxcool")),
      };
      return this._climateButtons().map((k) => html[k]()).join("");
    }

    _lvlWord(v) { return this._t(`lvl.${v}`, v); }

    _seat(key, label, ic) {
      const st = this._st(key);
      if (!st) return "";
      const opts = this._options(key);
      const lvl = opts.includes(st.state) ? st.state : "off";
      const idx = Math.max(0, opts.indexOf(lvl));
      const frac = opts.length > 1 ? idx / (opts.length - 1) : 0;
      const word = opts.includes(st.state) ? this._lvlWord(lvl) : "—";
      return `<button class="cbtn ${frac > 0 ? "on lvl" : ""}" style="--lvl:${frac}" data-act="cycle:${key}" data-ent="${key}"
          title="${esc(label)}: ${esc(word)}">${icon(ic)}<span>${esc(label)}</span><b>${esc(word)}</b></button>`;
    }

    _stepper(zoneKey, suffix, label, bare) {
      const st = this._st(zoneKey);
      if (!st) return "";
      const v = this._pending[zoneKey] != null ? this._pending[zoneKey] : Number(st.state);
      const on = this._isOn("climate_auto") || this._isOn("ac");
      return `<div class="tcol">${bare ? "" : `<p class="micro">${esc(label)}</p>`}
        <div class="temp ${on ? "on" : ""}" title="${esc(label)}">
          <button class="cstep" data-act="tempdown_${suffix}" data-ent="${zoneKey}" title="${esc(this._t("tooltip.cooler"))}">${icon("minus")}</button>
          <span class="tval" data-tval="${zoneKey}">${isFinite(v) ? String(v).replace(/\.0$/, "") : "—"}°</span>
          <button class="cstep" data-act="tempup_${suffix}" data-ent="${zoneKey}" title="${esc(this._t("tooltip.warmer"))}">${icon("plus")}</button>
        </div></div>`;
    }

    _fanStepper() {
      const st = this._st("fan_speed");
      if (!st) return "";
      const shown = OK(st) ? (st.state === "off" ? "0" : st.state) : "—";
      return `<div class="tcol"><p class="micro">${esc(this._t("label.fan"))}</p>
        <div class="temp fan ${OK(st) && st.state !== "off" ? "on" : ""}">
          <button class="cstep" data-act="fandown" data-ent="fan_speed" title="${esc(this._t("tooltip.less"))}">${icon("minus")}</button>
          <span class="tval">${esc(shown)}</span>
          <button class="cstep" data-act="fanup" data-ent="fan_speed" title="${esc(this._t("tooltip.more"))}">${icon("plus")}</button>
        </div></div>`;
    }

    _flowRow() {
      const st = this._st("blowing_mode");
      if (!st) return "";
      const modes = ["face", "leg", "face_leg", "window", "face_window", "leg_window", "all", "auto"]
        .filter((m) => this._options("blowing_mode").includes(m));
      return `<p class="micro csub">${icon("fresh")} ${esc(this._t("section.airflow"))}</p>
        <div class="crow wrap flow">${modes.map((m) => `<button class="cbtn ${st.state === m ? "on" : ""}"
          data-act="flow:${m}" data-ent="blowing_mode"><span>${esc(this._t("flow." + m, m))}</span></button>`).join("")}</div>`;
    }

    /* tabs = true (tabbed cards): the climate tab carries the switches (auto, A/C, defrost, recirculation ...),
     * the presets live on the overview tab */
    _climatePanel(tabs) {
      const heat = this._hidden("seat_heating") ? ""
        : this._seat("seat_heat_driver", this._t("label.driver"), "seatheat")
        + this._seat("seat_heat_passenger", this._t("label.passenger"), "seatheat")
        + this._seat("seat_heat_rear_left", this._t("rear.temp_left"), "seatheat")
        + this._seat("seat_heat_rear_right", this._t("rear.temp_right"), "seatheat");
      /* the heated wheel and the heated glass sit here, with the seats */
      const warm = heat
        + (this._hidden("wheel") ? "" : this._seat("steering_heat", this._t("act.wheel"), "steering"))
        + (this._hidden("defrost") ? "" : this._tile("defrost_front", this._t("act.defrost"), "defrost"))
        + (this._hidden("rear") ? "" : this._tile("defrost_rear", this._t("act.rear"), "defrost_rear"));
      const vent = this._hidden("seat_cooling") ? ""
        : this._seat("seat_vent_driver", this._t("label.driver"), "seatvent")
        + this._seat("seat_vent_passenger", this._t("label.passenger"), "seatvent");
      return `${tabs ? `<div class="actions" style="margin-top:2px">${this._actionRow()}</div><hr class="hairline">` : '<hr class="hairline">'}
        <p class="micro">${icon("climate")} ${esc(this._t("section.climate"))}</p>
        ${tabs ? "" : `<div class="actions" style="margin:2px 0 10px">${this._actionRow()}</div>`}
        <div class="crow wrap temprow">
          ${this._stepper("temp_driver", "driver", this._t("label.driver"))}
          ${this._stepper("temp_passenger", "passenger", this._t("label.passenger"))}
          ${this._fanStepper()}
        </div>
        ${this._flowRow()}
        ${warm ? `<p class="micro csub">${icon("seatheat")} ${esc(this._t("section.seat_heating"))}</p>
        <div class="crow wrap seats">${warm}</div>` : ""}
        ${vent ? `<p class="micro csub">${icon("seatvent")} ${esc(this._t("section.seat_cooling"))}</p>
        <div class="crow wrap seats">${vent}</div>` : ""}`;
    }

    /* Tyres (fl fr rl rr) whose pressure is below tire_critical, in the sensor's own unit. */
    _tireLowKeys() {
      const tc = Number(this._config.tire_critical);
      if (this._config.tire_critical == null || !isFinite(tc)) return [];
      return ["fl", "fr", "rl", "rr"].filter((k) => {
        const st = this._st("tire_" + k), v = OK(st) ? NUM(st) : null;
        return v != null && v < tc;
      });
    }

    _tireColorStyle() {
      const col = parseColor(this._config.tire_color_critical);
      return col ? ` style="--tc:${_hex(col)}"` : "";
    }

    _tire(key) {
      const st = this._st(key);
      if (!OK(st)) return "—";
      const v = NUM(st);
      return v == null ? "—" : `${v.toFixed(2)}<i>${esc(UNIT(st))}</i>`;
    }

    _beltWord(key) {
      const st = this._st(key);
      if (!OK(st)) return "—";
      return this._t(st.state === "buckled" ? "val.buckled" : "val.unbuckled");
    }

    _syncedAt() {
      let max = 0;
      KEYS.forEach((k) => {
        const st = this._st(k);
        const t = st ? Date.parse(st.last_updated) : 0;
        if (t > max) max = t;
      });
      return max ? new Date(max) : null;
    }

    /* ------------------------------------------- state shared by every view */
    _ctx() {
      const online = this._online();
      const speedSt = this._st("speed");
      const speed = NUM(speedSt);
      const fuelSt = this._st("fuel_level");
      const fuel = NUM(fuelSt);
      const tank = Number(this._config.tank_size) || TANK_L;
      const fuelPct = fuel == null ? null : Math.max(0, Math.min(100, (fuel / tank) * 100));
      const rangeSt = this._st("range");
      const range = OK(rangeSt) && NUM(rangeSt) != null ? Math.round(NUM(rangeSt)) : "—";
      const interior = this._st("temp_inside");
      const exterior = this._st("temp_outside");
      const doors = [["door_fl", "front"], ["door_fr", "front"], ["door_rl", "rear"], ["door_rr", "rear"]]
        .filter(([k]) => this._isOn(k));
      const open = {};
      doors.forEach(([, where]) => { open[where] = true; });
      const engineOn = this._isOn("engine_running");
      const speedUnit = UNIT(speedSt) || "km/h";
      const moving = speed != null && speed > 0;
      /* Three steps: ok, warn (fuel_warn, default 25 %), critical (fuel_critical, default 10 %). */
      let fw = Number(this._config.fuel_warn), fc = Number(this._config.fuel_critical);
      if (!isFinite(fw) || this._config.fuel_warn == null) fw = 25;
      if (!isFinite(fc) || this._config.fuel_critical == null) fc = 10;
      if (fc > fw) fc = fw;
      const crit = fuelPct != null && fuelPct <= fc;
      const low = fuelPct != null && fuelPct <= fw;
      const lk = this._lockInfo();
      const winOpen = this._openCount();
      const tail = [lk && lk.unlocked ? this._t("status.unlocked") : "",
        winOpen ? this._t("status.windows_open", "", { count: winOpen }) : ""].filter(Boolean).join(" · ");
      let statusLine = !online ? this._t("status.offline")
        : moving ? this._t("status.driving", "", { speed: ` · ${Math.round(speed)} ${speedUnit}` })
        : doors.length ? this._t("status.openings", "", { count: doors.length, plural: doors.length > 1 ? "s" : "" })
        : engineOn ? this._t("status.engine_on")
        : this._t("status.parked");
      if (online && !moving && tail) statusLine += ` · ${tail}`;
      return { online, speedSt, speed, moving, fuelSt, fuel, fuelPct, rangeSt, range, interior, exterior,
        doors, open, engineOn, speedUnit, low, crit, tireLow: this._tireLowKeys(), statusLine,
        warnStatus: !online || doors.length > 0 || (!moving && !!tail), unlocked: !!(lk && lk.unlocked), winOpen,
        climateOn: this._isOn("climate_auto") || this._isOn("ac") };
    }

    _fuelBar(c) {
      const cfg = this._config, step = c.crit ? "crit" : c.low ? "low" : "ok";
      const col = parseColor(cfg["fuel_color_" + (c.crit ? "critical" : c.low ? "warn" : "ok")]);
      return `<div class="bar ${step}"${col ? ` style="--fc:${_hex(col)}"` : ""}><i style="width:${c.fuelPct == null ? 0 : c.fuelPct}%"></i></div>`;
    }

    _headRight(c) {
      return c.fuel == null ? "" : esc(this._t("label.fuel", "", { l: Math.round(c.fuel) }));
    }

    _titleHtml(c) {
      return this._config.hide_name ? ""
        : `<i class="dot ${c.online ? "" : "off"}"></i>${esc(this._title())}`;
    }

    _footer() {
      const d = this._syncedAt();
      const when = d ? esc(this._t("label.synced", "", { time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) : "";
      return `<div class="footer"><span class="micro">MHA Bridge${this._config.demo ? " · DEMO" : ""}</span><span class="micro">${when}</span></div>${this._debugBlock()}`;
    }

    /* `debug: true` in the card config: which entity every key resolves to and what state it has. */
    _debugBlock() {
      if (!this._config.debug) return "";
      const ents = this._hass.entities || {};
      let mine = 0;
      for (const id in ents) if (ents[id] && ents[id].platform === DOMAIN_ID) mine++;
      const rows = ["connected", "engine_running", "door_fl", "speed", "range", "temp_inside", "tire_fl", "temp_driver", "fan_speed", "seat_heat_driver", "central_lock", "win_fl"].map((k) => {
        const id = this._eid(k), st = id ? this._hass.states[id] : null;
        return `${k} -> ${id || "no id"} = ${st ? st.state : "no state"}`;
      });
      const head = `registry entries: ${Object.keys(ents).length}, mha_bridge: ${mine}, prefix: ${this._config.prefix || this._prefix() || "-"}, online: ${this._online()}, tag: ${this.localName}`;
      return `<pre style="margin:10px 0 0;padding:8px;border-radius:8px;background:rgba(120,130,140,.12);font:11px/1.45 monospace;white-space:pre-wrap;word-break:break-all">${esc(head + "\n" + rows.join("\n"))}</pre>`;
    }

    _heroBlock(c) {
      return `
          <div class="hero">
            <div>
              <div class="num n ${c.range === "—" ? "unavail" : ""}">${c.range}<span class="u">${esc(UNIT(c.rangeSt) || "km")}</span></div>
              <div class="micro" style="margin-top:5px">${esc(this._t("label.range"))}</div>
            </div>
            <div class="side">
              ${OK(c.interior) && NUM(c.interior) != null ? `<div class="num">${Math.round(NUM(c.interior))}°</div>
                <div class="u2">${esc(this._t("label.inside"))}${OK(c.exterior) && NUM(c.exterior) != null
                  ? ` · ${esc(this._t("label.out", "", { temp: Math.round(NUM(c.exterior)) }))}` : ""}</div>` : ""}
            </div>
          </div>`;
    }

    _drivingSection(c) {
      return `
          <hr class="hairline">
          <p class="micro">${icon("driving")} ${esc(this._t("section.driving"))}</p>
          <div class="grid sec">
            ${this._row(this._t("row.speed"), c.speedSt, { dec: 0 })}
            ${this._row(this._t("row.speed_ipk"), this._st("speed_ipk"), { dec: 0 })}
            ${this._row(this._t("row.rpm"), this._st("rpm"), { dec: 0 })}
            ${this._row(this._t("row.gear"), this._st("gear"))}
            ${this._row(this._t("row.ignition"), this._st("ignition"))}
            ${this._row(this._t("row.engine"), null, { value: c.engineOn ? this._t("val.running") : this._t("val.stopped"), accent: c.engineOn, more: this._eid("engine_running") })}
          </div>`;
    }

    _tiresSection() {
      const lowK = this._tireLowKeys();
      const cell = (k) => `<div class="t${lowK.includes(k) ? " crit" : ""}${this._moreAttr(this._eid("tire_" + k)) ? " clk" : ""}"${this._moreAttr(this._eid("tire_" + k))}><b>${this._tire("tire_" + k)}</b><div class="micro">${esc(this._t("tire." + k))}</div></div>`;
      return `
          <hr class="hairline">
          <p class="micro">${icon("tire")} ${esc(this._t("section.tires"))}</p>
          <div class="tires" style="margin-top:8px${this._tireColorStyle() ? ";--tc:" + _hex(parseColor(this._config.tire_color_critical)) : ""}">${cell("fl")}${cell("fr")}${cell("rl")}${cell("rr")}</div>`;
    }

    _vehicleSection(c) {
      return `
          <hr class="hairline">
          <p class="micro">${icon("trip")} ${esc(this._t("section.vehicle"))}</p>
          <div class="grid sec">
            ${this._row(this._t("row.odometer"), this._st("odometer"), { dec: 0 })}
            ${this._row(this._t("row.fuel"), c.fuelSt, { warn: c.low, dec: 1 })}
            ${this._row(this._t("row.range"), c.rangeSt, { dec: 0 })}
            ${this._row(this._t("row.outside"), c.exterior, { dec: 1 })}
            ${this._row(this._t("row.cabin"), c.interior, { dec: 1 })}
            ${this._row(this._t("row.belts"), null, { value: `${this._beltWord("belt_driver")} / ${this._beltWord("belt_passenger")}`, more: this._eid("belt_driver") })}
          </div>`;
    }

    /* ----------------------------- windows, rear climate, comfort ----------------------------- */
    _has(key) { return !!this._st(key); }

    /* on = unlocked (binary_sensor device class lock) */
    _lockInfo() {
      const st = this._st("central_lock");
      if (!st || this._hidden("lock")) return null;
      if (!OK(st)) return { cls: "bad", word: this._t("lock.unknown"), ic: "unlock", unlocked: false };
      const un = st.state === "on";
      return { cls: un ? "bad" : "ok", word: this._t(un ? "lock.unlocked" : "lock.locked"), ic: un ? "unlock" : "lock", unlocked: un };
    }

    _coverPos(key) {
      const st = this._st(key);
      if (!OK(st)) return null;
      const v = Number(st.attributes && st.attributes.current_position);
      return isFinite(v) ? v : (st.state === "closed" ? 0 : null);
    }

    /* A sunroof that is only tilted up for ventilation reports a small position (a few %), which is not
     * "open 4 %". Position 0 < p <= sunroof_vent_max (default 8) or the tilt switch means "ventilation". */
    _roofVent() {
      if (!this._has("sunroof")) return this._isOn("sunroof_tilt");
      const pos = this._coverPos("sunroof") || 0, lim = Number(this._config.sunroof_vent_max);
      return (pos > 0 && pos <= (isFinite(lim) ? lim : 8)) || (pos <= 0 && this._isOn("sunroof_tilt"));
    }

    _coverKeys() {
      return ["win_fl", "win_fr", "win_rl", "win_rr", "sunroof", "sunshade"].filter((k) => this._has(k));
    }

    _openCount() {
      return this._coverKeys().filter((k) => k !== "sunshade").filter((k) => (this._coverPos(k) || 0) > 0).length;
    }

    _coverRow(key) {
      const pos = this._coverPos(key);
      const label = this._t("win." + key.replace("win_", ""));
      const ic = key === "sunroof" ? "roof" : key === "sunshade" ? "shade" : "window";
      const vent = key === "sunroof" && this._roofVent();
      const word = vent ? this._t("win.vent") : pos == null ? "—" : pos <= 0 ? this._t("win.closed") : `${this._t(key === "sunshade" ? "win.open_f" : "win.open")} ${Math.round(pos)}%`;
      const steps = [0, 25, 50, 75, 100];
      let near = -1;
      if (pos != null && !vent) near = steps.reduce((b, p) => (Math.abs(p - pos) < Math.abs(b - pos) ? p : b), steps[0]);
      const btns = steps.map((p) => `<button class="cbtn ${p === near ? "on" : ""}" data-act="cover:${key}:${p}" data-ent="${key}"
          title="${esc(label)}: ${p === 0 ? esc(this._t("win.shut")) : p === 100 ? esc(this._t("win.full")) : p + "%"}"
          aria-label="${esc(label)}: ${p === 0 ? esc(this._t("win.shut")) : p === 100 ? esc(this._t("win.full")) : p + "%"}">${p === 0 ? icon("shut") : p === 100 ? icon("full") : p + "%"}</button>`).join("");
      return `<div class="opn o-${key} ${pos > 0 || vent ? "open" : ""}"><div class="opn-h">${icon(ic)}<span>${esc(label)}</span><b>${esc(word)}</b></div>
        <div class="opn-b">${btns}</div></div>`;
    }

    _openingsSection() {
      if (this._hidden("windows")) return "";
      const keys = this._coverKeys();
      const tilt = this._has("sunroof_tilt");
      if (!keys.length && !tilt) return "";
      const lk = this._lockInfo();
      const chip = lk ? `<span class="lockchip ${lk.cls}">${icon(lk.ic)}${esc(lk.word)}</span>` : "";
      const anyOpen = this._openCount() > 0 || this._coverPos("sunshade") > 0 || this._roofVent();
      const closeAll = `<button class="closeall ${anyOpen ? "act" : ""}" data-act="closeall" data-ent="${keys[0] || "sunroof_tilt"}">${icon("shut")}<span>${esc(this._t("win.close_all"))}</span></button>`;
      const extra = [
        tilt ? `<button class="cbtn ${this._isOn("sunroof_tilt") || this._roofVent() ? "on" : ""}" data-act="sw:sunroof_tilt" data-ent="sunroof_tilt">${icon("roof")}<span>${esc(this._t("win.tilt"))}</span></button>` : "",
      ].join("");
      return `
        <hr class="hairline">
        <p class="micro">${icon("window")} ${esc(this._t("section.windows"))}${chip}</p>
        ${closeAll}
        <div class="opn-wrap"><div class="opn-grid k${["sunroof", "sunshade"].filter((k) => keys.includes(k)).length}">${keys.map((k) => this._coverRow(k)).join("")}</div></div>
        ${extra ? `<div class="crow wrap">${extra}</div>` : ""}`;
    }

    _tile(key, label, ic) {
      if (!this._has(key)) return "";
      return `<button class="cbtn ${this._isOn(key) ? "on" : ""}" data-act="sw:${key}" data-ent="${key}"
          title="${esc(label)}">${icon(ic)}<span>${esc(label)}</span></button>`;
    }

    /* A select shown as one button that cycles through its options; the current one is the label. */
    _cyc(key, label, ic, prefix) {
      const st = this._st(key);
      if (!st) return "";
      const word = OK(st) ? this._t(prefix + st.state, st.state) : "—";
      return `<button class="cbtn" data-act="cycle:${key}" data-ent="${key}" title="${esc(label)}">${icon(ic)}<span>${esc(label)}</span><b>${esc(word)}</b></button>`;
    }

    _rearSection() {
      if (this._hidden("rear_climate")) return "";
      const tiles = this._tile("rear_power", this._t("rear.power"), "climate")
        + this._tile("rear_auto", this._t("rear.auto"), "auto")
        + this._tile("climate_lock", this._t("rear.lock"), "lock")
       ;
      if (!tiles && !this._st("rear_temperature")) return "";
      const tempHtml = this._stepper("rear_temperature", "rear", this._t("rear.temp"), true);
      return `
        <hr class="hairline">
        <p class="micro">${icon("fresh")} ${esc(this._t("section.rear"))}</p>
        <div class="crow wrap rear">${tempHtml}${tiles}</div>`;
    }

    _ambientSection() {
      if (this._hidden("ambient")) return "";
      const keys = ["ambient_power", "ambient_brightness", "ambient_mode", "ambient_effect", "ambient_color"];
      if (!keys.some((k) => this._has(k))) return "";
      const br = this._st("ambient_brightness");
      let brHtml = "";
      if (br) {
        const v = OK(br) ? Number(br.state) : null;
        const steps = [20, 40, 60, 80, 100];
        const near = v == null ? -1 : steps.reduce((b, p) => (Math.abs(p - v) < Math.abs(b - v) ? p : b), steps[0]);
        brHtml = `<div class="mrow"><p class="micro">${esc(this._t("amb.brightness"))}</p>${steps.map((p) =>
          `<button class="cbtn ${p === near ? "on" : ""}" data-act="amb:bright:${p}" data-ent="ambient_brightness">${p}%</button>`).join("")}</div>`;
      }
      const col = this._st("ambient_color");
      let colHtml = "";
      if (col) {
        colHtml = `<div class="swatches">${this._options("ambient_color").map((c) =>
          `<button class="swc ${col.state === c ? "sel" : ""}" style="--c:${AMBIENT_HEX[c] || "#888"}" data-act="amb:color:${c}"
            data-ent="ambient_color" title="${esc(this._t("col." + c, c))}"></button>`).join("")}</div>`;
      }
      return `
        <hr class="hairline">
        <p class="micro">${icon("ambient")} ${esc(this._t("section.ambient"))}</p>
        <div class="crow wrap">${this._tile("ambient_power", this._t("amb.power"), "ambient")}
          ${this._cyc("ambient_mode", this._t("amb.mode"), "ambient", "amb.mode.")}
          ${this._cyc("ambient_effect", this._t("amb.effect"), "ambient", "amb.effect.")}</div>
        ${brHtml}${colHtml}`;
    }

    /* Massage is a paid option: the entities exist only on cars that have it, so on others this
     * section never appears. `hide: [massage]` removes it even where they exist. */
    _massageSection() {
      if (this._hidden("massage")) return "";
      const rows = ["driver", "passenger"].map((w) => {
        if (!this._has("massage_" + w)) return "";
        return `<div class="mrow"><p class="micro">${esc(this._t("label." + w))}</p>
          ${this._tile("massage_" + w, this._t("section.massage"), "massage")}
          ${this._cyc("massage_level_" + w, this._t("mas.level"), "massage", "lvl.")}
          ${this._cyc("massage_program_" + w, this._t("mas.program"), "massage", "mas.p.")}</div>`;
      }).join("");
      if (!rows) return "";
      return `
        <hr class="hairline">
        <p class="micro">${icon("massage")} ${esc(this._t("section.massage"))}</p>${rows}`;
    }

    _comfortSections() {
      return this._rearSection() + this._ambientSection() + this._massageSection();
    }

    _setCover(key, pos) {
      if (pos > 0 && this._config.confirm_open && !window.confirm(this._t("confirm.open"))) return;
      if (pos <= 0) this._call("cover", "close_cover", key);
      else if (pos >= 100) this._call("cover", "open_cover", key);
      else this._call("cover", "set_cover_position", key, { position: pos });
    }

    _closeAll() {
      this._coverKeys().forEach((k) => { if ((this._coverPos(k) || 0) > 0) this._call("cover", "close_cover", k); });
      if (this._isOn("sunroof_tilt")) this._call("switch", "turn_off", "sunroof_tilt");
    }

    /* chrome_delete as one colour for the 3D chrome trim: 0..1 darkens, "body" follows the paint, a colour is used as is. */
    _c3dChrome() {
      const cd = _chromeDelete(this._config);
      if (!cd) return null;
      const v = Object.values(cd)[0], light = [210, 214, 218], dark = [26, 28, 32];
      if (v === "body") return parseColor(this._config.car_color) || BASE_RGB;
      if (Array.isArray(v)) return v;
      return light.map((c, i) => Math.round(c + (dark[i] - c) * v));
    }

    /* The 3D body replaces the flat picture; if it cannot load the picture simply stays. */
    _mount3d() {
      const svg = this.shadowRoot.querySelector("svg.cartop");
      if (!svg || this._c3dFail) return;
      const three = this._topData().three;
      if (!three) return;
      if (!this._c3d) {
        if (this._c3dLoading) return;
        this._c3dLoading = true;
        car3dLoad().then((lib) => {
          this._c3dLoading = false;
          if (!this.isConnected) return;
          this._c3d = new Car3D(lib); this._c3dFresh = true; this._mount3d();
        }).catch(() => { this._c3dLoading = false; this._c3dFail = true; });
        return;
      }
      const c = this._c3d, host = svg.parentElement;
      host.querySelectorAll("canvas.car3d").forEach((x) => { if (x !== c.canvas) x.remove(); });
      if (c.canvas.parentElement !== host) host.insertBefore(c.canvas, host.firstChild);
      svg.classList.add("has3d");
      c.onScale = (sc) => car3dLayout(svg, sc);
      c.setState(three, this._c3dFresh); this._c3dFresh = false;
      c._resize(); car3dLayout(svg, c.s);
    }

    /* ---- cabin / cockpit pictures ---- */
    _cabinCfg() {
      return { fabric: cabColor(this._config.cabin_fabric, CAB_FABRIC), trim: cabColor(this._config.cabin_trim, CAB_TRIM) };
    }

    _cabinFx() {
      const cfg = this._config.cabin_effects, names = ["heat", "vent", "wheel", "air", "defrost", "ambient", "massage"], fx = {};
      const alias = { airflow: "air" };
      const list = Array.isArray(cfg) ? cfg.map((k) => alias[k] || k) : null;
      names.forEach((n) => {
        fx[n] = cfg === false ? false : list ? list.includes(n)
          : cfg && typeof cfg === "object" ? !(cfg[n] === false || cfg[n] === "off" || cfg[n] === 0 || cfg[(Object.keys(alias).find((a) => alias[a] === n)) || "_"] === false) : true;
      });
      return fx;
    }

    /* cabin_opacity: one number for heating, ventilation and air flow, or {heat, vent, air}; 0..1 (or percent) */
    _cabinOp() {
      const c = this._config.cabin_opacity, one = (v) => { let n = Number(v); if (!isFinite(n)) return 0.6; if (n > 1) n /= 100; return Math.max(0, Math.min(1, n)); };
      const out = { heat: 0.6, vent: 0.6, air: 0.6 };
      if (c == null || c === "") return out;
      if (typeof c === "object") { for (const k of Object.keys(out)) if (c[k] != null) out[k] = one(c[k]); if (c.airflow != null) out.air = one(c.airflow); const all = c.all != null ? one(c.all) : null; if (all != null) for (const k of Object.keys(out)) if (c[k] == null) out[k] = all; return out; }
      const v = one(c); return { heat: v, vent: v, air: v };
    }

    _cabinData() {
      const lvl = (k) => { const st = this._st(k), n = st ? parseInt(st.state, 10) : 0; return isFinite(n) ? Math.max(0, Math.min(3, n)) : 0; };
      const num = (k) => { const st = this._st(k); return OK(st) ? NUM(st) : null; };
      const fs = this._st("fan_speed"), fan = !OK(fs) ? null : fs.state === "off" ? 0 : (parseInt(fs.state, 10) || null);
      const bm = this._st("blowing_mode"), cs = this._st("ambient_color"), es = this._st("ambient_effect"), bs = this._st("ambient_brightness");
      let bright = 1;
      if (OK(bs) && NUM(bs) != null) { const a = bs.attributes || {}, mn = Number(a.min) || 0, mx = Number(a.max) || 100; bright = Math.max(0, Math.min(1, (NUM(bs) - mn) / (mx - mn || 1))); }
      return {
        fx: this._cabinFx(),
        heat: { l: lvl("seat_heat_driver"), r: lvl("seat_heat_passenger") },
        vent: { l: lvl("seat_vent_driver"), r: lvl("seat_vent_passenger") },
        heatR: { l: lvl("seat_heat_rear_left"), r: lvl("seat_heat_rear_right") },
        trl: num("rear_temperature"), trr: num("rear_temperature"),
        hasRear: true,
        rearFlow: (() => { const st = this._st("rear_blowing_mode"); return OK(st) ? st.state : null; })(),
        rearOn: this._st("rear_power") && OK(this._st("rear_power")) ? this._isOn("rear_power") : null,
        
        op: this._cabinOp(),
        wheel: lvl("steering_heat"), fan, flow: OK(bm) ? bm.state : "all",
        tl: num("temp_driver"), tr: num("temp_passenger"),
        dfF: this._isOn("defrost_front"), dfR: this._isOn("defrost_rear"),
        amb: { on: this._isOn("ambient_power"), color: OK(cs) ? cs.state : "", effect: OK(es) ? es.state : "static", bright },
        mas: { l: this._isOn("massage_driver"), r: this._isOn("massage_passenger"),
               ll: lvl("massage_level_driver") || 2, lr: lvl("massage_level_passenger") || 2 },
      };
    }

    _cabinBlock(mode) {
      const ov = cabinOverlay(this._cabinData(), mode), rhd = !!this._config.rhd;
      return `<div class="carwrap cabinflat"><div class="flip"${rhd ? ' style="transform:scaleX(-1)"' : ""}><canvas class="cabimg" data-kind="cabin" width="1121" height="768"></canvas>
        <svg class="cabsvg" viewBox="0 0 1121 768" xmlns="http://www.w3.org/2000/svg" role="img"
          aria-label="${esc(this._t("tab." + (mode === "comfort" ? "comfort" : "climate")))}">${ov}</svg></div></div>`;
    }

    _cockpitBlock() {
      const rhd = !!this._config.rhd, ign = this._st("ignition");
      const on = !!ign && ["on", "driving", "start", "acc"].includes(ign.state);
      const sst = this._st("speed_ipk") || this._st("speed"), sp = OK(sst) ? NUM(sst) : null;
      const g = this._st("gear"), gear = OK(g) && g.state ? String(g.state).charAt(0).toUpperCase() : "";
      const cap = [gear && `<b>${esc(gear)}</b>`, sp != null ? `${Math.round(sp)} <i>${esc(UNIT(sst) || "")}</i>` : ""].filter(Boolean).join(" · ");
      return `<div class="carwrap cockpit"><div class="flip"${rhd ? ' style="transform:scaleX(-1)"' : ""}><canvas class="cabimg" data-kind="cockpit" width="1610" height="768"></canvas>
        <svg class="cabsvg" viewBox="0 0 1610 768" xmlns="http://www.w3.org/2000/svg">${cockpitOverlay({ on })}</svg></div>${cap ? `<div class="cabcap">${cap}</div>` : ""}</div>`;
    }

    /* The flat versions (no WebGL, or car_3d: false) and the cockpit: paint the recoloured photo into its canvas. */
    _mountFlat() {
      const cfg = this._cabinCfg();
      this.shadowRoot.querySelectorAll("canvas.cabimg").forEach((cv) => {
        const kind = cv.dataset.kind;
        cabLoad(kind).then((lib) => { cv.getContext("2d").drawImage(cabRender(lib, kind, cfg.fabric, cfg.trim), 0, 0); }).catch(() => {});
      });
    }

    /* Data for the top-view drawing: tyre pressures, door states, picture (shared by the top cards). */
    _topData() {
      const rhd = !!this._config.rhd;
      const tire = (k) => {
        const st = this._st(k);
        return OK(st) && NUM(st) != null ? `${NUM(st).toFixed(2)} ${UNIT(st)}`.trim() : "—";
      };
      const isOpen = (k) => { const st = this._st(k); return OK(st) ? st.state === "on" : null; };
      const d = {
        tires: rhd ? { fl: tire("tire_fr"), fr: tire("tire_fl"), rl: tire("tire_rr"), rr: tire("tire_rl") }
                   : { fl: tire("tire_fl"), fr: tire("tire_fr"), rl: tire("tire_rl"), rr: tire("tire_rr") },
        low: (() => {
          const k = this._tireLowKeys(), has = (x) => k.includes(x);
          return rhd ? { fl: has("fr"), fr: has("fl"), rl: has("rr"), rr: has("rl") }
                     : { fl: has("fl"), fr: has("fr"), rl: has("rl"), rr: has("rr") };
        })(),
        tc: (() => { const c = parseColor(this._config.tire_color_critical); return c ? _hex(c) : ""; })(),
        mirror: rhd,
        more: (() => {
          const m = (k) => this._moreAttr(this._eid("tire_" + k));
          return rhd ? { fl: m("fr"), fr: m("fl"), rl: m("rr"), rr: m("rl") }
                     : { fl: m("fl"), fr: m("fr"), rl: m("rl"), rr: m("rr") };
        })(),
        labels: { fl: this._t("tire.short.fl"), fr: this._t("tire.short.fr"), rl: this._t("tire.short.rl"), rr: this._t("tire.short.rr") },
        doors: { fl: isOpen(rhd ? "door_fr" : "door_fl"), fr: isOpen(rhd ? "door_fl" : "door_fr"),
                 rl: isOpen("door_rl"), rr: isOpen("door_rr") },
        hood: null, trunk: null, sunroof: null, bootWord: "", lights: this._lightsOn(),
        src: (() => {
          const look = this._look(true), c0 = this._config;
          const tkey = String(c0.car_image_top || (CAR_LIBRARY[String(c0.car_image || "").toLowerCase()] ? c0.car_image : CAR_DEFAULT));
          const url = CAR_LIBRARY[tkey.toLowerCase()] ? CAR_LIBRARY[tkey.toLowerCase()].top : tkey;
          const hit = look && _svgCache.get(_svgKey(url, look.rgb, null));
          return typeof hit === "string" ? hit : url;
        })(),
        win: (() => {
          const p = (k) => (this._has(k) ? this._coverPos(k) : null);
          return rhd ? { fl: p("win_fr"), fr: p("win_fl"), rl: p("win_rr"), rr: p("win_rl") }
                     : { fl: p("win_fl"), fr: p("win_fr"), rl: p("win_rl"), rr: p("win_rr") };
        })(),
        words: { openM: this._t("topview.open_m"), closedM: this._t("topview.closed_m"), shade: this._t("topview.shade"), win: this._t("topview.win"), winClosed: this._t("topview.win_closed"), winOpen: this._t("topview.win_open"),
                 hood: this._t("topview.hood"), sunroof: this._t("topview.sunroof"), open: this._t("topview.open"),
                 closed: this._t("topview.closed"), unknown: this._t("topview.unknown") },
      };
      /* hood / tailgate: own sensors of the app; a label with no data shows "—" instead of disappearing */
      const tl = this._config.top_labels, names = ["doors", "windows", "roof", "trunk", "hood", "tires"];
      d.show = {};
      names.forEach((n) => {
        d.show[n] = tl === false ? false : Array.isArray(tl) ? tl.includes(n)
          : tl && typeof tl === "object" ? !(tl[n] === false || tl[n] === "off" || tl[n] === 0) : true;
      });
      const flag = (k) => {
        const st = this._st(k);
        if (!st || st.state === "unavailable" || st.state === "unknown") return null;
        return ["on", "open", "opening", "true", "ajar"].includes(String(st.state).toLowerCase());
      };
      d.hood = flag("hood"); d.trunk = flag("trunk"); d.bootWord = this._t("topview.trunk");
      const vent = this._roofVent(), roofRaw = this._has("sunroof") ? this._coverPos("sunroof") : null, roofPos = vent ? 0 : roofRaw || 0, tilt = vent;
      const sr = roofRaw == null && !vent ? null : roofPos, sh = this._has("sunshade") ? this._coverPos("sunshade") : null;
      const pct = (v) => (v <= 0 ? this._t("topview.win_closed") : v >= 100 ? this._t("topview.win_open") : Math.round(v) + "%");
      d.sunroof = sr == null ? (tilt ? true : null) : sr > 0 || tilt;
      if (vent) d.sunroof = true;
      d.roofTxt = vent ? this._t("topview.vent") : sr == null ? "" : sr >= 100 ? this._t("topview.open_m") : sr > 0 ? Math.round(sr) + "%" : tilt ? this._t("topview.tilt") : this._t("topview.closed_m");
      d.shadeVal = sh;
      d.shadeTxt = sh == null ? "" : sh <= 0 ? this._t("topview.closed") : sh >= 100 ? this._t("topview.open") : Math.round(sh) + "%";
      { /* every label opens the history of its entity (switched off together with the values: more_info: false) */
        const m = (k) => this._moreAttr(this._eid(k)), sw = (a, b) => (rhd ? [b, a] : [a, b]);
        const dr = (k) => m("door_" + k), wn = (k) => m("win_" + k);
        d.mo = { door: rhd ? { fl: dr("fr"), fr: dr("fl"), rl: dr("rr"), rr: dr("rl") } : { fl: dr("fl"), fr: dr("fr"), rl: dr("rl"), rr: dr("rr") },
                 win: rhd ? { fl: wn("fr"), fr: wn("fl"), rl: wn("rr"), rr: wn("rl") } : { fl: wn("fl"), fr: wn("fr"), rl: wn("rl"), rr: wn("rr") },
                 hood: m("hood"), trunk: m("trunk"), sunroof: m("sunroof"), shade: m("sunshade") };
      }
      const pos = (k) => this._coverPos(k) || 0, isOn = (v) => !!v;
      d.three = this._config.car_3d === false ? null : {
        doors: { fl: isOn(d.doors.fl), fr: isOn(d.doors.fr), rl: isOn(d.doors.rl), rr: isOn(d.doors.rr) },
        win: rhd ? { fl: pos("win_fr"), fr: pos("win_fl"), rl: pos("win_rr"), rr: pos("win_rl") }
                 : { fl: pos("win_fl"), fr: pos("win_fr"), rl: pos("win_rl"), rr: pos("win_rr") },
        hood: !!d.hood, trunk: !!d.trunk, sunroof: roofPos, tilt, lights: d.lights,
        shade: this._has("sunshade") ? pos("sunshade") : 100,
        color: parseColor(this._config.car_color) || null, chrome: this._c3dChrome(), fabric: this._cabinCfg().fabric || [58, 86, 86], rhd,
      };
      return d;
    }

    /* ------------------------------------------------------------- render */
    _render() {
      if (!this._found()) {
        this.shadowRoot.innerHTML = `<style>${BASE_CSS}</style><div class="shell"><p class="micro">MHA Bridge</p>
          <p style="margin-top:8px;font-size:13px">${this._t("status.no_car")}</p></div>`;
        return;
      }
      this._renderView(this._ctx());
      this._wire();
    }

    /* `view: top` draws the car from above (tyre pressures and doors on the drawing) instead of the side view. */
    _isTop() { return String(this._config.view || "side").toLowerCase() === "top"; }

    /* Full card: the car (side view, or from above with `view: top`), then actions, climate, tires, vehicle. */
    _renderView(c) {
      const top = this._isTop();
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}${top ? ".hero .n { font-size:46px; } .carwrap.top { max-width:290px; margin:12px auto 0; } .carwrap.top svg { overflow:visible; }" : ""}</style>
        <div class="shell">
          <div class="head">
            <div>
              <div class="title">${this._titleHtml(c)}</div>
              <div class="status ${c.warnStatus ? "warn" : ""}">${esc(c.statusLine)}</div>
            </div>
            <span class="micro">${this._headRight(c)}</span>
          </div>
          ${this._heroBlock(c)}
          ${this._fuelBar(c)}
          ${top ? `<div class="carwrap top">${CAR_TOP_SVG("", this._topData())}</div>` : `<div class="carwrap">${this._carBody(c.open)}</div>`}
          ${this._presetsBlock()}
          ${this._navRow()}
          ${this._mapBlock("overview")}
          ${this._openingsSection()}
          ${this._climatePanel()}
          ${this._comfortSections()}
          ${this._drivingSection(c)}
          ${top ? "" : this._tiresSection()}
          ${this._vehicleSection(c)}
          ${this._footer()}
        </div>`;
    }

    /* ------------------------------------------------ expand (compact card) */
    /* tap_action / car_tap_action: "expand" | "none" | an object like Home Assistant's own actions. */
    _tapAction(key, def) {
      let a = this._config && this._config[key];
      if (a == null || a === "") a = def;
      if (typeof a === "string") a = { action: a };
      if (!a || typeof a !== "object") a = { action: "none" };
      const act = String(a.action || "none").toLowerCase().replace(/_/g, "-");
      return { ...a, action: act === "perform-action" ? "call-service" : act };
    }

    _runTap(key, def) {
      const a = this._tapAction(key, def), h = this._hass;
      switch (a.action) {
        case "none": return;
        case "expand": this._openFullCard(); return;
        case "navigate": {
          if (!a.navigation_path) return;
          if (a.navigation_replace) history.replaceState(history.state, "", a.navigation_path); else history.pushState(null, "", a.navigation_path);
          window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !!a.navigation_replace } }));
          return;
        }
        case "url": {
          if (!a.url_path) return;
          // a path inside Home Assistant ("/car", "/lovelace/car") opens in the app itself, like navigate; only full URLs go to the browser
          if (/^\/(?!\/)/.test(a.url_path)) { history.pushState(null, "", a.url_path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); return; }
          window.open(a.url_path, "_blank", "noopener"); return;
        }
        case "more-info": {
          const id = a.entity || (this._config && this._config.entity);
          if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
          return;
        }
        case "toggle": if (h && a.entity) h.callService("homeassistant", "toggle", { entity_id: a.entity }); return;
        case "call-service": {
          const svc = String(a.perform_action || a.service || ""), [dom, name] = svc.split(".");
          if (!h || !dom || !name) return;
          const data = { ...(a.data || a.service_data || {}) };
          h.callService(dom, name, data, a.target || undefined);
          return;
        }
      }
    }

    _wireExpand() {
      const sh = this.shadowRoot;
      const inner = (ev) => ev.target && ev.target.closest && ev.target.closest("button, a, input, select, textarea, [data-act], [data-more], [data-tab], .act, .cbtn");
      const wrap = sh.querySelector(".carwrap.expandable");
      if (wrap && !wrap.dataset.wired) {
        wrap.dataset.wired = "1";
        const open = (ev) => { ev.preventDefault(); ev.stopPropagation(); this._runTap("car_tap_action", "expand"); };
        wrap.addEventListener("click", open);
        wrap.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") open(ev); });
      }
      /* the car of any other card: only when car_tap_action is set */
      const carDef = this._config && this._config.car_tap_action != null && this._tapAction("car_tap_action", "none").action !== "none";
      if (carDef) sh.querySelectorAll(".carwrap:not(.expandable)").forEach((w) => {
        if (w.dataset.wired) return; w.dataset.wired = "1"; w.style.cursor = "pointer";
        w.addEventListener("click", (ev) => { if (inner(ev)) return; ev.stopPropagation(); this._runTap("car_tap_action", "none"); });
      });
      /* the card itself */
      const shell = sh.querySelector(".shell");
      if (shell && !shell.dataset.wired && this._tapAction("tap_action", "none").action !== "none") {
        shell.dataset.wired = "1"; shell.style.cursor = "pointer";
        shell.addEventListener("click", (ev) => { if (inner(ev) || (ev.target.closest && ev.target.closest(".carwrap.expandable"))) return; this._runTap("tap_action", "none"); });
      }
    }

    /* Tapping the car opens the real full card in a modal dialog. It lives in
     * document.body (not the shadow root) so Lovelace layout transforms cannot
     * push it out of the viewport, and is kept fed with every hass update. */
    _openFullCard() {
      if (!this._expandDialog) {
        const dlg = document.createElement("dialog");
        dlg.className = "mha-expand";
        dlg.style.cssText = [
          "position:fixed", "inset:0", "margin:auto", "width:min(520px,96vw)", "max-height:92vh",
          "overflow-y:auto", "overscroll-behavior:contain", "border:none", "padding:0",
          "background:transparent", "color:inherit",
        ].join(";");
        if (!document.getElementById("mha-expand-backdrop")) {
          const st = document.createElement("style");
          st.id = "mha-expand-backdrop";
          st.textContent = "dialog.mha-expand::backdrop{background:rgba(0,0,0,.62)}";
          document.head.appendChild(st);
        }
        /* popup_card: which card the window shows; popup_map: true / false = the map in the window on / off (omitted = as on the card) */
        const pc = String(this._config.popup_card || "mha-card-full").replace(/^custom:/, "").toLowerCase();
        const card = document.createElement(["mha-card", "mha-card-full", "mha-card-compact", "mha-card-mini"].includes(pc) ? pc : "mha-card-full");
        try {
          const cc = { ...(this._config || {}) }; delete cc.tap_action; cc.car_tap_action = "none"; delete cc.popup_card; delete cc.popup_map;
          if (this._config.popup_map === false) cc.map = false; else if (this._config.popup_map === true && !cc.map) cc.map = true;
          card.setConfig(cc);
        }
        catch (err) { console.warn("mha-card: could not build the expanded card:", err); return; }
        dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
        dlg.appendChild(card);
        document.body.appendChild(dlg);
        this._expandDialog = dlg;
        this._expandCard = card;
      }
      /* open first, then feed hass: the map inside is built in a visible box, so Leaflet gets a real size */
      this._expandDialog.showModal();
      this._expandCard.hass = this._hass;
      const ec = this._expandCard; [60, 300, 900].forEach((ms) => setTimeout(() => { if (this._expandDialog && this._expandDialog.open && ec._mapRefresh) ec._mapRefresh(); }, ms));
    }

    /* ---------------------------------------- icon buttons (compact / mini) */
    _iconButtons(list) {
      const def = {
        auto: () => this._actBtn("auto", this._t("act.auto"), "auto", "climate_auto", this._isOn("climate_auto")),
        ac: () => this._actBtn("ac", this._t("act.ac"), "ac", "ac", this._isOn("ac")),
        defrost: () => this._actBtn("defrost", this._t("act.defrost"), "defrost", "defrost_front", this._isOn("defrost_front")),
        rear: () => this._actBtn("rear", this._t("act.rear"), "defrost_rear", "defrost_rear", this._isOn("defrost_rear")),
        recirc: () => this._actBtn("recirc", this._t("act.recirc"), "recirc", "circulation", (this._st("circulation") || {}).state === "inside"),
        wheel: () => this._actBtn("wheel", this._t("act.wheel"), "steering", "steering_heat",
          !!this._st("steering_heat") && this._st("steering_heat").state !== "off" && OK(this._st("steering_heat"))),
        heat: () => this._actBtn("maxheat", this._t("act.maxheat"), "heat", "temp_driver", false, this._t("tip.maxheat")),
        cool: () => this._actBtn("maxcool", this._t("act.maxcool"), "cool", "temp_driver", false, this._t("tip.maxcool")),
      };
      const alias = { maxheat: "heat", maxcool: "cool", climate: "auto" };
      return list.map((k) => String(k).toLowerCase()).map((k) => alias[k] || k)
        .filter((k) => Object.prototype.hasOwnProperty.call(def, k)).map((k) => def[k]()).join("");
    }

    _buttons(fallback) {
      return Array.isArray(this._config.buttons) ? this._config.buttons : fallback;
    }
  }

  /* ================================================================= top view */
  /* ================================================================= compact */
  class MhaCardCompact extends MhaCard {
    getCardSize() { return 4; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _renderView(c) {
      const chips = [
        c.moving && `<span class="chip warn">${esc(this._t("chip.driving"))}</span>`,
        !c.moving && this._config.show_parked && `<span class="chip">${esc(this._t("chip.parked"))}</span>`,
        c.engineOn && `<span class="chip on">${esc(this._t("chip.engine_on"))}</span>`,
        c.climateOn && `<span class="chip on">${esc(this._t("chip.climate_on"))}</span>`,
        c.doors.length > 0 && `<span class="chip warn">${esc(this._t("chip.n_open", "", { count: c.doors.length }))}</span>`,
        c.winOpen > 0 && `<span class="chip warn">${esc(this._t("chip.windows_open"))}</span>`,
        c.unlocked && !c.moving && `<span class="chip warn">${esc(this._t("chip.unlocked"))}</span>`,
        c.low && `<span class="chip warn">${esc(this._t(c.crit ? "chip.critical_fuel" : "chip.low_fuel"))}</span>`,
        c.tireLow.length > 0 && `<span class="chip crit"${this._tireColorStyle()}>${esc(this._t("chip.tire_low"))} ${esc(c.tireLow.map((k) => this._t("tire.short." + k)).join(" "))}</span>`,
      ].filter(Boolean).join("");
      const temp = OK(c.interior) && NUM(c.interior) != null
        ? this._t("label.temp_in", "", { temp: Math.round(NUM(c.interior)) }) : "";
      const right = [this._headRight(c), esc(temp)].filter(Boolean).join(" · ");
      const actions = this._iconButtons(this._buttons(["auto", "ac", "heat", "cool", "defrost", "rear"]));

      this.shadowRoot.innerHTML = `<style>${BASE_CSS}
        .head { display:flex; align-items:baseline; justify-content:space-between; }
        .title { font-size:13px; font-weight:600; letter-spacing:.02em; display:flex; align-items:center; gap:7px; }
        .dot { width:6px; height:6px; border-radius:50%; background:${ACCENT}; }
        .dot.off { background:${AMBER}; }
        .hero { display:flex; align-items:center; gap:14px; margin:8px 0 2px; }
        .hero .n { font-size:44px; }
        .hero .u { font-size:13px; color: var(--secondary-text-color); margin-left:3px; }
        .hero .sub { margin-top:4px; }
        .carwrap { flex:1; max-width:300px; margin-left:auto; }
        /* the buttons share the row in equal columns whatever the label length; long labels wrap inside their button */
        .actions { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:6px; }
        .act { min-width:0; padding:10px 1px 8px; justify-content:flex-start; }
        .act span { max-width:100%; text-align:center; font-size:8.5px; letter-spacing:.03em; line-height:1.2; overflow-wrap:anywhere; }
        @container (max-width: 330px) { .act span { display:none; } .act { padding:11px 0; } }
        </style>
        <div class="shell">
          <div class="head">
            <div class="title">${this._titleHtml(c)}</div>
            <span class="micro">${right}</span>
          </div>
          <div class="hero">
            <div>
              <div class="num n ${c.range === "—" ? "unavail" : ""}">${c.range}<span class="u">${esc(UNIT(c.rangeSt) || "km")}</span></div>
              <div class="micro sub">${esc(this._t("label.range"))}</div>
            </div>
            <div class="carwrap${this._tapAction("car_tap_action", "expand").action !== "none" ? " expandable" : ""}"${this._tapAction("car_tap_action", "expand").action !== "none" ? ` role="button" tabindex="0"` : ""}
                 ${this._tapAction("car_tap_action", "expand").action === "expand" ? `title="${esc(this._t("tooltip.open_the_full_card"))}"` : ""}>${this._carBody(c.open)}</div>
          </div>
          <div style="margin:2px 0 10px">${this._fuelBar(c)}</div>
          <div class="chips" style="margin-bottom:12px">${chips || `<span class="chip">${esc(this._t("chip.parked"))}</span>`}</div>
          <div class="actions">${actions}</div>
        </div>`;
    }
  }

  /* ==================================================================== mini */
  class MhaCardMini extends MhaCard {
    getCardSize() { return 3; }
    getGridOptions() { return { columns: 6, rows: 3, min_columns: 4, min_rows: 3 }; }

    _renderView(c) {
      const temp = OK(c.interior) && NUM(c.interior) != null
        ? this._t("label.temp_in", "", { temp: Math.round(NUM(c.interior)) }) : "";
      const actions = this._iconButtons(this._buttons(["auto", "heat", "cool"]));

      this.shadowRoot.innerHTML = `<style>${BASE_CSS}
        .shell { padding: 14px 16px 12px; }
        .head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .title { font-size:12px; font-weight:600; letter-spacing:.02em;
                 display:flex; align-items:center; gap:6px; min-width:0; flex:1; }
        .title em { font-style:normal; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dot { width:5px; height:5px; border-radius:50%; background:${ACCENT}; flex:none; }
        .dot.off { background:${AMBER}; }
        .temp { font-size:12px; color: var(--secondary-text-color); flex:none;
                font-variant-numeric: tabular-nums; }
        .mid { margin:8px 0 2px; }
        .mid .n { font-size:34px; }
        .mid .u { font-size:12px; color: var(--secondary-text-color); margin-left:2px; }
        .status { font-size:11px; color: var(--secondary-text-color); margin-top:1px; }
        .status.warn { color:${AMBER}; }
        .status.tirecrit { color: var(--tc, var(--geely-critical, #e5484d)); font-weight:600; }
        .actions { display:flex; gap:6px; margin-top:10px; }
        .act { flex:1; padding:8px 0 7px; border-radius:12px; }
        .act span { display:none; }
        .act svg { width:19px; height:19px; }
        </style>
        <div class="shell">
          <div class="head">
            <div class="title">
              <i class="dot ${c.online ? "" : "off"}"></i>
              <em>${this._config.hide_name ? "" : esc(this._title())}</em>
            </div>
            ${temp ? `<span class="temp">${esc(temp)}</span>` : ""}
          </div>
          <div class="mid">
            <span class="num n ${c.range === "—" ? "unavail" : ""}">${c.range}</span><span class="u">${esc(UNIT(c.rangeSt) || "km")}</span>
            <div class="status ${c.tireLow.length ? "tirecrit" : c.warnStatus ? "warn" : ""}"${this._tireColorStyle()}>${esc(c.tireLow.length
              ? this._t("chip.tire_low") + " " + c.tireLow.map((k) => this._t("tire.short." + k)).join(" ") : c.statusLine)}</div>
          </div>
          <div class="actions">${actions}</div>
        </div>`;
    }
  }

  /* ================================================================== tabs */
  /* One card, five tabs: Overview, Climate, Body, Comfort, Data. On a wide card the car,
   * range and chips stay in a side column and only the tab content scrolls; on a narrow
   * card everything stacks. Tabs with nothing to show (no windows, no ambient light) vanish. */
  class MhaCardTabs extends MhaCard {
    /* the presets (when listed in the config) sit on the overview tab */
    getCardSize() { return 7; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    _tabList() {
      const all = {
        overview: true,
        climate: true,
        body: true,
        comfort: (!this._hidden("ambient") && ["ambient_power", "ambient_brightness", "ambient_mode", "ambient_effect", "ambient_color"].some((k) => this._has(k)))
          || (!this._hidden("massage") && ["massage_driver", "massage_passenger"].some((k) => this._has(k))),
        data: true,
      };
      const want = Array.isArray(this._config.tabs) && this._config.tabs.length
        ? this._config.tabs.map((k) => String(k).toLowerCase()) : ["overview", "climate", "body", "comfort", "data"];
      return want.filter((k) => all[k]);
    }

    _tabKey() { return "mha-card-tab:" + (this._config.name || "default"); }

    _currentTab(list) {
      let t = this._tab;
      if (!t) {
        if (this._config.remember_tab) { try { t = window.localStorage.getItem(this._tabKey()); } catch (e) { t = null; } }
        if (!t) t = String(this._config.default_tab || "overview").toLowerCase();
      }
      return list.includes(t) ? t : list[0];
    }

    /* the picture follows the tab. Overview: the side view; Climate: the cabin from above; Body: the top view with
     * the roof; Comfort: the cabin again (ambient light, massage); Data: the cockpit. tab_images: false keeps one picture;
     * tab_images: { overview: side|top|cabin|cockpit|none, climate: ..., ... } picks each. */
    _baseHero() { return this._isTop() ? "top" : "side"; }

    _heroKind(tab) {
      const cfg = this._config.tab_images, base = this._baseHero();
      if (cfg === false) return base;
      const def = { overview: base, climate: "cabin", body: "top", comfort: "cabin", data: "cockpit" };
      const v = cfg && typeof cfg === "object" ? cfg[tab] : null;
      return ["side", "top", "cabin", "cockpit", "none"].includes(v) ? v : (def[tab] || base);
    }

    /* every picture sits in a "stage" of one fixed shape, so the controls below never jump when the tab changes. */
    _carBlock(c, tab) {
      const stage = (h) => `<div class="stage">${h}</div>`;
      switch (this._heroKind(tab || "overview")) {
        case "side": return stage(`<div class="carwrap">${this._carBody(c.open)}</div>`);
        case "top": return stage(`<div class="carwrap top">${CAR_TOP_SVG("", this._topData())}</div>`);
        case "cabin": return stage(this._cabinBlock(tab === "comfort" ? "comfort" : "climate"));
        case "cockpit": return stage(this._cockpitBlock());
        default: return "";
      }
    }

    /* The panel layout overrides this; null = ordinary card. */
    _panelSpec() { return null; }
    _mapColumn() { return ""; }

    _chips(c) {
      return [
        c.moving && `<span class="chip warn">${esc(this._t("chip.driving"))}</span>`,
        !c.moving && this._config.show_parked && `<span class="chip">${esc(this._t("chip.parked"))}</span>`,
        c.engineOn && `<span class="chip on">${esc(this._t("chip.engine_on"))}</span>`,
        c.climateOn && `<span class="chip on">${esc(this._t("chip.climate_on"))}</span>`,
        c.doors.length > 0 && `<span class="chip warn">${esc(this._t("chip.n_open", "", { count: c.doors.length }))}</span>`,
        c.winOpen > 0 && `<span class="chip warn">${esc(this._t("chip.windows_open"))}</span>`,
        c.unlocked && !c.moving && `<span class="chip warn">${esc(this._t("chip.unlocked"))}</span>`,
        c.low && `<span class="chip warn">${esc(this._t(c.crit ? "chip.critical_fuel" : "chip.low_fuel"))}</span>`,
        c.tireLow.length > 0 && `<span class="chip crit"${this._tireColorStyle()}>${esc(this._t("chip.tire_low"))} ${esc(c.tireLow.map((k) => this._t("tire.short." + k)).join(" "))}</span>`,
      ].filter(Boolean).join("");
    }

    _doorsBlock() {
      const row = (k, label) => {
        const st = this._st(k);
        if (!st) return "";
        const open = st.state === "on";
        return this._row(label, null, { value: OK(st) ? this._t(open ? "topview.open" : "topview.closed") : "—", warn: open, more: st.entity_id });
      };
      const rows = row("door_fl", this._t("label.driver")) + row("door_fr", this._t("label.passenger"))
        + row("door_rl", this._t("tire.rl")) + row("door_rr", this._t("tire.rr"));
      return rows ? `<hr class="hairline"><p class="micro">${icon("driving")} ${esc(this._t("section.doors"))}</p><div class="grid sec">${rows}</div>` : "";
    }

    _pane(tab, c) {
      const inner = this._paneInner(tab, c);
      return tab === "overview" ? inner : inner + this._mapBlock(tab);
    }

    _paneInner(tab, c) {
      switch (tab) {
        case "overview":
          /* from above the tyres and doors are on the drawing, so Overview shows the vehicle data instead */
          return `${this._presetsBlock(true)}${this._navRow()}${this._mapBlock("overview")}${this._isTop() ? this._vehicleSection(c) : ""}`;
        case "climate":
          return `${this._climatePanel(true)}${this._rearSection()}`;
        case "body":
          return `${this._openingsSection()}${this._doorsBlock()}`;
        case "comfort":
          return `${this._ambientSection()}${this._massageSection()}`;
        default:
          return `${this._drivingSection(c)}${this._vehicleSection(c)}${this._tiresSection()}`;
      }
    }

    _renderView(c) {
      const list = this._tabList();
      const tab = this._currentTab(list);
      const old = this.shadowRoot.querySelector(".pane");
      const keep = old ? old.scrollTop : 0;
      const ic = { overview: "driving", climate: "climate", body: "window", comfort: "ambient", data: "trip" };
      const bar = list.map((k) => `<button class="tab ${k === tab ? "on" : ""}" data-tab="${k}" role="tab"
          aria-selected="${k === tab}">${icon(ic[k])}<span>${esc(this._t("tab." + k))}</span></button>`).join("");
      const h = this._config.height == null ? 440 : Number(this._config.height);
      const chips = this._chips(c);
      const ps = this._panelSpec();
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}${CARD_CSS}
        .tside .stage { position:relative; width:100%; aspect-ratio:1.3; margin:6px 0 0; display:flex; align-items:center; justify-content:center; }
        .tside .stage .carwrap { margin:0; max-width:none; width:100%; }
        .tside .stage .carwrap.top { width:auto; height:100%; max-width:none; aspect-ratio:400/720; margin:0; }
        .tside .stage .carwrap.top svg.cartop { width:100%; height:100%; }
        .tside .stage .carwrap.cabinflat, .tside .stage .carwrap.cockpit { max-width:none; width:100%; margin:0; }
        .tside.nostage .stage { aspect-ratio:auto; display:block; }
        .tside.nostage .stage .carwrap.top { width:100%; height:auto; aspect-ratio:auto; max-width:230px; margin:8px auto 0; }
        .tside.nostage .stage .carwrap.top svg.cartop { height:auto; }
        .tside.nostage .stage .carwrap { margin:6px auto 0; }
        .tshell { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; }
        .tside .hero { margin:10px 0 4px; }
        .tside .hero .n { font-size:46px; }
        .tside .carwrap { max-width:300px; margin:6px auto 0; }
        .tside .carwrap.top { max-width:230px; margin:8px auto 0; }
        @container (min-width: 720px) { .tside .carwrap.top { max-width:200px; } }
        .tside .carwrap.top svg { overflow:visible; }
        .tside .chips { margin-top:10px; }
        .tbar { display:flex; gap:4px; padding:4px; border-radius:16px; background: rgba(120,130,140,.12); }
        .tab { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px;
               padding:8px 4px 7px; border:none; border-radius:12px; background:none; cursor:pointer;
               color: var(--secondary-text-color); font: inherit; font-size:11px; font-weight:600;
               -webkit-tap-highlight-color: transparent; transition: background .15s ease, color .15s ease; }
        .tab svg { width:19px; height:19px; }
        .tab span { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tab.on { color:${ON_TEXT}; background: color-mix(in srgb, ${ACCENT} 18%, transparent);
                  box-shadow: 0 0 0 1px color-mix(in srgb, ${ACCENT} 45%, transparent) inset; }
        @media (hover: hover) { .tab:not(.on):hover { background: rgba(120,130,140,.16); } }
        .pane { margin-top:10px; }
        .pane > .hairline:first-child { display:none; }
        .pane > .micro:first-child, .pane > p.micro.csub:first-child { margin-top:2px; }
        @container (min-width: 720px) {
          .tshell { grid-template-columns: 290px minmax(0,1fr); gap:22px; align-items:start; }
          .tside { position:sticky; top:0; }
          .tab { flex-direction:row; justify-content:center; gap:7px; font-size:12px; padding:9px 6px; }
          .pane { ${h > 0 ? `max-height:${h}px; overflow-y:auto; padding-right:6px; scrollbar-width:thin;` : ""} }
        }
        ${ps ? PANEL_CSS : ""}
        </style>
        <div class="shell"${ps ? (ps.rot ? ` style="position:absolute;top:0;left:0;box-sizing:border-box;width:${ps.w}px;height:${ps.hpx}px;transform-origin:0 0;transform:translateX(${ps.shift}px) rotate(90deg) scale(${ps.z});"` : ` style="zoom:${ps.z};${ps.hpx ? `height:${ps.hpx}px;` : ""}"`) : ""}>
          <div class="tshell${this._p3 ? " p3" : ""}">
            <div class="tside${this._config.stable_tabs === false && !ps ? " nostage" : ""}">
              <div class="head">
                <div>
                  <div class="title">${this._titleHtml(c)}</div>
                  <div class="status ${c.warnStatus ? "warn" : ""}">${esc(c.statusLine)}</div>
                </div>
                <span class="micro">${this._headRight(c)}</span>
              </div>
              ${this._heroBlock(c)}
              ${this._fuelBar(c)}
              ${this._carBlock(c, tab)}
              ${chips ? `<div class="chips">${chips}</div>` : ""}
            </div>
            <div class="tmain">
              <div class="tbar" role="tablist">${bar}</div>
              <div class="pane" role="tabpanel">${this._pane(tab, c)}</div>
            </div>
            ${this._mapColumn()}
          </div>
          ${this._footer()}
        </div>`;
      const pane = this.shadowRoot.querySelector(".pane");
      if (pane && keep) pane.scrollTop = keep;
    }

    _wire() {
      super._wire();
      this.shadowRoot.querySelectorAll("[data-tab]").forEach((el) => el.addEventListener("click", () => {
        this._tab = el.dataset.tab;
        if (this._config.remember_tab) { try { window.localStorage.setItem(this._tabKey(), this._tab); } catch (e) { /* private mode */ } }
        const pane = this.shadowRoot.querySelector(".pane");
        if (pane) pane.scrollTop = 0;
        this._safeRender();
        const np = this.shadowRoot.querySelector(".pane");
        if (np) np.scrollTop = 0;
      }));
    }
  }

  /* panel: the tabbed card for a whole screen (a laptop at 1920x1080, a wall tablet). The card is laid out like the wide
   * tabbed card (about 1040 css-px wide) and scaled up with CSS zoom to fill the width and the height of the screen. */
  const PANEL_CSS = `
    .shell { display:flex; flex-direction:column; }
    .tshell { flex:1; min-height:0; grid-template-columns: 440px minmax(0,1fr); gap:28px; align-items:stretch; }
    .tside { position:static; display:flex; flex-direction:column; min-height:0; }
    .tside .stage { flex:1 1 0; aspect-ratio:auto; min-height:0; }
    .tside .stage .carwrap.top { height:100%; }
    .tside .chips { margin-top:auto; padding-top:10px; }
    .tmain { display:flex; flex-direction:column; min-height:0; }
    .tab { font-size:13px; padding:11px 8px; }
    .pane { flex:1; min-height:0; max-height:none; overflow-y:auto; scrollbar-width:thin; padding-right:8px; }
    .tshell.p3 { grid-template-columns: 340px minmax(0,1fr) minmax(0,31%); gap:24px; }
    .tshell.p3 .tab { flex-direction:column; gap:3px; font-size:12px; padding:9px 4px 8px; }
    .tshell.p3 .tab svg { width:20px; height:20px; }
    .tmap { display:flex; flex-direction:column; min-height:0; min-width:0; }
    .tmap .micro.csub { margin:2px 0 0; }
    .tmap .mapbox { margin-top:8px; }`;

  class MhaCardPanel extends MhaCardTabs {
    get _isPanel() { return true; }
    getCardSize() { return 12; }
    getGridOptions() { return { columns: 12, min_columns: 12 }; }
    _tabKey() { return "mha-card-tab:panel:" + (this._config.name || "default"); }
    /* The panel is a landscape "canvas" scaled to the screen. Without the map it is two columns (car | controls), 1040 css-px
     * wide at least; with the map it is three (car | controls | map in the right third), 1280 css-px wide at least. The scale is
     * between 0.6 and 2.6, so the smallest screen for the three columns is 768 x 384 css-px (1280 x 0.6, 640 x 0.6); below that
     * the card falls back to the tabbed card. On a touch screen held upright (portrait) the whole canvas is turned by 90 degrees
     * and fills the screen, so the phone only has to be turned (`rotate: auto|always` turns it; the default `off` keeps the tabbed card there instead). */
    _mapColumn() {
      if (!this._p3) return "";
      return `<div class="tmap">${this._mapHead(this._mapCfg() || {})}<div class="mapbox fill"><slot name="map"></slot></div></div>`;
    }
    _mapBlock(tab) { return this._p3 ? "" : super._mapBlock(tab); }
    _panelSpec() {
      const cfg = this._config, r = this.getBoundingClientRect();
      const W = r.width || this.clientWidth || window.innerWidth;
      const mc = this._mapCfg();
      const want3 = !!(mc && this._hass && this._hass.states[mc.entity]);
      const DW = want3 ? 1280 : 1040, DH = 640, MINZ = 0.6;
      const topPx = Math.max(0, r.top), vh = window.innerHeight, vw = window.innerWidth;
      let coarse = false;
      try { coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { /* default */ }
      const rotMode = String(cfg.rotate == null ? "off" : cfg.rotate).toLowerCase();
      const portrait = vh > vw * 1.05 && W < 700;
      const wasRot = this._rot;
      this._rot = false; this._p3 = false; this._mapFill = false;
      this.style.height = ""; this.style.position = ""; this.style.overflow = "";
      if (portrait && rotMode !== "off" && (coarse || rotMode === "always") && !(Number(cfg.scale) > 0)) {
        const long = Math.max(300, Math.round(vh - topPx - 14)), short = Math.round(W);
        const z = Math.max(0.4, Math.min(2, Math.round(Math.min(long / DW, short / DH) * 100) / 100));
        this._rot = true; this._p3 = want3; this._mapFill = want3; this._zoom = z;
        this.style.height = long + "px"; this.style.position = "relative"; this.style.overflow = "hidden";
        return { rot: true, z, w: Math.round(long / z), hpx: Math.round(short / z), shift: short };
      }
      const minW = Number(cfg.panel_min_width) || 0;
      if (minW > 0 && W < minW) return null;          // `panel_min_width`: narrower than this -> the tabbed card (portrait layout)
      if (W < DW * MINZ && !(Number(cfg.scale) > 0)) return null;     // a narrow column: behave like the tabbed card
      const availH = Number(cfg.panel_height) || Math.max(DH * MINZ, vh - topPx - 14);
      let z = Number(cfg.scale);
      if (z > 0) z = Math.max(0.5, z);                 // an explicit scale may also shrink the card
      else {
        z = Math.min(W / DW, availH / DH);
        const zm = Number(cfg.zoom);                    // `zoom` trims the automatic fit: 0.85 = 15 % smaller, more room, no scrolling
        if (zm >= 0.5 && zm <= 2) z = Math.min(z * zm, W / DW);
        z = Math.max(MINZ, z);
      }
      z = Math.max(0.5, Math.min(2.6, Math.round(z * 100) / 100));
      this._zoom = z; this._p3 = want3; this._mapFill = want3;
      return { z, hpx: Math.round(availH / z) };
    }
    connectedCallback() {
      super.connectedCallback();
      if (this._pRo || !window.ResizeObserver) return;
      let last = "";
      const check = () => {
        this._pRaf = 0;
        const r = this.getBoundingClientRect(), key = Math.round(r.width / 8) + ":" + Math.round(window.innerHeight / 8) + ":" + Math.round(window.innerWidth / 8) + ":" + Math.round(r.top / 8);
        if (key !== last && this._hass) { last = key; this._safeRender(); }
      };
      this._pRo = new ResizeObserver(() => { if (!this._pRaf) this._pRaf = requestAnimationFrame(check); });
      this._pRo.observe(this);
      this._onWin = () => { if (!this._pRaf) this._pRaf = requestAnimationFrame(check); };
      window.addEventListener("resize", this._onWin);
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      if (this._pRo) { this._pRo.disconnect(); this._pRo = null; }
      if (this._onWin) { window.removeEventListener("resize", this._onWin); this._onWin = null; }
    }
  }

  /* ============================================================ visual editor
   * The card editor of Home Assistant (Edit card -> the form instead of YAML). It is built from the stock
   * ha-form, so every field looks like the rest of Home Assistant. Only the keys the user changes are written to the
   * config; everything else (and any value the form cannot show, like a colour name or a map with extra keys) stays as it is.
   * Presets have their own list with add / remove / reorder; `actions` of a preset are still written in YAML. */
  const ED_TXT = {
    en: {
      "sec.general": "General", "sec.look": "Look of the car", "sec.colors": "Colours", "sec.taps": "Taps", "sec.tabs": "Tabs and panel",
      "sec.buttons": "Buttons and hidden blocks", "sec.nav": "Navigation and map", "sec.fuel": "Fuel and tyres", "sec.presets": "Presets",
      "sec.cabin": "Cabin", "sec.more": "More", "tab.main": "Main", "tab.look": "Look", "tab.act": "Actions", "tab.pre": "Presets", "tab.data": "Data and map",
      name: "Title", hide_name: "Hide the title", prefix: "Entity prefix (slug)", tracker: "Device tracker of the car",
      show_parked: "Show “Parked”", rhd: "Right-hand drive", more_info: "Tap on a value opens its history", confirm_open: "Ask before opening windows and sunroof",
      zoom: "Size of the card (zoom)", demo: "Demo mode (built-in model of the car)", debug: "Debug (show resolved entities)", text_size: "Text size (multiplier)",
      view: "Car view", "o.side": "From the side", "o.top": "From above", car_image_kind: "Car picture", car_image_url: "Address of your picture", car_image_facing: "Picture faces", car_3d: "3D model on the top view",
      wheels: "Rim design", wheel_spin: "Spinning rims (side view)", wheel_circumference: "Wheel circumference, m", wheel_spin_entity: "Speed sensor for the rims",
      headlights: "Lamps glow while the engine runs", arch_color: "Wheel-arch trim", cd_front_bumper: "Chrome delete: front bumper", cd_rear_bumper: "Chrome delete: rear bumper",
      cd_doors: "Chrome delete: door frames", cd_rails: "Chrome delete: roof rails", cd_windows: "Chrome delete: window mouldings",
      c_car_color: "Body colour", c_accent: "Accent of the card", c_warn_color: "Warning colour", c_critical_color: "Critical colour",
      c_fuel_color_ok: "Fuel bar: normal", c_fuel_color_warn: "Fuel bar: low", c_fuel_color_critical: "Fuel bar: almost out", c_tire_color_critical: "Critical tyre pressure",
      reset: "Default",
      tap_action_kind: "Tap on the card", tap_action_nav: "Page to open", tap_action_url: "Link", tap_action_entity: "Entity", tap_action_perform: "Action (domain.service)",
      car_tap_action_kind: "Tap on the car", car_tap_action_nav: "Page to open", car_tap_action_url: "Link", car_tap_action_entity: "Entity", car_tap_action_perform: "Action (domain.service)",
      "k.expand": "Open the full card in a window", "k.none": "Nothing", "k.navigate": "Go to a page", "k.url": "Open a link", "k.more-info": "Open the history of an entity", "k.call-service": "Call an action",
      tabs: "Tabs (in order)", default_tab: "First tab", remember_tab: "Remember the last opened tab (otherwise always the first one)", height: "Height of the tab area, px (0 = unlimited)", tab_images: "The picture follows the tab", stable_tabs: "Stable picture size",
      scale: "Absolute zoom (panel)", panel_height: "Height, px (panel)", panel_min_width: "Narrower than, px: tabbed card (panel; 0 = off)", rotate: "Phone held upright (panel)", "o.rot_auto": "Turn to landscape", "o.rot_off": "Tabbed card instead", "o.rot_always": "Always turn when upright",
      buttons: "Quick buttons (compact and mini)", hide: "Hide buttons and blocks", climate_buttons: "Climate buttons (top row)",
      nav: "Navigation apps", nav_mode: "Route or location", nav_travel: "Travel mode", map_on: "Map inside the card", map_zoom: "Map zoom",
      tank_size: "Tank size, L", fuel_warn: "Low fuel at, %", fuel_critical: "Critical fuel at, %", tire_critical: "Critical tyre pressure",
      cabin_fabric: "Cabin fabric", cabin_trim: "Cabin trim strip",
      "add": "Add a preset", "add6": "Add the six standard presets", "del": "Remove", "up": "Up", "down": "Down", "np": "No presets: the card shows none. Add your own or the six standard ones.",
      pr_help: "Every key is optional; what is not set is left as it is on the car. Windows, sunroof and blind: closed, open or 0–100. Seats, windows, rear climate and any Home Assistant actions are under “More steps”.",
      p_id: "ID", p_name: "Label", p_icon: "Icon", p_temp: "Temperature (number, min or max)", p_fan: "Fan speed", p_flow: "Air flow", p_circ: "Recirculation",
      p_auto: "Auto", p_ac: "A/C", p_defrost: "Front defrost", p_rear: "Rear defrost", p_seat_heat: "Seat heating", p_seat_vent: "Seat ventilation", p_wheel: "Steering wheel heating",
      p_windows: "Windows (closed / open / 0–100)", p_sunroof: "Sunroof (closed / open / vent / 0–100)", p_sunshade: "Sunshade (closed / open / 0–100)", p_enabled: "Show on the card",
      "t.keep": "Leave as it is", "t.on": "On", "t.off": "Off", "o.auto": "Automatic", "o.left": "Left", "o.right": "Right", "o.monjaro": "Geely Monjaro", "o.drawing": "Simple drawing", "o.custom": "Your own picture",
      "o.black": "Black", "o.body": "Body colour", "o.original": "As in the picture", "o.inside": "Inside", "o.outside": "Outside", "o.route": "Route to the car", "o.locate": "Show the car",
      "o.face": "Face", "o.leg": "Legs", "o.face_leg": "Face and legs", "o.window": "Windscreen", "o.face_window": "Face and windscreen", "o.leg_window": "Legs and windscreen", "o.all": "All",
      "o.green": "Green", "o.light_gray": "Light grey", "o.dark_gray": "Dark grey", "o.bronze": "Bronze", "o.silver": "Silver", "o.gold": "Gold",
      "o.overview": "Overview", "o.climate": "Climate", "o.body": "Body", "o.comfort": "Comfort", "o.data": "Data",
      "o.driving": "Driving", "o.walking": "Walking", "o.transit": "Transit", "o.bicycling": "Bicycling",
      "o.heat": "Max heat", "o.cool": "Max cold", "o.recirc": "Recirculation", "o.wheel": "Steering wheel", "o.defrost": "Front defrost", "o.rear": "Rear defrost", "o.ac": "A/C",
      "o.maxheat": "Max heat", "o.maxcool": "Max cold", "o.seat_heating": "Seat heating", "o.seat_cooling": "Seat ventilation", "o.windows": "Windows", "o.lock": "Lock",
      "o.rear_climate": "Rear climate", "o.gclean": "Air cleaning", "o.ambient": "Ambient light", "o.massage": "Massage", "o.presets": "Presets",
      "o.yandex": "Yandex Maps", "o.maps": "Google Maps", "o.osm": "OpenStreetMap", "o.apple": "Apple Maps", "o.here": "HERE WeGo",
    },
    ru: {
      "sec.general": "Основное", "sec.look": "Внешний вид машины", "sec.colors": "Цвета", "sec.taps": "Нажатия", "sec.tabs": "Вкладки и панель",
      "sec.buttons": "Кнопки и скрытые блоки", "sec.nav": "Навигация и карта", "sec.fuel": "Топливо и шины", "sec.presets": "Пресеты",
      "sec.cabin": "Салон", "sec.more": "Прочее", "tab.main": "Основное", "tab.look": "Вид", "tab.act": "Действия", "tab.pre": "Пресеты", "tab.data": "Данные и карта",
      name: "Заголовок", hide_name: "Скрыть заголовок", prefix: "Префикс сущностей (slug)", tracker: "Трекер (device_tracker) машины",
      show_parked: "Показывать «Стоянка»", rhd: "Правый руль", more_info: "Нажатие на значение открывает историю", confirm_open: "Спрашивать перед открытием окон и люка",
      zoom: "Размер карточки (масштаб)", demo: "Демо-режим (встроенная модель машины)", debug: "Отладка (показать найденные сущности)", text_size: "Размер текста (множитель)",
      view: "Вид машины", "o.side": "Сбоку", "o.top": "Сверху", car_image_kind: "Картинка машины", car_image_url: "Адрес своей картинки", car_image_facing: "Машина смотрит", car_3d: "3D-модель на виде сверху",
      wheels: "Дизайн дисков", wheel_spin: "Вращение дисков (вид сбоку)", wheel_circumference: "Окружность колеса, м", wheel_spin_entity: "Датчик скорости для дисков",
      headlights: "Свет фар при работающем двигателе", arch_color: "Молдинги арок", cd_front_bumper: "Антихром: передний бампер", cd_rear_bumper: "Антихром: задний бампер",
      cd_doors: "Антихром: рамки дверей", cd_rails: "Антихром: рейлинги", cd_windows: "Антихром: молдинги стёкол",
      c_car_color: "Цвет кузова", c_accent: "Основной цвет карточки", c_warn_color: "Цвет предупреждения", c_critical_color: "Цвет критичного значения",
      c_fuel_color_ok: "Полоса топлива: норма", c_fuel_color_warn: "Полоса топлива: мало", c_fuel_color_critical: "Полоса топлива: почти пусто", c_tire_color_critical: "Критичное давление шин",
      reset: "По умолчанию",
      tap_action_kind: "Тап по карточке", tap_action_nav: "Страница", tap_action_url: "Ссылка", tap_action_entity: "Сущность", tap_action_perform: "Действие (domain.service)",
      car_tap_action_kind: "Тап по машине", car_tap_action_nav: "Страница", car_tap_action_url: "Ссылка", car_tap_action_entity: "Сущность", car_tap_action_perform: "Действие (domain.service)",
      "k.expand": "Открыть полную карточку в окне", "k.none": "Ничего", "k.navigate": "Перейти на страницу", "k.url": "Открыть ссылку", "k.more-info": "Открыть историю сущности", "k.call-service": "Вызвать действие",
      tabs: "Вкладки (по порядку)", default_tab: "Первая вкладка", remember_tab: "Помнить последнюю открытую вкладку (иначе всегда первая)", height: "Высота области вкладок, px (0 = без ограничения)", tab_images: "Картинка меняется вместе с вкладкой", stable_tabs: "Стабильный размер картинки",
      scale: "Абсолютный масштаб (панель)", panel_height: "Высота, px (панель)", panel_min_width: "Уже, px: карточка с вкладками (панель; 0 = выкл.)", rotate: "Смартфон в портрете (панель)", "o.rot_auto": "Развернуть в альбомную", "o.rot_off": "Показать карточку с вкладками", "o.rot_always": "Всегда разворачивать в портрете",
      buttons: "Быстрые кнопки (compact и mini)", hide: "Скрыть кнопки и блоки", climate_buttons: "Кнопки климата (верхний ряд)",
      nav: "Навигационные приложения", nav_mode: "Маршрут или точка", nav_travel: "Способ передвижения", map_on: "Карта внутри карточки", map_zoom: "Масштаб карты",
      tank_size: "Объём бака, л", fuel_warn: "Мало топлива при, %", fuel_critical: "Критично при, %", tire_critical: "Критичное давление шин",
      cabin_fabric: "Ткань салона", cabin_trim: "Декоративная полоса салона",
      "add": "Добавить пресет", "add6": "Добавить шесть стандартных", "del": "Удалить", "up": "Выше", "down": "Ниже", "np": "Пресетов нет: на карточке их тоже нет. Добавьте свои или шесть стандартных.",
      pr_help: "Все ключи необязательны; что не задано, остаётся в машине как есть. Окна, люк и шторка: closed, open или 0–100. Сиденья, окна, задний климат и любые действия Home Assistant — в блоке «Ещё шаги».",
      p_id: "ID", p_name: "Подпись", p_icon: "Иконка", p_temp: "Температура (число, min или max)", p_fan: "Скорость вентилятора", p_flow: "Направление потока", p_circ: "Рециркуляция",
      p_auto: "Авто", p_ac: "Кондиционер", p_defrost: "Обогрев лобового", p_rear: "Обогрев заднего", p_seat_heat: "Подогрев сидений", p_seat_vent: "Вентиляция сидений", p_wheel: "Обогрев руля",
      p_windows: "Окна (closed / open / 0–100)", p_sunroof: "Люк (closed / open / vent / 0–100)", p_sunshade: "Шторка (closed / open / 0–100)", p_enabled: "Показывать на карточке",
      "t.keep": "Не менять", "t.on": "Включить", "t.off": "Выключить", "o.auto": "Автоматически", "o.left": "Влево", "o.right": "Вправо", "o.monjaro": "Geely Monjaro", "o.drawing": "Простой рисунок", "o.custom": "Своя картинка",
      "o.black": "Чёрные", "o.body": "В цвет кузова", "o.original": "Как на картинке", "o.inside": "Салон", "o.outside": "Улица", "o.route": "Маршрут к машине", "o.locate": "Показать машину",
      "o.face": "Лицо", "o.leg": "Ноги", "o.face_leg": "Лицо и ноги", "o.window": "Лобовое", "o.face_window": "Лицо и лобовое", "o.leg_window": "Ноги и лобовое", "o.all": "Все",
      "o.green": "Зелёная", "o.light_gray": "Светло-серая", "o.dark_gray": "Тёмно-серая", "o.bronze": "Бронза", "o.silver": "Серебро", "o.gold": "Золото",
      "o.overview": "Обзор", "o.climate": "Климат", "o.body": "Кузов", "o.comfort": "Комфорт", "o.data": "Данные",
      "o.driving": "На машине", "o.walking": "Пешком", "o.transit": "Транспорт", "o.bicycling": "На велосипеде",
      "o.heat": "Макс. тепло", "o.cool": "Макс. холод", "o.recirc": "Рециркуляция", "o.wheel": "Обогрев руля", "o.defrost": "Обогрев лобового", "o.rear": "Обогрев заднего", "o.ac": "Кондиционер",
      "o.maxheat": "Макс. тепло", "o.maxcool": "Макс. холод", "o.seat_heating": "Подогрев сидений", "o.seat_cooling": "Вентиляция сидений", "o.windows": "Окна", "o.lock": "Замок",
      "o.rear_climate": "Задний климат", "o.gclean": "Очистка воздуха", "o.ambient": "Подсветка салона", "o.massage": "Массаж", "o.presets": "Пресеты",
      "o.yandex": "Яндекс Карты", "o.maps": "Google Карты", "o.osm": "OpenStreetMap", "o.apple": "Apple Карты", "o.here": "HERE WeGo",
    },
  };

  let _edReady = null;
  const edLoadHa = () => _edReady || (_edReady = (async () => {
    try {
      await Promise.all(["ha-form", "ha-expansion-panel", "ha-icon-picker"].map((n) => customElements.whenDefined(n).catch(() => 0)).slice(0, 0));
      if (!customElements.get("ha-form") || !customElements.get("ha-entity-picker") || !customElements.get("ha-icon-picker")) {
        const h = await window.loadCardHelpers();
        for (const type of ["entities", "tile", "button"]) {
          try { const c = await h.createCardElement({ type, entities: [], entity: "sun.sun" }); if (c && c.constructor && c.constructor.getConfigElement) await c.constructor.getConfigElement(); } catch (e) { /* try the next one */ }
        }
      }
    } catch (e) { /* the form may still work */ }
  })());

  class MhaCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {}; this._hass = null; this._built = false; this._forms = [];
    }
    set hass(h) { this._hass = h; this._forms.forEach((f) => { f.hass = h; }); }
    setConfig(config) {
      this._config = { ...(config || {}) };
      if (this._built) this._sync(); else if (this.isConnected || this._wantBuild) this._build();
    }
    connectedCallback() { this._wantBuild = true; if (!this._built) edLoadHa().then(() => { if (!this._built) this._build(); }); }
    get _lang() { const l = String((this._hass && (this._hass.language || (this._hass.locale && this._hass.locale.language))) || "en").toLowerCase(); return l.startsWith("ru") ? "ru" : "en"; }
    _t(k) { return (ED_TXT[this._lang] || ED_TXT.en)[k] || ED_TXT.en[k] || k; }
    get _layout() {
      const ty = String(this._config.type || "").replace(/^custom:/, "");
      return { "mha-card": "tabs", "mha-card-full": "full", "mha-card-compact": "compact", "mha-card-panel": "panel", "mha-card-mini": "mini" }[ty] || "tabs";
    }

    /* ---- config <-> form values ---- */
    _tapKind(a) { const t = typeof a === "string" ? a : a && a.action; return t ? String(t).toLowerCase().replace(/_/g, "-").replace("perform-action", "call-service") : ""; }
    _toForm(c) {
      const f = {};
      f.card_type = String(c.type || "custom:mha-card").replace(/^custom:/, "");
      ["name", "prefix", "tracker", "zoom", "text_size", "rotate", "view", "wheel_circumference", "wheel_spin_entity", "height", "scale", "panel_height", "panel_min_width", "default_tab",
        "nav_mode", "nav_travel", "tank_size", "fuel_warn", "fuel_critical", "tire_critical", "cabin_fabric", "cabin_trim", "car_image_facing", "wheels", "arch_color"].forEach((k) => { if (c[k] !== undefined) f[k] = c[k]; });
      ["hide_name", "show_parked", "rhd", "demo", "debug", "wheel_spin", "confirm_open", "remember_tab"].forEach((k) => { f[k] = !!c[k]; });
      ["more_info", "car_3d", "headlights", "stable_tabs"].forEach((k) => { f[k] = c[k] !== false; });
      f.tab_images = c.tab_images !== false && c.tab_images !== "none";
      const ci = c.car_image == null || c.car_image === "" ? "monjaro" : String(c.car_image);
      f.car_image_kind = ["monjaro", "drawing"].includes(ci.toLowerCase()) ? ci.toLowerCase() : "custom";
      if (f.car_image_kind === "custom") f.car_image_url = ci;
      if (f.car_image_facing === undefined) f.car_image_facing = "auto";
      if (f.wheels === undefined) f.wheels = "type1";
      f.wheels = /^\d$/.test(String(f.wheels)) ? "type" + f.wheels : String(f.wheels);
      f.arch_color = f.arch_color === undefined || f.arch_color === true ? "black" : String(f.arch_color);
      const cd = c.chrome_delete;
      [["front_bumper", "cd_front_bumper"], ["rear_bumper", "cd_rear_bumper"], ["doors", "cd_doors"], ["rails", "cd_rails"], ["windows", "cd_windows"]].forEach(([z, k]) => {
        const v = cd === true ? 1 : cd && typeof cd === "object" ? cd[z] : 0; f[k] = !!v && v !== "off";
      });
      f.tabs = Array.isArray(c.tabs) ? c.tabs.map((x) => String(x).toLowerCase()) : ["overview", "climate", "body", "comfort", "data"];
      f.default_tab = f.default_tab || "overview";
      f.nav = Array.isArray(c.nav) ? c.nav.map((x) => String(x).toLowerCase()) : ["yandex", "maps"];
      f.nav_mode = f.nav_mode || "route"; f.nav_travel = f.nav_travel || "driving";
      f.map_on = !!c.map && c.map !== "off";
      f.map_zoom = c.map && typeof c.map === "object" && c.map.zoom != null ? Number(c.map.zoom) : 15;
      f.hide = Array.isArray(c.hide) ? c.hide.map((x) => String(x).toLowerCase()) : [];
      f.climate_buttons = Array.isArray(c.climate_buttons) ? c.climate_buttons.map((x) => String(x).toLowerCase()) : ["auto", "ac", "recirc", "gclean"];
      f.buttons = Array.isArray(c.buttons) ? c.buttons.map((x) => String(x).toLowerCase()) : layoutButtons(this._layout);
      if (f.zoom === undefined) f.zoom = 1;
      if (f.rotate === undefined) f.rotate = "off";
      if (f.view === undefined) f.view = "side";
      f.cabin_fabric = f.cabin_fabric === undefined ? "green" : String(f.cabin_fabric);
      f.cabin_trim = f.cabin_trim === undefined ? "bronze" : String(f.cabin_trim);
      if (typeof c.text_size === "number") f.text_size = c.text_size; else delete f.text_size;
      ["tap_action", "car_tap_action"].forEach((k) => {
        const def = k === "car_tap_action" && this._layout === "compact" ? "expand" : "none", a = c[k];
        const kind = this._tapKind(a) || def, o = a && typeof a === "object" ? a : {};
        f[k + "_kind"] = kind; f[k + "_nav"] = o.navigation_path || ""; f[k + "_url"] = o.url_path || ""; f[k + "_entity"] = o.entity || "";
        f[k + "_perform"] = o.perform_action || o.service || "";
      });
      f.popup_card = ["mha-card", "mha-card-full", "mha-card-compact", "mha-card-mini"].includes(String(c.popup_card || "").replace(/^custom:/, "")) ? String(c.popup_card).replace(/^custom:/, "") : "mha-card-full";
      f.popup_map = c.popup_map === true ? "on" : c.popup_map === false ? "off" : "auto";
      ["car_image_top"].forEach((k) => { f[k] = c[k] == null ? "" : String(c[k]); });
      f.car_image_flip = !!c.car_image_flip;
      f.sunroof_vent_max = c.sunroof_vent_max != null && isFinite(Number(c.sunroof_vent_max)) ? Number(c.sunroof_vent_max) : 8;
      f.cabin_opacity = typeof c.cabin_opacity === "number" ? (c.cabin_opacity > 1 ? c.cabin_opacity / 100 : c.cabin_opacity) : 0.6;
      f.car_image_hotspots = c.car_image_hotspots && typeof c.car_image_hotspots === "object" ? c.car_image_hotspots : {};
      { const tl = c.top_labels;
        f.top_labels_list = ED_TOP.filter((n) => (tl === false ? false : Array.isArray(tl) ? tl.includes(n) : tl && typeof tl === "object" ? !(tl[n] === false || tl[n] === "off" || tl[n] === 0) : true)); }
      { const ce = c.cabin_effects, al = { airflow: "air" }, ls = Array.isArray(ce) ? ce.map((x) => al[x] || x) : null;
        f.cabin_effects_list = ED_FX.filter((n) => (ce === false ? false : ls ? ls.includes(n) : ce && typeof ce === "object" ? !(ce[n] === false || ce[n] === "off" || ce[n] === 0) : true)); }
      { const m = c.map && typeof c.map === "object" ? c.map : {};
        f.map_entity = m.entity || ""; f.map_ratio = m.aspect_ratio ? String(m.aspect_ratio) : "16:10"; f.map_height = Number(m.height) > 0 ? Number(m.height) : 0;
        f.map_theme = ["auto", "light", "dark"].includes(m.theme_mode) ? m.theme_mode : "auto"; f.map_hours = Number(m.hours_to_show) > 0 ? Number(m.hours_to_show) : 0; f.map_tab = String(m.tab || "overview");
        f.map_title = m.title == null ? "" : String(m.title); f.map_hide_title = m.title === "";
        if (f.map_hide_title) f.map_title = "";
        f.map_center = ["follow", "fixed"].includes(String(m.center)) ? String(m.center) : "auto"; f.map_locate = !!m.locate_button;
        const mk = m.marker == null ? "" : String(m.marker).trim();
        f.map_marker = /^(default|icon|stock)$/i.test(mk) ? "default" : !mk || mk.toLowerCase() === "car" ? "car" : "custom"; f.map_marker_url = f.map_marker === "custom" ? mk : "";
        f.map_marker_size = Number(m.marker_size) >= 16 && Number(m.marker_size) <= 160 ? Number(m.marker_size) : 56; f.map_rotate = m.marker_rotate !== false; f.map_heading = m.marker_heading ? String(m.marker_heading) : "";
        f.map_caption = (Array.isArray(m.caption) ? m.caption : m.caption ? [m.caption] : []).map((x) => String(x).toLowerCase()); f.map_address_entity = m.address_entity || "";
        f.map_label = ["name", "state", "attribute", "icon"].includes(String(m.label)) ? String(m.label) : "icon"; f.map_label_attr = m.label_attribute || ""; f.map_label_unit = m.label_unit || "";
        const ents = Array.isArray(m.entities) ? m.entities : m.entities ? [m.entities] : [];
        f.map_entities = ents.map((e) => (typeof e === "string" ? e : e && e.entity)).filter(Boolean);
        f.map_entities_opts = {}; ents.forEach((e) => { if (e && typeof e === "object" && e.entity) { const o = { ...e }; delete o.entity; if (Object.keys(o).length) f.map_entities_opts[e.entity] = o; } });
        f.map_geo = (Array.isArray(m.geo_location_sources) ? m.geo_location_sources : m.geo_location_sources ? [m.geo_location_sources] : []).map(String);
        f.map_auto_fit = !!m.auto_fit; f.map_fit_zones = !!m.fit_zones; f.map_trail_color = m.trail_color ? String(m.trail_color) : ""; f.map_trail_width = Number(m.trail_width) > 0 ? Number(m.trail_width) : 0; }
      { const ti = c.tab_images && typeof c.tab_images === "object" ? c.tab_images : {}; ED_TABS.forEach((t) => { f["ti_" + t] = String(ti[t] || ED_TABIMG[t]); }); }
      { const ts = c.text_size, o = typeof ts === "number" ? { all: ts } : ts && typeof ts === "object" ? ts : {};
        ED_TS.forEach((k) => { const v = Number(o[k]); f["ts_" + k] = isFinite(v) && v > 0 && v <= 4 ? v : 1; }); }
      return f;
    }
    /* value of the form field -> value in the config (undefined = remove the key) */
    _fromField(k, v, c) {
      const keep = (cond, val) => (cond ? undefined : val);
      switch (k) {
        case "car_image_kind": return null;       /* handled together with the url */
        case "wheels": return keep(v === "type1", v);
        case "car_image_facing": return keep(v === "auto" || v === "", v);
        case "arch_color": return keep(v === "black", v);
        case "tabs": return keep(Array.isArray(v) && v.join() === "overview,climate,body,comfort,data", v);
        case "default_tab": return keep(v === "overview", v);
        case "nav": return keep(Array.isArray(v) && v.join() === "yandex,maps", v);
        case "nav_mode": return keep(v === "route", v);
        case "nav_travel": return keep(v === "driving", v);
        case "hide": return keep(!v || !v.length, v);
        case "climate_buttons": return keep(!Array.isArray(v) || [...v].sort().join() === "ac,auto,gclean,recirc", v);
        case "zoom": return keep(Number(v) === 1, Number(v));
        case "more_info": case "car_3d": case "headlights": case "stable_tabs": case "tab_images": return keep(v !== false, false);
        case "hide_name": case "show_parked": case "rhd": case "demo": case "debug": case "wheel_spin": case "confirm_open": case "remember_tab": return keep(!v, true);
        case "rotate": return keep(v === "off", v);
        case "popup_card": return keep(v === "mha-card-full", v);
        case "popup_map": return v === "on" ? true : v === "off" ? false : undefined;
        case "view": return keep(v === "side", v);
        case "car_image_flip": return keep(!v, true);
        case "sunroof_vent_max": return keep(Number(v) === 8, Number(v));
        case "cabin_opacity": return keep(Math.abs(Number(v) - 0.6) < 1e-9, Number(v));
        case "car_image_hotspots": return v && typeof v === "object" && Object.keys(v).length ? v : undefined;
        case "cabin_fabric": return keep(v === "green", v);
        case "cabin_trim": return keep(v === "bronze", v);
        case "name": case "prefix": case "tracker": case "wheel_spin_entity": case "car_image_url": case "car_image_top": return keep(v === "" || v == null, v);
        default: return v === "" || v == null ? undefined : v;
      }
    }
    _onForm(value) {
      const prev = this._toForm(this._config), c = { ...this._config };
      const changed = Object.keys(value).filter((k) => JSON.stringify(value[k]) !== JSON.stringify(prev[k]));
      if (!changed.length) return;
      const set = (k, v) => { if (v === undefined) delete c[k]; else c[k] = v; };
      let mapDone = false;
      changed.forEach((k) => {
        const v = value[k];
        if (k === "car_image_kind" || k === "car_image_url") {
          const kind = value.car_image_kind, url = String(value.car_image_url || "").trim();
          set("car_image", kind === "custom" ? (url || undefined) : kind === "monjaro" ? undefined : kind); return;
        }
        if (/^cd_/.test(k)) {
          const zone = k.slice(3), cur = c.chrome_delete;
          const obj = cur && typeof cur === "object" ? { ...cur } : cur === true ? { front_bumper: 1, rear_bumper: 1, doors: 1, rails: 1, windows: 1 } : {};
          if (v) obj[zone] = 1; else delete obj[zone];
          set("chrome_delete", Object.keys(obj).length ? obj : undefined); return;
        }
        if (/^map_/.test(k)) {
          if (mapDone) return; mapDone = true;
          if (!value.map_on) { set("map", undefined); return; }
          const cur = c.map && typeof c.map === "object" ? { ...c.map } : {};
          const put = (key, val, def) => { if (val === undefined || val === null || val === "" || val === def || (typeof val === "number" && !isFinite(val)) || (Array.isArray(val) && !val.length)) delete cur[key]; else cur[key] = val; };
          const str = (v) => String(v == null ? "" : v).trim();
          delete cur.default_zoom;
          put("entity", str(value.map_entity), ""); put("zoom", Number(value.map_zoom), 15); put("aspect_ratio", str(value.map_ratio), "16:10");
          put("height", Number(value.map_height) > 0 ? Number(value.map_height) : undefined); put("theme_mode", value.map_theme, "auto");
          put("hours_to_show", Number(value.map_hours) > 0 ? Number(value.map_hours) : undefined); put("tab", value.map_tab, "overview");
          if (value.map_hide_title) cur.title = ""; else put("title", str(value.map_title), "");
          put("center", value.map_center, "auto"); put("locate_button", value.map_locate ? true : undefined);
          put("marker", value.map_marker === "custom" ? str(value.map_marker_url) : value.map_marker, "car");
          put("marker_size", Number(value.map_marker_size), 56); put("marker_rotate", value.map_rotate === false ? false : undefined); put("marker_heading", str(value.map_heading), "");
          put("caption", Array.isArray(value.map_caption) ? value.map_caption : undefined); put("address_entity", str(value.map_address_entity), "");
          put("label", value.map_label, "icon"); put("label_attribute", value.map_label === "attribute" ? str(value.map_label_attr) : "", ""); put("label_unit", value.map_label === "attribute" ? str(value.map_label_unit) : "", "");
          { const ids = Array.isArray(value.map_entities) ? value.map_entities : [], opts = value.map_entities_opts && typeof value.map_entities_opts === "object" ? value.map_entities_opts : {};
            put("entities", ids.map((id) => (opts[id] && typeof opts[id] === "object" && Object.keys(opts[id]).length ? { entity: id, ...opts[id] } : id))); }
          put("geo_location_sources", Array.isArray(value.map_geo) ? value.map_geo.filter(Boolean) : undefined);
          put("auto_fit", value.map_auto_fit ? true : undefined); put("fit_zones", value.map_fit_zones ? true : undefined);
          put("trail_color", str(value.map_trail_color), ""); put("trail_width", Number(value.map_trail_width) > 0 ? Number(value.map_trail_width) : undefined);
          set("map", Object.keys(cur).length ? cur : true); return;
        }
        if (k === "card_type") { set("type", "custom:" + v); return; }
        if (k === "top_labels_list") { const l = Array.isArray(v) ? v : []; set("top_labels", l.length === ED_TOP.length ? undefined : l.length ? ED_TOP.filter((n) => l.includes(n)) : false); return; }
        if (k === "cabin_effects_list") { const l = Array.isArray(v) ? v : []; set("cabin_effects", l.length === ED_FX.length ? undefined : l.length ? ED_FX.filter((n) => l.includes(n)) : false); return; }
        if (/^ti_/.test(k)) {
          const o = {}; let same = true;
          ED_TABS.forEach((t) => { o[t] = value["ti_" + t] || ED_TABIMG[t]; if (o[t] !== ED_TABIMG[t]) same = false; });
          set("tab_images", same ? undefined : o); return;
        }
        if (/^ts_/.test(k)) {
          const cur = c.text_size, o = typeof cur === "number" ? { all: cur } : cur && typeof cur === "object" ? { ...cur } : {}, key = k.slice(3), n = Number(v);
          if (!isFinite(n) || n <= 0 || n === 1) delete o[key]; else o[key] = n;
          const ks = Object.keys(o); set("text_size", !ks.length ? undefined : ks.length === 1 && ks[0] === "all" ? o.all : o); return;
        }
        const m = /^(tap_action|car_tap_action)_(kind|nav|url|entity|perform)$/.exec(k);
        if (m) {
          const key = m[1], kind = value[key + "_kind"], def = key === "car_tap_action" && this._layout === "compact" ? "expand" : "none";
          const o = { action: kind === "call-service" ? "perform-action" : kind };
          if (kind === "navigate") o.navigation_path = value[key + "_nav"] || "";
          if (kind === "url") o.url_path = value[key + "_url"] || "";
          if (kind === "more-info" && value[key + "_entity"]) o.entity = value[key + "_entity"];
          if (kind === "call-service") { o.perform_action = value[key + "_perform"] || ""; if (c[key] && typeof c[key] === "object") { if (c[key].data) o.data = c[key].data; if (c[key].target) o.target = c[key].target; } }
          const simple = ["expand", "none"].includes(kind);
          set(key, simple ? (kind === def ? (c[key] !== undefined ? kind : undefined) : kind) : o); return;
        }
        set(k, this._fromField(k, v, c));
      });
      this._fire(c);
      if (changed.includes("card_type")) { this._built = false; this._forms = []; this._build(); }   /* other card types have other sections */
    }
    _fire(c) {
      this._config = c; this._sync();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
    }

    /* ---- schema ---- */
    _opts(list, prefix = "o.", current) {
      const o = list.map((v) => ({ value: v, label: this._t(prefix + v) }));
      if (current != null && current !== "" && !list.includes(current)) o.push({ value: current, label: String(current) });
      return o;
    }
    _sections(f) {
      const L = this._layout, tabbed = L === "tabs" || L === "top_tabs" || L === "panel", sel = (options, multiple) => ({ select: { options, mode: "dropdown", multiple: !!multiple, custom_value: false } });
      const num = (min, max, step, mode = "box") => ({ number: { min, max, step, mode } });
      const tap = (k) => {
        const kinds = ["expand", "none", "navigate", "url", "more-info", "call-service"].map((v) => ({ value: v, label: this._t("k." + v) }));
        const s = [{ name: k + "_kind", required: true, selector: { select: { options: kinds, mode: "dropdown" } } }];
        const kind = f[k + "_kind"];
        if (kind === "navigate") s.push({ name: k + "_nav", selector: { text: {} } });
        if (kind === "url") s.push({ name: k + "_url", selector: { text: {} } });
        if (kind === "more-info") s.push({ name: k + "_entity", selector: { entity: {} } });
        if (kind === "call-service") s.push({ name: k + "_perform", selector: { text: {} } });
        return s;
      };
      const S = [];
      S.push({ id: "general", icon: "mdi:car-cog", open: true, schema: [
        { name: "card_type", selector: { select: { mode: "dropdown", options: ["mha-card", "mha-card-full", "mha-card-compact", "mha-card-mini", "mha-card-panel"].map((v) => ({ value: v, label: this._t("ct." + v) })) } } },
        { name: "name", selector: { text: {} } }, { name: "hide_name", selector: { boolean: {} } }, { name: "prefix", selector: { text: {} } },
        { name: "tracker", selector: { entity: { domain: "device_tracker" } } },
        { name: "show_parked", selector: { boolean: {} } }, { name: "rhd", selector: { boolean: {} } }, { name: "more_info", selector: { boolean: {} } },
        { name: "confirm_open", selector: { boolean: {} } }, { name: "sunroof_vent_max", selector: num(1, 30, 1) }, { name: "zoom", selector: num(0.5, 2, 0.05, "slider") },
      ] });
      S.push({ id: "look", icon: "mdi:car-side", schema: [
        { name: "car_image_kind", selector: sel(this._opts(["monjaro", "drawing", "custom"]), false) },
        ...(f.car_image_kind === "custom" ? [{ name: "car_image_url", selector: { text: {} } }, { name: "car_image_top", selector: { text: {} } }, { name: "car_image_flip", selector: { boolean: {} } }, { name: "car_image_hotspots", selector: { object: {} } }] : []),
        ...(L === "tabs" || L === "full" || L === "panel" ? [{ name: "view", selector: sel(this._opts(["side", "top"]), false) }] : []),
        { name: "car_image_facing", selector: sel(this._opts(["auto", "left", "right"]), false) },
        { name: "wheels", selector: sel(["type1", "type2", "type3", "type4", "type5"].map((v) => ({ value: v, label: v })), false) },
        { name: "wheel_spin", selector: { boolean: {} } },
        ...(f.wheel_spin ? [{ name: "wheel_circumference", selector: num(1.5, 3.2, 0.01) }, { name: "wheel_spin_entity", selector: { entity: { domain: "sensor" } } }] : []),
        { name: "car_3d", selector: { boolean: {} } }, { name: "headlights", selector: { boolean: {} } },
        { name: "arch_color", selector: sel(this._opts(["black", "body", "original"], "o.", f.arch_color), false) },
        { name: "cd_front_bumper", selector: { boolean: {} } }, { name: "cd_rear_bumper", selector: { boolean: {} } }, { name: "cd_doors", selector: { boolean: {} } },
        { name: "cd_rails", selector: { boolean: {} } }, { name: "cd_windows", selector: { boolean: {} } },
      ] });
      S.push({ id: "top", icon: "mdi:car-top", schema: [
                { name: "top_labels_list", selector: sel(this._opts(ED_TOP, "tl."), true) },
      ] });
      S.push({ id: "taps", icon: "mdi:gesture-tap", schema: [...tap("tap_action"), ...tap("car_tap_action"),
        { name: "popup_card", selector: { select: { mode: "dropdown", options: ["mha-card-full", "mha-card", "mha-card-compact", "mha-card-mini"].map((v) => ({ value: v, label: this._t("pc." + v) })) } } },
        { name: "popup_map", selector: { select: { mode: "dropdown", options: ["auto", "on", "off"].map((v) => ({ value: v, label: this._t("pm." + v) })) } } }] });
      if (tabbed) S.push({ id: "tabs", icon: "mdi:tab", schema: [
        ...(L !== "panel" || true ? [{ name: "tabs", selector: sel(this._opts(["overview", "climate", "body", "comfort", "data"]), true) }] : []),
        { name: "default_tab", selector: sel(this._opts(["overview", "climate", "body", "comfort", "data"]), false) },
        { name: "remember_tab", selector: { boolean: {} } },
        { name: "tab_images", selector: { boolean: {} } },
        ...(f.tab_images ? ED_TABS.map((t) => ({ name: "ti_" + t, selector: { select: { mode: "dropdown", options: ["side", "top", "cabin", "cockpit", "none"].map((v) => ({ value: v, label: this._t("ti." + v) })) } } })) : []),
        { name: "stable_tabs", selector: { boolean: {} } },
        { name: "height", selector: num(0, 1200, 10) },
        ...(L === "panel" ? [{ name: "scale", selector: num(0.5, 3, 0.05) }, { name: "panel_height", selector: num(200, 2400, 10) }, { name: "panel_min_width", selector: num(0, 3000, 10) }, { name: "rotate", selector: { select: { mode: "dropdown", options: ["off", "auto", "always"].map((v) => ({ value: v, label: this._t("o.rot_" + v) })) } } }] : []),
      ] });
      S.push({ id: "buttons", icon: "mdi:gesture-tap-button", schema: [
        ...(L === "compact" || L === "mini" ? [{ name: "buttons", selector: sel(this._opts(["auto", "ac", "defrost", "rear", "recirc", "wheel", "heat", "cool"]), true) }] : []),
        { name: "climate_buttons", selector: sel(this._opts(["auto", "ac", "recirc", "gclean", "maxheat", "maxcool"]), true) },
        { name: "hide", selector: sel(this._opts(["auto", "ac", "defrost", "rear", "recirc", "wheel", "maxheat", "maxcool", "seat_heating", "seat_cooling", "windows", "lock", "rear_climate", "gclean", "ambient", "massage", "presets"]), true) },
      ] });
      S.push({ id: "nav", icon: "mdi:map-marker-path", schema: [
        { name: "nav", selector: sel(this._opts(["yandex", "maps", "osm", "apple", "here"]), true) },
        { name: "nav_mode", selector: sel(this._opts(["route", "locate"]), false) }, { name: "nav_travel", selector: sel(this._opts(["driving", "walking", "transit", "bicycling"]), false) },
        { name: "map_on", selector: { boolean: {} } },
        ...(f.map_on ? [{ name: "map_entity", selector: { entity: { domain: ["device_tracker", "person", "zone"] } } }, { name: "map_zoom", selector: num(3, 20, 1, "slider") },
          { name: "map_ratio", selector: { text: {} } }, { name: "map_height", selector: num(0, 1200, 10) },
          { name: "map_theme", selector: { select: { mode: "dropdown", options: ["auto", "light", "dark"].map((v) => ({ value: v, label: this._t("mt." + v) })) } } },
          { name: "map_hours", selector: num(0, 168, 1) }, ...(tabbed ? [{ name: "map_tab", selector: sel(this._opts(ED_TABS), false) }] : []),
          { name: "map_title", selector: { text: {} } }, { name: "map_hide_title", selector: { boolean: {} } },
          { name: "map_center", selector: { select: { mode: "dropdown", options: ["auto", "follow", "fixed"].map((v) => ({ value: v, label: this._t("mc." + v) })) } } }, { name: "map_locate", selector: { boolean: {} } },
          { name: "map_marker", selector: { select: { mode: "dropdown", options: ["car", "default", "custom"].map((v) => ({ value: v, label: this._t("mm." + v) })) } } },
          ...(f.map_marker === "custom" ? [{ name: "map_marker_url", selector: { text: {} } }] : []),
          ...(f.map_marker !== "default" ? [{ name: "map_marker_size", selector: num(16, 160, 2, "slider") }, { name: "map_rotate", selector: { boolean: {} } }, ...(f.map_rotate ? [{ name: "map_heading", selector: { text: {} } }] : []),
            { name: "map_caption", selector: sel(this._opts(["speed", "state", "address", "name"], "mp."), true) }, { name: "map_address_entity", selector: { entity: {} } }] : []),
          { name: "map_label", selector: { select: { mode: "dropdown", options: ["icon", "name", "state", "attribute"].map((v) => ({ value: v, label: this._t("ml." + v) })) } } },
          ...(f.map_label === "attribute" ? [{ name: "map_label_attr", selector: { text: {} } }, { name: "map_label_unit", selector: { text: {} } }] : []),
          { name: "map_entities", selector: { entity: { multiple: true } } }, ...((f.map_entities || []).length ? [{ name: "map_entities_opts", selector: { object: {} } }] : []),
          { name: "map_geo", selector: { select: { mode: "dropdown", multiple: true, custom_value: true, options: [] } } },
          { name: "map_auto_fit", selector: { boolean: {} } }, { name: "map_fit_zones", selector: { boolean: {} } },
          { name: "map_trail_color", selector: { text: {} } }, { name: "map_trail_width", selector: num(0, 12, 1) }] : []),
      ] });
      S.push({ id: "fuel", icon: "mdi:gas-station", schema: [
        { name: "tank_size", selector: num(10, 200, 1) }, { name: "fuel_warn", selector: num(1, 90, 1) }, { name: "fuel_critical", selector: num(1, 90, 1) },
        { name: "tire_critical", selector: num(0.5, 5, 0.05) },
      ] });
      S.push({ id: "cabin", icon: "mdi:car-seat", schema: [
        { name: "cabin_fabric", selector: sel(this._opts(["green", "light_gray", "dark_gray"], "o.", f.cabin_fabric), false) },
        { name: "cabin_trim", selector: sel(this._opts(["bronze", "silver", "gold"], "o.", f.cabin_trim), false) },
        { name: "cabin_opacity", selector: num(0, 1, 0.05, "slider") },
        { name: "cabin_effects_list", selector: sel(this._opts(ED_FX, "ce."), true) },
      ] });
      S.push({ id: "more", icon: "mdi:dots-horizontal", schema: [
        { name: "demo", selector: { boolean: {} } }, { name: "debug", selector: { boolean: {} } },
      ] });
      S.push({ id: "textparts", icon: "mdi:format-size", schema: ED_TS.map((k) => ({ name: "ts_" + k, selector: num(0.5, 3, 0.05) })) });
      S.forEach((x) => x.schema.forEach((it) => { if (it.selector && it.selector.select && !it.selector.select.multiple) it.required = true; }));
      return S;
    }
    /* ---- "?" help: a round icon by every field, the description shows on hover (or on tap) ---- */
    _help(name) {
      const H = ED_HELP[this._lang] || ED_HELP.en;
      if (H[name]) return H[name];
      const P = ED_HELP_PAT[this._lang] || ED_HELP_PAT.en, m = /^(ts|ti|px)_/.exec(name);
      if (m) return P[m[1]].replace("{l}", String(this._t(name)).replace(/^[^:]*:\s*/, ""));
      return "";
    }
    _hq(name) {
      const t = this._help(name); if (!t) return "";
      return `<span class="hq" tabindex="0">?<span class="tip">${esc(t)}</span></span>`;
    }
    _helpMount(form, tries = 0) {
      const sr = form.shadowRoot, root = sr && sr.querySelector(".root");
      if (!root) { if (tries < 6) setTimeout(() => this._helpMount(form, tries + 1), 250); return; }
      if (!form._mhaHelp) {
        form._mhaHelp = true;
        const st = document.createElement("style");
        st.textContent = `.root { position: relative; }
          .mhah { position: absolute; z-index: 3; width: 18px; height: 18px; box-sizing: border-box; border-radius: 50%; border: 1px solid var(--secondary-text-color, #888); color: var(--secondary-text-color, #888);
            font: 600 12px/16px sans-serif; text-align: center; cursor: help; background: var(--card-background-color, transparent); opacity: .8; outline: none; user-select: none; }
          .mhah:hover, .mhah:focus { opacity: 1; color: var(--primary-color, #03a9f4); border-color: var(--primary-color, #03a9f4); z-index: 9; }
          .mhah .tip { display: none; position: absolute; top: 22px; right: -6px; width: min(300px, 72vw); padding: 8px 10px; border-radius: 8px; text-align: left; font: 400 12px/1.45 var(--paper-font-body1_-_font-family, sans-serif);
            background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); border: 1px solid var(--divider-color, #888); box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: default; white-space: normal; }
          .mhah:hover .tip, .mhah:focus .tip { display: block; }`;
        sr.appendChild(st);
        if (window.ResizeObserver) { form._mhaRo = new ResizeObserver(() => this._helpLayout(form)); form._mhaRo.observe(root); }
      }
      this._helpLayout(form);
      [500, 1400].forEach((ms) => setTimeout(() => this._helpLayout(form), ms));   /* fields finish drawing a moment after the form */
    }
    _helpLayout(form) {
      const sr = form.shadowRoot, root = sr && sr.querySelector(".root"); if (!root) return;
      const kids = [...root.children].filter((el) => el.localName === "ha-selector" && el.name);
      const old = new Map([...root.querySelectorAll(":scope > .mhah")].map((e) => [e.dataset.n, e]));
      const seen = new Set();
      kids.forEach((el) => {
        const text = this._help(el.name); if (!text) return;
        seen.add(el.name);
        let ic = old.get(el.name);
        if (!ic) { ic = document.createElement("span"); ic.className = "mhah"; ic.tabIndex = 0; ic.dataset.n = el.name; root.appendChild(ic); }
        if (ic.dataset.t !== text) { ic.dataset.t = text; ic.textContent = "?"; const tip = document.createElement("span"); tip.className = "tip"; tip.textContent = text; ic.appendChild(tip); }
        const w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) { ic.style.display = "none"; return; }
        ic.style.display = "";
        const sel = el.selector || {}, kind = Object.keys(sel)[0], slider = kind === "number" && sel.number && sel.number.mode === "slider";
        let x = el.offsetLeft + w - 34, y = el.offsetTop + h / 2 - 9;
        if (kind === "boolean") x = el.offsetLeft + w - 76;
        else if (kind === "select" || kind === "entity") { x = el.offsetLeft + w - 80; if (kind === "entity" && h > 70) y = el.offsetTop + h - 37; }
        else if (kind === "number") { if (slider) { x = el.offsetLeft + w - 26; y = el.offsetTop + 2; } else x = el.offsetLeft + w - 64; }
        else if (kind === "object") y = el.offsetTop + 4;
        ic.style.left = Math.round(x) + "px"; ic.style.top = Math.round(y) + "px";
      });
      old.forEach((e, n) => { if (!seen.has(n)) e.remove(); });
    }

    _label(s) {
      const k = s.name;
      return this._t(k);
    }

    /* ---- DOM ---- */
    _build() {
      this._built = true;
      const root = this.shadowRoot;
      root.innerHTML = `<style>
        :host { display: block; color: var(--primary-text-color, var(--e-text)); color-scheme: light dark;
          --e-text:#212121; --e-text2:#727272; --e-div:rgba(0,0,0,.12); --e-bg2:#f2f2f2; --e-pri:#03a9f4; }
        @media (prefers-color-scheme: dark) { :host { --e-text:#e1e1e1; --e-text2:#9b9b9b; --e-div:rgba(255,255,255,.14); --e-bg2:#2a2a2a; } }
        .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; padding-bottom: 10px; border-bottom: 1px solid var(--divider-color, var(--e-div)); }
        .tabs button { font: inherit; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 18px; cursor: pointer; border: 1px solid var(--divider-color, var(--e-div));
          background: var(--secondary-background-color, var(--e-bg2)); color: var(--secondary-text-color, var(--e-text2)); }
        .tabs button.on { background: var(--primary-color, var(--e-pri)); border-color: var(--primary-color, var(--e-pri)); color: var(--text-primary-color, #fff); }
        .sec { margin: 0 0 14px; }
        .sec[hidden], .grp[hidden] { display: none; }
        .sec > h3 { margin: 4px 0 8px; font-size: 13px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color, var(--e-text2)); display: flex; align-items: center; gap: 8px; }
        .sec > h3::after { content: ""; flex: 1; height: 1px; background: var(--divider-color, var(--e-div)); }
        ha-form { display: block; }
        .colors { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; padding-top: 4px; }
        .crow { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--primary-text-color, var(--e-text)); padding: 6px 8px; border: 1px solid var(--divider-color, var(--e-div)); border-radius: 10px; }
        .crow input[type=color] { width: 38px; height: 30px; padding: 0; border: 1px solid var(--divider-color, var(--e-div)); border-radius: 6px; background: none; cursor: pointer; flex: none; }
        .crow > span:not(.hq) { flex: 1; min-width: 0; }
        .crow button, .pbar button, .pitem button.mini { font: inherit; font-size: 12px; border: 1px solid var(--divider-color, var(--e-div)); border-radius: 8px; background: none; color: var(--secondary-text-color, var(--e-text2)); cursor: pointer; padding: 4px 8px; }
        .crow button:disabled, .pitem button.mini:disabled { opacity: .35; cursor: default; }
        .crow.unset input { opacity: .5; }
        .pbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
        .pbar button { color: var(--primary-color, var(--e-pri)); border-color: var(--primary-color, var(--e-pri)); padding: 7px 12px; font-size: 13px; }
        .pitem { border: 1px solid var(--divider-color, var(--e-div)); border-radius: 12px; margin-bottom: 8px; padding: 0 12px 10px; background: var(--secondary-background-color, var(--e-bg2)); }
        .pitem.shut ha-form { display: none; }
        .pitem .ph { display: flex; align-items: center; gap: 6px; padding: 8px 0 2px; }
        .pitem .ph b { flex: 1; font-size: 14px; color: var(--primary-text-color, var(--e-text)); cursor: pointer; }
        .pmore { margin: 6px 0 2px; } .pmore > summary { cursor: pointer; font-size: 13px; color: var(--primary-color, var(--e-pri)); padding: 6px 2px; }
        .hq { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; box-sizing: border-box; border-radius: 50%; border: 1px solid var(--secondary-text-color, var(--e-text2)); color: var(--secondary-text-color, var(--e-text2)); font: 600 12px/16px sans-serif; cursor: help; flex: none; outline: none; opacity: .8; }
        .hq:hover, .hq:focus { opacity: 1; color: var(--primary-color, var(--e-pri)); border-color: var(--primary-color, var(--e-pri)); }
        .hq .tip { display: none; position: absolute; z-index: 9; bottom: 24px; right: -6px; width: min(300px, 72vw); padding: 8px 10px; border-radius: 8px; text-align: left; font: 400 12px/1.45 sans-serif; background: var(--card-background-color, #fff); color: var(--primary-text-color, var(--e-text)); border: 1px solid var(--divider-color, var(--e-div)); box-shadow: 0 4px 14px rgba(0,0,0,.35); cursor: default; white-space: normal; }
        .hq:hover .tip, .hq:focus .tip { display: block; }
        .help { font-size: 12px; color: var(--secondary-text-color, var(--e-text2)); margin: 2px 0 8px; line-height: 1.4; }
        .empty { font-size: 13px; color: var(--secondary-text-color, var(--e-text2)); padding: 8px 2px; }
      </style><div class="tabs"></div><div class="body"></div>`;
      this._tabsEl = root.querySelector(".tabs"); this._body = root.querySelector(".body");
      this._forms = []; this._panels = {};
      const f = this._toForm(this._config);
      this._sectionList = this._sections(f);
      const mk = (id, make) => { const d = document.createElement("div"); d.className = "sec"; d.dataset.sec = id; const h = document.createElement("h3"); h.textContent = this._t("sec." + id); d.append(h, make()); this._panels[id] = d; return d; };
      this._sectionList.forEach((s) => mk(s.id, () => {
        const form = document.createElement("ha-form");
        form.hass = this._hass; form.data = f; form.schema = s.schema;
        form.computeLabel = (x) => this._label(x);
        form.addEventListener("value-changed", (e) => { e.stopPropagation(); this._onForm({ ...this._toForm(this._config), ...e.detail.value }); });
        form.dataset.sec = s.id; this._forms.push(form); return form;
      }));
      mk("colors", () => { const d = document.createElement("div"); d.className = "colors"; this._colorsEl = d; this._drawColors(); return d; });
      mk("presets", () => { const d = document.createElement("div"); this._presetsEl = d; this._drawPresets(); return d; });
      /* the sections are grouped on tabs, so the editor is not one long page */
      const groups = [["main", ["general", "more", "textparts"]], ["look", ["look", "top", "colors", "cabin"]], ["act", ["taps", "buttons"]], ["pre", ["presets"]], ["data", ["tabs", "nav", "fuel"]]];
      this._groups = groups.map(([g, ids]) => ({ g, ids: ids.filter((i) => this._panels[i]) })).filter((x) => x.ids.length);
      this._groups.forEach((x) => { const div = document.createElement("div"); div.className = "grp"; div.dataset.g = x.g; x.ids.forEach((i) => div.appendChild(this._panels[i])); this._body.appendChild(div); });
      this._tab = this._tab && this._groups.some((x) => x.g === this._tab) ? this._tab : this._groups[0].g;
      this._drawTabs();
      this._forms.forEach((f) => setTimeout(() => this._helpMount(f), 300));
    }
    _drawTabs() {
      this._tabsEl.replaceChildren(...this._groups.map((x) => { const b = document.createElement("button"); b.type = "button"; b.textContent = this._t("tab." + x.g); b.className = x.g === this._tab ? "on" : ""; b.addEventListener("click", () => { this._tab = x.g; this._drawTabs(); }); return b; }));
      this._body.querySelectorAll(".grp").forEach((d) => { d.hidden = d.dataset.g !== this._tab; });
      if (this._forms) setTimeout(() => this._forms.forEach((f) => { if (f._mhaHelp) this._helpLayout(f); }), 60);
    }
    _sync() {
      if (!this._built) return;
      const f = this._toForm(this._config);
      const secs = this._sections(f);
      this._forms.forEach((form) => {
        const s = secs.find((x) => x.id === form.dataset.sec); if (!s) return;
        form.data = f; if (JSON.stringify(s.schema) !== JSON.stringify(form.schema)) form.schema = s.schema;
        setTimeout(() => this._helpMount(form), 200);
      });
      this._drawColors();
    }

    /* colours: the stock colour input plus a "default" button; the value is written as #rrggbb */
    _drawColors() {
      if (!this._colorsEl) return;
      const keys = [["car_color", "#53596a"], ["accent", "#2fd6a4"], ["warn_color", "#e8a13a"], ["critical_color", "#e5484d"], ["fuel_color_ok", "#2fd6a4"], ["fuel_color_warn", "#e8a13a"], ["fuel_color_critical", "#e5484d"], ["tire_color_critical", "#e5484d"]];
      this._colorsEl.replaceChildren(...keys.map(([k, def]) => {
        const row = document.createElement("div"), cur = this._config[k], hex = this._hex(cur) || def;
        row.className = "crow" + (cur ? "" : " unset");
        row.innerHTML = `<input type="color" value="${hex}"><span>${this._t("c_" + k)}</span>${this._hq(k)}<button type="button">${this._t("reset")}</button>`;
        row.querySelector("input").addEventListener("change", (e) => { const c = { ...this._config }; c[k] = e.target.value; this._fire(c); });
        row.querySelector("button").addEventListener("click", () => { const c = { ...this._config }; delete c[k]; this._fire(c); });
        return row;
      }));
    }
    _hex(v) {
      if (!v) return "";
      const m = /^#([0-9a-f]{6})$/i.exec(String(v).trim()); if (m) return "#" + m[1].toLowerCase();
      try { const cx = document.createElement("canvas").getContext("2d"); cx.fillStyle = "#010203"; cx.fillStyle = String(v); const o = cx.fillStyle; return /^#[0-9a-f]{6}$/i.test(o) && o !== "#010203" ? o : ""; } catch (e) { return ""; }
    }

    /* ---- presets ---- */
    _presetList() {
      const p = this._config.presets;
      if (Array.isArray(p)) return p.map((x) => (x && typeof x === "object" ? { ...x } : { id: String(x) }));
      if (p && typeof p === "object") return Object.keys(p).map((k) => ({ ...(p[k] || {}), id: k }));
      return [];
    }
    _setPresets(list) {
      const c = { ...this._config };
      if (list.length) c.presets = list; else delete c.presets;
      this._config = c; this._drawPresets();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
    }
    _pSchema() {
      const tri = (n) => ({ name: n, selector: { select: { mode: "dropdown", options: [{ value: "keep", label: this._t("t.keep") }, { value: "on", label: this._t("t.on") }, { value: "off", label: this._t("t.off") }] } } });
      const lvl = (n) => ({ name: n, selector: { select: { mode: "dropdown", options: [{ value: "keep", label: this._t("t.keep") }, { value: "off", label: this._t("t.off") }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] } } });
      const opt = (n, list, pre = "o.") => ({ name: n, selector: { select: { mode: "dropdown", options: [{ value: "keep", label: this._t("t.keep") }, ...list.map((v) => ({ value: v, label: this._t(pre + v) }))] } } });
      return [
        { name: "p_id", selector: { text: {} } }, { name: "p_name", selector: { text: {} } }, { name: "p_icon", selector: { icon: {} } },
        { name: "p_temp", selector: { text: {} } },
        opt("p_fan", ["1", "2", "3", "4", "5", "6", "7", "8", "9"], "x."), opt("p_flow", ["face", "leg", "face_leg", "window", "face_window", "leg_window", "all", "auto"]), opt("p_circ", ["inside", "outside", "auto"]),
        tri("p_auto"), tri("p_ac"), tri("p_defrost"), tri("p_rear"), lvl("p_seat_heat"), lvl("p_seat_vent"), lvl("p_wheel"),
        { name: "p_windows", selector: { text: {} } }, { name: "p_sunroof", selector: { text: {} } }, { name: "p_sunshade", selector: { text: {} } },
        { name: "p_enabled", selector: { boolean: {} } },
      ];
    }
    _pSchema2() {
      const opts = (list, pre) => [{ value: "keep", label: this._t("t.keep") }, ...list.map((v) => ({ value: v, label: pre ? this._t(pre + v) : v }))];
      const dd = (n, o) => ({ name: n, selector: { select: { mode: "dropdown", options: o } } });
      return ED_PX.map(([k, t]) => {
        const n = "px_" + k;
        if (t === "tri") return dd(n, opts(["on", "off"], "t."));
        if (t === "lvl") return dd(n, opts(["off", "1", "2", "3"], ""));
        if (t === "flow") return dd(n, opts(["face", "leg", "face_leg", "window", "face_window", "leg_window", "all", "auto"], "o."));
        if (t === "obj") return { name: n, selector: { object: {} } };
        return { name: n, selector: { text: {} } };
      });
    }
    _pToForm2(p) {
      const d = {};
      ED_PX.forEach(([k, t]) => {
        const v = p[k], n = "px_" + k;
        if (t === "tri") d[n] = v === undefined || v === null || v === "" ? "keep" : (v === false || /^(off|false|no|0)$/i.test(String(v))) ? "off" : "on";
        else if (t === "obj") d[n] = Array.isArray(v) ? v : [];
        else d[n] = v === undefined || v === null || v === "" ? (t === "txt" ? "" : "keep") : String(v);
      });
      return d;
    }
    _pApply2(p, d) {
      const o = { ...p };
      ED_PX.forEach(([k, t]) => {
        const v = d["px_" + k];
        if (t === "tri") { if (v === "keep" || v === undefined) delete o[k]; else o[k] = v === "on"; }
        else if (t === "obj") { if (Array.isArray(v) && v.length) o[k] = v; else delete o[k]; }
        else if (t === "txt") { const x = String(v || "").trim(); if (x === "") delete o[k]; else o[k] = /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x; }
        else { if (v === "keep" || v === undefined || v === "") delete o[k]; else o[k] = v; }
      });
      return o;
    }
    _pToForm(p) {
      const tri = (v) => (v === undefined || v === null || v === "" ? "keep" : (v === false || /^(off|false|no|0)$/i.test(String(v))) ? "off" : "on");
      const lv = (v) => (v === undefined || v === null || v === "" ? "keep" : String(v));
      return { p_id: p.id || "", p_name: p.name || "", p_icon: p.icon || "", p_temp: Array.isArray(p.temp) ? "" : p.temp === undefined ? "" : String(p.temp), p_fan: lv(p.fan), p_flow: lv(p.flow), p_circ: lv(p.circ),
        p_auto: tri(p.auto), p_ac: tri(p.ac), p_defrost: tri(p.defrost), p_rear: tri(p.rear), p_seat_heat: lv(p.seat_heat), p_seat_vent: lv(p.seat_vent), p_wheel: lv(p.wheel),
        p_windows: p.windows === undefined ? "" : String(p.windows), p_sunroof: p.sunroof === undefined ? "" : String(p.sunroof), p_sunshade: p.sunshade === undefined ? "" : String(p.sunshade), p_enabled: p.enabled !== false };
    }
    _pApply(p, d) {
      const o = { ...p };
      const put = (k, v) => { if (v === undefined || v === "" || v === "keep") delete o[k]; else o[k] = v; };
      const tri = (k, v) => { if (v === "keep") delete o[k]; else o[k] = v === "on"; };
      const prevTemp = Array.isArray(p.temp) ? p.temp : null;
      o.id = String(d.p_id || p.id || "preset").trim() || "preset";
      put("name", d.p_name); put("icon", d.p_icon);
      if (!(prevTemp && d.p_temp === "")) { const t = String(d.p_temp || "").trim(); put("temp", t === "" ? undefined : isFinite(Number(t)) ? Number(t) : t); }
      put("fan", d.p_fan); put("flow", d.p_flow); put("circ", d.p_circ);
      tri("auto", d.p_auto); tri("ac", d.p_ac); tri("defrost", d.p_defrost); tri("rear", d.p_rear);
      put("seat_heat", d.p_seat_heat); put("seat_vent", d.p_seat_vent); put("wheel", d.p_wheel);
      const cov = (k, v) => { const t = String(v || "").trim(); put(k, t === "" ? undefined : /^\d+(\.\d+)?$/.test(t) ? Number(t) : t); };
      cov("windows", d.p_windows); cov("sunroof", d.p_sunroof); cov("sunshade", d.p_sunshade);
      if (d.p_enabled === false) o.enabled = false; else delete o.enabled;
      return o;
    }
    _drawPresets() {
      const el = this._presetsEl; if (!el) return;
      const list = this._presetList();
      el.replaceChildren();
      const help = document.createElement("div"); help.className = "help"; help.textContent = this._t("pr_help"); el.appendChild(help);
      if (!list.length) { const e = document.createElement("div"); e.className = "empty"; e.textContent = this._t("np"); el.appendChild(e); }
      list.forEach((p, i) => {
        const box = document.createElement("div"); box.className = "pitem";
        const head = document.createElement("div"); head.className = "ph"; if (list.length > 1) box.classList.add("shut");
        head.innerHTML = `<b>${esc(p.name || p.id || "preset")}</b><button type="button" class="mini" data-a="up">▲</button><button type="button" class="mini" data-a="down">▼</button><button type="button" class="mini" data-a="del">${this._t("del")}</button>`;
        head.querySelector('[data-a="up"]').disabled = i === 0; head.querySelector('[data-a="down"]').disabled = i === list.length - 1;
        head.addEventListener("click", (ev) => {
          const a = ev.target && ev.target.dataset && ev.target.dataset.a;
          if (!a) { if (ev.target && ev.target.tagName === "B") box.classList.toggle("shut"); return; }
          const l = this._presetList();
          if (a === "del") l.splice(i, 1);
          else { const j = a === "up" ? i - 1 : i + 1; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; }
          this._setPresets(l);
        });
        const form = document.createElement("ha-form");
        form.hass = this._hass; form.data = this._pToForm(p); form.schema = this._pSchema();
        form.computeLabel = (x) => this._t(x.name);
        form.addEventListener("value-changed", (e) => {
          e.stopPropagation(); const l = this._presetList(); l[i] = this._pApply(l[i], e.detail.value);
          const c = { ...this._config }; c.presets = l; this._config = c;
          const b = head.querySelector("b"); if (b) b.textContent = l[i].name || l[i].id;
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
        });
        const more = document.createElement("details"); more.className = "pmore";
        const sm = document.createElement("summary"); sm.textContent = this._t("px_more"); more.appendChild(sm);
        const form2 = document.createElement("ha-form");
        form2.hass = this._hass; form2.data = this._pToForm2(p); form2.schema = this._pSchema2();
        form2.computeLabel = (x) => this._t(x.name);
        form2.addEventListener("value-changed", (e) => {
          e.stopPropagation(); const l = this._presetList(); l[i] = this._pApply2(l[i], e.detail.value);
          const c = { ...this._config }; c.presets = l; this._config = c;
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
        });
        more.appendChild(form2); this._forms.push(form2);
        box.append(head, form, more); el.appendChild(box); this._forms.push(form);
        setTimeout(() => { this._helpMount(form); this._helpMount(form2); more.addEventListener("toggle", () => setTimeout(() => this._helpLayout(form2), 50)); }, 300);
      });
      const bar = document.createElement("div"); bar.className = "pbar";
      bar.innerHTML = `<button type="button" data-a="add">+ ${this._t("add")}</button><button type="button" data-a="add6">+ ${this._t("add6")}</button>`;
      bar.addEventListener("click", (ev) => {
        const a = ev.target && ev.target.dataset && ev.target.dataset.a; if (!a) return;
        const l = this._presetList();
        if (a === "add") { let n = 1; while (l.some((x) => x.id === "preset" + n)) n++; l.push({ id: "preset" + n, name: "", icon: "mdi:car", ac: true }); }
        else { const ids = l.map((x) => x.id); STD_PRESETS.forEach((p) => { if (!ids.includes(p.id) && l.length < 8) l.push({ ...p, name: this._lang === "ru" ? p.ru : p.en }); }); }
        this._setPresets(l.map((x) => { const y = { ...x }; delete y.ru; delete y.en; return y; }));
      });
      el.appendChild(bar);
    }
  }
  Object.assign(ED_TXT.en, {"sec.top": "Top view", "sec.textparts": "Text size by element", "px_more": "More steps (per seat and window, rear climate, ambient light, any HA actions)", "top_labels_list": "Labels on the top view", "tl.doors": "Doors", "tl.windows": "Windows", "tl.roof": "Sunroof and blind", "tl.trunk": "Tailgate", "tl.hood": "Hood", "tl.tires": "Tyre pressure", "car_image_top": "Top-view picture (URL or name)", "car_image_flip": "Mirror the picture", "car_image_hotspots": "Marker positions (YAML, % of the frame)", "sunroof_vent_max": "Sunroof opening counted as ventilation, %", "cabin_opacity": "Strength of cabin effects (0–1)", "cabin_effects_list": "What is drawn on the cabin", "ce.heat": "Seat heating", "ce.vent": "Seat ventilation", "ce.wheel": "Steering-wheel heating", "ce.air": "Air flow", "ce.defrost": "Defrost", "ce.ambient": "Ambient light", "ce.massage": "Massage", "map_entity": "Map: tracker (empty = the car’s tracker)", "map_zoom": "Map: zoom", "map_ratio": "Map: aspect ratio (16:10)", "map_height": "Map: height, px (0 = by ratio)", "map_theme": "Map: theme", "map_hours": "Map: trail, hours (0 = none)", "map_tab": "Map: shown on the tab", "mt.auto": "Like Home Assistant", "mt.light": "Light", "mt.dark": "Dark", "ti.side": "Side view", "ti.top": "Top view", "ti.cabin": "Cabin", "ti.cockpit": "Instrument cluster", "ti.none": "No picture", "ti_overview": "Picture: Overview", "ti_climate": "Picture: Climate", "ti_body": "Picture: Body", "ti_comfort": "Picture: Comfort", "ti_data": "Picture: Data", "ts_all": "All text (multiplier)", "ts_title": "Title", "ts_status": "Status line", "ts_big": "Big figure (range)", "ts_side": "Temperature next to the range", "ts_unit": "Units", "ts_heading": "Section headings", "ts_button": "Buttons", "ts_chip": "Chips", "ts_tab": "Tabs", "ts_row": "Rows of values", "ts_stepper": "Temperature and fan", "ts_window": "Window buttons", "ts_tire": "Tyre block", "ts_caption": "Captions on the cabin", "ts_label3d": "Labels on the top view", "px_temp_driver": "Driver temperature", "px_temp_passenger": "Passenger temperature", "px_rear_temp": "Rear temperature", "px_rear_climate": "Rear climate", "px_g_clean": "Air cleaning", "px_rear_flow": "Rear air flow", "px_seat_heat_driver": "Heating: driver", "px_seat_heat_passenger": "Heating: passenger", "px_seat_heat_rear_left": "Heating: rear left", "px_seat_heat_rear_right": "Heating: rear right", "px_seat_vent_driver": "Ventilation: driver", "px_seat_vent_passenger": "Ventilation: passenger", "px_window_driver": "Window: driver", "px_window_passenger": "Window: passenger", "px_window_rear_left": "Window: rear left", "px_window_rear_right": "Window: rear right", "px_ambient": "Ambient light", "px_ambient_brightness": "Ambient brightness", "px_actions": "Home Assistant actions (a list in YAML)"});
  Object.assign(ED_TXT.ru, {"sec.top": "Вид сверху", "sec.textparts": "Размер текста по элементам", "px_more": "Ещё шаги (по сиденьям и окнам, задний климат, подсветка, любые действия HA)", "top_labels_list": "Подписи на виде сверху", "tl.doors": "Двери", "tl.windows": "Окна", "tl.roof": "Люк и шторка", "tl.trunk": "Багажник", "tl.hood": "Капот", "tl.tires": "Давление в шинах", "car_image_top": "Картинка сверху (URL или имя)", "car_image_flip": "Отразить картинку", "car_image_hotspots": "Положение маркеров (YAML, % от рамки)", "sunroof_vent_max": "Положение люка, считающееся проветриванием, %", "cabin_opacity": "Сила эффектов в салоне (0–1)", "cabin_effects_list": "Что рисовать на салоне", "ce.heat": "Подогрев сидений", "ce.vent": "Вентиляция сидений", "ce.wheel": "Подогрев руля", "ce.air": "Потоки воздуха", "ce.defrost": "Обогрев стёкол", "ce.ambient": "Подсветка салона", "ce.massage": "Массаж", "map_entity": "Карта: трекер (пусто = трекер машины)", "map_zoom": "Карта: масштаб", "map_ratio": "Карта: пропорции (16:10)", "map_height": "Карта: высота, px (0 = по пропорциям)", "map_theme": "Карта: тема", "map_hours": "Карта: след пути, часов (0 = нет)", "map_tab": "Карта: на какой вкладке", "mt.auto": "Как в Home Assistant", "mt.light": "Светлая", "mt.dark": "Тёмная", "ti.side": "Вид сбоку", "ti.top": "Вид сверху", "ti.cabin": "Салон", "ti.cockpit": "Приборная панель", "ti.none": "Без картинки", "ti_overview": "Картинка: Обзор", "ti_climate": "Картинка: Климат", "ti_body": "Картинка: Кузов", "ti_comfort": "Картинка: Комфорт", "ti_data": "Картинка: Данные", "ts_all": "Весь текст (множитель)", "ts_title": "Заголовок", "ts_status": "Строка состояния", "ts_big": "Крупная цифра (запас хода)", "ts_side": "Температура рядом с запасом хода", "ts_unit": "Единицы измерения", "ts_heading": "Заголовки разделов", "ts_button": "Кнопки", "ts_chip": "Чипы", "ts_tab": "Вкладки", "ts_row": "Строки значений", "ts_stepper": "Температура и вентилятор", "ts_window": "Кнопки окон", "ts_tire": "Блок шин", "ts_caption": "Подписи на салоне", "ts_label3d": "Подписи на виде сверху", "px_temp_driver": "Температура: водитель", "px_temp_passenger": "Температура: пассажир", "px_rear_temp": "Температура сзади", "px_rear_climate": "Задний климат", "px_g_clean": "Очистка воздуха", "px_rear_flow": "Задний поток воздуха", "px_seat_heat_driver": "Подогрев: водитель", "px_seat_heat_passenger": "Подогрев: пассажир", "px_seat_heat_rear_left": "Подогрев: сзади слева", "px_seat_heat_rear_right": "Подогрев: сзади справа", "px_seat_vent_driver": "Вентиляция: водитель", "px_seat_vent_passenger": "Вентиляция: пассажир", "px_window_driver": "Окно: водитель", "px_window_passenger": "Окно: пассажир", "px_window_rear_left": "Окно: сзади слева", "px_window_rear_right": "Окно: сзади справа", "px_ambient": "Подсветка салона", "px_ambient_brightness": "Яркость подсветки", "px_actions": "Действия Home Assistant (список в YAML)"});
  Object.assign(ED_TXT.en, {"map_title": "Map: heading", "map_hide_title": "Map: hide the heading", "map_center": "Map: centre", "mc.auto": "Stock behaviour", "mc.follow": "Follow the car", "mc.fixed": "Fixed (does not move on updates)", "map_locate": "Map: “To the car” button", "map_marker": "Map: car marker", "mm.default": "Stock (picture or icon of the tracker)", "mm.car": "Monjaro from above, in the colour of the car (default)", "mm.custom": "My picture (URL)", "map_marker_url": "Marker picture (URL or /local/…)", "map_marker_size": "Marker size, px", "map_rotate": "Turn the marker with the heading", "map_heading": "Heading attribute of the tracker (empty = heading, course, bearing)", "map_caption": "Caption under the marker", "mp.speed": "Speed", "mp.state": "State (home / away)", "mp.address": "Address", "mp.name": "Name", "map_address_entity": "Entity with the address (empty = attribute address of the tracker)", "map_label": "Map: stock marker label", "ml.icon": "Picture or icon", "ml.name": "Name", "ml.state": "State", "ml.attribute": "Attribute value", "map_label_attr": "Attribute for the label", "map_label_unit": "Unit of the label", "map_entities": "Map: more entities (second car, zones, people)", "map_entities_opts": "Options of those entities (YAML: entity → label_mode, attribute, unit, focus, name)", "map_geo": "Map: geo_location sources", "map_auto_fit": "Map: fit all entities in view", "map_fit_zones": "Map: include zones when fitting", "map_trail_color": "Trail colour (any CSS colour)", "map_trail_width": "Trail line width (0 = stock)"});
  Object.assign(ED_TXT.ru, {"map_title": "Карта: заголовок", "map_hide_title": "Карта: скрыть заголовок", "map_center": "Карта: центр", "mc.auto": "Как в Home Assistant", "mc.follow": "Следовать за машиной", "mc.fixed": "Закреплён (не двигается при обновлениях)", "map_locate": "Карта: кнопка «К машине»", "map_marker": "Карта: маркер машины", "mm.default": "Штатный (картинка или значок трекера)", "mm.car": "Monjaro сверху, цвета машины (по умолчанию)", "mm.custom": "Своя картинка (URL)", "map_marker_url": "Картинка маркера (URL или /local/…)", "map_marker_size": "Размер маркера, px", "map_rotate": "Поворачивать маркер по курсу", "map_heading": "Атрибут курса у трекера (пусто = heading, course, bearing)", "map_caption": "Подпись под маркером", "mp.speed": "Скорость", "mp.state": "Состояние (дома / не дома)", "mp.address": "Адрес", "mp.name": "Название", "map_address_entity": "Сущность с адресом (пусто = атрибут address у трекера)", "map_label": "Карта: подпись штатного маркера", "ml.icon": "Картинка или значок", "ml.name": "Название", "ml.state": "Состояние", "ml.attribute": "Значение атрибута", "map_label_attr": "Атрибут для подписи", "map_label_unit": "Единица подписи", "map_entities": "Карта: другие объекты (вторая машина, зоны, люди)", "map_entities_opts": "Параметры этих объектов (YAML: entity → label_mode, attribute, unit, focus, name)", "map_geo": "Карта: источники geo_location", "map_auto_fit": "Карта: вместить все объекты", "map_fit_zones": "Карта: учитывать зоны при подборе", "map_trail_color": "Цвет следа (любой цвет CSS)", "map_trail_width": "Толщина следа (0 = штатная)"});
  Object.assign(ED_TXT.en, {"card_type": "Card type", "ct.mha-card": "Tabs (mha-card)", "ct.mha-card-full": "Full, one page (mha-card-full)", "ct.mha-card-compact": "Compact (mha-card-compact)", "ct.mha-card-mini": "Mini (mha-card-mini)", "ct.mha-card-panel": "Full-screen panel (mha-card-panel)"});
  Object.assign(ED_TXT.ru, {"card_type": "Тип карточки", "ct.mha-card": "С вкладками (mha-card)", "ct.mha-card-full": "Полная, одной страницей (mha-card-full)", "ct.mha-card-compact": "Компактная (mha-card-compact)", "ct.mha-card-mini": "Мини (mha-card-mini)", "ct.mha-card-panel": "Панель на весь экран (mha-card-panel)"});
  Object.assign(ED_TXT.en, {"popup_card": "Window on tap: which card", "pc.mha-card-full": "Full, one page (mha-card-full)", "pc.mha-card": "Tabs (mha-card)", "pc.mha-card-compact": "Compact (mha-card-compact)", "pc.mha-card-mini": "Mini (mha-card-mini)", "popup_map": "Window on tap: map", "pm.auto": "As on the card", "pm.on": "Always show the map", "pm.off": "No map in the window"});
  Object.assign(ED_TXT.ru, {"popup_card": "Окно по нажатию: какая карточка", "pc.mha-card-full": "Полная, одной страницей (mha-card-full)", "pc.mha-card": "С вкладками (mha-card)", "pc.mha-card-compact": "Компактная (mha-card-compact)", "pc.mha-card-mini": "Мини (mha-card-mini)", "popup_map": "Окно по нажатию: карта", "pm.auto": "Как в карточке", "pm.on": "Всегда показывать карту", "pm.off": "Без карты в окне"});
  const ED_HELP = {"ru": {"car_color": "Цвет кузова на картинке машины (вид сбоку и сверху, 3D). Перекрашивается только краска: стёкла, шины, диски, фары и молдинги остаются как есть. «По умолчанию» — родной цвет картинки.", "accent": "Основной цвет карточки: полоса запаса хода, активные кнопки и вкладки, точка у названия.", "warn_color": "Цвет предупреждений (янтарный): открытые двери и окна, средний уровень топлива.", "critical_color": "Цвет критичных состояний (красный): критичное давление шин, почти пустой бак.", "fuel_color_ok": "Цвет полосы топлива, когда топлива достаточно.", "fuel_color_warn": "Цвет полосы топлива ниже порога «Предупреждение» (fuel_warn).", "fuel_color_critical": "Цвет полосы топлива ниже критичного порога (fuel_critical).", "tire_color_critical": "Цвет давления в шине ниже порога «Критичное давление шин».", "card_type": "Вид карточки. «С вкладками» — основная (Обзор, Климат, Кузов, Комфорт, Данные), «Полная» — всё одной длинной страницей, «Компактная» — одна плитка, «Мини» — маленький квадрат, «Панель» — на весь экран. Меняет ключ type; набор настроек ниже подстраивается под выбранный вид.", "name": "Заголовок карточки. Если пусто, показывается стандартное название машины.", "hide_name": "Убирает заголовок с карточки (остаётся статус и запас хода).", "prefix": "Префикс имён сущностей машины (например geely_monjaro), если карточка не нашла их сама. Обычно оставляют пустым: префикс определяется автоматически.", "tracker": "device_tracker с GPS машины. Нужен для карты и для кнопок «проложить маршрут».", "show_parked": "Показывает метку «Стоянка», когда машина стоит.", "rhd": "Правый руль: картинка и стороны (водитель, пассажир, окна, двери) зеркалятся.", "more_info": "Нажатие на значение (давление в шинах, топливо, двери, подписи на виде сверху) открывает историю сущности в Home Assistant. Выключено — значения не кликабельны.", "confirm_open": "Перед открытием окон и люка спрашивает подтверждение, чтобы не открыть случайно. Закрытие всегда без вопроса.", "sunroof_vent_max": "Положение люка в процентах, до которого он считается «проветриванием» (приподнят сзади, а не сдвинут). В этом случае на карточке написано «Проветр.» вместо процентов. По умолчанию 8.", "zoom": "Размер всей карточки: множитель от 0.5 до 2 (1 — обычный). У панели подрезает автоподгонку: 0.85 — карточка мельче и длинная вкладка помещается без прокрутки.", "scale": "Только панель: абсолютный масштаб от 0.5 до 3. Если задан, автоматический подбор по размеру экрана отключается.", "panel_height": "Только панель: высота в пикселях. Пусто — панель занимает остаток высоты окна.", "panel_min_width": "Только панель: если карточка уже этого числа (px), она показывается как карточка с вкладками (портретная раскладка), например 900. 0 — переключение только когда не хватает места для колонок.", "rotate": "Только панель, телефон в портрете. «Карточка с вкладками» (по умолчанию) — панель перестраивается в портретную раскладку. «Развернуть в альбомную» — вся панель поворачивается на бок, телефон нужно повернуть. «Всегда» — поворот и вне сенсорных экранов.", "car_image_kind": "Картинка машины: «Geely Monjaro» — встроенная векторная (перекрашивается), «нарисованный силуэт» или своя картинка.", "car_image_url": "Адрес своей картинки сбоку (PNG, WebP или SVG), например /local/my-car.png.", "car_image_top": "Своя картинка для вида сверху. Используется, когда 3D выключен или недоступен.", "car_image_flip": "Отразить картинку по горизонтали, если ваша картинка смотрит не в ту сторону.", "car_image_hotspots": "Положение индикаторов на своей картинке (фары, капот, багажник и др.) в процентах от рамки: [x, y]. Для встроенной машины не нужно.", "view": "Как показана машина: сбоку или сверху (3D-модель с открывающимися дверями, окнами, давлением шин).", "car_image_facing": "Куда смотрит машина на виде сбоку. «Автоматически» — как у встроенной картинки, «влево»/«вправо» зеркалят картинку вместе с индикаторами.", "wheels": "Дизайн дисков на виде сбоку: type1 — родные, type2…type5 — другие. Меняет оба колеса сразу.", "wheel_spin": "Диски на виде сбоку вращаются со скоростью машины (колесо 20\").", "wheel_circumference": "Окружность колеса в метрах для вращения дисков. По умолчанию 2.29 (колесо 20\").", "wheel_spin_entity": "Свой датчик скорости для вращения дисков. Пусто — скорость самой машины.", "car_3d": "3D-модель на виде сверху. Выключите, если нет WebGL или слабое устройство: останется плоская картинка.", "headlights": "Фары и задние фонари светятся, пока двигатель работает (вид сбоку, сверху и 3D).", "arch_color": "Цвет молдингов колёсных арок: чёрные, в цвет кузова или как на исходной картинке.", "cd_front_bumper": "Антихром: затемнить хром переднего бампера. Степень затемнения и свой цвет задаются в YAML (chrome_delete).", "cd_rear_bumper": "Антихром: затемнить хром заднего бампера. Степень и цвет — в YAML (chrome_delete).", "cd_doors": "Антихром: затемнить рамки дверей (нижний молдинг). Степень и цвет — в YAML (chrome_delete).", "cd_rails": "Антихром: затемнить рейлинги на крыше. Степень и цвет — в YAML (chrome_delete).", "cd_windows": "Антихром: затемнить молдинги стёкол. Степень и цвет — в YAML (chrome_delete).", "top_labels_list": "Какие группы подписей показывать на виде сверху: двери, окна, люк и шторка, багажник, капот, шины. Каждая подпись кликабельна (история сущности), если включено «Нажатие на значение открывает историю».", "cabin_fabric": "Цвет обивки на фото салона (вкладки Климат и Комфорт).", "cabin_trim": "Цвет отделки салона на фото.", "cabin_opacity": "Сила эффектов на фото салона от 0 до 1 (по умолчанию 0.6): подогрев, потоки воздуха, подсветка.", "cabin_effects_list": "Какие эффекты рисовать на салоне: подогрев и вентиляция сидений, подогрев руля, потоки воздуха, обогрев стёкол, подсветка, массаж.", "tap_action_kind": "Что делает нажатие на саму карточку: ничего, открыть окно (expand), перейти на страницу, открыть ссылку, показать историю сущности или вызвать действие HA.", "car_tap_action_kind": "Что делает нажатие на картинку машины. По умолчанию у компактной карточки — окно с полной карточкой, у остальных — ничего.", "tap_action_nav": "Путь страницы Lovelace для перехода, например /lovelace/car-panel.", "car_tap_action_nav": "Путь страницы Lovelace для перехода, например /lovelace/car-panel.", "tap_action_url": "Адрес ссылки, которая откроется в новой вкладке.", "car_tap_action_url": "Адрес ссылки, которая откроется в новой вкладке.", "tap_action_entity": "Сущность, историю которой откроет нажатие.", "car_tap_action_entity": "Сущность, историю которой откроет нажатие.", "tap_action_perform": "Действие Home Assistant в формате домен.действие, например script.turn_on.", "car_tap_action_perform": "Действие Home Assistant в формате домен.действие, например script.turn_on.", "popup_card": "Какая карточка показывается в окне, которое открывается по нажатию (expand): полная (по умолчанию), с вкладками, компактная или мини.", "popup_map": "Карта в окне по нажатию. «Как в карточке» — окно повторяет настройку карты карточки; «Всегда показывать» — карта есть, даже если на дашборде её нет; «Без карты» — в окне карты нет.", "buttons": "Быстрые кнопки компактной и мини-карточки и их порядок: авто, кондиционер, обогрев стёкол, задний климат, рециркуляция, руль, подогрев, холод.", "climate_buttons": "Кнопки верхнего ряда вкладки «Климат». По умолчанию четыре: авто, кондиционер, рециркуляция, очистка воздуха. Можно добавить «Макс. тепло» и «Макс. холод» или убрать лишние. Обогрев руля и стёкол находится в разделе обогрева рядом с сиденьями.", "hide": "Какие кнопки и блоки скрыть (например, массаж, задний климат, подсветку), если в машине их нет или они не нужны.", "tabs": "Какие вкладки показывать и в каком порядке (Обзор, Климат, Кузов, Комфорт, Данные). Вкладка «Комфорт» исчезает сама, если в машине нет подсветки и массажа.", "default_tab": "Вкладка, на которой карточка всегда открывается при загрузке страницы.", "remember_tab": "Включено — карточка помнит последнюю выбранную вкладку в браузере и открывается на ней. Выключено — всегда открывается на «Первой вкладке».", "tab_images": "Картинка над вкладками меняется вместе с вкладкой (бок, салон, вид сверху, приборная панель). Выключено — одна картинка на все вкладки.", "stable_tabs": "Картинка лежит в «сцене» одной фиксированной формы, поэтому при переключении вкладок всё ниже не прыгает. Выключено — у каждой картинки своя высота.", "height": "Высота области вкладок в пикселях. Область под полосой вкладок на широком экране (карточка шире примерно 720 px, две колонки) не выше этого значения и прокручивается внутри. 0 — без ограничения. На узком экране, например на телефоне, ключ не действует; у панели высота задаётся отдельно.", "nav": "Какие кнопки «проложить маршрут» показывать: Яндекс, Google, OSM, Apple, HERE.", "nav_mode": "Что делают кнопки навигаторов: проложить маршрут до машины или показать машину на карте.", "nav_travel": "Способ передвижения для маршрута: на машине, пешком, транспортом, на велосипеде.", "map_on": "Карта внутри карточки (штатная карта Home Assistant в стиле карточки). Нужен трекер.", "map_entity": "Трекер для карты. Пусто — трекер машины.", "map_zoom": "Начальный масштаб карты: чем больше число, тем ближе (15 — улица).", "map_ratio": "Пропорции карты, например 16:10. Если задана высота, пропорции не используются.", "map_height": "Высота карты в пикселях вместо пропорции. 0 — по пропорциям.", "map_theme": "Тема карты: как в Home Assistant, светлая или тёмная.", "map_hours": "Рисовать след пути за последние N часов. 0 — без следа. Если задан цвет или толщина следа, а часы не указаны, рисуется след за 24 часа.", "map_tab": "На какой вкладке показывать карту (в карточке с вкладками и в панели без трёх колонок).", "map_title": "Заголовок над картой. Пусто — стандартный.", "map_hide_title": "Убрать заголовок над картой.", "map_center": "Как карта ведёт себя при обновлениях: «Как в Home Assistant», «Следовать за машиной» (центр всё время на ней) или «Закреплён» (не двигается).", "map_locate": "Кнопка «К машине» поверх карты (справа вверху): возвращает карту к машине. Слева у карты есть и штатные кнопки Home Assistant, они центрируют по всем отслеживаемым объектам; если на карте только машина, действие почти одинаковое.", "map_marker": "Маркер машины: «Monjaro сверху» цвета car_color (по умолчанию), «штатный» маркер Home Assistant или своя картинка.", "map_marker_url": "Адрес своей картинки маркера, например /local/marker.png.", "map_marker_size": "Размер маркера машины в пикселях.", "map_rotate": "Поворачивать маркер по курсу, если у трекера есть атрибут heading, course или bearing.", "map_heading": "Имя атрибута с курсом, если оно отличается от heading, course, bearing.", "map_caption": "Что писать в подписи под маркером: скорость, состояние, название, адрес.", "map_address_entity": "Сущность с адресом для подписи. Пусто — атрибут address у трекера.", "map_label": "Подпись штатного маркера: значок, название, состояние или значение атрибута.", "map_label_attr": "Имя атрибута, значение которого показывать в подписи.", "map_label_unit": "Единица измерения после значения атрибута, например км/ч.", "map_entities": "Другие объекты на карте (трекеры, зоны, geo_location).", "map_entities_opts": "Параметры каждого из этих объектов в YAML: режим подписи (label_mode), атрибут, единица, учитывать ли при фокусе (focus), имя.", "map_geo": "Источники geo_location на карте, например all.", "map_auto_fit": "Карта сама подбирает масштаб, чтобы вместить все объекты.", "map_fit_zones": "Учитывать зоны при подборе масштаба (вместе с «Карта: вместить все объекты»).", "map_trail_color": "Цвет следа пути: #2fd6a4, 2fd6a4 (без #) или любое имя цвета CSS. Пусто — цвет по умолчанию.", "map_trail_width": "Толщина следа пути в пикселях. 0 — по умолчанию.", "tank_size": "Объём бака в литрах: по нему процент топлива пересчитывается в литры.", "fuel_warn": "Ниже этого процента топлива полоса становится жёлтой.", "fuel_critical": "Ниже этого процента топлива полоса становится красной.", "tire_critical": "Давление в шине ниже этого значения (бар) подсвечивается красным.", "demo": "Демо-режим: карточка работает на встроенной модели машины, все кнопки действуют, но в машину ничего не отправляется. В подвале написано «DEMO».", "debug": "Показывает под карточкой, какая сущность найдена для каждого ключа и в каком она состоянии. Помогает понять, почему значение не появляется.", "p_id": "Идентификатор пресета латиницей, например winter. Должен быть уникальным.", "p_name": "Подпись на кнопке пресета.", "p_icon": "Иконка пресета: встроенное имя или mdi:… значок.", "p_enabled": "Показывать ли пресет на карточке. Выключенный остаётся в списке, но кнопки на карточке нет.", "p_temp": "Температура, которую пресет установит: число (обе зоны) или min / max.", "p_fan": "Скорость вентилятора пресета. «Не менять» — оставить как есть.", "p_flow": "Направление потока воздуха в пресете. «Не менять» — оставить.", "p_circ": "Рециркуляция воздуха в пресете.", "p_auto": "Режим «Авто» климата в пресете.", "p_ac": "Кондиционер в пресете.", "p_defrost": "Обогрев лобового стекла в пресете.", "p_rear": "Обогрев заднего стекла в пресете.", "p_wheel": "Подогрев руля в пресете.", "p_seat_heat": "Подогрев сидений в пресете (уровень). Отдельно по сиденьям — в блоке «Ещё шаги».", "p_seat_vent": "Вентиляция сидений в пресете (уровень). Отдельно по сиденьям — в блоке «Ещё шаги».", "p_windows": "Положение окон в пресете: закрыть, открыть или 0–100 %.", "p_sunroof": "Положение люка в пресете: закрыт, открыт, 0–100 % или проветривание.", "p_sunshade": "Положение шторки панорамы в пресете: закрыта, открыта или 0–100 %.", "px_actions": "Любые действия Home Assistant (вызов сервисов), которые пресет выполнит. Список в формате YAML."}, "en": {"car_color": "Body colour on the car picture (side view, top view, 3D). Only the paint is repainted: glass, tyres, rims, lamps and mouldings stay as they are. \"Default\" is the picture's own colour.", "accent": "The main colour of the card: the range bar, active buttons and tabs, the dot by the title.", "warn_color": "Warning colour (amber): open doors and windows, medium fuel level.", "critical_color": "Colour of critical states (red): critical tyre pressure, an almost empty tank.", "fuel_color_ok": "Colour of the fuel bar when there is enough fuel.", "fuel_color_warn": "Colour of the fuel bar below the \"Warning\" threshold (fuel_warn).", "fuel_color_critical": "Colour of the fuel bar below the critical threshold (fuel_critical).", "tire_color_critical": "Colour of a tyre pressure below the \"Critical tyre pressure\" threshold.", "card_type": "The kind of card. \"Tabs\" is the main one (Overview, Climate, Body, Comfort, Data), \"Full\" is one long page, \"Compact\" is one tile, \"Mini\" is a small square, \"Panel\" fills the screen. It changes the key type; the settings below adapt to the kind you choose.", "name": "Card title. Empty shows the default name of the car.", "hide_name": "Removes the title from the card (the status and range stay).", "prefix": "Prefix of the car's entity names (for example geely_monjaro) when the card cannot find them itself. Usually left empty: the prefix is detected automatically.", "tracker": "The device_tracker with the car's GPS. Needed for the map and the \"route to the car\" buttons.", "show_parked": "Shows a \"Parked\" tag while the car stands.", "rhd": "Right-hand drive: the picture and the sides (driver, passenger, windows, doors) are mirrored.", "more_info": "A tap on a value (tyre pressure, fuel, doors, labels on the top view) opens the entity history in Home Assistant. Off: values are not clickable.", "confirm_open": "Asks for confirmation before opening windows and the sunroof, to avoid opening them by accident. Closing never asks.", "sunroof_vent_max": "The sunroof position in percent up to which it counts as \"ventilation\" (tilted at the rear, not slid back). The card then says \"Vent\" instead of a percentage. Default 8.", "zoom": "Size of the whole card: a multiplier from 0.5 to 2 (1 is normal). On the panel it trims the automatic fit: 0.85 makes the card smaller so a long tab fits without scrolling.", "scale": "Panel only: absolute scale from 0.5 to 3. When set, the automatic fit to the screen is switched off.", "panel_height": "Panel only: height in pixels. Empty: the panel takes the rest of the window height.", "panel_min_width": "Panel only: when the card is narrower than this (px), for example 900, it is shown as the tabbed card (portrait layout). 0: it switches only when there is no room for the columns.", "rotate": "Panel only, a phone held upright. \"Tabbed card\" (default): the panel rebuilds into the portrait layout. \"Turn to landscape\": the whole panel is turned on its side and you turn the phone. \"Always\": turns outside touch screens too.", "car_image_kind": "The picture of the car: \"Geely Monjaro\" is the built-in vector (repaintable), \"drawn silhouette\", or your own picture.", "car_image_url": "Address of your own side picture (PNG, WebP or SVG), for example /local/my-car.png.", "car_image_top": "Your own picture for the top view. Used when 3D is off or unavailable.", "car_image_flip": "Mirrors the picture horizontally when your picture faces the wrong way.", "car_image_hotspots": "Positions of the indicators on your own picture (lamps, hood, trunk, ...) in percent of the frame: [x, y]. Not needed for the built-in car.", "view": "How the car is shown: from the side or from above (a 3D model with opening doors, windows and tyre pressures).", "car_image_facing": "Which way the car looks on the side view. \"Automatic\" keeps the built-in picture as it is, \"left\" and \"right\" mirror the picture together with the indicators.", "wheels": "Rim design on the side view: type1 is the original, type2…type5 are others. Changes both wheels at once.", "wheel_spin": "The rims on the side view turn at the speed of the car (20\" wheel).", "wheel_circumference": "Rolling circumference of the wheel in metres for the spin. Default 2.29 (20\" wheel).", "wheel_spin_entity": "Your own speed sensor for the spinning rims. Empty: the car's own speed.", "car_3d": "The 3D model on the top view. Turn it off without WebGL or on a weak device: a flat picture stays.", "headlights": "Head and tail lamps glow while the engine runs (side view, top view and 3D).", "arch_color": "Colour of the wheel-arch trim: black, body colour, or as in the original picture.", "cd_front_bumper": "Chrome delete: darkens the chrome of the front bumper. The degree and a custom colour are set in YAML (chrome_delete).", "cd_rear_bumper": "Chrome delete: darkens the chrome of the rear bumper. Degree and colour in YAML (chrome_delete).", "cd_doors": "Chrome delete: darkens the door frames (lower moulding). Degree and colour in YAML (chrome_delete).", "cd_rails": "Chrome delete: darkens the roof rails. Degree and colour in YAML (chrome_delete).", "cd_windows": "Chrome delete: darkens the window mouldings. Degree and colour in YAML (chrome_delete).", "top_labels_list": "Which label groups to show on the top view: doors, windows, sunroof and blind, tailgate, hood, tyres. Each label is clickable (entity history) when \"A tap on a value opens the history\" is on.", "cabin_fabric": "Upholstery colour on the cabin photo (the Climate and Comfort tabs).", "cabin_trim": "Trim colour on the cabin photo.", "cabin_opacity": "Strength of the effects on the cabin photo from 0 to 1 (default 0.6): heating, air flow, ambient light.", "cabin_effects_list": "Which effects to draw on the cabin: seat heating and ventilation, wheel heating, air flow, defrost, ambient light, massage.", "tap_action_kind": "What a tap on the card itself does: nothing, open the window (expand), go to a page, open a link, show an entity history or call an HA action.", "car_tap_action_kind": "What a tap on the car picture does. By default the compact card opens the full card in a window, the others do nothing.", "tap_action_nav": "Lovelace page path to go to, for example /lovelace/car-panel.", "car_tap_action_nav": "Lovelace page path to go to, for example /lovelace/car-panel.", "tap_action_url": "Address of the link that opens in a new tab.", "car_tap_action_url": "Address of the link that opens in a new tab.", "tap_action_entity": "The entity whose history the tap opens.", "car_tap_action_entity": "The entity whose history the tap opens.", "tap_action_perform": "A Home Assistant action as domain.action, for example script.turn_on.", "car_tap_action_perform": "A Home Assistant action as domain.action, for example script.turn_on.", "popup_card": "Which card the window shows when a tap opens it (expand): full (default), tabs, compact or mini.", "popup_map": "The map in the window on tap. \"As on the card\": the window follows the card's map setting; \"Always show\": there is a map even when the dashboard card has none; \"No map\": the window has no map.", "buttons": "Quick buttons of the compact and mini cards and their order: auto, A/C, defrost, rear, recirculation, wheel, heat, cool.", "climate_buttons": "Buttons in the top row of the Climate tab. Four by default: auto, A/C, recirculation, air cleaning. You can add Max heat and Max cold or remove some. The heated wheel and glass are in the heating section next to the seats.", "hide": "Which buttons and blocks to hide (for example massage, rear climate, ambient light) when the car lacks them or you do not need them.", "tabs": "Which tabs to show and in what order (Overview, Climate, Body, Comfort, Data). The Comfort tab disappears by itself when the car has no ambient light or massage.", "default_tab": "The tab the card always opens on when the page loads.", "remember_tab": "On: the card remembers the last chosen tab in the browser and opens on it. Off: it always opens on the \"First tab\".", "tab_images": "The picture above the tabs changes with the tab (side, cabin, top view, cockpit). Off: one picture for all tabs.", "stable_tabs": "The picture sits in a \"stage\" of one fixed shape, so nothing below jumps when you switch tabs. Off: each picture has its own height.", "height": "Height of the tab area in pixels. On a wide screen (card wider than about 720 px, two columns) the area under the tab bar is no taller than this and scrolls inside. 0: unlimited. It has no effect on a narrow screen such as a phone; the panel has its own height.", "nav": "Which \"route to the car\" buttons to show: Yandex, Google, OSM, Apple, HERE.", "nav_mode": "What the navigation buttons do: route to the car or show the car on a map.", "nav_travel": "Travel mode for the route: driving, walking, transit, cycling.", "map_on": "A map inside the card (the stock Home Assistant map in the card's own look). Needs a tracker.", "map_entity": "Tracker for the map. Empty: the car's tracker.", "map_zoom": "Initial map zoom: the larger the number, the closer (15 is a street).", "map_ratio": "Map proportions, for example 16:10. Not used when a height is set.", "map_height": "Map height in pixels instead of a ratio. 0: by the ratio.", "map_theme": "Map theme: as in Home Assistant, light or dark.", "map_hours": "Draw the trail of the last N hours. 0: no trail. If a trail colour or width is set and the hours are not, the last 24 hours are drawn.", "map_tab": "The tab to show the map on (tabbed card, and the panel without three columns).", "map_title": "Heading above the map. Empty: the default one.", "map_hide_title": "Removes the heading above the map.", "map_center": "How the map behaves on updates: \"As in Home Assistant\", \"Follow the car\" (always centred on it) or \"Fixed\" (does not move).", "map_locate": "A \"To the car\" button over the map (top right): brings the map back to the car. The map also has the stock Home Assistant buttons on the left; they centre on all tracked objects, so with only the car on the map the effect is almost the same.", "map_marker": "The car marker: \"Monjaro from above\" in car_color (default), the \"stock\" Home Assistant marker, or your own picture.", "map_marker_url": "Address of your own marker picture, for example /local/marker.png.", "map_marker_size": "Size of the car marker in pixels.", "map_rotate": "Turn the marker with the heading when the tracker has a heading, course or bearing attribute.", "map_heading": "Name of the attribute with the heading when it differs from heading, course, bearing.", "map_caption": "What to write in the caption under the marker: speed, state, name, address.", "map_address_entity": "Entity with the address for the caption. Empty: the address attribute of the tracker.", "map_label": "Label of the stock marker: icon, name, state or an attribute value.", "map_label_attr": "Name of the attribute whose value goes into the label.", "map_label_unit": "Unit shown after the attribute value, for example km/h.", "map_entities": "Other objects on the map (trackers, zones, geo_location).", "map_entities_opts": "Options of each of those entities in YAML: label mode (label_mode), attribute, unit, whether it counts for the focus (focus), name.", "map_geo": "geo_location sources on the map, for example all.", "map_auto_fit": "The map picks its zoom to fit all objects.", "map_fit_zones": "Take zones into account when fitting (together with \"Map: fit all entities in view\").", "map_trail_color": "Colour of the trail: #2fd6a4, 2fd6a4 (no #) or any CSS colour name. Empty: the default.", "map_trail_width": "Trail width in pixels. 0: the default.", "tank_size": "Tank size in litres: the fuel percentage is converted to litres with it.", "fuel_warn": "Below this fuel percentage the bar turns yellow.", "fuel_critical": "Below this fuel percentage the bar turns red.", "tire_critical": "A tyre pressure below this value (bar) is shown red.", "demo": "Demo mode: the card runs on a built-in model of the car, every control works, nothing is sent to the car. The footer says \"DEMO\".", "debug": "Prints under the card which entity each key resolved to and its state. Helps to see why a value is missing.", "p_id": "Preset id in Latin letters, for example winter. Must be unique.", "p_name": "Label on the preset button.", "p_icon": "Preset icon: a built-in name or an mdi:… icon.", "p_enabled": "Whether the preset is shown on the card. A disabled preset stays in the list but has no button on the card.", "p_temp": "Temperature the preset sets: a number (both zones) or min / max.", "p_fan": "Fan speed of the preset. \"Do not change\" keeps it as it is.", "p_flow": "Air-flow direction of the preset. \"Do not change\" keeps it.", "p_circ": "Air recirculation in the preset.", "p_auto": "Climate \"Auto\" mode in the preset.", "p_ac": "Air conditioning in the preset.", "p_defrost": "Windscreen heating in the preset.", "p_rear": "Rear window heating in the preset.", "p_wheel": "Steering-wheel heating in the preset.", "p_seat_heat": "Seat heating in the preset (a level). Per seat: in the \"More steps\" block.", "p_seat_vent": "Seat ventilation in the preset (a level). Per seat: in the \"More steps\" block.", "p_windows": "Window position in the preset: close, open or 0-100 %.", "p_sunroof": "Sunroof position in the preset: closed, open, 0-100 % or ventilation.", "p_sunshade": "Blind position in the preset: closed, open or 0-100 %.", "px_actions": "Any Home Assistant actions (service calls) the preset runs. A list in YAML."}}, ED_HELP_PAT = {"ru": {"ts": "Множитель размера текста для «{l}»: 1 — как сейчас, 1.2 — на 20 % крупнее, 0.8 — мельче. Записывается в text_size.", "ti": "Какая картинка показывается над вкладкой: вид сбоку, вид сверху (3D), салон, приборная панель или без картинки. Действует, если включено «Картинка меняется вместе с вкладкой».", "px": "Шаг пресета «{l}»: значение, которое пресет установит при нажатии. «Не менять» — оставить как есть."}, "en": {"ts": "Text size multiplier for \"{l}\": 1 is as it is, 1.2 is 20 % larger, 0.8 is smaller. Stored in text_size.", "ti": "Which picture is shown above the tab: side view, top view (3D), cabin, cockpit or none. Works when \"The picture follows the tab\" is on.", "px": "Preset step \"{l}\": the value the preset sets on a tap. \"Do not change\" leaves it as it is."}};
  const ED_TOP = ["doors", "windows", "roof", "trunk", "hood", "tires"], ED_FX = ["heat", "vent", "wheel", "air", "defrost", "ambient", "massage"];
  const ED_TABS = ["overview", "climate", "body", "comfort", "data"], ED_TABIMG = { overview: "side", climate: "cabin", body: "top", comfort: "cabin", data: "cockpit" };
  const ED_TS = ["all", "title", "status", "big", "side", "unit", "heading", "button", "chip", "tab", "row", "stepper", "window", "tire", "caption", "label3d"];
  const ED_PX = [["temp_driver", "txt"], ["temp_passenger", "txt"], ["rear_temp", "txt"], ["rear_climate", "tri"], ["g_clean", "tri"], ["rear_flow", "flow"],
    ["seat_heat_driver", "lvl"], ["seat_heat_passenger", "lvl"], ["seat_heat_rear_left", "lvl"], ["seat_heat_rear_right", "lvl"], ["seat_vent_driver", "lvl"], ["seat_vent_passenger", "lvl"],
    ["window_driver", "txt"], ["window_passenger", "txt"], ["window_rear_left", "txt"], ["window_rear_right", "txt"], ["ambient", "tri"], ["ambient_brightness", "txt"], ["actions", "obj"]];
  const layoutButtons = (L) => (L === "mini" ? ["auto", "heat", "cool"] : ["auto", "ac", "heat", "cool", "defrost", "rear"]);
  /* the six presets of examples/presets.yaml, for the "add standard presets" button */
  const STD_PRESETS = [
    { id: "winter", en: "Winter", ru: "Зима", icon: "heat", temp: 24, auto: true, ac: false, defrost: true, rear: true, circ: "outside", seat_heat: "3", wheel: "3", seat_vent: "off" },
    { id: "summer", en: "Summer", ru: "Лето", icon: "cool", temp: "min", auto: true, ac: true, defrost: false, rear: false, circ: "inside", flow: "face", seat_vent: "3", seat_heat: "off", wheel: "off" },
    { id: "defog", en: "Defog", ru: "Запотело", icon: "defrost", temp: 24, auto: false, ac: true, defrost: true, rear: true, circ: "outside", flow: "window", fan: "7" },
    { id: "comfort", en: "Comfort", ru: "Комфорт", icon: "auto", temp: 22, auto: true, ac: true, defrost: false, rear: false, circ: "auto", seat_heat: "off", seat_vent: "off", wheel: "off" },
    { id: "vent", en: "Ventilate", ru: "Проветрить", icon: "fresh", auto: false, ac: false, defrost: false, rear: false, circ: "outside", flow: "face", fan: "5" },
    { id: "off", en: "All off", ru: "Всё выкл", icon: "climate", enabled: false, auto: false, ac: false, defrost: false, rear: false, seat_heat: "off", seat_vent: "off", wheel: "off" },
  ];
  for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) { ED_TXT.en["x." + k] = k; ED_TXT.ru["x." + k] = k; }
  if (!customElements.get("mha-card-editor")) customElements.define("mha-card-editor", MhaCardEditor);
  const mhaGetConfigElement = async () => { await edLoadHa(); return document.createElement("mha-card-editor"); };
  MhaCard.getConfigElement = mhaGetConfigElement;


  /* ------------------------------------------------------ registration -- */
  const CARDS = [
    ["mha-card", MhaCardTabs, "MHA Bridge", "Tabbed card: the car, range and chips, tabs Overview, Climate, Body, Comfort, Data"],
    ["mha-card-full", MhaCard, "MHA Bridge (full)", "The long card: car, presets, windows, climate, seats, tyres and vehicle data one under another"],
    ["mha-card-compact", MhaCardCompact, "MHA Bridge (compact)", "The essentials in one tile with quick climate buttons"],
    ["mha-card-mini", MhaCardMini, "MHA Bridge (mini)", "A small square: range, cabin temperature and quick climate buttons"],
    ["mha-card-panel", MhaCardPanel, "MHA Bridge (panel)", "Full-screen card for a laptop or wall tablet: car, controls and map in three columns"],
  ];
  window.customCards = window.customCards || [];
  CARDS.forEach(([tag, cls, name, description]) => {
    try { if (!customElements.get(tag)) customElements.define(tag, cls); }
    catch (err) { console.warn(`mha-card: define(${tag}) skipped:`, err); }
    if (!window.customCards.some((c) => c.type === tag)) {
      window.customCards.push({ type: tag, name, description, preview: tag !== "mha-card-panel", documentationURL: "https://github.com/nimnal/mha-bridge" });
    }
  });
})();
