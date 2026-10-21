# Changelog

## 1.2.0 — 2026-10-21 (Android app 1.1)
- Android app: English interface. The language follows the system language (Russian, Ukrainian, Belarusian and Kazakh show Russian, everything else English), and a “Language” card at the top of the app switches it by hand: Auto / Русский / English. The choice is saved; the notification text is translated too.
- Map trail: `trail_color` / `trail_width` now work without `hours_to_show` (the trail of the last 24 hours is drawn; the stock map draws no trail at 0 hours), and a colour typed without `#` (`ffffff`) is accepted; an invalid colour is ignored. The trail colour and width now apply to the line itself (the stock map draws it as separate non-interactive segments that were left untouched), and the dots shrink to the width of the line.
- Map in the card no longer flickers or turns white while the car drives: the card re-renders every time the speed or position changes, and each render used to move the map element, so Home Assistant rebuilt the map and reloaded its tiles. The map now lives outside the re-rendered part of the card and stays untouched.

## 1.1.1 — 2026-10-20 (Android app 1.1)
**The first public release of MHA Bridge**: the Android app for the ECARX head unit, the Home Assistant integration `mha_bridge` and a family of Lovelace cards. Optional functions are created only when the car reports them as supported.

### Also in this release
- The integration ships its own brand images (`custom_components/mha_bridge/brand/icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png`), the same icon as the Android app, so Home Assistant 2026.3 and newer shows it on the integration page instead of "icon not available".
- The rear has no fan of its own (the fan is shared by the whole cabin): the rear fan stepper, the `rear_fan` preset key and the `rear_fan` entity are gone; the rear air-flow animation follows the shared fan speed, the rear air direction and the rear climate switch.
- Cabin animations run only for known, active states: the air-flow ribbons are drawn only while the fan speed is a known number above zero (unavailable, unknown or off draws nothing); seat, steering wheel, defrost, massage and ambient effects already followed their own states.
- The settings screen has a "Support the project" card with a QR code (CloudTips) at the bottom; the README has a support button.
- Climate tab: the top row is four buttons (Auto, A/C, Recirculation, Air cleaning), the rest (`maxheat`, `maxcool`) is chosen with `climate_buttons` and hidden by default; steering-wheel, windshield and rear-window heating moved into the section "Heating: seats, steering wheel, glass"; the rear-climate controls share one grid with equal cells.
- Presets are momentary: preset buttons never turn green; the climate buttons show the real state. By default only 6 presets are shown (`off` and `leave` have `enabled: false` in the examples).
- `tap_action` / `car_tap_action` with `action: url` and a path inside Home Assistant (`/car`, `/lovelace/car`) now open in the app itself; only full URLs go to the browser (`navigate` does the same).

