from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
import os
import tempfile
import zipfile
from ..services.immich import immich_service
from ..services.face_search import face_search_service
from ..services.session import session_manager
from ..utils.face_detect import detect_and_embed_face
from ..config import get_settings
import io
from PIL import Image

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.get("/people")
async def get_people():
    people = await immich_service.get_all_people()
    named = [{"id": p["id"], "name": p["name"]} for p in people if p.get("name")]
    named.sort(key=lambda x: x["name"])
    return {"people": named}


def _is_couple(person_id: str) -> bool:
    settings = get_settings()
    ids = {i.strip() for i in (settings.couple_person_ids or "").split(",") if i.strip()}
    return person_id in ids


async def _with_couple_extras(person_id: str, person_assets: list[dict]) -> list[dict]:
    """The couple also sees every unassigned photo in their results."""
    if not _is_couple(person_id):
        return person_assets
    _, unassigned = await face_search_service.get_unassigned_assets()
    seen = {a["id"] for a in person_assets}
    merged = list(person_assets)
    for asset in unassigned:
        if asset["id"] not in seen:
            merged.append(asset)
            seen.add(asset["id"])
    return merged


@router.get("/unassigned")
async def get_unassigned_photos():
    total, unassigned = await face_search_service.get_unassigned_assets()

    photos = []
    for asset in unassigned:
        photos.append({
            **asset,
            "thumbnailUrl": f"/api/unassigned/photos/{asset['id']}/thumbnail",
        })

    return {
        "total": total,
        "assigned": total - len(photos),
        "unassignedCount": len(photos),
        "photos": photos,
    }


class NameSearchRequest(BaseModel):
    name: str


@router.post("/search/name")
async def search_by_name(req: NameSearchRequest):
    people = await immich_service.get_all_people()
    named = [p for p in people if p.get("name")]

    query = req.name.strip().lower()
    best_match = None
    best_score = 0

    for person in named:
        pname = person["name"].lower()
        if pname == query:
            best_match = person
            best_score = 1.0
            break
        if query in pname or pname in query:
            score = len(query) / max(len(pname), len(query))
            if score > best_score:
                best_score = score
                best_match = person

    if best_match is None or best_score < 0.5:
        raise HTTPException(
            status_code=404,
            detail="We couldn't find that name. Please check the spelling and try again.",
        )

    person_id = best_match["id"]
    person_assets = await immich_service.get_person_assets(person_id)
    person_assets = await _with_couple_extras(person_id, person_assets)
    photo_ids = [asset["id"] for asset in person_assets]
    session_id = session_manager.create_session(person_id, photo_ids)

    photos = []
    for asset in person_assets:
        photos.append({
            "id": asset["id"],
            "thumbnailUrl": f"/api/results/{session_id}/photos/{asset['id']}/thumbnail",
            "width": asset.get("exifInfo", {}).get("imageWidth") or asset.get("width") or 0,
            "height": asset.get("exifInfo", {}).get("imageHeight") or asset.get("height") or 0,
            "originalWidth": asset.get("originalWidth") or 0,
            "originalHeight": asset.get("originalHeight") or 0,
            "type": asset.get("type", ""),
        })

    return {
        "matched": True,
        "sessionId": session_id,
        "personId": person_id,
        "personName": best_match["name"],
        "similarity": 1.0,
        "photoCount": len(photos),
        "photos": photos,
    }


