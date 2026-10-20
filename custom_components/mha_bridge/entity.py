"""Base entity."""
from __future__ import annotations

from collections.abc import Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from . import MhaConfigEntry
from .const import DOMAIN
from .hub import MhaHub


class MhaEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    # Control entities are unavailable while the app is offline; sensors keep their last value.
    _requires_connection = False

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        self.hub: MhaHub = entry.runtime_data
        self._key = key
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="Geely",
            model="Monjaro (ECARX)",
        )

    @property
    def available(self) -> bool:
        return self.hub.connected if self._requires_connection else True

    @property
    def raw(self):
        return self.hub.values.get(self._key)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(self.hass, self.hub.signal, self._handle_update)
        )

    @callback
    def _handle_update(self, key: str | None) -> None:
        if key is None or key == self._key:
            self.async_write_ha_state()


@callback
def async_add_optional(
    hass: HomeAssistant,
    entry: MhaConfigEntry,
    async_add_entities,
    keys,
    factory: Callable[[MhaConfigEntry, str], MhaEntity],
) -> None:
    """Add entities for optional car functions as soon as the car reports them as supported."""
    hub: MhaHub = entry.runtime_data
    added: set[str] = set()

    @callback
    def _sync() -> None:
        new = [k for k in keys if k in hub.supported and k not in added]
        if not new:
            return
        added.update(new)
        async_add_entities([factory(entry, k) for k in new])

    _sync()
    entry.async_on_unload(async_dispatcher_connect(hass, hub.caps_signal, _sync))
