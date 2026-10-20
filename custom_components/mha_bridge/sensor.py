"""Sensors (car -> HA)."""
from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from . import MhaConfigEntry
from .const import ENUM_SENSORS, NUMERIC_SENSORS, PRECISION
from .entity import MhaEntity


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    entities: list[SensorEntity] = [MhaNumericSensor(entry, k) for k in NUMERIC_SENSORS]
    entities += [MhaEnumSensor(entry, k) for k in ENUM_SENSORS]
    async_add_entities(entities)


class _Restoring(MhaEntity, SensorEntity, RestoreEntity):
    """Keeps the last known value across restarts and while the car is asleep."""

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self._key not in self.hub.values and (last := await self.async_get_last_state()):
            if last.state not in ("unknown", "unavailable"):
                self.hub.values[self._key] = last.state


class MhaNumericSensor(_Restoring):
    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        unit, dev_class, state_class = NUMERIC_SENSORS[key]
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = SensorDeviceClass(dev_class) if dev_class else None
        self._attr_state_class = SensorStateClass(state_class)
        self._attr_suggested_display_precision = PRECISION.get(key)

    @property
    def native_value(self) -> float | None:
        try:
            return float(self.raw)
        except (TypeError, ValueError):
            return None


class MhaEnumSensor(_Restoring):
    _attr_device_class = SensorDeviceClass.ENUM

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        self._attr_options = ENUM_SENSORS[key]

    @property
    def native_value(self) -> str | None:
        value = self.raw
        return value if value in self._attr_options else None
