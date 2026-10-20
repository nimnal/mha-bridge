# Customizing the MHA Bridge cards: gallery and reference

This document shows what can be configured in the cards; every example comes with a screenshot and a config. Keys go straight into the card's YAML. The full list with comments is in [`mha-card-full-config.yaml`](mha-card-full-config.yaml), a short table is in the [README](../README.en.md).

> The screenshots were made in a test page that imitates Home Assistant (demo data), phone width 430 px, panel 1920×1080. They carry Russian captions; the card itself switches between Russian and English with your Home Assistant profile (see [Language](#11-language)). On your dashboard everything looks the same, with live data.

**Contents**

1. [Which card to choose](#1-which-card-to-choose)
2. [Tabs: order, picture, height](#2-tabs-order-picture-height)
3. [Full-screen panel](#3-full-screen-panel)
4. [Look of the car (side view)](#4-look-of-the-car-side-view)
5. [Top view (3D)](#5-top-view-3d)
6. [Cabin](#6-cabin)
7. [Presets](#7-presets)
8. [What to show and what to hide](#8-what-to-show-and-what-to-hide)
9. [Fuel, tyres, navigation](#9-fuel-tyres-navigation)
10. [Theme colour and text size](#10-theme-colour-and-text-size)
11. [Language](#11-language)
12. [Ready-made configurations](#12-ready-made-configurations)
13. [Demo mode](#13-demo-mode---demo)

---

> Every key below can also be changed without YAML: Edit card opens a visual editor built from the stock Home Assistant components, with five tabs: Main, Look (including colours and cabin), Actions (taps, quick buttons, hidden blocks), Presets, Data and map (card tabs, navigation, fuel, tyres). Only changed keys are written; YAML mode stays available and every YAML key is in the form (the map, text size per element, the picture of each tab, hood and tailgate sensors, top-view labels, cabin effects, preset steps per seat and window). The marker positions `car_image_hotspots` and a preset’s `actions` are typed as a YAML block inside the form.

![Визуальный редактор](gallery/editor.png)

## 1. Which card to choose

The card type is the layout: pick the `type` and that is all. The side or top view is a separate key, `view: side | top`.

![Card family](gallery/family.png)

| Card type | For |
|---|---|
| `custom:mha-card` | Five tabs. **Best for a phone and the default choice** |
| `custom:mha-card-full` | Everything on one long page: the most scrolling, nothing hidden |
| `custom:mha-card-compact` | A narrow card: range, temperature and a row of buttons (`buttons`) |
| `custom:mha-card-mini` | One line: status and a few buttons. For the top of a dashboard |
| `custom:mha-card-panel` | Tabs scaled to a whole screen (1920×1080): a wall tablet or a laptop |

```yaml
type: custom:mha-card
view: top        # side (default) | top: the 3D top view with open doors, windows, sunroof, hood and tailgate
```

## 2. Tabs: order, picture, height

In `mha-card` and `mha-card-panel` the order from top to bottom is always the same: **tabs → presets → "route to the car" links → the map (if on) → the rest**. The tyres are at the bottom of the Data tab. The climate buttons (six by default; the top row is set with `climate_buttons`, and Max heat and Max cool are hidden until you add them there) live on the Climate tab.

![Tabs on a phone](gallery/tabs_phone.png)

The header, the picture and the tab bar stay where they are when you switch tabs (the picture sits in a "stage" of one fixed shape); only the content below changes, so the buttons do not jump. You can switch this off with `stable_tabs: false` (see below).

![Tabs with the top view](gallery/toptabs_phone.png)

```yaml
type: custom:mha-card
tabs: [overview, climate, body, comfort, data]   # which tabs and in what order
default_tab: overview                            # tab on open (always)
remember_tab: false                              # true: remember the last chosen tab in the browser instead
```

### Alignment when switching tabs: `stable_tabs`

By default (`stable_tabs: true`) the picture sits in a stage of one shape and everything below it stays put. With `stable_tabs: false` each picture takes its own height: the card is more compact, but the content below shifts when you change tab.

![stable_tabs](gallery/stable_tabs.png)

```yaml
stable_tabs: false
```

The Comfort tab (rear climate, ambient light, massage) disappears on its own if the car has none of these functions. You can keep only the tabs you need: `tabs: [overview, climate]`.

### The picture above the tabs - `tab_images`

![tab_images](gallery/tab_images.png)

By default the picture changes with the tab: Overview the side photo (the top view with `view: top`), Climate the cabin from above, Body the 3D top view, Comfort the cabin, Data the instrument cluster. Your own choice for each tab:

```yaml
tab_images:
  overview: cabin      # side | top | cabin | cockpit | none
  climate: cabin
  body: top
# tab_images: false    # the same picture on every tab
```

### Wide screens

On a wide screen the tabs get a fixed content height (`height`, 440 px by default, `0` for no limit); the content scrolls inside.

![Wide screen](gallery/wide.png)

## 3. Full-screen panel

`custom:mha-card-panel` is made for a whole screen: a big range figure, a large picture on the left, big tabs and buttons in the middle, the map on the right (when it is on). The scale is picked automatically; put it into a **Panel (single card)** view.

![Panel: overview](gallery/panel_overview.png)

![Panel: climate](gallery/panel_climate.png)

![Panel: body](gallery/panel_body.png)

### Three columns: car, controls, map

With the map on (`map: true`) the panel has three columns: **the car on the left** (picture, range, chips), **tabs and buttons in the middle**, **the map on the right over the whole height (about a third of the screen)**. The map is visible on every tab and leaves the Overview tab. Without `map` there are two columns, as before.

Sizes. The panel is drawn on a 1280×640 CSS-pixel "canvas" (two columns: 1040×640) and scaled to the screen between 0.6 and 2.6. That gives the minimum for three columns: **768×384 CSS pixels** (1280×0.6 and 640×0.6). A 1366×768 laptop gets a scale of about 1.0, a 1024×600 tablet about 0.8, a phone in landscape (844×390) about 0.6 (small text, but readable). Below the minimum (a narrow column on a computer) the card behaves like `mha-card`.

A phone held upright. By default (`rotate: off`), on a phone held in portrait or in a narrow column the panel becomes the tabbed card (portrait layout; the map goes on the tab `map.tab`). `rotate: auto` turns the canvas by 90° instead and fills the screen: just turn the phone clockwise. `rotate: always` turns it on outside touch screens too.

![The panel on a phone held upright: the tabbed card](gallery/panel_phone.png)

With `rotate: auto` the whole panel is turned on its side instead and the phone has to be turned:

![The panel with rotate: auto](gallery/panel_phone_rotated.png)

```yaml
type: custom:mha-card-panel
map: true           # the map in the right third
rotate: off         # off (default) | auto | always
panel_min_width: 900   # narrower than 900 px -> the tabbed card (portrait layout); no key = only when the columns do not fit
zoom: 0.85          # trims the automatic zoom: below 1 = smaller card, more room, no scrolling
scale: 1.6          # or an absolute zoom (down to 0.5); by default it follows the window size
panel_height: 1000  # height in pixels; by default the rest of the window
```

If a scroll bar appears on the right (a long tab such as Body does not fit), set `zoom: 0.9`, `0.85` or lower. `zoom` works in the other cards too (`0.5`-`2`): `mha-card`, `-full`, `-compact` and so on.

![zoom in the panel](gallery/panel_zoom.png)

On a narrow screen the panel behaves like a normal `mha-card`.

## 4. Look of the car (side view)

The car picture is vector, so it is recoloured without losing quality. Only the body paint, the chrome trim, the wheel-arch trim and the rims change; glass, tyres and lamps stay as they are.

### Body colour — `car_color`

![car_color](gallery/car_color.png)

```yaml
car_color: "#b3262d"    # any CSS colour: #rrggbb, rgb(...), a name
```

The same colour is used for the roof on the top view and for the 3D model.

### Rims — `wheels`

One key changes both wheels at once. `type1` is the original rims (as in the source picture), `type2`…`type5` are other Monjaro rims.

![wheels](gallery/wheels.png)

```yaml
wheels: type3    # type1 (default) | type2 | type3 | type4 | type5
```

The rims work together with every other look setting (colour, chrome delete, arches, mirroring).

#### Spinning rims — `wheel_spin`

```yaml
wheel_spin: true              # the rims on the side view turn with the car (off by default)
wheel_circumference: 2.29     # rolling circumference, m (default: a 20" wheel, about 2.29 m)
wheel_spin_entity: sensor.my_speed   # optional: any speed sensor instead of the car's own
```

The rotation speed comes from the car's speed (`speed_ipk`, else `speed`; km/h, mph and m/s are recognised) and the wheel circumference, so it roughly matches a real wheel. In reverse the rims turn backwards, when parked they stand still. Once the spokes can no longer be followed by the eye (faster than about 25 km/h) they melt into a motion-blurred disc, as in a long-exposure photo. Works with the built-in Monjaro picture and every `wheels` design; no animation when the system asks for reduced motion.

### Chrome delete — `chrome_delete`

Chrome parts can be darkened, painted in the body colour or in any other colour. Five independent zones: `front_bumper`, `rear_bumper`, `doors` (door frames), `rails` (roof rails), `windows` (window mouldings).

![chrome_delete](gallery/chrome_delete.png)

```yaml
chrome_delete: true                  # all five zones in gloss black

chrome_delete:                       # or per zone
  front_bumper: 1                    # 0..1 - how dark (1 = black)
  rear_bumper: 1
  doors: "body"                      # "body" - the body colour
  rails: "#c9a227"                   # any colour, the highlights are kept
  windows: 0.6
```

### Wheel-arch trim — `arch_color`

![arch_color](gallery/arch_color.png)

```yaml
arch_color: black       # black (default) | original | body | any colour
```

`original` keeps the colours of the source photo (`car_color` then does not touch the arches).

### Direction of the car — `car_image_facing`

![facing](gallery/facing.png)

```yaml
car_image_facing: left   # right (default) | left
```

Both the picture and the markers (lamps, handles, hood, tailgate) are mirrored. Marker positions can be fine-tuned in `car_image_hotspots` (percent of the picture box).

### Your own picture — `car_image`

```yaml
car_image: monjaro                       # the built-in car (default)
# car_image: drawing                     # a drawn silhouette
# car_image: /local/my-car.png           # your own side photo (PNG/WebP/SVG)
car_image_facing: left                   # which way the car looks in your photo
# car_image_flip: true                   # mirror the picture horizontally
# car_image_top: /local/my-car-top.png   # your own picture for the top view (when 3D is off)
car_image_hotspots:
  headlight: [93, 45]
  taillight: [5, 38]
```

## 5. Top view (3D)

With `view: top` the car is shown from above as a 3D model: doors swing open, windows and sunroof show their position in percent, the hood and the tailgate open. The labels (tyre pressure, door and window states) can be switched by group.

![Top view](gallery/top_view.png)

```yaml
car_3d: true                  # false - a flat picture instead of 3D (if WebGL is unavailable)
rhd: false                    # true - right-hand drive: the sides swap
# Every label is clickable: doors, windows, sunroof, blind, hood, tailgate and tyres open the history of
# their entity. Turn clicks off with more_info: false. The sunroof and the blind are separate labels
# (sunroof over the front half of the roof, blind over the rear half). Hide both: top_labels: { roof: false }.
top_labels:                   # which labels to show
  doors: true
  windows: true
  roof: true
  trunk: true
  hood: true
  tires: true
# top_labels: [doors, windows]   # or a list of only the ones you need
# top_labels: false              # remove every label at once
```

The hood and the tailgate are picked up automatically when Home Assistant has the "Hood" and "Trunk" entities. The sunroof, blind, hood and tailgate labels are always shown; one rule for every value on the card: an unknown or not received state is shown as "—", never as "Closed" or 0. "—" means the state has never been received from the car; the last known state is kept across Home Assistant restarts.

A sunroof that is only tilted at the rear for ventilation is labelled "Vent" instead of a percentage. The limit is `sunroof_vent_max` (percent, default `8`): anything open up to that value counts as ventilation.

```yaml
sunroof_vent_max: 8     # open no more than 8 % -> the label says "Vent"
```

### Lamp glow: `headlights`

While the engine runs, the head and tail lamps glow on the side view, the top view and in 3D. It needs the "Engine running" entity (`engine_running`).

![Lamp glow](gallery/headlights.png)

The 3D top view:

![Lamp glow in 3D](gallery/lights_3d.png)

```yaml
headlights: false             # true by default; false = no glow
```


## 6. Cabin

The cabin photo from above on the Climate tab shows seat heating and ventilation, steering-wheel heating, the air flow from the vents and windshield defrost. The seat fabric and the trim are recoloured.

![Cabin](gallery/cabin.png)

```yaml
cabin_fabric: dark_gray      # green (default) | light_gray | dark_gray | any colour
cabin_trim: silver           # bronze (default) | silver | gold | any colour
cabin_effects: [heat, vent, air]   # what to draw: false, a list or a map; heat, vent, wheel, air, defrost, ambient, massage
cabin_opacity: 0.6           # default 0.6; opacity of the effects 0..1 or a map { heat: 0.8, vent: 0.5, air: 0.4 }
```

## 7. Presets

Presets are up to 8 one-tap tiles under the picture. Each can be changed, removed, or you can add your own: climate, windows, sunroof, blind and any Home Assistant service. The icon is any Material Design Icon (`mdi:name`). The detailed reference with every key is in the [README](../README.en.md), section "Presets".

The tiles lay themselves out: up to 4 in one row, 5-6 three per row, 7-8 four per row.

![Preset layouts](gallery/presets_layout.png)

![Your own presets](gallery/custom_presets.png)

```yaml
presets:
  - id: comfort
    name: Comfort
    icon: auto
    temp: 22
    auto: true
    ac: true
    circ: auto
  - id: parking
    name: Parking
    icon: mdi:car-brake-parking
    windows: closed
    sunroof: closed
    sunshade: closed
    ac: false
  - id: leave
    name: Leaving
    icon: mdi:exit-run
    windows: closed
    actions:                       # any Home Assistant service
      - action: light.turn_off
        target: { entity_id: light.garage }
```

Nothing is built into the code: a preset that is not in the list is not on the card. The six familiar ones (Winter, Summer, Defog, Comfort, Ventilate, All off) with all their steps are in [`examples/presets.yaml`](../examples/presets.yaml): copy the block into your config and edit it.

### Tap on the card and on the car — `tap_action`, `car_tap_action`

What happens when you tap the card itself (`tap_action`) or the picture of the car (`car_tap_action`). Works on every card; buttons, tyre pressures and tabs still do their own thing: tapping a tyre pressure opens the full history of that sensor.

```yaml
car_tap_action: expand          # default on the compact card: a window with the full card
tap_action: none                # default: nothing
```

Values: `expand` (a window with the full card), `none`, or an action as in Home Assistant:

```yaml
# go to another Lovelace page, e.g. one with the panel card
car_tap_action:
  action: navigate
  navigation_path: /lovelace/car-panel

# open a link in a new tab
tap_action:
  action: url
  url_path: https://example.com

# history of any sensor
tap_action:
  action: more-info
  entity: sensor.my_sensor

# call an action
tap_action:
  action: perform-action
  perform_action: script.turn_on
  data: { entity_id: script.warm_up }
```

The short form works too: `tap_action: expand`, `car_tap_action: none`. The mini card (`mha-card-mini`) has no picture of the car: there `tap_action` applies (for example `tap_action: expand` makes it open the full card as well). Inside the opened window these keys do nothing.

### The window on tap — `popup_card`, `popup_map`

With `expand` a window with a card opens. Two keys say which card it is and whether it has the map:

```yaml
popup_card: mha-card-full   # mha-card-full (default) | mha-card | mha-card-compact | mha-card-mini
popup_map: true             # true: the window always has the map; false: no map; omitted: as on the card
```

The map in the window takes its settings from the card's own `map` (tracker, zoom, marker); when the dashboard card has no map, `popup_map: true` turns it on with the defaults. Taps inside the window do nothing.

## 8. What to show and what to hide

The `hide` key removes buttons and blocks you do not need. It is handy when the car lacks a function or you simply do not use it.

![Hidden elements](gallery/hide.png)

```yaml
hide:
  - seat_cooling     # seat ventilation
  - rear_climate     # rear climate
  - gclean           # air cleaning
  - ambient          # ambient light
  - massage          # massage
  - maxheat          # the "Max heat" button
  - maxcool          # the "Max cold" button
```

Allowed values: `auto`, `ac`, `defrost`, `rear`, `recirc`, `wheel`, `maxheat`, `maxcool`, `seat_heating`, `seat_cooling`, `windows`, `lock`, `rear_climate`, `gclean`, `ambient`, `massage`.

#### Climate buttons: `climate_buttons`

The top row of the Climate tab holds four buttons by default: **Auto**, **A/C**, **Recirculation** and **Air cleaning**. Each one shows the real state of the function. Max heat and Max cold are hidden by default; to bring them back or to drop some, give a list (the order of the buttons is always the same):

```yaml
climate_buttons: [auto, ac, recirc, gclean, maxheat, maxcool]   # default [auto, ac, recirc, gclean]
```

The heated wheel, windshield and rear glass are not part of this row: they sit in the **"Heating: seats, steering wheel, glass"** section next to the seat heating (hide them with `wheel`, `defrost`, `rear` of the `hide` key). Preset tiles never light up: they are one-shot actions, not switches.

Title: `name: "My Monjaro"` changes the name, `hide_name: true` removes it. Entities are found automatically; if the car has an unusual prefix, set `prefix: geely_monjaro`. If a value does not show on the card, add `debug: true`: the card prints under itself which entity each key resolved to and its state. `show_parked: true` shows a "Parked" tag when the car stands.

## 9. Fuel, tyres, navigation

```yaml
tank_size: 60                 # tank size, l (to turn percent into litres)
fuel_warn: 25                 # yellow level, %
fuel_critical: 10             # red level, %
fuel_color_ok: "#2fd6a4"
fuel_color_warn: "#e8a13a"
fuel_color_critical: "#e5484d"
tire_critical: 1.8            # a pressure below this is shown red
tire_color_critical: "#e5484d" # colour of the critical pressure
nav: [yandex, maps, osm]      # navigation buttons: yandex, maps, osm, apple, here
nav_mode: route               # route - route to the car, locate - show the car on a map
nav_travel: walking           # driving | walking | transit | bicycling
tracker: device_tracker.geely_monjaro   # the car's tracker in HA (GPS), needed for the navigation buttons
confirm_open: true            # ask before opening windows and the sunroof
more_info: true               # a click on a value opens the HA history
```

### Map: `map`

The map can be built right into the card. It is the stock Home Assistant map without its own frame and shadow: it takes the look of the other blocks, zooms with the wheel and the buttons, and moves with a finger or a mouse. It is off by default. It shows on the Overview tab (in `mha-card` and `mha-card-full`, after the route links).

```yaml
map: true                         # on, with the defaults
# or in detail:
map:
  entity: device_tracker.geely_monjaro   # tracker (the card's `tracker` key by default)
  zoom: 15                        # default zoom, 1-22
  aspect_ratio: "16:10"           # proportions; or set height: 260 (px) instead
  theme_mode: auto                # auto | light | dark
  hours_to_show: 0                # hours of the trail to draw (0 = none)
  tab: overview                   # which tab: overview, climate, body, comfort, data
  title: Where is the car         # heading above the map; "" removes the heading
  center: auto                    # auto (as in HA) | follow (keep the car in the centre) | fixed (do not move on updates)
  locate_button: false            # true: a "To the car" button over the map
  marker: car                     # car (Monjaro from above in the car's colour, the default) | default (the stock HA marker) | a picture address: /local/marker.png
  marker_size: 56                 # height of the marker, px (16-160)
  marker_rotate: true             # turn the marker with the heading (attribute heading, course or bearing of the tracker)
  marker_heading: course          # name of the heading attribute if it is a different one
  caption: [speed, state]         # caption under your own marker: speed, state, address, name
  address_entity: sensor.car_address   # where the address comes from (else the tracker's attribute address)
  label: icon                     # label of the stock marker: icon | name | state | attribute
  label_attribute: speed          # which attribute to show with label: attribute
  label_unit: km/h
  entities:                       # more objects on the map: zones, a second car, people
    - zone.home
    - entity: device_tracker.wife
      label_mode: name            # name | state | attribute | icon
      focus: false                # leave it out when fitting the view
  geo_location_sources: []        # geo_location sources, for example [all]
  auto_fit: false                 # fit every object into the view
  fit_zones: false                # include zones when fitting
  trail_color: "#ff3b7a"          # colour of the trail (any CSS colour)
  trail_width: 4                  # line width of the trail
```

**Your own marker.** By default (`marker: car`) a small Monjaro from above is drawn over the map in the colour of `car_color` (the default paint without it) and the stock marker of that tracker is hidden. Bring the stock marker back with `marker: default`; your own picture is `marker: /local/marker.png`. The marker turns with the heading when the tracker has an attribute `heading`, `course` or `bearing`; tapping it opens the tracker's history. The `caption` is made of the speed (the card's speed sensor), the tracker state, the name and the address (the sensor `address_entity` or the tracker's attribute `address`). With `marker: default` the stock Home Assistant marker is used: its picture comes from the tracker's `entity_picture` and its label is chosen with `label`.

**Map centre.** `center: follow` moves the map after the car with every new position, `center: fixed` puts the car in the centre once and moves nothing after that (you can still pan by hand, fitting is off). The `locate_button` returns the map to the car. `entities` adds zones, a second car and people, `auto_fit` fits every object into the view. The colour and width of the trail (`trail_color`, `trail_width`) apply to the trail switched on by `hours_to_show`.

If the tracker has no position the block is not shown. The map is drawn by the stock `map` card, so tiles, theme and the car marker come from your own Home Assistant.

In the previews the backdrop is a fragment of OpenStreetMap, © OpenStreetMap contributors (ODbL). In your card the tiles are drawn by Home Assistant; the zoom buttons and marker in the screenshots are static.

![The map in the card](gallery/map.png)

### Windows and sunroof on the Body tab

The window tiles follow the seats of the real car: rear left is always under the driver, rear right under the passenger. The sunroof and the blind take a third column, or drop to a row below when the width is not enough (a phone). There are never more than three columns, and the tiles stretch to fill the width.


## 10. Theme colour and text size

### Theme colour - `accent`

The main colour of the card (green by default): the range bar, the dot next to the name, active buttons and tabs, chips, the outline of switched-on switches. The value is a name from the list or any CSS colour.

![accent](gallery/accent.png)

```yaml
type: custom:mha-card
accent: orange            # green (default), mint, blue, sky, cyan, violet, purple,
                          # pink, red, orange, amber, yellow, lime, white
# accent: "#c0ff3d"       # or any CSS colour: "rgb(255 140 0)", "hsl(200 90% 55%)"
warn_color: "#e8a13a"     # optional: the warning colour (amber by default)
critical_color: "#e5484d" # optional: the colour of critical values (tyre pressure and so on, red by default)
```

The key works in every card. The warm and cold air-flow colours on the cabin picture and the body colour do not change: they show temperature and are set separately (`car_color`).

![accent in the panel](gallery/accent_panel.png)

![accent in the top-view card](gallery/accent_toptabs.png)

### Text size - `text_size`

The text can be resized as a whole or by kind of element. The value is a number: up to 4 it is a multiplier (`1.2` = 20 % bigger, `0.85` = smaller), above 4 it is an exact size in pixels; a string works too: `"14px"`, `"120%"`.

![text_size](gallery/text_size.png)

```yaml
text_size: 1.15           # everything 15 % bigger
```

```yaml
text_size:                # or by kind of element (every key is optional)
  all: 1.1                # everything that has no key of its own
  title: 1.3              # the name of the car
  status: 1.15            # the status line under the name
  big: 1.35               # the big range figure (and the temperature in the compact card)
  side: 1.2               # the figures beside it
  unit: 1.2               # units (km, °C)
  heading: 12px           # block headings (CLIMATE, TYRES, ...)
  button: 1.2             # labels on buttons and tiles (presets, climate, seats)
  chip: 1.15              # chips such as "Engine running", "Unlocked"
  tab: 1.3                # tab names
  row: 1.1                # data rows (mileage, fuel, doors)
  stepper: 1.2            # temperature and fan values between - and +
  window: 1.1             # window, sunroof and blind tiles
  tire: 1.2               # tyre pressures
  caption: 1.1            # captions on the cabin photo
  label3d: 1.2            # labels on the top view (a multiplier only)
```

- The size is computed from what the element has now, so it works at any width and in any card.
- Bigger text needs more room: long labels may be shortened ("Comfo..."), and tall tabs may need scrolling. If it does not fit, lower `zoom` or `text_size` itself.
- For the top-view labels (`label3d`) use a multiplier only: they are drawn inside the picture and are not measured in screen pixels.
- `zoom` changes the size of the whole card (`0.5`-`2`); `text_size` changes the text only.

## 11. Language

The card is in Russian or English; the language comes from the Home Assistant user profile. Preset names and captions switch with it.

![English](gallery/english.png)

## 12. Ready-made configurations

### Phone: everything on tabs

```yaml
type: custom:mha-card
name: Monjaro
car_color: "#1f4e9c"
wheels: type3
chrome_delete:
  rails: body
  doors: body
  windows: 0.6
arch_color: black
default_tab: overview
presets:
  winter: { name: Warm-up, icon: mdi:snowflake-melt, temp: 25 }
  defog: false
  parking: { name: Parking, icon: mdi:car-brake-parking, windows: closed, sunroof: closed, ac: false }
nav: [yandex, maps]
tank_size: 60
```

### Wall tablet: full-screen panel

```yaml
type: custom:mha-card-panel
car_color: "#e9ebee"
wheels: type5
cabin_fabric: light_gray
cabin_trim: silver
default_tab: climate
nav: [yandex]
nav_mode: locate
```

### Minimum: a line for the main dashboard

```yaml
type: custom:mha-card-mini
buttons: [auto, ac, defrost]
hide_name: true
```

### Top view for right-hand drive

```yaml
type: custom:mha-card
view: top
rhd: true
car_color: "#16181c"
top_labels: [doors, windows, tires]
car_3d: true
```

## 13. Demo mode - `demo`

`demo: true` runs the card without a car: it shows a built-in model of the Monjaro and **every control works** - climate, seat heating and ventilation, windows, sunroof, blind, ambient light and presets (yours too, with any keys and `actions`). Press "Winter": the temperature goes to 24, the windshield heating comes on and the cabin picture changes its air flow. Nothing is sent to the car or to Home Assistant, and no real entities are read.

```yaml
type: custom:mha-card
demo: true            # remove it or set false to get the real data back
car_image: monjaro
presets:
  winter: { temp: 24 }
```

- Works in every card: `mha-card`, `-full`, `-compact`, `-mini`, `-panel`.
- The model is shared by all demo cards on the page (press in one - all change) and resets on page reload.
- Windows and the sunroof move gradually like on the car; doors, hood, trunk and lock do not change in the model (the card has no control for them).
- Language and theme come from your Home Assistant profile. The footer says "DEMO" so that it cannot be taken for real data.
- Handy for tuning: pick the colour, rims, presets and `tabs`, then remove `demo`.

![demo](gallery/demo.png)
