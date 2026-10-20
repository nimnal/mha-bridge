"""Temperature controls."""
from __future__ import annotations

from homeassistant.components.number import NumberDeviceClass, NumberEntity, NumberMode
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import MhaConfigEntry
from .const import NUMBERS, OPT_NUMBERS, OPT_TEMPS
from .entity import MhaEntity, async_add_optional


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MhaTemperature(entry, k) for k in NUMBERS])
    async_add_optional(hass, entry, async_add_entities, OPT_NUMBERS, MhaPercent)
    async_add_optional(hass, entry, async_add_entities, OPT_TEMPS, MhaTemperature)


class MhaTemperature(MhaEntity, NumberEntity):
    _requires_connection = True
    _attr_device_class = NumberDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_mode = NumberMode.BOX

    @property
    def native_min_value(self) -> float:
        return self.hub.meta["temp_min"]

    @property
    def native_max_value(self) -> float:
        return self.hub.meta["temp_max"]

    @property
    def native_step(self) -> float:
        return self.hub.meta["temp_step"]

    @property
    def native_value(self) -> float | None:
        try:
            return float(self.raw)
        except (TypeError, ValueError):
            return None

    async def async_set_native_value(self, value: float) -> None:
        self.hub.send_command(self._key, float(value))


class MhaPercent(MhaEntity, NumberEntity):
    """0..100 % control (ambient light brightness)."""

    _requires_connection = True
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 5
    _attr_native_unit_of_measurement = "%"
    _attr_mode = NumberMode.SLIDER

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        self._attr_icon = OPT_NUMBERS[key]

    @property
    def native_value(self) -> float | None:
        try:
            return float(self.raw)
        except (TypeError, ValueError):
            return None

    async def async_set_native_value(self, value: float) -> None:
        self.hub.send_command(self._key, float(value))
