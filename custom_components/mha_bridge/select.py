"""Select controls."""
from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import MhaConfigEntry
from .const import OPT_SELECT_ICONS, OPT_SELECTS, SELECT_ICONS, SELECTS
from .entity import MhaEntity, async_add_optional


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MhaSelect(entry, k) for k in SELECTS])
    async_add_optional(hass, entry, async_add_entities, OPT_SELECTS, MhaSelect)


class MhaSelect(MhaEntity, SelectEntity):
    _requires_connection = True

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        self._attr_options = SELECTS.get(key) or OPT_SELECTS[key]
        self._attr_icon = SELECT_ICONS.get(key) or OPT_SELECT_ICONS.get(key)

    @property
    def current_option(self) -> str | None:
        value = self.raw
        return value if value in self._attr_options else None

    async def async_select_option(self, option: str) -> None:
        self.hub.send_command(self._key, option)
