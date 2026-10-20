"""Switch controls."""
from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import MhaConfigEntry
from .const import OPT_SWITCHES, SWITCHES
from .entity import MhaEntity, async_add_optional


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MhaSwitch(entry, k) for k in SWITCHES])
    async_add_optional(hass, entry, async_add_entities, OPT_SWITCHES, MhaSwitch)


class MhaSwitch(MhaEntity, SwitchEntity):
    _requires_connection = True

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        self._attr_icon = SWITCHES.get(key) or OPT_SWITCHES.get(key)

    @property
    def is_on(self) -> bool | None:
        value = self.raw
        return value if isinstance(value, bool) else None

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.hub.send_command(self._key, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.hub.send_command(self._key, False)
