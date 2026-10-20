"""Websocket API used by the Android bridge app (authenticated with a long-lived token)."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, PROTOCOL_VERSION
from .hub import MhaHub

_SCALAR = vol.Any(str, int, float, bool, None)


def _hub(hass: HomeAssistant) -> MhaHub | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        hub = getattr(entry, "runtime_data", None)
        if isinstance(hub, MhaHub):
            return hub
    return None


def _require_hub(hass, connection, msg) -> MhaHub | None:
    hub = _hub(hass)
    if hub is None:
        connection.send_error(
            msg["id"],
            "not_configured",
            "Интеграция ECARX установлена, но не добавлена: Настройки → Устройства и службы → Добавить интеграцию",
        )
    return hub


@websocket_api.websocket_command({vol.Required("type"): "mha_bridge/info"})
@callback
def ws_info(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _require_hub(hass, connection, msg)
    if hub is None:
        return
    connection.send_result(msg["id"], {"protocol": PROTOCOL_VERSION, "connected": hub.connected})


@websocket_api.websocket_command(
    {vol.Required("type"): "mha_bridge/subscribe", vol.Optional("meta"): dict}
)
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _require_hub(hass, connection, msg)
    if hub is None:
        return
    msg_id = msg["id"]

    @callback
    def forward(command: dict[str, Any]) -> None:
        connection.send_message({"id": msg_id, "type": "event", "event": command})

    # Register first so that detach runs automatically when the connection closes.
    connection.subscriptions[msg_id] = hub.attach(forward)
    if msg.get("meta"):
        hub.update({}, msg["meta"])
    connection.send_result(msg_id, {"protocol": PROTOCOL_VERSION})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "mha_bridge/update",
        vol.Optional("values", default={}): {str: _SCALAR},
        vol.Optional("meta"): dict,
    }
)
@callback
def ws_update(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _require_hub(hass, connection, msg)
    if hub is None:
        return
    hub.update(msg["values"], msg.get("meta"))
    connection.send_result(msg["id"])


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_info)
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_update)
