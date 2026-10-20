"""Serve and auto-register the MHA Bridge dashboard card.

The card lives in mha-card.js beside this file and appears in the Lovelace card
picker as `custom:mha-card` once the integration is set up - no HACS frontend
package and no manual resource entry.

The delivery approach (a view that resolves the file on every request, a
version+mtime query so browsers and the service worker never serve a stale copy, a
Lovelace resource with an extra-module fallback) follows the Geely Connect integration
by Yossi Koncha, MIT License - see LICENSE-geely-connect.
"""
from __future__ import annotations

import gzip
import hashlib
import logging
import os

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CARD_URL = f"/{DOMAIN}/mha-card.js"
_REGISTERED = f"{DOMAIN}_card_registered"


def _card_path() -> str:
    return os.path.join(os.path.dirname(__file__), "mha-card.js")


def _card_mtime(path: str) -> int:
    try:
        return int(os.path.getmtime(path))
    except OSError:
        return 0


async def async_register_card(hass: HomeAssistant) -> None:
    """Idempotent and best-effort: a missing frontend must never block the integration."""
    if hass.data.get(_REGISTERED):
        return
    hass.data[_REGISTERED] = True
    try:
        path = _card_path()
        if not await hass.async_add_executor_job(os.path.isfile, path):
            hass.data[_REGISTERED] = False
            _LOGGER.error(
                "The dashboard card file is missing (%s). Re-copy the whole "
                "custom_components/mha_bridge folder and restart Home Assistant.", path)
            return
        hass.http.register_view(MhaCardView())
        hass.http.register_view(MhaCarImageView())
        hass.http.register_view(MhaCarTopImageView())
        hass.http.register_view(MhaCarTopMaskView())
        hass.http.register_view(MhaCar3dModelView())
        hass.http.register_view(MhaThreeView())
        for _view in (MhaCabinView, MhaCabinMaskView, MhaCockpitView, MhaCockpitMaskView):
            hass.http.register_view(_view())
        integration = await async_get_integration(hass, DOMAIN)
        stamp = await hass.async_add_executor_job(_card_mtime, path)
        url = f"{CARD_URL}?v={integration.version}&m={stamp}"

        registered = await _async_register_resource(hass, url)
        if not registered:
            try:
                from homeassistant.components.frontend import add_extra_js_url

                add_extra_js_url(hass, url)
            except Exception as err:  # noqa: BLE001 - frontend may be absent
                _LOGGER.debug("No frontend to load the card into (%s)", err)
        if not registered and hass.state is CoreState.starting:
            async def _retry(_event) -> None:
                if not await _async_register_resource(hass, url):
                    _LOGGER.warning(
                        "Could not add the ECARX card to Lovelace resources. If the card is "
                        "missing, add it by hand: Settings -> Dashboards -> Resources -> "
                        "%s (JavaScript module)", url)

            hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _retry)
        _LOGGER.info("ECARX dashboard card served at %s (Lovelace resource: %s)", url, registered)
    except Exception as err:  # noqa: BLE001
        hass.data[_REGISTERED] = False
        _LOGGER.warning("Could not register the dashboard card (non-fatal): %s", err)


async def _async_register_resource(hass: HomeAssistant, url: str) -> bool:
    """Add (or update) the card as a Lovelace resource. False if impossible."""
    data = hass.data.get("lovelace")
    resources = getattr(data, "resources", None)
    if resources is None and isinstance(data, dict):
        resources = data.get("resources")
    if resources is None or not hasattr(resources, "async_create_item"):
        return False
    try:
        if hasattr(resources, "async_get_info"):
            await resources.async_get_info()
        elif getattr(resources, "loaded", True) is False:
            await resources.async_load()
        existing = [
            item for item in resources.async_items() or []
            if str(item.get("url", "")).split("?")[0] == CARD_URL
        ]
        if not existing:
            await resources.async_create_item({"res_type": "module", "url": url})
            return True
        keep, *duplicates = existing
        for dupe in duplicates:
            await resources.async_delete_item(dupe["id"])
        if keep.get("url") != url:
            await resources.async_update_item(keep["id"], {"url": url})
        return True
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("Lovelace resource registration unavailable (%s)", err)
        return False


class MhaCardView(HomeAssistantView):
    """Serve mha-card.js, resolved fresh on every request (public UI code, no auth:
    the frontend loads Lovelace resources as plain script tags)."""

    url = CARD_URL
    name = f"{DOMAIN}:card"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        def _read() -> bytes | None:
            try:
                with open(_card_path(), "rb") as fh:
                    return fh.read()
            except OSError:
                return None

        body = await request.app["hass"].async_add_executor_job(_read)
        if body is None:
            return web.Response(status=404, text="mha-card.js is missing from the integration folder")
        return web.Response(
            body=body, content_type="text/javascript", charset="utf-8",
            headers={"Cache-Control": "no-cache"},
        )


