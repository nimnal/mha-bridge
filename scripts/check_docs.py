#!/usr/bin/env python3
"""Run from anywhere: python3 scripts/check_docs.py (exit code 1 when a key is undocumented).
Cross-check: every configuration key of the card against README (table rows), CUSTOMIZATION and the full YAML example."""
import re, sys, os
R = os.environ.get('REPO') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(f'{R}/custom_components/mha_bridge/mha-card.js').read()
top = """type name hide_name prefix tracker tank_size show_parked rhd view fuel_warn fuel_critical fuel_color_ok fuel_color_warn fuel_color_critical
nav nav_mode nav_travel hide climate_buttons confirm_open buttons car_image car_image_top car_image_facing car_image_hotspots car_image_flip car_color arch_color
chrome_delete wheels wheel_spin wheel_spin_entity wheel_circumference tap_action car_tap_action popup_card popup_map accent warn_color critical_color
text_size zoom scale panel_height panel_min_width rotate map stable_tabs headlights car_3d demo debug tabs default_tab remember_tab tab_images height
more_info sunroof_vent_max top_labels cabin_effects cabin_opacity cabin_fabric cabin_trim tire_critical tire_color_critical presets""".split()
mapk = """entity zoom aspect_ratio theme_mode hours_to_show height tab title center locate_button marker marker_size marker_rotate marker_heading caption
address_entity label label_attribute label_unit entities geo_location_sources auto_fit fit_zones trail_color trail_width""".split()
docs = {f: open(f'{R}/{f}').read() for f in ['README.md', 'README.en.md', 'docs/CUSTOMIZATION.md', 'docs/CUSTOMIZATION.en.md', 'docs/mha-card-full-config.yaml']}
bad = 0
def fail(m):
    global bad; bad += 1; print('MISSING', m)
for k in top:
    if k == 'type': continue
    for f in ['README.md', 'README.en.md']:
        if not re.search(r'^\|[^|]*`' + re.escape(k) + r'`', docs[f], re.M): fail(f'{k}: no table row in {f}')
    for f in ['docs/CUSTOMIZATION.md', 'docs/CUSTOMIZATION.en.md', 'docs/mha-card-full-config.yaml']:
        if not re.search(r'(?<![a-z_])' + re.escape(k) + r'(?![a-z_])', docs[f]): fail(f'{k}: not in {f}')
for k in mapk:
    for f in docs:
        if not re.search(r'(?<![a-z_])' + re.escape(k) + r'(?![a-z_])', docs[f]): fail(f'map.{k}: not in {f}')
# every form field of the editor must be a known key (or a known prefix) - catches keys added to the editor but not to this list
names = set(re.findall(r'\{ name: "([a-z_0-9]+)"', js))
pref = ('map_', 'cd_', 'ts_', 'ti_', 'px_', 'tap_action_', 'car_tap_action_')
known = set(top) | {'card_type', 'car_image_kind', 'car_image_url', 'top_labels_list', 'cabin_effects_list', 'wheels', 'tap_action_kind', 'car_tap_action_kind'}
for n in sorted(names):
    if n in known or n.startswith(pref): continue
    print('CHECK editor field not in key list:', n)
print('keys checked: %d top-level, %d map; problems: %d' % (len(top) - 1, len(mapk), bad))
sys.exit(1 if bad else 0)