### Visual editor
- All cards open a graphical editor (Edit card): five tabs (Main, Look, Actions, Presets, Data and map), built on the stock Home Assistant form. Every configuration key has a field in the form (the whole map block, text size per element, the picture of each tab, top-view labels, cabin effects and strength, per-seat and per-window preset steps). Presets have their own list (add, reorder, remove, the six standard ones in one click). Only changed keys are written; YAML stays available. Every card has a live preview in the card picker (the built-in demo model when the car's entities are not in HA yet).

### Core
- Android app **MHA Bridge** (`ru.mhabridge`) for the ECARX head unit: reads the car through ECARX AdaptAPI and talks to Home Assistant over a WebSocket.
- Integration `mha_bridge`: sensors, door binary sensors, climate controls, seat and steering-wheel heating and ventilation, WebSocket API.
- Cards `mha-card` (tabs), `mha-card-full`, `mha-card-compact`, `mha-card-mini` and `mha-card-panel`; `view: top` draws the car from above in `mha-card`, `mha-card-full` and `mha-card-panel`. There is no layout switch: the card type is the layout.
- Vector side and top pictures of the Monjaro with `car_color`, anti-chrome per zone (`chrome_delete`) and `arch_color`.
- Fuel colour steps, critical tyre pressure, clickable values, five navigation apps, responsive layout, right-hand drive mirroring.
- Top view: every label (doors, windows, sunroof, blind, hood, tailgate) opens the history of its entity (off with `more_info: false`); the blind is its own label over the rear half of the roof, the sunroof over the front half.
- Map: a small Monjaro from above in the car's colour is the default marker (`marker: default` brings the stock one back); own car marker (`marker`, `marker_size`, `marker_rotate`, `caption`), stock-marker label (`label`), more objects and zones (`entities`, `geo_location_sources`, `auto_fit`, `fit_zones`), heading (`title`), centre modes (`center: follow | fixed`), a "To the car" button (`locate_button`), trail colour and width; all of them in the editor.
- The sunroof and the blind (`cover.*_sunroof`, `cover.*_sunshade`) are always created, like the hood and the tailgate: every Monjaro has them.
- Doors, hood, tailgate, windows, sunroof and blind keep their last known state across Home Assistant restarts and while the car is asleep (like the sensors); one display rule for every value: a state that is unknown or not received is shown as "—" (never as "Closed" or 0) on the top view and in the data rows; a top-view label shows "—" only when the state has never been received.
- Rims `type4` redrawn from a sharp straight-on photo (sprites 360 px instead of 240 px).
- Editor: the card type can be switched in the form (Main tab).
- Window on tap: `popup_card` picks the card shown in the window (`mha-card-full` by default, `mha-card`, `mha-card-compact`, `mha-card-mini`), `popup_map: true | false` turns the map in the window on or off regardless of the dashboard card; both are in the editor (Actions tab).
- Editor: every field has a "?" icon, hover or tap it for a description of what the field does and what it changes (Russian and English).
- Editor: the colours follow the Home Assistant theme (light, dark, or the system theme with the profile theme on "Auto"); without a theme it falls back to the system colour scheme.
- Fix: the wheel-arch colour no longer paints the tail lamp.
- Preset buttons have a "Presets" heading like the other blocks.

### Android app
- A launcher icon (a house with a Wi-Fi sign and the Monjaro).
- The header shows the author (nimnal, Telegram @nimnal) and the repository link as tappable links, and the version label.
- `Extras` module (AdaptAPI through reflection) with capability detection (`isFunctionSupported`) sent to Home Assistant in `meta.supported`.
- Windows, sunroof, panoramic sunshade as `cover` (0-100 %), sunroof tilt, central lock sensor. Opening is refused unless the central lock state is freshly confirmed; closing is always allowed.
- Rear climate (power, AUTO, fan, panel lock, temperature, rear seat heating, rear airflow), air cleaning (G-clean), ambient light (power, brightness, mode, effect, colour).
- Massage (driver/passenger: switch, intensity, program) for cars that have it; hidden automatically when the car does not report it.
- New sensors `hood` and `trunk`, read from the door function (zone 0x10000000 = hood, 0x20000000 = trunk; 1 = open).
- Diagnostics dumps all AdaptAPI int constants and the live values of lock/trunk/hood/roof/window-like functions.

### Integration
- Binary sensors "Hood" and "Trunk" (device class door); the capability list is stored, so entities appear after a restart before the car connects.
- The integration serves `car-side.svg` (with five rim designs), `car-top.webp` + `car-top-mask.webp` (the flat top view is a render of the 3D model, so the lamps and the geometry match the 3D view exactly), `car3d.bin` (~1.3 MB), `three.module.min.js` (MIT), `cabin.webp`, `cabin_mask.png`, `cockpit.webp`, `cockpit_mask.png`; the heavy files load only when a card needs them.

### New cards and layouts
- `mha-card`: a side column with the car, range and chips, plus tabs Overview / Climate / Body / Comfort / Data (keys `tabs`, `default_tab`, `height`). Every picture sits in a "stage" of one fixed shape, so nothing below it jumps when you switch tabs.
- `mha-card-panel`: the tabbed card for a whole screen, a laptop or a wall tablet (sized for 1920x1080), scaled to the window; keys `scale` (absolute, 0.5 and up), `zoom` (trims the automatic fit, so a long tab can be made to fit without scrolling) and `panel_height`.
- Tabs: the card always opens on `default_tab`; `remember_tab: true` brings back remembering the last chosen tab.
- Panel with the map (`map: true`): three columns, the car on the left, tabs and buttons in the middle, the map over the whole height in the right third; the smallest screen is 768x384 css-px. On a phone held upright (or in a narrow column) the panel becomes the tabbed card; `rotate: auto` turns it into landscape instead, `always` also on a computer (`rotate: off | auto | always`, default `off`); `panel_min_width: 900` switches the panel to the tabbed card below a chosen width.
- Tabbed cards change the picture with the tab (`tab_images`): the side view, the cabin photo from above, the 3D top view, the cockpit.
- The switches (Auto, A/C, front and rear defrost, recirculation, steering-wheel heating, max heat / cold) are in the Climate block or tab only. Under the picture come, in this order: the tabs, the presets, the "route to the car" links, then everything else.

### 3D top view and cabin
- `view: top` draws a 3D model of the Monjaro (three.js): doors open on their hinges, windows, sunroof and blind follow their entities, the hood and tailgate open; labels per door and window, `top_labels` switches each group off; `car_3d: false` keeps the flat picture.
- The cabin photo from above (Climate, Comfort) with live effects: seat heating and ventilation per seat, steering-wheel heating, air flow drawn like the head unit's own animation (ribbons leaving the vents, colour from the set temperature, pace from the fan), defrost, ambient light along the doors, massage pulses. `cabin_fabric`, `cabin_trim` recolour the upholstery and the trim, `cabin_opacity` and `cabin_effects` tune the effects. The cockpit photo on the Data tab.
- A sunroof that is only tilted for ventilation shows its own status "Ventilation" (`sunroof_vent_max`, default 8 %).

### Presets
- One-tap presets under the picture. Nothing is built into the code: every preset, including the familiar Winter, Summer, Defog, Comfort, Ventilate and All off, is written with its steps in the card YAML, and a preset that is not listed is not on the card (ready-made six: `examples/presets.yaml`). They use the same tiles as the climate buttons; the grid follows the count (8 = 2x4, 6 = 2x3, up to 4 in one row).
- At most 8 in total, in the order of the list. A preset can set climate (temperatures per zone, fan, flow, seat heating and ventilation per seat, wheel, rear climate, ambient light), windows, sunroof (incl. `vent`) and blind, and call any Home Assistant service (`actions`); icons are built-in names or `mdi:` icons.

### Look and size
- `tap_action` / `car_tap_action`: choose what a tap on the card or on the car does (full-card window by default on the compact card, or navigate to another Lovelace page, open a link, more-info, call an action).
- `wheel_spin: true`: the rims of the side view turn at the speed of a 20" wheel (reverse turns backwards, fast speeds melt into a motion blur); `wheel_circumference` and `wheel_spin_entity` tune it. Off by default.
- `wheels: type1 ... type5`: five rim designs on the side view (one key changes both wheels); works with `car_color`, `chrome_delete`, `arch_color`, `car_image_facing`.
- `accent`: the theme colour of the card (green by default): a name (`blue`, `orange`, `violet` ...) or any CSS colour; `warn_color` and `critical_color` for amber and red.
- `text_size`: the size of the text by kind of element (title, status, big figures, headings, buttons, chips, tabs, rows, steppers, windows, tyres, captions, 3D labels), as a multiplier or in px; `all` scales everything. `zoom` (0.5-2) scales a whole card.
- `demo: true`: the card runs on a built-in model of the car, every control works and redraws at once, nothing is sent to the car; the footer says "DEMO".
- `map`: a map built into the card (the stock Home Assistant map, restyled as part of the card, with zoom and scrolling); off by default; `entity`, `zoom`, `aspect_ratio` or `height`, `theme_mode`, `hours_to_show`, `tab`. It sits on the Overview tab after the route links.
- `stable_tabs` (default `true`): `false` lets each tab's picture take its own height instead of one fixed stage.
- `headlights` (default `true`): the head and tail lamps glow while the engine runs, on the side view, the top view and in 3D. The tail-lamp glow is a ready-made layer with its own effects (outer glow, colour overlay, inner glow; softened), the same on the side and the top view; the swept head lamps throw two beams each.
- Tabbed cards: Overview holds the presets, the route links and the map; the tyre block is at the bottom of the Data tab.
- Windows grid follows the car: rear left under the driver, rear right under the passenger; the sunroof and blind in a third column or a row below; at most three columns.
- Graphics keep their proportions at any width, font size and orientation (icons no longer squeeze, the 3D view fits its box).
- `cabin_opacity` defaults to `0.6`.
- `debug: true`: prints under the card which entity each key resolves to and its state.
- Body tab: "Close all" as a wide accented button, windows, sunroof and blind say "Open 40 %", arrow buttons, at most three tiles in a row.
- Phone width: a shorter Climate tab (three steppers on one line, four air-flow modes per row).
- Climate buttons use clearer Material Design Icons; `hide` names `windows, lock, rear_climate, gclean, ambient, massage`; `confirm_open`.

### Documentation
- `docs/CUSTOMIZATION.md` (and `.en.md`): a gallery with about 100 screenshots and a reference of every look setting with ready-made configs; the README has the full key table.
