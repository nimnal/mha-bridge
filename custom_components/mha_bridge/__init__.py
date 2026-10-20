"""MHA Bridge: bridge between the head unit app and Home Assistant."""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from .cards import async_register_card
from .const import DOMAIN, REMOVED_KEYS
from .hub import MhaHub
from .websocket import async_register

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.SWITCH,
    Platform.COVER,
]

type MhaConfigEntry = ConfigEntry[MhaHub]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: MhaConfigEntry) -> bool:
    entry.runtime_data = MhaHub(hass, entry.entry_id)
    await entry.runtime_data.async_load()
    # Удаляем сущности, которые были в прежних версиях и больше не поддерживаются
    registry = er.async_get(hass)
    for reg_entry in er.async_entries_for_config_entry(registry, entry.entry_id):
        if any(reg_entry.unique_id == f"{entry.entry_id}_{key}" for key in REMOVED_KEYS):
            registry.async_remove(reg_entry.entity_id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await async_register_card(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: MhaConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
