# API Testing Guide — VibeShift

The VibeShift backend is a FastAPI app running on port `8001`. All endpoints (except `/auth/sync`) require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

---

## Running the Backend Locally

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Interactive API docs (Swagger UI): `http://localhost:8001/docs`

---

## Getting a Token for Testing

1. Open the VibeShift app and log in
2. In your backend console you will see requests with the Bearer token in the Authorization header
3. Copy that token — it's valid for ~60 minutes

Or use the Clerk Dashboard → Users → click user → "Sessions" to generate a short-lived token.

---

## Endpoints

### Auth Sync (called automatically on login)

```bash
curl -X POST http://localhost:8001/auth/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: `{"synced": true, "user_id": "..."}`

---

### User Profile

**Get profile:**
```bash
curl http://localhost:8001/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update profile:**
```bash
curl -X PATCH http://localhost:8001/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Insiya", "bio": "Music lover", "audio_quality": "high", "export_format": "wav"}'
```

---

### Genre Transform

**List available genres:**
```bash
curl http://localhost:8001/transform/genres \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: list of 10 genres (blues, classical, country, disco, hiphop, jazz, metal, pop, reggae, rock)

**Start a transform job:**
```bash
curl -X POST http://localhost:8001/transform/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio_file=@path/to/song.mp3" \
  -F "target_genre=rock" \
  -F "duration=10" \
  -F "start_offset=5" \
  -F "guidance=9.5" \
  -F "vocal_mix=1.5" \
  -F "instr_mix=1.0"
```

Expected: `{"job_id": "...", "status": "pending", "target_genre": "rock"}`

**Poll job status:**
```bash
curl http://localhost:8001/transform/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Status values: `pending` → `processing` → `completed` / `failed`

When `completed`, the response includes:
- `download_url` — pre-signed S3 URL for the output WAV
- `original_url` — pre-signed S3 URL for the original uploaded file
- `song_name`, `target_genre`, `prompt_used`

**Delete a job:**
```bash
curl -X DELETE http://localhost:8001/transform/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Stem Demixing

**Start a demix job:**
```bash
curl -X POST http://localhost:8001/demixer/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio_file=@path/to/song.mp3"
```

Expected: `{"job_id": "...", "status": "pending"}`

**Poll job status:**
```bash
curl http://localhost:8001/demixer/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

When `completed`, the response includes:
- `stems` — object with `vocals`, `drums`, `bass`, `other` pre-signed S3 URLs
- `original_url` — the uploaded file URL
- `song_name`

**Delete a job:**
```bash
curl -X DELETE http://localhost:8001/demixer/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Library

**Get all jobs for current user (demix + transform combined):**
```bash
curl http://localhost:8001/library \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: `{"items": [...]}` — each item has `id`, `type` (demix/transform), `song_name`, `status`, `created_at`, `target_genre` (transform only).

---

## Testing with Postman

1. Create a new Collection: **VibeShift**
2. Set a Collection Variable: `base_url = http://localhost:8001`
3. Set a Collection Header: `Authorization: Bearer {{token}}`
4. Add requests for each endpoint above

### Form-data fields for transform job (Postman)

| Key | Type | Value |
|-----|------|-------|
| `audio_file` | File | select MP3/WAV |
| `target_genre` | Text | `jazz` |
| `duration` | Text | `10` |
| `start_offset` | Text | `5` |
| `guidance` | Text | `9.5` |
| `vocal_mix` | Text | `1.5` |
| `instr_mix` | Text | `1.0` |

---

## Parameter Reference

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `duration` | 10.0 | 1–60s | Length of audio to transform |
| `start_offset` | 5.0 | 0–song length | Start position in seconds (skip intro) |
| `guidance` | 9.5 | 1–15 | MusicGen guidance scale (higher = closer to prompt) |
| `vocal_mix` | 1.5 | 0–3 | Vocal volume in final mix |
| `instr_mix` | 1.0 | 0–3 | Instrumental volume in final mix |

---

## Common Errors

| Status | Message | Fix |
|--------|---------|-----|
| 401 | `Not authenticated` | Token expired — get a new one from the app |
| 404 | `Job not found` | Wrong job ID or it belongs to another user |
| 400 | `Duration must be 1–60 seconds` | Keep duration in valid range |
| 500 | Check `error_message` in job response | Replicate API failure — retry or check Replicate dashboard |

---

## Monitoring Logs

```bash
# Watch backend logs while making requests
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Or if running in Docker
docker logs -f vibeshift-backend
```

You will see per-stage logs for transform jobs:
```
[Transform abc12345] START genre=rock duration=10s
[Transform abc12345] Stage 1: preparing audio URL
[Transform abc12345] Stage 2: Demucs on Replicate...
[Transform abc12345] Stage 2 done — stems: ['vocals', 'drums', 'bass', 'other']
[Transform abc12345] Stage 3: MusicGen (10s, guidance=9.5)...
[Transform abc12345] Stage 4: vocal FX
[Transform abc12345] Stage 5: tempo matching
[Transform abc12345] Stage 6: mixing and uploading
[Transform abc12345] DONE
```
