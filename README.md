# Wedding Photo Discovery

Guests upload a selfie and instantly get back only the event photos they appear in — powered by your own self-hosted photo library. No accounts, no app install, no scrolling through hundreds of pictures that aren't yours.

![Wedding Photo Discovery preview card](frontend/public/og-image.jpg)

**Status:** Working deployment serving guests (Docker Compose: React frontend, FastAPI backend, Immich photo backend).

## The problem

After a wedding, hundreds or thousands of photos land in one shared gallery. Each guest wants the dozen photos *they* appear in, and today that means manual scrolling, requesting photos in chat groups, or the couple hand-sorting pictures per person.

## How it works (user workflow)

1. Guest opens the link on their phone and uploads a selfie (gallery picker) or takes one with the guided in-app camera (face outline, lighting tips, explicit permission step).
2. The backend detects the face, computes its embedding, and matches it against known faces in the photo library.
3. If Immich has a name for the match, the guest confirms it ("Are you …? Yes / No").
4. The guest browses their photos in a swipeable gallery and saves them:
   - **iPhone:** "Save to Photos" shares batches straight into the gallery app.
   - **Everyone:** "Download All" fetches one zip of full-quality originals.
   - Single photos can be opened full-screen and long-pressed to save.

## Key features

- Selfie-based photo search (upload or guided in-app camera, front/rear switchable)
- Identity confirmation step using names stored in Immich ("Are you …?")
- Session-scoped photo access — guests can only ever see their own matches
- Swipeable full-screen photo viewer with keyboard, button, and touch navigation
- Bulk download as a zip of originals, capped per session
- iOS "Save to Photos" via the native share sheet, in small batches
- Name-based search fallback (`POST /api/search/name`)
- Unassigned-photo browser for the event owner (`?view=unassigned`)
- Configurable "couple" identities that additionally receive unassigned photos
- Link preview card (Open Graph / Twitter Card) for sharing on chat apps

## Architecture

```text
Guest browser (HTTPS)
  → Nginx (serves React SPA, proxies /api/*)
    → FastAPI backend
      → Immich ML service  (/predict, InsightFace buffalo_l embeddings)
      → Immich PostgreSQL  (face_search / asset_face tables, cosine match)
      → Immich Server API  (photo metadata, thumbnails, originals)
```

The wedding app joins the existing `immich_default` Docker network so it can
reach Immich's server, ML service, and database by container hostname.
Uploaded selfies are processed in memory and never stored. The Immich API
key lives only in backend environment variables — it is never sent to the
browser.

## Frontend stack

| Piece | Technology |
|---|---|
| UI | React 18 + TypeScript 5.5 |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 (+ custom wedding palette), PostCSS, Autoprefixer |
| Camera | `MediaDevices.getUserMedia` with canvas capture |
| Sharing | Web Share API (`navigator.share` with `File` objects) on iOS |
| Production serving | Nginx (Alpine), multi-stage Docker build from Node 20 |

App states: `idle → uploading/searching → confirm → results → error`, plus an
`unassigned` owner view reachable via `?view=unassigned`.

## Backend stack

| Piece | Technology |
|---|---|
| Framework | FastAPI 0.115 (Python 3.12, Uvicorn 0.34) |
| HTTP client | httpx 0.27 |
| Database driver | asyncpg 0.29 (connection pool, 2–5 connections) |
| Numerics | NumPy 1.26 |
| Image handling | Pillow 10.4 (EXIF-safe open, downscale to 1024px, JPEG re-encode) |
| Settings | pydantic-settings 2.7 (environment variables + `.env` file) |
| Upload parsing | python-multipart |

## Database

PostgreSQL 14 (provided by the Immich installation, pgvector-compatible
image). The app reads — never writes — two tables:

- `face_search(faceId, embedding vector(512))` — known face embeddings
- `asset_face(id, "assetId", "personGroupId", "deletedAt", "isVisible")` — face-to-photo links

Sessions are kept in a process-local in-memory map with configurable expiry.

## Photo processing workflow

1. `POST /api/search` accepts `photo` (JPG/PNG/WEBP/HEIC, size-capped).
2. The image is validated, converted to RGB, downscaled (long edge 1024px),
   and re-encoded as JPEG.
3. The bytes are sent to Immich ML `POST /predict` as multipart
   (`entries` = facial-recognition detection + recognition, `buffalo_l`).
4. The highest-confidence returned face embedding is parsed (list, binary,
   or string-encoded vector).
5. If no face is found, the API returns a 400 with a human-readable message.

## Face matching

Face recognition itself is performed by **Immich's built-in pipeline
(InsightFace `buffalo_l` model)** — this project does not train or ship its
own model. Matching logic in `FaceSearchService`:

1. Parse every stored embedding from `face_search` (asyncpg returns pgvector
   values as strings; all encodings are handled).
2. Compute cosine similarity against the query embedding with NumPy.
3. Group similarities by person; score = mean of the top-5 matches.
4. Return the best person when its score ≥ `FACE_MATCH_THRESHOLD`.

Detection sensitivity (`MIN_DETECTION_SCORE`, default `0.3`) and the match
threshold (`FACE_MATCH_THRESHOLD`, default `0.55`) are both configurable —
the identity-confirmation screen acts as a safety net against loose matches.

## Screenshots