_IMAGE_CACHE: dict[str, tuple[bytes, bytes, str] | None] = {}


class _CarImageView(HomeAssistantView):
    """Serve a vector car drawing (public, no auth: it is fetched by the card).

    Sent gzip-compressed when the browser accepts it - the traced SVGs are ~100-160 KB
    raw but only 30-50 KB on the wire."""

    requires_auth = False
    filename = ""
    mime = "image/svg+xml"

    async def get(self, request: web.Request) -> web.Response:
        name = self.filename

        def _read() -> tuple[bytes, bytes, str] | None:
            try:
                with open(os.path.join(os.path.dirname(__file__), name), "rb") as fh:
                    raw = fh.read()
            except OSError:
                return None
            return raw, gzip.compress(raw, 9), '"' + hashlib.sha1(raw).hexdigest()[:16] + '"'

        if name not in _IMAGE_CACHE:
            _IMAGE_CACHE[name] = await request.app["hass"].async_add_executor_job(_read)
        entry = _IMAGE_CACHE[name]
        if entry is None:
            return web.Response(status=404)
        raw, packed, etag = entry
        # Revalidate on every load (a 304 costs nothing): a long max-age kept an old
        # picture in desktop browsers after the integration was updated.
        headers = {"Cache-Control": "no-cache", "ETag": etag, "Vary": "Accept-Encoding"}
        if request.headers.get("If-None-Match") == etag:
            return web.Response(status=304, headers=headers)
        if "gzip" in request.headers.get("Accept-Encoding", ""):
            headers["Content-Encoding"] = "gzip"
            return web.Response(body=packed, content_type=self.mime, headers=headers)
        return web.Response(body=raw, content_type=self.mime, headers=headers)


class MhaCarImageView(_CarImageView):
    url = f"/{DOMAIN}/car-side.svg"
    name = f"{DOMAIN}:car_image"
    filename = "car-side.svg"


class MhaCarTopImageView(_CarImageView):
    """Top view for the flat mode (car_3d: false / no WebGL): a render of the 3D model itself, so the geometry is the same."""

    url = f"/{DOMAIN}/car-top.webp"
    name = f"{DOMAIN}:car_top_image"
    filename = "car-top.webp"
    mime = "image/webp"


class MhaCarTopMaskView(_CarImageView):
    """Paint mask of that render (white = body paint), used to repaint it in car_color."""

    url = f"/{DOMAIN}/car-top-mask.webp"
    name = f"{DOMAIN}:car_top_mask"
    filename = "car-top-mask.webp"
    mime = "image/webp"


class MhaCar3dModelView(_CarImageView):
    """The 3D car model for the top view (Int16 positions, ~1.3 MB, ~0.5 MB gzipped)."""

    url = f"/{DOMAIN}/car3d.bin"
    name = f"{DOMAIN}:car3d_model"
    filename = "car3d.bin"
    mime = "application/octet-stream"


class MhaThreeView(_CarImageView):
    """three.js (MIT), loaded by the card only when a top view is on the dashboard."""

    url = f"/{DOMAIN}/three.module.min.js"
    name = f"{DOMAIN}:three_js"
    filename = "three.module.min.js"
    mime = "text/javascript"


class MhaCabinView(_CarImageView):
    """Cabin photo from above (Climate / Comfort tabs of the tabbed cards)."""

    url = f"/{DOMAIN}/cabin.webp"
    name = f"{DOMAIN}:cabin_photo"
    filename = "cabin.webp"
    mime = "image/webp"


class MhaCabinMaskView(_CarImageView):
    """Masks of the cabin photo: red = fabric, green = trim (for cabin_fabric / cabin_trim)."""

    url = f"/{DOMAIN}/cabin_mask.png"
    name = f"{DOMAIN}:cabin_mask"
    filename = "cabin_mask.png"
    mime = "image/png"


class MhaCockpitView(_CarImageView):
    """Cockpit photo (Data tab)."""

    url = f"/{DOMAIN}/cockpit.webp"
    name = f"{DOMAIN}:cockpit_photo"
    filename = "cockpit.webp"
    mime = "image/webp"


class MhaCockpitMaskView(_CarImageView):
    url = f"/{DOMAIN}/cockpit_mask.png"
    name = f"{DOMAIN}:cockpit_mask"
    filename = "cockpit_mask.png"
    mime = "image/png"
