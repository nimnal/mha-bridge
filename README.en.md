<div align="center">

# 🚙 MHA Bridge

**A bridge between the ECARX head unit (Geely Monjaro / Xingyue L) and Home Assistant: car data, climate control and ready-made dashboard cards.**

[![Add to HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=nimnal&repository=mha-bridge&category=integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.1.1-2fd6a4.svg)
[![Русский](https://img.shields.io/badge/README-Русский-lightgrey.svg)](README.md)

![MHA Bridge cards](docs/gallery/family.png)

</div>

> An unofficial community project, not affiliated with Geely, ECARX or Home Assistant. Tested by the author on a Geely Monjaro (Xingyue L). Other ECARX cars have not been tested.

---

## ✨ Highlights

- 📡 **Local, no cloud.** An Android app runs on the head unit itself, reads the car through ECARX AdaptAPI and pushes the data to Home Assistant over a WebSocket. Nothing goes through third-party servers.
- 🔌 **Two-way.** Data is pushed to HA as it changes (`local_push`, no polling). Commands from HA (climate, seat heating, ventilation) reach the car over the same subscription.
- 🧩 **One install.** The integration serves the card file itself and registers it as a Lovelace resource. No separate frontend install.
- 🖱️ **Visual editor:** the cards are configured in a normal Home Assistant dialog (tabs, switches, colour pickers, a preset list), YAML is optional; every card has a live preview in the card picker.
- 🧊 **3D top view:** a Monjaro model whose doors, windows, sunroof and tailgate open on the card together with the car.
- 🪑 **A picture per tab:** the Climate tab shows the cabin photo from above (no body) with heating, ventilation and air flow lit up; fabric and trim colours are selectable.
- 🎨 **Vector Monjaro pictures** for the side and top views: body colour, anti-chrome per zone, wheel-arch colour.
- 📱 **Responsive** from desktop down to a narrow phone screen.
- 🌐 **Russian and English** UI for the integration and cards.
- 🔐 **The HA token stays on the device.** Create a dedicated HA user with a long-lived token for the car.

## 🖼️ Customization gallery

The cards are configured in the visual editor or in YAML: body colour, theme colour, text size, chrome delete, rims, cabin, tabs, presets. A few examples are below; the full reference with screenshots and ready-made configs is in **[docs/CUSTOMIZATION.en.md](docs/CUSTOMIZATION.en.md)** (the screenshots carry Russian captions; the card itself switches to English with your Home Assistant profile).

| | |
|---|---|
| [![Body colours](docs/gallery/car_color.png)](docs/CUSTOMIZATION.en.md#body-colour--car_color) | [![Rims](docs/gallery/wheels.png)](docs/CUSTOMIZATION.en.md#rims--wheels) |
| `car_color`: any body colour | `wheels`: five rim designs, both wheels with one key |
| [![Chrome delete](docs/gallery/chrome_delete.png)](docs/CUSTOMIZATION.en.md#chrome-delete--chrome_delete) | [![Presets](docs/gallery/presets_layout.png)](docs/CUSTOMIZATION.en.md#7-presets) |
| `chrome_delete`: chrome black, body colour or any colour | `presets`: up to 8 of your own scenarios, the grid adapts |
| [![Theme colour](docs/gallery/accent.png)](docs/CUSTOMIZATION.en.md#10-theme-colour-and-text-size) | [![Text size](docs/gallery/text_size.png)](docs/CUSTOMIZATION.en.md#10-theme-colour-and-text-size) |
| `accent`: the main colour of the card (green by default) | `text_size`: text size as a whole or by kind of element |

[![Tabs on a phone](docs/gallery/tabs_phone.png)](docs/CUSTOMIZATION.en.md#2-tabs-order-picture-height)

[![Full-screen panel](docs/gallery/panel_climate.png)](docs/CUSTOMIZATION.en.md#3-full-screen-panel)

---

## 📊 What you can see (sensors)

| Group | Entities |
|---|---|
| **Driving** | speed, instrument-cluster speed, engine speed, gear (P / R / N / D), ignition (lock / off / acc / on / start / driving) |
| **Range & fuel** | fuel level (L), range, odometer |
| **Temperature** | cabin and outside |
| **Tyres** | pressure of all four tyres (bar) |
| **Body & safety** | four doors, hood and trunk (open / closed), driver and passenger seat belts, engine running |
| **Link** | "Car connection" (is the bridge alive) |

## 🎛️ What you can do (controls)

| Action | Entity |
|---|---|
| Driver and passenger temperature (16–30 °C, 0.5 step) | `number` |
| Fan speed (off, 1–9) | `select` |
| Airflow (face, legs, face+legs, windshield, face+windshield, legs+windshield, all, auto, off) | `select` |
| Air source (outside / recirculation) | `select` |
| Driver and passenger seat heating (off, 1–3) | `select` |
| Driver and passenger seat ventilation (off, 1–3) | `select` |
| Steering wheel heating (off, 1–3) | `select` |
| A/C, climate AUTO | `switch` |
| Windshield and rear window defrost | `switch` |

Windows, sunroof, massage and ambient light are described below under "Windows, sunroof, lock and optional equipment". There are no commands for locks, trunk and hood yet.

### 🪟 Windows, sunroof, lock and optional equipment

Not every car has these functions, so **entities are created only if the car itself reports the function as supported** (the app sends the list in `meta.supported`; it is remembered across Home Assistant restarts). No function means no entity and no block in the card. Exception: the sunroof and the blind exist on every Monjaro, so their entities are always created (like the hood and the tailgate); hide anything you do not need in the card with `top_labels`.

| What | Entity | Note |
|---|---|---|
| Windows (4), sunroof, panoramic sunshade | `cover` (position 0–100 %) | Positions 0 / 25 / 50 / 75 / 100 %. A window cannot hold less than 10 %, 4 % step, same as the stock app |
| Sunroof tilt | `switch` | |
| Central lock | `binary_sensor` (device class `lock`) | Read only: `on` = unlocked |
| Rear climate: power, AUTO, fan (0–9), panel lock | `switch` / `select` | |
| Rear seat heating (left, right; off, 1–3), rear airflow (face / feet / both) | `select` | optional |
| Rear zone temperature (one shared, `number`) | `number` | optional |
| Air cleaning (G-clean) | `switch` | |
| Driver and passenger massage: on, intensity 1–3, program 1–8 | `switch` / `select` | **Optional equipment.** On a car without massage there are no entities and the card block is not shown |
| Ambient light: on, brightness, mode, effect, colour (13 colours) | `switch` / `number` / `select` | |

**Opening safety.** Closing windows, sunroof and shade is always allowed. Opening (and tilting the roof) is allowed only if the central lock state has just been read and is reliable. If the lock cannot be read, the open command is refused and the app log says why. This is the same caution as the car's stock app. In the card you can add a confirmation: `confirm_open: true`.

**Hiding card blocks** with `hide`: `windows`, `lock`, `rear_climate`, `gclean`, `ambient`, `massage`. Massage also hides itself when there are no entities. The `massage` key removes the block where massage exists but is not wanted.

**Trunk and hood.** Their function IDs are not known yet. The **Diagnostics** button in the app now writes every AdaptAPI constant and the values of functions that look like locks, trunk, hood, roof and windows to the log (`=== КОНСТАНТЫ ADAPTAPI ===`). Copy the log and send it, and control can be added in the next release.

### 🧊 3D top view

With `view: top` (in `mha-card`, `mha-card-full` and `mha-card-panel`) the card now draws a **3D model of the Monjaro** (WebGL, three.js) instead of a flat picture. Whatever is open on the car is open on the card:

| State | What you see |
|---|---|
| Door (the four door sensors) | the door swings open on its hinges; the body keeps its size and position; the opening angle (28°) is chosen so all four doors fit inside the card |
| Hood and tailgate | open by the "Hood" and "Trunk" sensors that the app creates itself |
| Windows (each window `cover`) | the glass drops into the door in proportion to 0–100 % |
| Window label | under each door's Open/Closed: `window shut`, `window 40%`, `window open` (amber when not shut) |
| Sunroof, blind, hood, tailgate labels | on the model: `Sunroof: Closed / 40% / Tilted / Vent / Open` (`Vent` = tilted only for ventilation, see `sunroof_vent_max`) over the front half of the roof and a separate `Blind: Closed / 40% / Open` over the rear half (the roof glass is split by a line); `Hood` and `Tailgate: Open / Closed` ; the labels are always shown; one rule for every value on the card (doors, windows, sunroof, blind, hood, tailgate, tyres, data rows): when the state is unknown or not received, "—" is shown instead of the value, never "Closed" or 0. "—" means no data (check `binary_sensor.*_hood`, `binary_sensor.*_trunk`, `cover.*_sunshade` in Developer Tools) |
| Sunroof | slides back by the open percentage; "tilt" lifts the rear edge |
| Panoramic sunshade | retracts by the percentage |

Everything from before is kept: `car_color` paints the body, `chrome_delete` darkens the chrome trim, tyre pressures and door states are printed at the wheels, `rhd: true` mirrors the model together with the labels. If WebGL or the model files are unavailable the card shows the old flat picture. Turn 3D off with `car_3d: false`.

The model (`car3d.bin`, ~1.3 MB) and three.js (`three.module.min.js`, MIT) are served by the integration and loaded only when a top view is on the dashboard. Wheel-arch colour and per-zone anti-chrome do not apply in 3D (the chrome trim takes a single colour).

```yaml
type: custom:mha-card
view: top
car_color: "#0b5159"
```

### 🪑 Picture per tab and the cabin

In the tabbed cards (`mha-card`, `mha-card-panel`) the picture on the left follows the tab:

| Tab | Picture |
|---|---|
| Overview | side view (with `view: top`: top view) |
| Climate | the cabin photo from above in its **original proportions**, untransformed and without the body, with a soft vignette at the edges. It shows what is on: seat heating and ventilation per seat (three levels, colour and dots), steering-wheel heating (all drawn as soft smoke-like puffs: large slow warm billows for heating, small fast cool puffs for ventilation), heating of the **rear left and right** seats (rear seats have no ventilation, the centre seat has nothing), the front **air-flow direction** (streams leave the dash grilles, which light up in face mode) and the **rear airflow** (face from the centre tunnel, feet, face + feet); flows are coloured by the set temperature (blue, neutral, orange) and paced by the fan, windshield and rear-window defrost |
| Body | top view with the roof (3D, as before) |
| Comfort | the cabin: ambient light along the doors and dash in its colour and effect, massage pulses on the seat backs |
| Data | the cockpit photo: screens glow with the ignition on; gear and speed underneath |

![Card: the Climate, Comfort and Data tabs](docs/gallery/tabs_phone.png)

![Full-screen panel 1920×1080](docs/gallery/panel_climate.png)

**Cabin colours.** In the photo the fabric is green and the dash strip is bronze. Other trims have grey fabric and a silver strip, so both are selectable:

```yaml
cabin_fabric: green        # green (as in the photo), light_gray, dark_gray or any colour: "#7a2a2a", "rgb(80,90,100)"
cabin_trim: silver         # bronze (as in the photo), silver, gold or any colour
```

The recolouring works through masks and keeps highlights and shadows; only the fabric (seats, door inserts, dash band) and the thin decorative lines (under the screens, on the doors) change.

**Flags.**

| Key | Default | What it does |
|---|---|---|
| `tab_images` | `true` | `false`: one picture for all tabs, as before. Or per tab: `{ overview: side, climate: cabin, body: top, comfort: cabin, data: cockpit }`; values `side`, `top`, `cabin`, `cockpit`, `none` |
| `cabin_fabric` | `green` | fabric colour: `green`, `light_gray`, `dark_gray` or your own colour; applies on every tab, including the interior of the 3D top view (through open doors and the sunroof) |
| `cabin_trim` | `bronze` | decorative strip colour: `bronze`, `silver`, `gold` or your own colour |
| `cabin_effects` | all on | what is drawn over the cabin: `false` (nothing), a list or a map of `heat`, `vent`, `wheel`, `air` (or `airflow`), `defrost`, `ambient`, `massage` |
| `cabin_opacity` | `0.6` | opacity of the heating, ventilation and air-flow effects on the cabin: one number `0…1` (or percent `0…100`) for all, or a map `{heat: 0.5, vent: 1, air: 0.7}` (`heat` = seats, wheel and glass heating, `vent` = seat ventilation, `air` = air flows). Ambient light and massage are not affected |

The cabin is always a flat photo and does not depend on WebGL or `car_3d`. The files `cabin.webp`, `cabin_mask.png`, `cockpit.webp`, `cockpit_mask.png` (about 0.4 MB together) are served by the integration and loaded only by the tabs that need them.

## 🧠 How it works

```
 car ──► ECARX AdaptAPI ──► MHA Bridge app ──WebSocket──► Home Assistant
 (CAN,    (on the head       (ru.mhabridge,              (mha_bridge integration,
 climate)  unit)              foreground service)         entities and cards)
```

1. The app starts with the head unit (`BOOT_COMPLETED`) and runs as a foreground service.
2. It connects to Home Assistant with the address and long-lived token you enter in its settings.
3. State is sent with `mha_bridge/update`; HA commands arrive over the `mha_bridge/subscribe` subscription.
4. `mha_bridge/info` is used for the check: "Check connection" in the app confirms HA is reachable, the token is accepted and the integration is found.

## 📥 Installation

### Via HACS (recommended)

1. In HA open **HACS → ⋮ → Custom repositories**.
2. Paste `https://github.com/nimnal/mha-bridge`, category **Integration**.
3. Find **MHA Bridge** in HACS and press **Download**.
4. **Restart Home Assistant.**
5. **Settings → Devices & services → Add integration → MHA Bridge.** Enter the car name (default "Geely Monjaro").

Quick install: [![Open your Home Assistant instance and open the repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=nimnal&repository=mha-bridge&category=integration)

### Manually

1. Copy `custom_components/mha_bridge` to your HA config folder: `config/custom_components/mha_bridge`.
2. Restart Home Assistant and add the integration as in step 5 above.

### The app on the head unit

1. Download `MHA-Bridge.apk` from [Releases](https://github.com/nimnal/mha-bridge/releases) and install it on the head unit (allow installs from unknown sources).
2. In HA open your profile → **Security → Long-lived access tokens → Create token**. A dedicated user for the car is recommended.
3. In the app enter the HA address (for example `http://192.168.1.10:8123`) and the token.
4. Press **Check connection**, then **Save and start**.

## 🔄 Updating

Update the integration through HACS and **always restart HA**. Then press Ctrl+F5 in the browser, or it may keep showing the old card file or pictures. The app on the head unit is updated by installing a new APK over it, which must be signed with the same key as the previous one.

## 🖥️ Dashboards & cards

![MHA Bridge cards](docs/gallery/family.png)

Cards register themselves. After restarting HA refresh the page (Ctrl+F5), press “Add card” and search for “MHA Bridge”: every card has a preview (if the car's entities are not in HA yet, it shows the built-in demo model). Configure a card in the visual editor or in YAML.

### 🖱️ Visual editor

![Visual editor](docs/gallery/editor.png)

(The captions are Russian because the screenshot was taken with a Russian profile; with an English profile the editor is in English.)

“Edit” on a card opens a form built from the stock Home Assistant components (light and dark themes follow the Home Assistant theme, and with the profile theme set to "Auto" the system theme; Russian or English by the profile language). Five tabs: **Main** (card type, title, tracker, zoom, right-hand drive, sunroof ventilation limit, text size per element), **Look** (picture and your own pictures, rims and their spin, 3D, mouldings, chrome delete, top view: hood and tailgate sensors and labels, colours, cabin: strength and effects), **Actions** (tap on the card and on the car, the window on tap: which card and whether it has the map, quick buttons, hidden blocks), **Presets** (a list with add, reorder and a “six standard ones” button), **Data and map** (card tabs, the first tab, remembering the tab and the picture of each tab, navigation, the whole map: tracker, zoom, ratio, height, theme, trail, tab; fuel and tyres). A preset has a “More steps” block: seats and windows one by one, rear climate, ambient light, any HA actions. Every field has a round "?" on the right: hover it (or tap it) for a detailed description of what the field does and what it changes. Every YAML key is in the form; only the marker positions `car_image_hotspots` and a preset’s `actions` list are typed as a YAML block inside the form. Only the keys you change are written; YAML mode stays next to it.

| Type | What it is |
|---|---|
| `custom:mha-card` | **Tabbed (main card).** Compact card: the car, range and chips on the left, tabs Overview / Climate / Body / Comfort / Data on the right. Made for wide screens and phones, fixed height. `view: top` shows the car from above. |
| `custom:mha-card-full` | **Full.** Side photo (or `view: top`), range, climate, airflow, seat heating and ventilation, driving, tyres, car data, navigation on one page. |
| `custom:mha-card-panel` | **Full-screen panel.** The tabbed card for a laptop or a wall tablet: big figures, picture and buttons, scaled to the width and height of the screen (sized for 1920×1080). With the map on (`map: true`) it has three columns: the car, the tabs and buttons in the middle, the map in the right third. It needs a screen of at least 768×384 CSS pixels; on a phone held upright it becomes the tabbed card (`rotate: off \| auto \| always`, default `off`). Use it in a Panel (single card) view. Below the minimum it behaves like `mha-card`. |
| `custom:mha-card-compact` | **Compact.** Range, photo, status chips and six climate buttons. |
| `custom:mha-card-mini` | **Mini.** Title, range, three buttons. Fits a 6×3 grid. |

Minimal card:

```yaml
type: custom:mha-card
```

Every other key is optional.

### 🎨 Look of the car

```yaml
type: custom:mha-card
car_color: "#16181b"        # body colour: any CSS colour
wheels: type1               # side-view rims, both at once: type1 original | type2 … type5
arch_color: black           # wheel-arch trim: black | original | body | any colour
chrome_delete:              # anti-chrome on the side view; true = all five groups black
  front_bumper: 1
  rear_bumper: 1
  doors: 1                  # lower door trim
  rails: 1                  # roof rails
  windows: 0.6              # window mouldings
```

![Arch colours](docs/gallery/arch_color.png)

- **`car_color`** repaints only the body paint. Glass, tyres, wheels, lamps and all trim stay as they are.
- **`chrome_delete`**: each of the five groups takes a number 0…1 (how far towards gloss black, 1 = black), a colour (`"#202020"`, chrome is repainted keeping its highlights) or `body` (the body colour). Trim is always drawn above the paint.
- **`arch_color`**: `black` (default), `original` (as in the source photo, `car_color` does not apply), `body` (body colour) or any colour.
- **`wheels`**: the rim design on the side view; both wheels change with one key. `type1` is the original (as in the source picture), `type2` … `type5` are other Monjaro rims (see `docs/gallery/wheels.png`). It works together with `car_color`, `chrome_delete`, `arch_color` and `car_image_facing`.
- The top view supports `car_color` and (as one colour) `chrome_delete`; the arch colour does not apply there.

### 🎚️ Presets (one-tap scenarios)

A preset is a tile under the picture (on the Overview tab in tabbed cards) that runs a list of steps with one tap: climate, windows, sunroof, blind, seat heating and even any Home Assistant service. The tiles look like the climate buttons, three to a row. **At most 8** in total (extra ones are dropped). Steps whose entity or option the car does not have are skipped, so one preset works on every trim. Anything a preset does not mention is left as it is.

**Nothing is built into the code.** The whole logic of every preset, including the familiar Winter, Summer, Defog, Comfort, Ventilate and All off, is written in the card's YAML. A preset that is not in the `presets` list is not on the card; without a `presets` key there are no tiles at all. The six ready-made presets are in [`examples/presets.yaml`](examples/presets.yaml): copy them into your config and change them as you like.

#### How to write them

**A list: the exact set and order of the tiles.** Every item is a preset with its steps; `name` and `icon` are optional (the label defaults to the `id`, the icon to `climate`).

```yaml
presets:
  - id: winter
    name: Зима                 # optional: the label on the tile
    icon: heat
    temp: 24
    auto: true
    ac: false
    defrost: true
    rear: true
    circ: outside
    seat_heat: "3"
    wheel: "3"
    seat_vent: "off"
  - id: summer
    name: Лето
    icon: cool
    temp: min
    auto: true
    ac: true
    defrost: false
    rear: false
    circ: inside
    flow: face
    seat_vent: "3"
    seat_heat: "off"
    wheel: "off"
  - id: defog
    name: Запотело
    icon: defrost
    temp: 24
    auto: false
    ac: true
    defrost: true
    rear: true
    circ: outside
    flow: window
    fan: "7"
  - id: comfort
    name: Комфорт
    icon: auto
    temp: 22
    auto: true
    ac: true
    defrost: false
    rear: false
    circ: auto
    seat_heat: "off"
    seat_vent: "off"
    wheel: "off"
  - id: vent
    name: Проветрить
    icon: fresh
    auto: false
    ac: false
    defrost: false
    rear: false
    circ: outside
    flow: face
    fan: "5"
  - id: "off"
    name: Всё выкл
    icon: climate
    auto: false
    ac: false
    defrost: false
    rear: false
    seat_heat: "off"
    seat_vent: "off"
    wheel: "off"
```

A map works too: preset `id` → its settings (in config order). A preset without steps (only `name` / `icon`) is not shown, `enabled: false` hides one without deleting it. `presets: true` no longer switches anything on, `presets: false` simply hides the block.

```yaml
presets:
  parking:
    name: Parking
    icon: mdi:car-brake-parking
    windows: closed             # all four windows
    sunroof: closed
    sunshade: closed
    ac: false
    auto: false
  dog:                          # "dog in the car"
    name: Dog
    icon: mdi:dog
    windows: 30                 # windows at 30 %
    temp: 20
    fan: "3"
    ac: true
```

#### Keys common to all presets

| Key | What it does |
|---|---|
| `name` | Label on the tile (default: the `id`) |
| `icon` | A built-in icon (`heat`, `cool`, `defrost`, `auto`, `climate`, `fresh`, `steering`, `seatheat`, `seatvent`, `lock` …) **or any Material Design Icon: `mdi:name`** - catalogue at https://pictogrammers.com/library/mdi/ |
| `id` | Internal name (in a list); in a map this is the key |
| `enabled` | `false` hides the preset without deleting it from the config |

#### Climate

| Key | Values | What it does |
|---|---|---|
| `temp` | number, `[driver, passenger]`, `min`, `max` | Temperature of both zones |
| `temp_driver`, `temp_passenger` | number, `min`, `max` | One zone (wins over `temp`) |
| `rear_temp` | number | Rear zone temperature |
| `fan` | `"1"`…`"9"` | Fan speed (in quotes) |
| `flow` | `face`, `leg`, `face_leg`, `window`, `face_window`, `leg_window`, `all`, `auto` | Air flow |
| `auto`, `ac` | `true` / `false` | Auto mode, A/C |
| `defrost`, `rear` | `true` / `false` | Windshield / rear window defrost |
| `circ` | `inside`, `outside`, `auto` | Recirculation |
| `seat_heat`, `seat_vent` | `off`, `"1"`, `"2"`, `"3"` | Front seat heating / ventilation (heating also the rear seats) |
| `seat_heat_driver`, `seat_heat_passenger`, `seat_heat_rear_left`, `seat_heat_rear_right`, `seat_vent_driver`, `seat_vent_passenger` | same | One seat (wins over the general key) |
| `wheel` | `off`, `"1"`…`"3"` | Steering-wheel heating |
| `rear_climate`, `g_clean` | `true` / `false` | Rear climate, air cleaning |
| `rear_flow` | as for the front | Rear air direction (the fan is shared by the whole cabin) |
| `ambient` | `true` / `false` | Ambient light |
| `ambient_brightness` | number | Ambient brightness |

#### Windows, sunroof, blind

| Key | Values | What it does |
|---|---|---|
| `windows` | `closed`, `open`, `0`…`100` | All four windows at once (`closed` = 0, `open` = 100 %) |
| `window_driver`, `window_passenger`, `window_rear_left`, `window_rear_right` | same | One window (wins over `windows`) |
| `sunroof` | `closed`, `open`, `0`…`100`, `vent` | Sunroof; `vent` tilts it for ventilation, `closed` also switches the tilt off |
| `sunshade` | `closed`, `open`, `0`…`100` | Blind |

Windows and sunroof work only if the car reports them (see "Windows, sunroof ..."). `confirm_open` is not asked for presets: you wrote what they should do.

#### Any Home Assistant service - `actions`

A preset can call anything: switch a light, run a script, send a notification. The format is the same as in automations:

```yaml
presets:
  leave:
    name: Leaving
    icon: mdi:exit-run
    windows: closed
    sunroof: closed
    ac: false
    actions:
      - action: light.turn_off
        target: { entity_id: light.garage }
      - action: script.turn_on
        target: { entity_id: script.lock_house }
      - action: notify.mobile_app_phone
        data: { message: "Car is locked" }
```

Steps run in order about 0.3 s apart: climate first, then windows and sunroof, then `actions`. While a preset runs, the tiles ignore taps for a couple of seconds. Preset tiles never light up and keep no state: they are one-shot actions (like a momentary button) that run the scenario.

### ⛽ Fuel

The range bar changes colour in three steps:

| Level | Colour | Label |
|---|---|---|
| above `fuel_warn` (25 %) | green `--geely-accent` | none |
| `fuel_warn` to `fuel_critical` | amber `--geely-warn` | "Low fuel" |
| below `fuel_critical` (10 %) | red `--geely-critical` | "Fuel almost out" |

The percentage is computed from `tank_size` (60 L by default). Colours can be set with `fuel_color_ok`, `fuel_color_warn`, `fuel_color_critical` or with HA theme variables.

### 🛞 Tyres

If any tyre is below `tire_critical` its value turns red: in the full card, on the top view, in compact (a red chip) and in mini (a red line under the range). The threshold is in the sensor's unit (normally bar); the colour is `tire_color_critical`.

### 🗺️ Navigation

"Route to the car" buttons follow the `nav` list, in order:

| Key | App |
|---|---|
| `yandex` | Yandex Maps |
| `maps` | Google Maps |
| `osm` | OpenStreetMap |
| `apple` | Apple Maps |
| `here` | HERE WeGo |

`nav_mode: route` builds a route to the car, `locate` only shows where it is. `nav_travel`: `driving`, `walking`, `transit`, `bicycling` (OSM treats `transit` as driving).

### 👆 Clickable values

Tapping speed, engine speed, gear, ignition, engine, tyre pressure (and every label of the top view: doors, windows, sunroof, blind, hood, tailgate), mileage, fuel, range, temperatures or seat belts opens the standard HA history dialog. Turn it off with `more_info: false`.

A tap on the card itself and on the car picture is set with `tap_action` and `car_tap_action`: `expand` (the full card in a window, the default for the compact card), `none`, `navigate` (for example to a panel page), `url` (a path inside HA such as `/car` opens in the app itself, a full address in the external browser), `more-info`, `perform-action`. The same is on the Actions tab of the editor.

### 📚 All configuration keys

| Key | Default | Description |
|---|---|---|
| `view` | `side` | `mha-card`, `mha-card-full`, `mha-card-panel`: `side` or `top` (3D top view) |
| `tabs` | all five | `mha-card` and `mha-card-panel` only: which tabs and in which order (`overview, climate, body, comfort, data`). The Comfort tab disappears by itself when there is no ambient light or massage |
| `default_tab` | `overview` | `mha-card` and `mha-card-panel` only: tab on open; the card always opens on it |
| `remember_tab` | `false` | `mha-card` and `mha-card-panel` only: `true` remembers the last chosen tab in the browser instead of `default_tab` |
| `height` | `440` | `mha-card` and `mha-card-panel` only, on a wide screen: height of the tab area in pixels, `0` = unlimited |
| `tab_images` | `true` | `mha-card` and `mha-card-panel` only: the picture follows the tab (`false` turns it off; per tab: `side`, `top`, `cabin`, `cockpit`, `none`) |
| `map` | off | A map inside the card (the stock Home Assistant map in the card's own look, with zoom and scrolling). `true` or `{ entity, zoom, aspect_ratio, theme_mode, hours_to_show, height, tab }`: `entity` is the tracker (default `tracker`), `zoom` the default zoom (`15`), `aspect_ratio` (`16:10`), `theme_mode` (`auto`/`light`/`dark`), `hours_to_show` the trail, `height` a height in px instead of a ratio, `tab` the tab to show it on (`overview`). Also `title`, `center` (`follow`/`fixed`), `locate_button`, `marker` (`car` by default, `default` for the stock one, or a picture address), `marker_size`, `marker_rotate`, `caption`, `label`, `label_attribute`, `label_unit`, `address_entity`, `marker_heading`, `entities`, `geo_location_sources`, `auto_fit`, `fit_zones`, `trail_color`, `trail_width`: see docs/CUSTOMIZATION.en.md. Works in `mha-card`, `mha-card-full`, `mha-card-panel` |
| `stable_tabs` | `true` | `mha-card`/`mha-card-panel` only: the picture sits in a stage of one shape so controls do not jump when the tab changes. `false` lets each tab's picture take its own height (a more compact card) |
| `headlights` | `true` | While the engine runs (`engine_running`) the head and tail lamps glow on the side and top views (also in 3D). `false` turns it off |
| `accent` | `green` | The main colour of the card (green by default): a name (`blue`, `orange`, `violet`, `pink`, `red`, `cyan`, `amber`, `lime` and more) or any CSS colour, for example `"#ff8a3d"` |
| `warn_color`, `critical_color` | amber, red | The warning colour and the colour of critical values (tyre pressure and so on) |
| `text_size` | not set | Text size: a number (a multiplier up to 4, for example `1.15`, or a size in px) or a map by kind of element: `all`, `title`, `status`, `big`, `side`, `unit`, `heading`, `button`, `chip`, `tab`, `row`, `stepper`, `window`, `tire`, `caption`, `label3d`. More: [docs/CUSTOMIZATION.en.md](docs/CUSTOMIZATION.en.md#10-theme-colour-and-text-size) |
| `zoom` | `1` | Overall size of any card, `0.5` to `2` (for example `0.85` = 15 % smaller). In `panel` it trims the automatic fit: if a scroll bar appears on the right, set `zoom: 0.85` or lower |
| `scale` | auto | `panel` only: absolute zoom (for example `1.6`, values below 1 are allowed, down to `0.5`). By default it is chosen from the window size |
| `panel_height` | rest of the window | `panel` only: card height in pixels |
| `panel_min_width` | — | `panel` only: when the card is narrower than this many px (e.g. `900`), the panel is shown as the tabbed card (portrait layout). Without the key: only when there is no room for the columns |
| `rotate` | `off` | `panel` only: a phone held upright or a narrow column. `off` turns the panel into the tabbed card (portrait layout), `auto` turns the panel into landscape over the whole screen (turn the phone), `always` turns it on a computer too |
| `debug` | `false` | Prints under the card which entity each key resolved to and its state (to find why a value is missing) |
| `sunroof_vent_max` | `8` | The largest sunroof position in % that counts as ventilation (tilted at the rear, not slid back): the label says "Ventilation" instead of "4%" |
| `demo` | `false` | `true` - the card runs on a built-in model of the car instead of the real entities: press any button or preset, change the temperature, windows or seats and see the result at once; nothing is sent to the car. The footer says "DEMO". The state is shared by all cards on the page and resets on reload |
| `cabin_fabric` | `green` | Cabin fabric colour: `green`, `light_gray`, `dark_gray` or any colour |
| `cabin_trim` | `bronze` | Decorative strip colour: `bronze`, `silver`, `gold` or any colour |
| `cabin_effects` | all | What is drawn over the cabin: `false`, a list or a map of `heat`, `vent`, `wheel`, `air`, `defrost`, `ambient`, `massage` |
| `cabin_opacity` | `0.6` | Opacity of heating, ventilation and air-flow effects: a number `0…1` or a map `{heat, vent, air}` |
| `name` | device name | Title |
| `hide_name` | `false` | Hide the title |
| `prefix` | auto-detected | Entity slug, for example `geely_monjaro` |
| `tracker` | `device_tracker.geely_monjaro` | An existing HA tracker for the car (GPS) used by the route buttons. MHA Bridge itself does not report coordinates |
| `show_parked` | `false` | "Parked" label when the car stands still |
| `more_info` | `true` | Tapping a value opens the HA history |
| `rhd` | `false` | Right-hand drive: swaps sides on the top view and mirrors the picture |
| `tank_size` | `60` | Tank size, litres |
| `fuel_warn` | `25` | Amber step, % |
| `fuel_critical` | `10` | Red step, % |
| `fuel_color_ok` | `#2fd6a4` | Fuel bar colour when normal |
| `fuel_color_warn` | `#e8a13a` | Colour of the yellow step (`fuel_warn`) |
| `fuel_color_critical` | `#e5484d` | Colour of the red step (`fuel_critical`) |
| `tire_critical` | unset | Pressure below this value is red |
| `tire_color_critical` | `#e5484d` | Critical pressure colour |
| `nav` | `[yandex, maps]` | Navigation apps (`yandex`, `maps`, `osm`, `apple`, `here`) |
| `nav_mode` | `route` | `route` or `locate` |
| `nav_travel` | `driving` | `driving`, `walking`, `transit`, `bicycling` |
| `climate_buttons` | `[auto, ac, recirc, gclean]` | Buttons in the top row of the Climate tab: `auto, ac, recirc, gclean, maxheat, maxcool`. Four by default; Max heat and Max cold are hidden and are enabled here. The heated wheel, windshield and rear glass are in the "Heating: seats, steering wheel, glass" section |
| `hide` | `[]` | Hide buttons and blocks: `auto, ac, defrost, rear, recirc, wheel, maxheat, maxcool, seat_heating, seat_cooling, windows, lock, rear_climate, gclean, ambient, massage` |
| `confirm_open` | `false` | Ask for confirmation before opening windows and sunroof |
| `tap_action` | `none` | tap on the card: `expand` \| `none` \| `navigate` \| `url` \| `more-info` \| `perform-action` |
| `car_tap_action` | `expand` (compact) | tap on the car, same values; e.g. `navigate` to a page with the panel |
| `popup_card` | `mha-card-full` | Which card the window shows after `expand`: `mha-card-full`, `mha-card` (tabs), `mha-card-compact`, `mha-card-mini` |
| `popup_map` | as on the card | `true`: the window always has the map (even when the dashboard card has none), `false`: no map in the window; omitted: the window follows the card's `map` |
| `buttons` | `[auto, ac, heat, cool, defrost, rear]` | `compact` and `mini` only: `auto, ac, defrost, rear, recirc, wheel, heat, cool` |
| `car_color` | grey-blue | Body colour |
| `wheels` | `type1` | side-view rims, both wheels at once: `type1` (original) … `type5` |
| `wheel_spin` | `false` | the side-view rims turn with the car's speed (20" wheel) |
| `wheel_circumference` | `2.29` | Rolling circumference of the wheel in metres for `wheel_spin` |
| `wheel_spin_entity` | the car's speed | Your own speed sensor for `wheel_spin` |
| `arch_color` | `black` | `black`, `original`, `body` or a colour |
| `chrome_delete` | off | `true` or a map of `front_bumper`, `rear_bumper`, `doors`, `rails`, `windows` |
| `car_image` | `monjaro` | Built-in car key, `drawing`, or a path/URL of your own picture |
| `car_image_flip` | `false` | Mirror the picture horizontally (for your own picture that faces the wrong way) |
| `car_image_top` | as `car_image` | Picture for the top view (used when 3D is off or unavailable) |
| `car_3d` | `true` | `false` turns the 3D top view off |
| `top_labels` | all on | Labels on the top view: a map `{doors: false, windows: true, roof: true, trunk: true, hood: true, tires: true}`, a list of those to keep (`[doors, windows]`) or `false` for none. `tires` hides the tyre pressures |
| `presets` | none | Presets (up to 8): only those listed in the YAML with their steps (sample: `examples/presets.yaml`); windows, sunroof, climate, HA services, `mdi:` icons - see the "Presets" section |
| `car_image_facing` | `right` | Where the car looks on the side view: `right` or `left` |
| `car_image_hotspots` | built-in | Marker positions, % of the frame `[x, y]`: `headlight`, `taillight`, `front`, `rear`, `hood`, `trunk`, `ground` |

A full example with every key and comments (Russian): [`docs/mha-card-full-config.yaml`](docs/mha-card-full-config.yaml).

### 🧱 Car library

A built-in car is chosen by key: `car_image: monjaro`. For library keys `car_image_facing` mirrors both the picture and the markers. For your own file (`car_image: /local/my-car.png`) facing and markers are set by hand.

## 💡 Automation examples

Entity ids depend on the car name set in the integration. The examples use "Geely Monjaro".

**Pre-heat the cabin:**

```yaml
automation:
  - alias: "Pre-heat Monjaro on weekdays"
    trigger:
      - platform: time
        at: "07:30:00"
    condition:
      - condition: time
        weekday: [mon, tue, wed, thu, fri]
    action:
      - service: switch.turn_on
        target: { entity_id: switch.geely_monjaro_climate_auto }
      - service: number.set_value
        target: { entity_id: number.geely_monjaro_driver_temperature }
        data: { value: 22 }
      - service: select.select_option
        target: { entity_id: select.geely_monjaro_driver_seat_heating }
        data: { option: "2" }
```

**A door was left open:**

```yaml
automation:
  - alias: "Monjaro: door open"
    trigger:
      - platform: state
        entity_id:
          - binary_sensor.geely_monjaro_driver_door
          - binary_sensor.geely_monjaro_front_passenger_door
          - binary_sensor.geely_monjaro_rear_left_door
          - binary_sensor.geely_monjaro_rear_right_door
        to: "on"
        for: "00:05:00"
    action:
      - service: notify.notify
        data: { message: "A car door has been open for 5 minutes" }
```

**Low tyre pressure:**

```yaml
automation:
  - alias: "Monjaro: low tyre pressure"
    trigger:
      - platform: numeric_state
        entity_id:
          - sensor.geely_monjaro_tire_front_left
          - sensor.geely_monjaro_tire_front_right
          - sensor.geely_monjaro_tire_rear_left
          - sensor.geely_monjaro_tire_rear_right
        below: 1.8
    action:
      - service: notify.notify
        data: { message: "Low tyre pressure: {{ trigger.to_state.name }} — {{ trigger.to_state.state }} bar" }
```

**Low fuel:**

```yaml
automation:
  - alias: "Monjaro: low fuel"
    trigger:
      - platform: numeric_state
        entity_id: sensor.geely_monjaro_fuel_level
        below: 8
    action:
      - service: notify.notify
        data: { message: "Less than 8 litres left in the tank" }
```

## ⚠️ Known limitations

- It works only while the head unit is on and the app is running. With the car off, entities become unavailable.
- The set of functions depends on firmware and trim. The lock state is read, but there are no lock, trunk or hood commands yet: their IDs are unknown (see "Diagnostics").
- Windows, sunroof, shade, rear climate, massage and ambient light were checked only against the stock app's source and in a test Home Assistant, not yet on a live car.
- The 3D top view does not support the arch colour or per-zone anti-chrome (one chrome colour only).
- A white body comes out slightly cream: the repaint keeps the shading of the original grey car.
- Other models need their own pictures and markers (`car_image`, `car_image_hotspots`).
- Tested on a Geely Monjaro only; other ECARX cars are not guaranteed.

## 📁 Repository structure

```
mha-bridge/
├── custom_components/
│   └── mha_bridge/
│       ├── __init__.py, config_flow.py, const.py, hub.py, entity.py
│       ├── sensor.py, binary_sensor.py, number.py, select.py, switch.py
│       ├── websocket.py          # commands mha_bridge/info, subscribe, update
│       ├── cards.py              # serves and registers the card and pictures
│       ├── mha-card.js           # cards (mha-card, -full, -compact, -mini, -panel)
│       ├── car-side.svg          # side view, vector picture
│       ├── car-top.webp          # top view for the flat mode: a render of the 3D model
│       ├── car-top-mask.webp     # paint mask of that render (for car_color)
│       ├── cabin.webp, cockpit.webp  # cabin and cockpit photos
│       ├── cabin_mask.png, cockpit_mask.png  # fabric and trim masks
│       ├── car3d.bin             # 3D model for the top view
│       ├── three.module.min.js   # three.js (MIT), LICENSE-threejs
│       ├── translations/         # ru, en
│       └── LICENSE-geely-connect
├── docs/                         # pictures and the full configuration
├── .github/workflows/validate.yaml   # HACS + hassfest
├── hacs.json
├── CHANGELOG.md
├── LICENSE
├── NOTICE.txt
└── README.md, README.en.md
```

## 📜 License & credits

MHA Bridge is released under the **MIT License**, see [`LICENSE`](LICENSE). Copyright (c) 2026 nimnal.

The look of the cards (styles, the car drawing layout and the icon set) is based on
**[Geely Connect](https://github.com/YossiKon/geely-connect)**, Copyright (c) 2026 Yossi Koncha, MIT License. The licence text is kept in
[`custom_components/mha_bridge/LICENSE-geely-connect`](custom_components/mha_bridge/LICENSE-geely-connect) and must accompany any copy of the card.
See [`NOTICE.txt`](NOTICE.txt) for details.

The vector car pictures were built from the author's own photographs; the paint, chrome and arch zones were marked by hand.

Provided "as is", without warranty of any kind. You control your car's climate at your own risk.
Not affiliated with Geely, ECARX or Home Assistant.

---

<div align="center">

The project is free. If it is useful to you, you can support the author:

[![Support the project](https://img.shields.io/badge/Support%20the%20project-CloudTips-2fd6a4?style=for-the-badge)](https://pay.cloudtips.ru/p/8fef4204)

</div>