Capture these from your own deployment (use photos you have the right to
share — never other people's wedding pictures):

- `docs/screenshots/landing.png` — upload screen
- `docs/screenshots/camera.png` — guided camera with face outline
- `docs/screenshots/confirm.png` — "Are you …?" identity confirmation
- `docs/screenshots/results.png` — photo grid with download options

## Installation

Prerequisites: Docker + Docker Compose, and a running Immich installation
with photos uploaded and facial recognition finished.

```bash
# 1. Configure
cp .env.example .env
# Edit .env: set IMMICH_API_KEY (Immich web UI → User Settings → API Keys,
# full permissions) and DB_PASSWORD (must match your Immich database).

# 2. Run (from the project root)
docker compose up --build

# 3. Open
# http://localhost:3000
```

The backend must join Immich's Docker network (`immich_default`); start this
project from a host where that network exists.

## Environment configuration

| Variable | Default | Description |
|---|---|---|
| `IMMICH_API_KEY` | — (required) | Immich API key, all permissions |
| `DB_PASSWORD` | `postgres` | Must match the Immich database password |
| `FACE_MATCH_THRESHOLD` | `0.55` | Min top-5-average cosine similarity (0–1) |
| `MIN_DETECTION_SCORE` | `0.3` | Min face-detection confidence sent to Immich ML |
| `COUPLE_PERSON_IDS` | empty | Comma-separated Immich person IDs that also receive unassigned photos |
| `MAX_UPLOAD_MB` | `10` | Max selfie upload size |
| `SEARCH_SESSION_MINUTES` | `30` | Search session lifetime |
| `BACKEND_PORT` | `8000` | Backend port |
| `FRONTEND_PORT` | `3000` | Frontend port |

See `.env.example` and `deploy/` for a full server-migration runbook.

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check → `{"status": "ok"}` |
| `POST` | `/api/search` | Selfie upload (multipart `photo`) → match + session + photos |
| `POST` | `/api/search/name` | Name lookup (`{"name": "…"}`) → session + photos |
| `GET` | `/api/people` | Named people in Immich (`id`, `name`) |
| `GET` | `/api/unassigned` | Photos with no named face (counts + list) |
| `GET` | `/api/results/{session}/photos/{id}/thumbnail` | Session-gated thumbnail |
| `GET` | `/api/results/{session}/photos/{id}/preview` | Session-gated medium preview |
| `GET` | `/api/results/{session}/photos/{id}` | Session-gated full photo |
| `GET` | `/api/results/{session}/photos/{id}/download` | Session-gated download (attachment) |
| `GET` | `/api/results/{session}/download-all` | Session-gated zip of originals (capped at 300) |
| `GET` | `/api/unassigned/photos/{id}/thumbnail` | Unassigned-photo thumbnail |

Every photo route except `/api/unassigned/*` requires a valid, unexpired
session that contains that photo ID; otherwise it returns `403`.

## Development

```bash
# Backend (needs reachable Immich server/DB for real searches)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (Vite proxies /api to localhost:8000)
cd frontend
npm install
npm run dev     # start dev server
npm run build   # typecheck (tsc) + production build
```

## Deployment notes

- `docker-compose.yml` runs backend + frontend; both join the external
  `immich_default` network.
- Serve behind HTTPS in production — mobile cameras (`getUserMedia`) and
  the Web Share API only work in secure contexts.
- Any reverse proxy works (Nginx/Caddy/Cloudflare Tunnel); proxy `/` to the
  frontend container and let it forward `/api/*` to the backend.
- `deploy/` contains a tested runbook for moving Immich + this app to a
  private server (database dump/restore, library transfer, ARM notes).

## Privacy and security

- **Sessions, not accounts:** each search mints a random session valid for
  `SEARCH_SESSION_MINUTES`; photo URLs are useless without it and expire.
- **Selfies are transient:** uploads are processed in memory and never
  written to disk or the database.
- **Secrets stay server-side:** the Immich API key and DB password exist
  only as backend environment variables. Never commit real `.env` files —
  they are gitignored; copy `.env.example` instead.
- **Biometric data:** face embeddings live inside your own Immich database,
  which this app only reads. Nothing is sent to third-party recognition
  services.
- **Review before publishing:** never commit database dumps (`*.sql`),
  exports, API keys, or real guest photos. Rotate any credential that has
  ever appeared in a file you might commit.
- **Known exposure surface:** `/api/unassigned` and `/api/people` require
  no session. Put the deployment behind a private link and consider
  restricting these endpoints if your threat model needs it.

## Current limitations

- Matches exactly one face per selfie; group selfies resolve to the most
  confident face only.
- Accuracy depends on lighting, angle, and face size; side profiles and
  heavy filters match poorly.
- Requires a running Immich instance with completed face recognition —
  this project does not do recognition itself.
- iOS bulk saving is bounded by share-sheet/memory limits (full-quality in
  small batches, phone-sized previews in larger ones); very large galleries
  should use the zip download.
- No built-in authentication on the app itself; privacy rests on
  unguessable session IDs plus link distribution.
- The backend holds sessions in process memory (single replica).

## Future improvements

- Multi-face selfies (match every detected face, let the guest pick)
- Adjustable per-search strictness control in the UI
- Optional lightweight password/PIN gate in front of search
- Persistent session store (Redis) for multi-replica deployments
- Selectable photo subsets for sharing/downloading
- Automated end-to-end tests around the search pipeline

## License

MIT — see [LICENSE](LICENSE).
