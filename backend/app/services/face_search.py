import asyncpg
import numpy as np
from typing import Optional
from ..config import get_settings


class FaceSearchService:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            settings = get_settings()
            self._pool = await asyncpg.create_pool(
                host=settings.db_host,
                port=settings.db_port,
                database=settings.db_name,
                user=settings.db_user,
                password=settings.db_password,
                min_size=2,
                max_size=5,
            )
        return self._pool

    async def close(self):
        if self._pool:
            await self._pool.close()

    async def find_best_person_match(
        self, query_embedding: np.ndarray, threshold: float = 0.65
    ) -> Optional[dict]:
        pool = await self.get_pool()

        rows = await pool.fetch("""
            SELECT
                fs.embedding,
                af."personGroupId",
                af."assetId"
            FROM face_search fs
            JOIN asset_face af ON fs."faceId" = af.id
            WHERE af."personGroupId" IS NOT NULL
              AND af."deletedAt" IS NULL
              AND af."isVisible" = TRUE
        """)

        person_scores: dict[str, list[tuple[float, str]]] = {}

        for row in rows:
            db_embedding = self._parse_embedding(row["embedding"])
            if db_embedding is None or len(db_embedding) != len(query_embedding):
                continue

            similarity = self._cosine_similarity(query_embedding, db_embedding)
            person_id = str(row["personGroupId"])
            asset_id = str(row["assetId"])

            if person_id not in person_scores:
                person_scores[person_id] = []
            person_scores[person_id].append((similarity, asset_id))

        best_person = None
        best_score = -1

        for person_id, score_list in person_scores.items():
            sorted_scores = sorted(score_list, key=lambda x: x[0], reverse=True)
            top_scores = [s[0] for s in sorted_scores[:5]]
            avg_score = sum(top_scores) / len(top_scores)
            if avg_score > best_score:
                best_score = avg_score
                best_person = person_id

        if best_person and best_score >= threshold:
            return {
                "person_id": best_person,
                "similarity": float(best_score),
            }
        return None

    async def get_unassigned_assets(self) -> tuple[int, list[dict]]:
        """Assets with no visible named face. Returns (total_timeline_images, unassigned_list)."""
        pool = await self.get_pool()

        total = await pool.fetchval("""
            SELECT COUNT(*)
            FROM asset a
            WHERE a."deletedAt" IS NULL
              AND a.visibility = 'timeline'
              AND a.type = 'IMAGE'
        """)

        rows = await pool.fetch("""
            SELECT a.id, a.width, a.height, a.type
            FROM asset a
            WHERE a."deletedAt" IS NULL
              AND a.visibility = 'timeline'
              AND a.type = 'IMAGE'
              AND NOT EXISTS (
                  SELECT 1 FROM asset_face af
                  WHERE af."assetId" = a.id
                    AND af."personGroupId" IS NOT NULL
                    AND af."deletedAt" IS NULL
                    AND af."isVisible" = TRUE
              )
            ORDER BY a."fileCreatedAt" DESC
        """)

        assets = []
        for row in rows:
            asset_id = str(row["id"])
            assets.append({
                "id": asset_id,
                "width": row["width"] or 0,
                "height": row["height"] or 0,
                "originalWidth": row["width"] or 0,
                "originalHeight": row["height"] or 0,
                "type": row["type"] or "",
            })
        return total, assets

    def _parse_embedding(self, embedding_data) -> Optional[np.ndarray]:
        try:
            if isinstance(embedding_data, (memoryview, bytes)):
                arr = np.frombuffer(bytes(embedding_data), dtype=np.float32)
                return arr
            elif isinstance(embedding_data, list):
                return np.array(embedding_data, dtype=np.float32)
            elif isinstance(embedding_data, str):
                cleaned = embedding_data.strip("[]").strip()
                values = [float(x) for x in cleaned.split(",")]
                return np.array(values, dtype=np.float32)
            return None
        except Exception:
            return None

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))


face_search_service = FaceSearchService()
