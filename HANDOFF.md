# VibeShift — Full Project Handoff Document
**Date:** 2026-05-11  
**Author:** Claude Sonnet 4.6 (session summary for continuation)  
**Project path:** `C:\Users\Insiya Fakhruddin\Desktop\fyp_project`

---

## 1. Project Overview

**VibeShift** is a Final Year Project (FYP) — a mobile music AI app built with:
- **Frontend:** React Native (Expo) — `frontend/VibeShift/`
- **Backend:** FastAPI (Python) — `backend/`
- **Database:** SQLite via SQLModel + SQLAlchemy
- **Storage:** AWS S3
- **Auth:** Clerk (JWT tokens via `@clerk/clerk-expo`)
- **AI Models:** Replicate (Demucs for stem separation, MusicGen for genre transform)
- **Local DSP:** NumPy + SoundFile + librosa (pitch shift, timbre change, mixing)

The app has two main AI features:
1. **Demix Studio** — upload a song → AI separates into stems (vocals, drums, bass, other) → DJ mixer to edit each stem → export final mix
2. **Genre Transform** — upload a song → select target genre → AI transforms it (Demucs + MusicGen via Replicate)

---

## 2. Repository Structure

```
fyp_project/
├── backend/
│   ├── main.py                    # FastAPI app entry, includes all routers
│   ├── database.py                # SQLModel models: User, DemixJob, Stem, DemixMix, TransformJob
│   ├── auth.py                    # Clerk JWT verification, get_current_user dependency
│   ├── storage.py                 # AWS S3 upload/download/presigned URL helpers
│   ├── replicate_client.py        # Calls Replicate API (Demucs, MusicGen)
│   └── routers/
│       ├── demixer.py             # All /demixer/* endpoints
│       └── transform.py           # All /transform/* endpoints
│   └── modules/
│       └── demixer/
│           └── editor.py          # load_audio(), pitch_shift_audio(), change_timbre_simple()
├── frontend/VibeShift/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── demixing.tsx       # MAIN: DJ mixer screen (FULLY REWRITTEN)
│   │   │   └── genre-transform.tsx # MAIN: Genre transform screen (FULLY REWRITTEN)
│   │   ├── demixing.tsx           # Old non-tab copy (ignore — tabs version is active)
│   │   └── genre-transform.tsx    # Old non-tab copy (ignore — tabs version is active)
│   ├── components/
│   │   ├── DJChannelStrip.tsx     # NEW: DJ mixer channel strip (LED meter, fader, pitch)
│   │   ├── StemRing.tsx           # OLD: concentric ring UI (no longer used in demixing)
│   │   ├── StemMixer.tsx          # OLD: ring container (no longer used in demixing)
│   │   ├── GenreBubble.tsx        # Genre selection bubble component
│   │   ├── SongCard.tsx           # Card for previous songs list
│   │   ├── UploadButton.tsx       # File picker (expo-document-picker v14)
│   │   ├── GradientText.tsx       # Gradient text component
│   │   └── Icon.tsx               # Lucide icons wrapper
│   ├── context/
│   │   ├── AppearanceContext.tsx  # Theme system: useAppTheme(), hexToRgba()
│   │   └── UserContext.tsx        # useProfile() — user name, export_format etc.
│   └── constants/
│       └── theme.ts               # Theme.primary, Theme.secondary, Theme.accent
```

---

## 3. Backend API Endpoints (Complete Reference)

### Auth
All endpoints require `Authorization: Bearer <clerk_jwt_token>` header.  
Token obtained via `useAuth().getToken()` from `@clerk/clerk-expo`.

### Demixer Routes (`/demixer/*`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/demixer/jobs` | Upload audio, start Demucs stem separation. Returns `{job_id, status, song_name}` |
| GET | `/demixer/jobs/{job_id}` | Poll job status + get stems. Returns `{id, status, song_name, stems[], latest_mix_url}` |
| PUT | `/demixer/stems/{stem_id}` | Update stem settings. Body: `{pitch_shift, timbre_strength, volume, is_muted}` |
| POST | `/demixer/jobs/{job_id}/mix` | Start mix build with current stem settings. Returns `{mix_id, status: "processing"}` |
| GET | `/demixer/mixes/{mix_id}` | Poll specific mix. Returns `{mix_id, ready, failed, url}` |

