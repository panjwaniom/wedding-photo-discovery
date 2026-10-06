import io
import json
import httpx
import numpy as np
from PIL import Image
from typing import Optional
from ..config import get_settings


async def detect_and_embed_face(image_bytes: bytes) -> tuple[Optional[np.ndarray], Optional[str]]:
    settings = get_settings()
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    max_dim = 1024
    if max(img.size) > max_dim:
        ratio = max_dim / max(img.size)
        img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    jpeg_bytes = buf.getvalue()

    try:
        embedding = await _predict_from_ml(jpeg_bytes, settings)
        if embedding is not None:
            return embedding, None
    except httpx.ConnectError:
        return None, "Photo processing service is starting up. Please try again in a moment."
    except httpx.TimeoutException:
        return None, "Photo processing timed out. Please try a smaller image."
    except Exception as e:
        return None, "Unable to process this photo. Please try a clearer, front-facing selfie."

    return None, (
        "We couldn't detect a face in this photo. "
        "Please try a clearer photo where your face is visible and facing the camera."
    )


async def _predict_from_ml(image_bytes: bytes, settings) -> Optional[np.ndarray]:
    min_score = getattr(settings, "min_detection_score", 0.3)
    entries = json.dumps({
        "facial-recognition": {
            "detection": {
                "modelName": "buffalo_l",
                "options": {"minScore": min_score}
            },
            "recognition": {
                "modelName": "buffalo_l",
                "options": {}
            }
        }
    })

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.immich_ml_url}/predict",
            data={"entries": entries},
            files={"image": ("image.jpg", image_bytes, "image/jpeg")},
        )
        if resp.status_code == 200:
            data = resp.json()
            return _extract_face_embedding(data)
        return None


def _extract_face_embedding(data: dict) -> Optional[np.ndarray]:
    facial = data.get("facial-recognition", {})

    if isinstance(facial, list):
        if not facial:
            return None
        # Pick the highest-confidence face (best for angled/group shots),
        # not just the first one returned.
        best_entry = None
        best_score = -1.0
        for entry in facial:
            if not isinstance(entry, dict):
                continue
            try:
                score = float(entry.get("score", 0) or 0)
            except (TypeError, ValueError):
                score = 0
            if score >= best_score:
                best_score = score
                best_entry = entry
        face_entry = best_entry if best_entry is not None else facial[0]
        if isinstance(face_entry, dict):
            emb = face_entry.get("embedding") or face_entry.get("facial_recognition")
            if emb is not None:
                return _to_numpy(emb)

    if not isinstance(facial, dict):
        return None

    detection = facial.get("detection", {})
    recognition = facial.get("recognition", {})

    if isinstance(recognition, dict):
        embeddings = recognition.get("embeddings", [])
        if embeddings:
            return _to_numpy(embeddings[0])

    if isinstance(recognition, list) and len(recognition) > 0:
        emb = recognition[0].get("embedding") or recognition[0].get("facial_recognition")
        if emb is not None:
            return _to_numpy(emb)

    if isinstance(detection, list) and len(detection) > 0:
        faces = detection[0].get("faces", [])
        if faces:
            emb = faces[0].get("embedding")
            if emb is not None:
                return _to_numpy(emb)

    return None


def _to_numpy(emb) -> Optional[np.ndarray]:
    if isinstance(emb, list):
        return np.array(emb, dtype=np.float32)
    elif isinstance(emb, (bytes, memoryview)):
        return np.frombuffer(bytes(emb), dtype=np.float32)
    elif isinstance(emb, str):
        cleaned = emb.strip("[]").strip()
        values = [float(x) for x in cleaned.split(",")]
        return np.array(values, dtype=np.float32)
    return None
