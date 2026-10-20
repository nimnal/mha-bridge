"""Constants and entity definitions for the MHA Bridge integration.

Keys and option values must match the Android bridge app (Entities.java).
"""
from __future__ import annotations

DOMAIN = "mha_bridge"
PROTOCOL_VERSION = 1

# Control entities (HA -> car)
NUMBERS = {
    "temp_driver": "driver",
    "temp_passenger": "passenger",
}

DEFAULT_TEMP = {"temp_min": 16.0, "temp_max": 30.0, "temp_step": 0.5}

SELECTS: dict[str, list[str]] = {
    "fan_speed": ["off", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    "blowing_mode": [
        "face", "leg", "face_leg", "window", "face_window", "leg_window", "all", "auto", "off",
    ],
    "circulation": ["outside", "inside"],
    "seat_heat_driver": ["off", "1", "2", "3"],
    "seat_heat_passenger": ["off", "1", "2", "3"],
    "seat_vent_driver": ["off", "1", "2", "3"],
    "seat_vent_passenger": ["off", "1", "2", "3"],
    "steering_heat": ["off", "1", "2", "3"],
}

SELECT_ICONS = {
    "fan_speed": "mdi:fan",
    "blowing_mode": "mdi:air-filter",
    "circulation": "mdi:car-door",
    "seat_heat_driver": "mdi:car-seat-heater",
    "seat_heat_passenger": "mdi:car-seat-heater",
    "seat_vent_driver": "mdi:car-seat-cooler",
    "seat_vent_passenger": "mdi:car-seat-cooler",
    "steering_heat": "mdi:steering",
}

SWITCHES = {
    "ac": "mdi:snowflake",
    "climate_auto": "mdi:thermostat-auto",
    "defrost_front": "mdi:car-defrost-front",
    "defrost_rear": "mdi:car-defrost-rear",
}

# Numeric sensors (car -> HA): key -> (unit, device_class, state_class)
NUMERIC_SENSORS = {
    "speed": ("km/h", "speed", "measurement"),
    "speed_ipk": ("km/h", "speed", "measurement"),
    "fuel_level": ("L", "volume_storage", "measurement"),
    "odometer": ("km", "distance", "total_increasing"),
    "range": ("km", "distance", "measurement"),
    "temp_outside": ("°C", "temperature", "measurement"),
    "temp_inside": ("°C", "temperature", "measurement"),
    "rpm": ("rpm", None, "measurement"),
    "tire_fl": ("bar", "pressure", "measurement"),
    "tire_fr": ("bar", "pressure", "measurement"),
    "tire_rl": ("bar", "pressure", "measurement"),
    "tire_rr": ("bar", "pressure", "measurement"),
}

# Двери, капот и багажник (бинарные датчики): True = открыто
DOORS = ["door_fl", "door_fr", "door_rl", "door_rr", "hood", "trunk"]

# Display precision of the numeric sensors (decimal places)
PRECISION = {
    "speed": 0, "speed_ipk": 0, "fuel_level": 1, "odometer": 0, "range": 0,
    "temp_outside": 1, "temp_inside": 1, "rpm": 0,
    "tire_fl": 2, "tire_fr": 2, "tire_rl": 2, "tire_rr": 2,
}

# Enum sensors (car -> HA)
ENUM_SENSORS: dict[str, list[str]] = {
    "ignition": ["lock", "off", "acc", "on", "start", "driving"],
    "gear": ["p", "r", "n", "d"],
    "belt_driver": ["buckled", "unbuckled"],
    "belt_passenger": ["buckled", "unbuckled"],
}

# Производный датчик (обороты > 200): у этой машины ENGINE_STATE всегда неизвестен
ENGINE_RUNNING = "engine_running"

# Сущности прежних версий: удаляются из реестра при загрузке интеграции
REMOVED_KEYS = [
    "coolant_temp", "handbrake", "engine_state", "auto_fan",
    "window_fl", "window_fr", "window_rl", "window_rr",
]


# ---------------------------------------------------------------------------
# Дополнительные функции. Сущности создаются только если приложение
# сообщило в meta["supported"], что автомобиль объявил функцию поддерживаемой.
# ---------------------------------------------------------------------------

# Окна, люк, шторка панорамы (положение 0..100 %, 0 = закрыто)
COVERS = {
    "win_fl": "window",
    "win_fr": "window",
    "win_rl": "window",
    "win_rr": "window",
    "sunroof": "window",
    "sunshade": "shade",
}
# Есть на каждом Monjaro: создаются всегда, не ждут объявления от машины
ALWAYS_COVERS = ("sunroof", "sunshade")
COVER_ICONS = {
    "sunroof": ("mdi:car-select", "mdi:car-select"),
    "sunshade": ("mdi:blinds", "mdi:blinds-open"),
}

# Центральный замок: приложение шлёт True = закрыт на замок
LOCK_SENSOR = "central_lock"

OPT_SWITCHES = {
    "sunroof_tilt": "mdi:car-select",
    "rear_power": "mdi:car-seat-heater",
    "rear_auto": "mdi:thermostat-auto",
    "climate_lock": "mdi:lock-outline",
    "g_clean": "mdi:air-purifier",
    "massage_driver": "mdi:seat-recline-extra",
    "massage_passenger": "mdi:seat-recline-extra",
    "ambient_power": "mdi:car-light-dimmed",
}

OPT_SELECTS: dict[str, list[str]] = {
    "seat_heat_rear_left": ["off", "1", "2", "3"],
    "seat_heat_rear_right": ["off", "1", "2", "3"],
    "rear_blowing_mode": ["face", "leg", "face_leg"],
    "massage_level_driver": ["1", "2", "3"],
    "massage_level_passenger": ["1", "2", "3"],
    "massage_program_driver": [str(i) for i in range(1, 9)],
    "massage_program_passenger": [str(i) for i in range(1, 9)],
    "ambient_mode": ["drive", "custom", "music", "weather"],
    "ambient_effect": ["static", "gradient", "breathe"],
    "ambient_color": [
        "red", "orange", "amber", "honey", "yellow", "lime", "green",
        "mint", "turquoise", "sky", "blue", "purple", "pink",
    ],
}
OPT_SELECT_ICONS = {
    "seat_heat_rear_left": "mdi:car-seat-heater",
    "seat_heat_rear_right": "mdi:car-seat-heater",
    "rear_blowing_mode": "mdi:air-filter",
    "massage_level_driver": "mdi:seat-recline-extra",
    "massage_level_passenger": "mdi:seat-recline-extra",
    "massage_program_driver": "mdi:format-list-numbered",
    "massage_program_passenger": "mdi:format-list-numbered",
    "ambient_mode": "mdi:car-light-dimmed",
    "ambient_effect": "mdi:led-strip-variant",
    "ambient_color": "mdi:palette",
}

# Температура задней зоны (одна общая; приложение пишет её в обе задние зоны, как штатное)
OPT_TEMPS = {"rear_temperature": "mdi:thermometer"}

# Числа 0..100 %
OPT_NUMBERS = {"ambient_brightness": "mdi:brightness-6"}

# Все ключи необязательных сущностей (для проверки meta)
OPTIONAL_KEYS = (
    [k for k in COVERS if k not in ALWAYS_COVERS] + [LOCK_SENSOR] + list(OPT_SWITCHES) + list(OPT_SELECTS) + list(OPT_NUMBERS) + list(OPT_TEMPS)
)
