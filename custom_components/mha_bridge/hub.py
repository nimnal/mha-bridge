"""Shared state between the websocket API and the entities."""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from homeassistant.helpers.storage import Store

from .const import DEFAULT_TEMP, OPTIONAL_KEYS


class MhaHub:
    """Holds last known values and the live connection to the car app."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.signal = f"mha_bridge_update_{entry_id}"
        self.values: dict[str, Any] = {}
        self.meta: dict[str, float] = dict(DEFAULT_TEMP)
        self._subs: list[Callable[[dict[str, Any]], None]] = []
        # Функции, которые автомобиль объявил поддерживаемыми (сохраняется между перезапусками)
        self.supported: set[str] = set()
        self.caps_signal = f"mha_bridge_caps_{entry_id}"
        self._store: Store = Store(hass, 1, f"mha_bridge.{entry_id}.caps")

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if isinstance(data, dict):
            self.supported = {k for k in data.get("supported", []) if k in OPTIONAL_KEYS}

    @callback
    def _set_supported(self, keys: Any) -> None:
        if not isinstance(keys, list):
            return
        new = {k for k in keys if isinstance(k, str) and k in OPTIONAL_KEYS}
        if new == self.supported:
            return
        self.supported = new
        self._store.async_delay_save(lambda: {"supported": sorted(self.supported)}, 1)
        async_dispatcher_send(self.hass, self.caps_signal)

    @property
    def connected(self) -> bool:
        return bool(self._subs)

    @callback
    def attach(self, send: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        """Register the app connection. Returns a function that detaches it."""
        self._subs.append(send)
        async_dispatcher_send(self.hass, self.signal, None)

        @callback
        def detach() -> None:
            if send in self._subs:
                self._subs.remove(send)
            async_dispatcher_send(self.hass, self.signal, None)

        return detach

    @callback
    def update(self, values: dict[str, Any], meta: dict[str, Any] | None = None) -> None:
        """Apply values pushed by the app."""
        if meta:
            self._set_supported(meta.get("supported"))
            for k in DEFAULT_TEMP:
                v = meta.get(k)
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    self.meta[k] = float(v)
            async_dispatcher_send(self.hass, self.signal, None)
        for key, value in values.items():
            self.values[key] = value
            async_dispatcher_send(self.hass, self.signal, key)

    @callback
    def send_command(self, key: str, value: Any) -> None:
        """Forward a command from HA to the most recent app connection."""
        if not self._subs:
            raise HomeAssistantError("Автомобиль не на связи (приложение-мост не подключено)")
        self._subs[-1]({"command": key, "value": value})
