"""Connection status of the car app."""
from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from . import MhaConfigEntry
from .const import DOORS, ENGINE_RUNNING, LOCK_SENSOR
from .entity import MhaEntity, async_add_optional


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MhaConnection(entry), MhaEngine(entry)] + [MhaDoor(entry, k) for k in DOORS])
    async_add_optional(hass, entry, async_add_entities, [LOCK_SENSOR], lambda e, k: MhaLock(e))


class MhaConnection(MhaEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

    def __init__(self, entry: MhaConfigEntry) -> None:
        super().__init__(entry, "connected")

    @property
    def is_on(self) -> bool:
        return self.hub.connected


class MhaDoor(MhaEntity, BinarySensorEntity, RestoreEntity):
    """Doors, hood, tailgate: keep the last known state across restarts and while the car is asleep."""

    _attr_device_class = BinarySensorDeviceClass.DOOR

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self._key not in self.hub.values and (last := await self.async_get_last_state()):
            if last.state in ("on", "off"):
                self.hub.values[self._key] = last.state == "on"

    @property
    def is_on(self) -> bool | None:
        value = self.raw
        return value if isinstance(value, bool) else None


class MhaEngine(MhaEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.RUNNING

    def __init__(self, entry: MhaConfigEntry) -> None:
        super().__init__(entry, ENGINE_RUNNING)

    @property
    def is_on(self) -> bool | None:
        value = self.raw
        return value if isinstance(value, bool) else None


class MhaLock(MhaEntity, BinarySensorEntity):
    """Central lock. Device class LOCK: on = unlocked (problem), off = locked."""

    _attr_device_class = BinarySensorDeviceClass.LOCK

    def __init__(self, entry: MhaConfigEntry) -> None:
        super().__init__(entry, LOCK_SENSOR)

    @property
    def is_on(self) -> bool | None:
        value = self.raw
        return (not value) if isinstance(value, bool) else None