**Important backend behavior:**
- `POST /demixer/jobs/{id}/mix` creates a `DemixMix` record with `output_s3_key = "pending"` then runs `_run_mix` as a FastAPI BackgroundTask
- `GET /demixer/jobs/{id}` returns `latest_mix_url = null` when mix is pending (correctly handles the "pending" string)
- If `_run_mix` FAILS, the `DemixMix` record is DELETED (not marked failed). So `GET /demixer/mixes/{mix_id}` returns `{failed: true}` since the record is gone
- No DELETE endpoint for stems — use `PUT /demixer/stems/{id}` with `{is_muted: true}` to exclude from mix

**Stem object schema** (from `GET /demixer/jobs/{id}`):
```json
{
  "id": "uuid",
  "stem_type": "vocals|drums|bass|other|no_vocals",
  "pitch_shift": 0.0,
  "timbre_strength": 1.0,
  "volume": 1.0,
  "is_muted": false,
  "download_url": "https://s3.amazonaws.com/..."
}
```

### Transform Routes (`/transform/*`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/transform/jobs` | Upload audio + parameters, start transform. Returns `{job_id, status}` |
| GET | `/transform/jobs/{job_id}` | Poll status. Returns `{id, status, download_url, error_message}` |

**Transform parameters** (all sent as multipart FormData):
| Parameter | Type | Default | Range |
|-----------|------|---------|-------|
| `audio_file` | File | required | any audio |
| `target_genre` | string | required | `blues`, `classical`, `country`, `disco`, `hiphop`, `jazz`, `metal`, `pop`, `reggae`, `rock` |
| `duration` | float | 10.0 | 1–60 seconds |
| `start_offset` | float | 5.0 | 0–120 seconds |
| `guidance` | float | 9.5 | 1–20 |
| `vocal_mix` | float | 1.5 | 0–3 |
| `instr_mix` | float | 1.0 | 0–3 |

### Library Route
| Method | Path | Description |
|--------|------|-------------|
| GET | `/library` | Returns `{items: [{id, type, status, song_name, created_at}]}` — type is `"demix"` or `"transform"` |

---

## 4. Frontend: Demix Studio (`app/(tabs)/demixing.tsx`)

### What was built
The demixing screen was COMPLETELY REWRITTEN from concentric ring UI to a **DJ mixer layout**:
- Horizontal scrollable channel strips (one per stem)
- Each channel: LED meter, volume fader (drag), pitch +/−, mute, play, edit modal
- Bottom bar: shows build progress % while mixing, then playback controls with seekable scrub bar
- Auto-export: any change triggers debounced (700ms) re-export

### Key state and refs
```typescript
// Job state
const [jobId, setJobId]           // current demix job UUID
const [jobStatus, setJobStatus]   // 'idle'|'uploading'|'processing'|'completed'|'failed'
const [isDemixed, setIsDemixed]   // true when stems are available
const [stems, setStems]           // StemItem[]
const stemsRef = useRef<StemItem[]>([])  // always in sync with stems (stale closure fix)

// Mix build state
const [isMixing, setIsMixing]     // UI shows build progress bar
const [mixProgress, setMixProgress] // 0-100 fake progress
const [mixUrl, setMixUrl]         // presigned S3 URL of final mix
const [mixError, setMixError]     // error message if mix failed/timed out
const isMixingRef = useRef(false) // SYNC mutex — prevents duplicate exports
const dirtyRef = useRef(false)    // true if settings changed while export ran
const mixIdRef = useRef<string|null>(null) // current mix_id from POST /mix response

// Poll timers (both use setTimeout, NOT setInterval — avoids request stacking)
const pollRef    // stem separation poll timeout
const mixPollRef // mix build poll timeout
```