@router.post("/search")
async def search_face(photo: UploadFile = File(...)):
    settings = get_settings()

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
    if photo.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP, or supported image.")

    contents = await photo.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail="That image is too large. Please choose another photo.")

    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file. Please try another photo.")

    embedding, error = await detect_and_embed_face(contents)
    if error:
        raise HTTPException(status_code=400, detail=error)
    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="Couldn't detect a clear face. Please upload a clearer photo.",
        )

    match = await face_search_service.find_best_person_match(
        embedding, threshold=settings.face_match_threshold
    )

    if match is None:
        raise HTTPException(
            status_code=404,
            detail="We couldn't find your face in the wedding photos.",
        )

    person_id = match["person_id"]
    person_assets = await immich_service.get_person_assets(person_id)
    person_assets = await _with_couple_extras(person_id, person_assets)

    person_name = ""
    people = await immich_service.get_all_people()
    for p in people:
        if p["id"] == person_id:
            person_name = p.get("name", "")
            break

    photo_ids = [asset["id"] for asset in person_assets]

    session_id = session_manager.create_session(person_id, photo_ids)

    photos = []
    for asset in person_assets:
        photos.append({
            "id": asset["id"],
            "thumbnailUrl": f"/api/results/{session_id}/photos/{asset['id']}/thumbnail",
            "width": asset.get("exifInfo", {}).get("imageWidth") or asset.get("width") or 0,
            "height": asset.get("exifInfo", {}).get("imageHeight") or asset.get("height") or 0,
            "originalWidth": asset.get("originalWidth") or 0,
            "originalHeight": asset.get("originalHeight") or 0,
            "type": asset.get("type", ""),
        })

    return {
        "matched": True,
        "sessionId": session_id,
        "personId": person_id,
        "personName": person_name,
        "similarity": match["similarity"],
        "photoCount": len(photos),
        "photos": photos,
    }


@router.get("/results/{session_id}/photos/{photo_id}/thumbnail")
async def get_photo_thumbnail(session_id: str, photo_id: str):
    if not session_manager.is_photo_in_session(session_id, photo_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    result = await immich_service.get_asset_thumbnail(photo_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data, content_type = result
    return Response(content=data, media_type=content_type)


@router.get("/results/{session_id}/photos/{photo_id}/download")
async def download_photo(session_id: str, photo_id: str):
    if not session_manager.is_photo_in_session(session_id, photo_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    result = await immich_service.get_asset_download(photo_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data, content_type = result
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="wedding_{photo_id}.jpg"'},
    )


@router.get("/results/{session_id}/download-all")
async def download_all_photos(session_id: str, background_tasks: BackgroundTasks):
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Cap protects the server from multi-GB zips (couple has 284 photos).
    photo_ids = session.photo_ids[:300]
    if not photo_ids:
        raise HTTPException(status_code=404, detail="No photos found.")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    try:
        # STORED (no compression): JPEGs don't compress, this keeps it fast.
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_STORED) as zf:
            for pid in photo_ids:
                result = await immich_service.get_asset_original(pid)
                if result is None:
                    continue
                data, content_type = result
                ext = ".webp" if "webp" in content_type else ".jpg"
                zf.writestr(f"wedding_{pid}{ext}", data)
    finally:
        tmp.close()

    background_tasks.add_task(os.remove, tmp.name)
    return FileResponse(
        tmp.name,
        media_type="application/zip",
        filename="wedding-photos.zip",
        background=background_tasks,
    )


@router.get("/results/{session_id}/photos/{photo_id}/preview")
async def get_photo_preview(session_id: str, photo_id: str):
    if not session_manager.is_photo_in_session(session_id, photo_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    result = await immich_service.get_asset_preview(photo_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data, content_type = result
    return Response(content=data, media_type=content_type)


@router.get("/results/{session_id}/photos/{photo_id}")
async def get_photo_full(session_id: str, photo_id: str):
    if not session_manager.is_photo_in_session(session_id, photo_id):
        raise HTTPException(status_code=403, detail="Access denied.")

    result = await immich_service.get_asset_original(photo_id)
    if result is None:
        result = await immich_service.get_asset_thumbnail(photo_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data, content_type = result
    return Response(content=data, media_type=content_type)


@router.get("/unassigned/photos/{photo_id}/thumbnail")
async def get_unassigned_thumbnail(photo_id: str):
    result = await immich_service.get_asset_thumbnail(photo_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found.")
    data, content_type = result
    return Response(content=data, media_type=content_type)
