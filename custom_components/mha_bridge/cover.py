"""Windows, sunroof and panoramic sunshade (position 0..100 %, 0 = closed)."""
from __future__ import annotations

from typing import Any

from homeassistant.components.cover import CoverDeviceClass, CoverEntity, CoverEntityFeature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from . import MhaConfigEntry
from .const import ALWAYS_COVERS, COVER_ICONS, COVERS
from .entity import MhaEntity, async_add_optional


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MhaCover(entry, k) for k in ALWAYS_COVERS])
    async_add_optional(hass, entry, async_add_entities, [k for k in COVERS if k not in ALWAYS_COVERS], MhaCover)


class MhaCover(MhaEntity, CoverEntity, RestoreEntity):
    """Keeps the last known position across restarts and while the car is asleep (commands still need the app)."""

    _attr_supported_features = (
        CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE | CoverEntityFeature.SET_POSITION
    )

    def __init__(self, entry: MhaConfigEntry, key: str) -> None:
        super().__init__(entry, key)
        self._attr_device_class = (
            CoverDeviceClass.SHADE if COVERS[key] == "shade" else CoverDeviceClass.WINDOW
        )
        if key in COVER_ICONS:
            self._attr_icon = COVER_ICONS[key][0]

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self._key not in self.hub.values and (last := await self.async_get_last_state()):
            pos = last.attributes.get("current_position")
            if isinstance(pos, (int, float)):
                self.hub.values[self._key] = pos

    @property
    def current_cover_position(self) -> int | None:
        try:
            return max(0, min(100, round(float(self.raw))))
        except (TypeError, ValueError):
            return None

    @property
    def is_closed(self) -> bool | None:
        pos = self.current_cover_position
        return None if pos is None else pos == 0

    async def async_open_cover(self, **kwargs: Any) -> None:
        self.hub.send_command(self._key, 100)

    async def async_close_cover(self, **kwargs: Any) -> None:
        self.hub.send_command(self._key, 0)

    async def async_set_cover_position(self, **kwargs: Any) -> None:
        self.hub.send_command(self._key, int(kwargs["position"]))
