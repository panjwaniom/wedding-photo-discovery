import httpx
from typing import Optional
from ..config import get_settings


class ImmichService:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.immich_url.rstrip("/")
        self.api_key = settings.immich_api_key
        self.headers = {"x-api-key": self.api_key}

    async def get_all_people(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/api/people",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json().get("people", [])

    async def get_person_assets(self, person_id: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/api/search/metadata",
                headers={**self.headers, "Content-Type": "application/json"},
                json={"personIds": [person_id]},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("assets", {}).get("items", [])

    async def get_asset_thumbnail(self, asset_id: str) -> Optional[tuple[bytes, str]]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/api/assets/{asset_id}/thumbnail",
                headers=self.headers,
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return resp.content, content_type
            return None

    async def get_asset_preview(self, asset_id: str) -> Optional[tuple[bytes, str]]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/api/assets/{asset_id}/thumbnail",
                params={"size": "preview"},
                headers=self.headers,
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return resp.content, content_type
            return None

    async def get_asset_original(self, asset_id: str) -> Optional[tuple[bytes, str]]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                f"{self.base_url}/api/assets/{asset_id}/original",
                headers=self.headers,
                follow_redirects=True,
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return resp.content, content_type
            return None

    async def get_asset_download(self, asset_id: str) -> Optional[tuple[bytes, str]]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                f"{self.base_url}/api/assets/{asset_id}/original",
                headers=self.headers,
                follow_redirects=True,
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "application/octet-stream")
                return resp.content, content_type
            return None


immich_service = ImmichService()