### Critical polling pattern (MUST use setTimeout, not setInterval)
```typescript
// CORRECT — self-scheduling: next tick only fires after current fetch completes
const startJobPoll = (id: string) => {
  if (pollRef.current) clearTimeout(pollRef.current);
  const tick = async () => {
    try {
      let token = await getToken();
      if (!token) token = await getToken({ skipCache: true } as any);
      if (!token) { pollRef.current = setTimeout(tick, 8000); return; }
      const res = await fetch(`${API_URL}/demixer/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { pollRef.current = setTimeout(tick, 8000); return; }
      if (!res.ok) { pollRef.current = setTimeout(tick, 8000); return; }
      const data = await res.json();
      if (data.status === 'completed') {
        pollRef.current = null;
        // process stems...
      } else if (data.status === 'failed') {
        pollRef.current = null;
        // show error...
      } else {
        pollRef.current = setTimeout(tick, 8000); // still processing
      }
    } catch (_) { pollRef.current = setTimeout(tick, 8000); }
  };
  pollRef.current = setTimeout(tick, 3000);
};
```

### Mix poll uses specific mix endpoint
```typescript
// After handleExport gets mix_id from POST /mix response:
const startMixPoll = (mixId: string) => {
  // polls GET /demixer/mixes/{mixId} — NOT GET /demixer/jobs/{id}
  // This avoids the "revert to old mix URL" bug when new mix fails
  // data.failed → show error
  // data.ready && data.url → setMixUrl(data.url) — done!
  // 8-minute timeout (long songs take 5-7 min)
};
```

### handleExport — sync mutex + 401 retry
```typescript
const handleExport = async () => {
  if (!jobId) return;
  if (isMixingRef.current) { dirtyRef.current = true; return; } // already running
  isMixingRef.current = true; // SYNC — set before any await
  setIsMixing(true);
  setMixProgress(5);
  setMixError(null);
  try {
    let token = await getToken();
    let res = await fetch(`${API_URL}/demixer/jobs/${jobId}/mix`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      token = await getToken({ skipCache: true } as any);
      if (token) res = await fetch(`${API_URL}/demixer/jobs/${jobId}/mix`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    }
    if (!res.ok) { isMixingRef.current = false; setIsMixing(false); return; }
    const data = await res.json();
    mixIdRef.current = data.mix_id;
    startMixPoll(data.mix_id);
  } catch (_) { isMixingRef.current = false; setIsMixing(false); }
};
```

### Stem settings flow
1. User drags fader / changes pitch / changes timbre  
2. `handleVolumeChange(stemId, v)` → updates local state → calls `scheduleAutoExport(stemId)`
3. `scheduleAutoExport` → `setIsMixing(true)` immediately (instant UI) → debounces 700ms  
4. After 700ms: `handleStemSave(stemId)` → `await PUT /demixer/stems/{id}` → `handleExport()`
5. Mute toggle and delete call `handleExport()` directly (no debounce)

### Delete = mute on backend
```typescript
// No DELETE endpoint — send is_muted: true instead
const handleDeleteStem = async (stemId: string) => {
  setStems(prev => prev.filter(s => s.id !== stemId)); // remove from UI
  if (!stemId.startsWith('local-')) {
    await fetch(`${API_URL}/demixer/stems/${stemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_muted: true }),
    });
    handleExport();
  }
};
```

### StemItem interface
```typescript
interface StemItem {
  id: string;
  name: string;      // 'Vocals', 'Drums', 'Bass', 'Other'
  icon: string;      // emoji
  color: string;     // hex color
  download_url: string | null;
  isMuted: boolean;
  settings: { volume: number; pitch: number; timbre: number }; // volume 0-100, pitch -24 to +24, timbre 0-100
}
```

### mapApiStem (converts backend response)
```typescript
function mapApiStem(s: any, idx: number): StemItem {
  return {
    id: s.id,
    name: STEM_META[s.stem_type]?.name ?? s.stem_type,
    icon: STEM_META[s.stem_type]?.icon ?? '🎵',
    color: STEM_COLORS[s.stem_type] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    download_url: s.download_url ?? null,
    isMuted: s.is_muted ?? false,
    settings: {
      volume: Math.round((s.volume ?? 1.0) * 100),       // backend 0-1 → UI 0-100
      pitch:  s.pitch_shift ?? 0,                         // semitones -24 to +24
      timbre: Math.round(((s.timbre_strength ?? 1.0) - 0.5) * 100), // backend 0.5-1.5 → UI 0-100
    },
  };
}
```

### DJChannelStrip component (`components/DJChannelStrip.tsx`)
Props: `name, icon, color, volume, pitch, timbre, isMuted, isPlaying, hasAudio, onVolumeChange, onPitchChange, onTimbreChange, onMuteToggle, onPlay, onDelete, onSave`

Key internals:
- LED meter: 10 dots, `setInterval(110ms)`, green/yellow/red based on volume + isPlaying + random jitter
- Fader: `PanResponder` with `startVolRef` captured on grant, `gs.dy / trackHeightRef.current * 100` for delta
- Pitch: +/- Pressable buttons
- Edit modal: tap-to-set sliders for all 3 params + Save & Delete buttons

---

## 5. Frontend: Genre Transform (`app/(tabs)/genre-transform.tsx`)

### UI flow (phases)
`idle` → upload file → `genre_select` → select genre + adjust parameters → tap Transform → `processing` → `completed` / `failed`

### Key fixes applied
1. **401 on submit** — `handleTransform` now retries with `skipCache: true` on 401
2. **401 during poll** — `startPoll` uses self-scheduling `setTimeout` + retries 401 inline with fresh token
3. **Stacking requests** — replaced `setInterval` with self-scheduling `setTimeout`
4. **All parameters exposed in UI** — 5 `ParamRow` components with +/− steppers
5. **5-minute timeout** — poll stops after 5 min with error message
6. **No DELETE/reset** — `handleDiscard` properly clears all state and resets params to defaults

### Parameter controls
`ParamRow` component (inline in the file):
- Duration: 1–60 s (default 10)
- Start Offset: 0–120 s (default 5)
- Guidance Scale: 1–20 (default 9.5)
- Vocal Mix: 0–3 (default 1.5)
- Instrument Mix: 0–3 (default 1.0)

---

## 6. Auth Pattern (Clerk)

```typescript
import { useAuth } from '@clerk/clerk-expo';
const { getToken } = useAuth();

// ALWAYS do this — never just getToken() alone:
let token = await getToken();
if (!token) token = await getToken({ skipCache: true } as any);
if (!token) return; // abort — user needs to re-authenticate

// Include in every fetch:
headers: { Authorization: `Bearer ${token}` }

// On 401 response — refresh and retry:
if (res.status === 401) {
  token = await getToken({ skipCache: true } as any);
  if (token) res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}
```

**Why this matters:** In React Native, Clerk tokens expire and `getToken()` can return `null` in background contexts (setInterval callbacks). Sending `Authorization: Bearer null` → 401. The self-scheduling setTimeout pattern + skipCache retry fixes this.

---

## 7. Theme System

```typescript
import { useAppTheme, hexToRgba } from '@/context/AppearanceContext';
const t = useAppTheme();

// t.accent      — primary accent (default: '#9333ea' amethyst purple)
// t.accentAlt   — secondary accent (default: '#ec4899' pink)
// t.text        — primary text color
// t.subtitle    — secondary/muted text
// t.card        — card background
// t.gradient    — gradient array for LinearGradient
// t.background  — page background

hexToRgba('#9333ea', 0.2) // → 'rgba(147,51,234,0.2)'
```

---

## 8. Known Bugs Fixed in This Session

| Bug | Root Cause | Fix Applied |
|-----|------------|-------------|
| 401 cascade during stem separation poll | `setInterval` stacked async callbacks — 6-7 concurrent requests with expired token all fail at once | Replaced with self-scheduling `setTimeout` in `startJobPoll` |
| Mix halts at 5-10% then reverts to old audio | When `_run_mix` fails, DemixMix record deleted → old mix URL returned → poll thinks it's done | New `GET /demixer/mixes/{mix_id}` endpoint; poll now checks specific mix not general `latest_mix_url` |
| 3-minute mix timeout too short | Long songs (3+ min) take 5-10 min to remix | Increased to 8 minutes |
| Genre transform 401 | `startPoll` used `setInterval`, no 401 handling, token never refreshed | Self-scheduling `setTimeout` + skipCache retry on every poll tick |
| Genre transform parameters hardcoded | All 5 params were `String(constant)` | Exposed via `ParamRow` stepper components |
| Mix progress shows "Building" even when isMixingRef=false | `scheduleAutoExport` set `setIsMixing(true)` (React state) but not `isMixingRef.current = true` (sync ref) | `handleExport` now sets `isMixingRef.current = true` before any await; auto-export flow is correct without prematurely locking the ref |

---

## 9. Pending Work

| Item | Status | Notes |
|------|--------|-------|
| Genre transform full API integration | DONE ✓ | Fixed in this session |
| Demixer full API integration + DJ UI | DONE ✓ | Full rewrite done |
| Backend `requirements.txt` | Partially done | Check if `httpx`, `python-dotenv`, `sqlmodel`, `soundfile`, `librosa` are listed |
| StemRing.tsx / StemMixer.tsx cleanup | Not done | These files still exist but are no longer used by demixing.tsx. Safe to delete if not referenced elsewhere |
| `app/demixing.tsx` (non-tab copy) | Not done | Old file exists. Verify tabs routing is used; old file can be deleted |
| `app/genre-transform.tsx` (non-tab copy) | Not done | Old file with no auth code. Safe to delete |
| Library page | Unknown | `/library` endpoint exists; frontend library page status unknown |
| Account settings page | Unknown | `/account-settings` route referenced in demixing.tsx header |
| FYP final report | Required | Per CLAUDE.md: "I want report for my final year project, help me get a properly formatted final report" |

---

## 10. Environment Variables

Frontend (`.env` in `frontend/VibeShift/`):
```
EXPO_PUBLIC_API_URL=http://10.101.13.x:8000   (or your backend IP)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Backend (`.env` in `backend/`):
```
CLERK_SECRET_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
S3_BUCKET_NAME=vibeshift-audio-storage
REPLICATE_API_TOKEN=...
```

---

## 11. How to Run

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend/VibeShift
npm install
npx expo start
```

---

## 12. Git State (as of 2026-05-11)

Branch: `main`  
Last commit: `98b9300` — "Backend and frontend linked along with database"

Files changed in this session (not yet committed):
- `frontend/VibeShift/app/(tabs)/demixing.tsx` — FULL REWRITE (DJ mixer, all fixes)
- `frontend/VibeShift/app/(tabs)/genre-transform.tsx` — FULL REWRITE (auth fix, parameter UI)
- `frontend/VibeShift/components/DJChannelStrip.tsx` — NEW FILE
- `backend/routers/demixer.py` — Added `GET /demixer/mixes/{mix_id}` endpoint

---

## 13. Instructions for Continuing in a New Chat

When starting a new Claude session, paste this document and say:

> "This is a handoff document for my VibeShift FYP project. I want to continue working on it. Please read this document carefully and then help me with [your next task]."

**Suggested next tasks:**
1. Test the demixer end-to-end and fix any remaining issues
2. Write the FYP final report (per CLAUDE.md requirement)
3. Clean up dead files (old non-tab versions of genre-transform and demixing, StemRing, StemMixer)
4. Implement the library page if not done
5. Deploy to AWS (infrastructure was set up per git history)

---

*Generated by Claude Sonnet 4.6 — VibeShift FYP Project*