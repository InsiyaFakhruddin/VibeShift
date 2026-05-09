from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ── page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin   = Cm(3)
    section.right_margin  = Cm(2.5)

# ── helpers ───────────────────────────────────────────────────────────────────
PURPLE = RGBColor(0x7C, 0x3A, 0xED)
DARK   = RGBColor(0x1E, 0x1B, 0x4B)
GREY   = RGBColor(0x6B, 0x72, 0x80)

def heading1(text):
    p = doc.add_heading(text, level=1)
    p.runs[0].font.color.rgb = PURPLE
    p.runs[0].font.size = Pt(16)
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after  = Pt(6)

def heading2(text):
    p = doc.add_heading(text, level=2)
    p.runs[0].font.color.rgb = DARK
    p.runs[0].font.size = Pt(13)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(4)

def heading3(text):
    p = doc.add_heading(text, level=3)
    p.runs[0].font.color.rgb = PURPLE
    p.runs[0].font.size = Pt(11)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after  = Pt(2)

def body(text, bold=False, italic=False, color=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(11)
    run.bold   = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    p.paragraph_format.space_after = Pt(4)
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(text, style='List Bullet')
    p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
    p.paragraph_format.space_after = Pt(2)
    for run in p.runs:
        run.font.size = Pt(10.5)

def code_block(lines):
    """Grey-background monospace paragraph for code."""
    for line in lines:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent  = Inches(0.3)
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after  = Pt(1)
        run = p.add_run(line)
        run.font.name = 'Courier New'
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
        # light grey background via xml shading
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), 'F3F4F6')
        pPr.append(shd)

def simple_table(headers, rows, col_widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    # header row
    hrow = table.rows[0]
    for i, h in enumerate(headers):
        cell = hrow.cells[i]
        cell.text = h
        run = cell.paragraphs[0].runs[0]
        run.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        # purple background
        tcPr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '7C3AED')
        tcPr.append(shd)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    # data rows
    for r_idx, row_data in enumerate(rows):
        row = table.add_row()
        fill = 'FFFFFF' if r_idx % 2 == 0 else 'F5F3FF'
        for i, val in enumerate(row_data):
            cell = row.cells[i]
            cell.text = str(val)
            run = cell.paragraphs[0].runs[0]
            run.font.size = Pt(9.5)
            tcPr = cell._tc.get_or_add_tcPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'), fill)
            tcPr.append(shd)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Inches(w)
    doc.add_paragraph()
    return table

# ══════════════════════════════════════════════════════════════════════════════
# TITLE PAGE
# ══════════════════════════════════════════════════════════════════════════════
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.paragraph_format.space_before = Pt(60)
run = title.add_run('VibeShift')
run.bold = True
run.font.size = Pt(36)
run.font.color.rgb = PURPLE

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
run2 = sub.add_run('Database Architecture & REST API — Technical Reference')
run2.font.size = Pt(16)
run2.font.color.rgb = DARK

doc.add_paragraph()
byline = doc.add_paragraph()
byline.alignment = WD_ALIGN_PARAGRAPH.CENTER
byline.add_run('Final Year Project  ·  Backend Documentation').font.color.rgb = GREY

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 1. SYSTEM OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════
heading1('1. System Overview')
body(
    'VibeShift is a cloud-based music transformation platform that lets users '
    'separate audio tracks into individual stems (vocals, drums, bass, other) '
    'and re-style entire songs into different musical genres. The backend is '
    'built with FastAPI (Python), persists data in SQLite/PostgreSQL via SQLModel '
    '(a Pydantic+SQLAlchemy hybrid), stores audio files in AWS S3, and offloads '
    'heavy ML inference to a Google Colab notebook exposed over an ngrok tunnel.'
)

heading2('1.1 Technology Stack')
simple_table(
    ['Layer', 'Technology', 'Purpose'],
    [
        ['API Server',    'FastAPI 0.104 + Uvicorn',       'Async REST API, background task scheduling'],
        ['ORM / DB',      'SQLModel 0.0.19 + SQLite',      'Type-safe DB models, automatic migrations'],
        ['Authentication','Clerk (RS256 JWT / JWKS)',       'Passwordless auth, token verification'],
        ['File Storage',  'AWS S3 (boto3)',                 'Audio upload / presigned-URL download'],
        ['ML Back-end',   'Colab + ngrok (httpx)',          'Demucs stem separation, MusicGen transform'],
        ['HTTP Client',   'httpx (async)',                  'Calling ML API from background tasks'],
        ['Frontend',      'React Native / Expo 54',         'iOS & Android mobile app'],
    ],
    col_widths=[1.4, 2.1, 2.9]
)

# ══════════════════════════════════════════════════════════════════════════════
# 2. DATABASE SCHEMA
# ══════════════════════════════════════════════════════════════════════════════
heading1('2. Database Schema')
body(
    'The application uses five tables managed by SQLModel. All primary keys are '
    'UUIDs generated server-side. Timestamps default to UTC. The SQLite file '
    'path is configurable via the DATABASE_URL environment variable; swapping '
    'in a PostgreSQL connection string requires no code changes.'
)

# 2.1 users
heading2('2.1  users')
body('Stores one row per registered user, keyed by Clerk\'s user ID.')
simple_table(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
        ['id',              'VARCHAR(UUID)',  'PK',                       'Internal UUID primary key'],
        ['clerk_user_id',   'VARCHAR',        'UNIQUE, INDEX, NOT NULL',  'Clerk sub claim — stable across sessions'],
        ['name',            'VARCHAR',        'NULLABLE',                 'Display name set by user'],
        ['email',           'VARCHAR',        'UNIQUE, INDEX, NOT NULL',  'Email from Clerk'],
        ['bio',             'VARCHAR',        'NULLABLE',                 'Short user bio (profile page)'],
        ['avatar_url',      'VARCHAR',        'NULLABLE',                 'Base-64 data-URI of profile photo'],
        ['audio_quality',   'VARCHAR',        'DEFAULT "high"',           'low | standard | high'],
        ['export_format',   'VARCHAR',        'DEFAULT "wav"',            'mp3 | wav | flac'],
        ['created_at',      'DATETIME',       'DEFAULT utcnow()',         'Account creation timestamp'],
        ['updated_at',      'DATETIME',       'DEFAULT utcnow()',         'Last profile update timestamp'],
    ],
    col_widths=[1.4, 1.2, 1.5, 2.3]
)

# 2.2 demix_jobs
heading2('2.2  demix_jobs')
body('Tracks the lifecycle of a stem-separation job from upload to completion.')
simple_table(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
        ['id',                'VARCHAR(UUID)', 'PK',                   'Job UUID'],
        ['user_id',           'VARCHAR(UUID)', 'FK → users.id, INDEX', 'Owning user'],
        ['original_file_name','VARCHAR',       'NOT NULL',             'Original filename from upload'],
        ['original_s3_key',   'VARCHAR',       'NOT NULL',             'S3 object key for raw audio'],
        ['song_name',         'VARCHAR',       'NOT NULL',             'Derived from filename (sans extension)'],
        ['duration_seconds',  'FLOAT',         'NULLABLE',             'Audio length returned by ML API'],
        ['status',            'VARCHAR',       'DEFAULT "pending"',    'pending | processing | completed | failed'],
        ['error_message',     'VARCHAR',       'NULLABLE',             'Failure reason if status=failed'],
        ['created_at',        'DATETIME',      'DEFAULT utcnow()',     'Job submission time'],
        ['updated_at',        'DATETIME',      'DEFAULT utcnow()',     'Last status-change time'],
    ],
    col_widths=[1.5, 1.2, 1.4, 2.3]
)

# 2.3 stems
heading2('2.3  stems')
body('One row per audio stem within a demix job. Stores per-stem edit parameters used when mixing.')
simple_table(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
        ['id',               'VARCHAR(UUID)', 'PK',                      'Stem UUID'],
        ['job_id',           'VARCHAR(UUID)', 'FK → demix_jobs.id, INDEX','Parent demix job'],
        ['stem_type',        'VARCHAR',       'NOT NULL',                 'vocals | drums | bass | other | custom_*'],
        ['original_s3_key',  'VARCHAR',       'NOT NULL',                 'S3 key of raw stem from Demucs'],
        ['modified_s3_key',  'VARCHAR',       'NULLABLE',                 'S3 key after ML applies pitch/timbre FX'],
        ['pitch_shift',      'FLOAT',         'DEFAULT 0.0',              'Semitone offset (−12 to +12)'],
        ['timbre_strength',  'FLOAT',         'DEFAULT 1.0',              'Timbre blend strength (0.0 – 1.0)'],
        ['volume',           'FLOAT',         'DEFAULT 1.0',              'Linear volume multiplier'],
        ['is_muted',         'BOOLEAN',       'DEFAULT False',            'Exclude stem from mix when True'],
        ['created_at',       'DATETIME',      'DEFAULT utcnow()',         ''],
        ['updated_at',       'DATETIME',      'DEFAULT utcnow()',         ''],
    ],
    col_widths=[1.5, 1.2, 1.4, 2.3]
)

# 2.4 demix_mixes
heading2('2.4  demix_mixes')
body('Records each mix export. A user may re-mix the same job multiple times with different stem settings.')
simple_table(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
        ['id',           'VARCHAR(UUID)', 'PK',                      'Mix UUID'],
        ['job_id',       'VARCHAR(UUID)', 'FK → demix_jobs.id, INDEX','Parent demix job'],
        ['output_s3_key','VARCHAR',       'NOT NULL',                 'S3 key of the rendered mix file'],
        ['created_at',   'DATETIME',      'DEFAULT utcnow()',         'Time mix was created'],
    ],
    col_widths=[1.5, 1.2, 1.5, 2.2]
)

# 2.5 transform_jobs
heading2('2.5  transform_jobs')
body('Tracks genre-transformation requests from submission through ML processing to final output.')
simple_table(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
        ['id',                'VARCHAR(UUID)', 'PK',                    'Transform job UUID'],
        ['user_id',           'VARCHAR(UUID)', 'FK → users.id, INDEX',  'Owning user'],
        ['original_file_name','VARCHAR',       'NOT NULL',              'Original upload filename'],
        ['original_s3_key',   'VARCHAR',       'NOT NULL',              'S3 key of input audio'],
        ['target_genre',      'VARCHAR',       'NOT NULL',              'Preset name or freeform prompt'],
        ['prompt_used',       'VARCHAR',       'NULLABLE',              'Resolved prompt sent to MusicGen'],
        ['output_s3_key',     'VARCHAR',       'NULLABLE',              'S3 key of transformed output'],
        ['duration',          'FLOAT',         'DEFAULT 10.0',          'Audio clip length to transform (secs)'],
        ['start_offset',      'FLOAT',         'DEFAULT 5.0',           'Start position in input audio (secs)'],
        ['guidance',          'FLOAT',         'DEFAULT 9.5',           'MusicGen classifier-free guidance scale'],
        ['vocal_mix',         'FLOAT',         'DEFAULT 1.5',           'Vocal loudness in final mix'],
        ['instr_mix',         'FLOAT',         'DEFAULT 1.0',           'Instrumental loudness in final mix'],
        ['status',            'VARCHAR',       'DEFAULT "pending"',     'pending | processing | completed | failed'],
        ['error_message',     'VARCHAR',       'NULLABLE',              'Failure reason'],
        ['created_at',        'DATETIME',      'DEFAULT utcnow()',      ''],
        ['updated_at',        'DATETIME',      'DEFAULT utcnow()',      ''],
    ],
    col_widths=[1.5, 1.2, 1.4, 2.3]
)

heading2('2.6  Entity Relationship Summary')
body(
    'users 1──* demix_jobs 1──* stems\n'
    'demix_jobs 1──* demix_mixes\n'
    'users 1──* transform_jobs'
)

# ══════════════════════════════════════════════════════════════════════════════
# 3. AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════
doc.add_page_break()
heading1('3. Authentication')
body(
    'All protected endpoints require an HTTP Authorization header containing a '
    'Bearer token issued by Clerk. The backend verifies this token locally '
    'using Clerk\'s public JWKS endpoint — no secret-key round-trip is needed '
    'after key caching.'
)

heading2('3.1  JWT Verification Flow')
code_block([
    '# /backend/auth.py (simplified)',
    'import jwt',
    '',
    'jwks_client = jwt.PyJWKClient(CLERK_JWKS_URL, cache_keys=True)',
    '',
    'def get_clerk_user_id(credentials: HTTPAuthorizationCredentials) -> str:',
    '    token   = credentials.credentials',
    '    signing_key = jwks_client.get_signing_key_from_jwt(token)',
    '    payload = jwt.decode(token, signing_key.key, algorithms=["RS256"])',
    '    return payload["sub"]   # Clerk\'s stable user ID',
])
bullet('Algorithm: RS256 (asymmetric — Clerk signs with private key, backend verifies with public JWKS)')
bullet('Key caching: Enabled — JWKS keys are fetched once and reused until expiry, reducing latency')
bullet('On failure: HTTPException(401, "Invalid or expired token")')

heading2('3.2  User Resolution Dependency')
code_block([
    'def get_current_user(clerk_id = Depends(get_clerk_user_id),',
    '                     session  = Depends(get_session)) -> User:',
    '    user = session.exec(select(User).where(User.clerk_user_id == clerk_id)).first()',
    '    if not user:',
    '        raise HTTPException(404, "User not found — call /auth/sync first")',
    '    return user',
])

# ══════════════════════════════════════════════════════════════════════════════
# 4. API REFERENCE
# ══════════════════════════════════════════════════════════════════════════════
heading1('4. REST API Reference')
body(
    'Base URL (development):  http://localhost:8000\n'
    'Base URL (production):   https://<ec2-or-domain>/\n'
    'All responses are JSON. All times are ISO 8601 UTC.'
)

# ── 4.1 Auth ──────────────────────────────────────────────────────────────────
heading2('4.1  Authentication — POST /auth/sync')
body(
    'Called by the mobile app immediately after a successful Clerk sign-in. '
    'Creates a new user row on first login; updates name/avatar on subsequent '
    'calls. Returns the full user profile.'
)
heading3('Request')
code_block([
    'POST /auth/sync',
    'Authorization: Bearer <clerk_jwt>',
    'Content-Type: application/json',
    '',
    '{',
    '  "email":      "insiya@example.com",',
    '  "name":       "Insiya",',
    '  "avatar_url": "data:image/png;base64,iVBORw0KGgo..."',
    '}',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "id":             "3fa85f64-5717-4562-b3fc-2c963f66afa6",',
    '  "clerk_user_id":  "user_2xAbCdEfGhIjKlMnOp",',
    '  "email":          "insiya@example.com",',
    '  "name":           "Insiya",',
    '  "bio":            null,',
    '  "avatar_url":     "data:image/png;base64,...",',
    '  "audio_quality":  "high",',
    '  "export_format":  "wav",',
    '  "created_at":     "2024-11-01T08:00:00Z",',
    '  "updated_at":     "2024-11-01T08:00:00Z"',
    '}',
])

# ── 4.2 User ──────────────────────────────────────────────────────────────────
heading2('4.2  User Profile')

heading3('GET /users/me')
body('Returns the authenticated user\'s profile augmented with aggregated statistics.')
code_block([
    'GET /users/me',
    'Authorization: Bearer <clerk_jwt>',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "id":              "3fa85f64-...",',
    '  "name":            "Insiya",',
    '  "email":           "insiya@example.com",',
    '  "bio":             "Loves lo-fi beats",',
    '  "audio_quality":   "high",',
    '  "export_format":   "wav",',
    '  "tracks_demixed":  7,',
    '  "genres_changed":  3,',
    '  "created_at":      "2024-11-01T08:00:00Z",',
    '  "updated_at":      "2024-11-02T14:30:00Z"',
    '}',
])

heading3('PUT /users/me')
body('Partial update — omit any field you do not want to change.')
code_block([
    'PUT /users/me',
    'Authorization: Bearer <clerk_jwt>',
    'Content-Type: application/json',
    '',
    '{',
    '  "name":           "Insiya F.",',
    '  "bio":            "FYP developer",',
    '  "audio_quality":  "standard",',
    '  "export_format":  "mp3"',
    '}',
])

# ── 4.3 Demixer ──────────────────────────────────────────────────────────────
heading2('4.3  Demixer — Stem Separation')

heading3('POST /demixer/jobs  —  Upload & start job')
body(
    'Accepts multipart audio upload. Saves the file to S3, creates a DemixJob '
    'record, and schedules a background task that calls the Colab ML API. '
    'Returns immediately with the job ID — the client must poll to track progress.'
)
code_block([
    'POST /demixer/jobs',
    'Authorization: Bearer <clerk_jwt>',
    'Content-Type: multipart/form-data',
    '',
    'audio_file=<binary WAV or MP3>',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "job_id":    "b1c2d3e4-...",',
    '  "status":    "pending",',
    '  "song_name": "my_track"',
    '}',
])

heading3('GET /demixer/jobs/{job_id}  —  Poll status & stems')
body('Returns job status and, once completed, per-stem download URLs and the latest mix URL.')
code_block([
    'GET /demixer/jobs/b1c2d3e4-...',
    'Authorization: Bearer <clerk_jwt>',
])
heading3('Response  200 OK  (completed)')
code_block([
    '{',
    '  "id":       "b1c2d3e4-...",',
    '  "status":   "completed",',
    '  "song_name": "my_track",',
    '  "stems": [',
    '    {',
    '      "id":               "a1b2c3d4-...",',
    '      "stem_type":        "vocals",',
    '      "pitch_shift":      0.0,',
    '      "timbre_strength":  1.0,',
    '      "volume":           1.0,',
    '      "is_muted":         false,',
    '      "download_url":     "https://s3.amazonaws.com/...?X-Amz-Expires=3600"',
    '    },',
    '    { "stem_type": "drums",  ... },',
    '    { "stem_type": "bass",   ... },',
    '    { "stem_type": "other",  ... }',
    '  ],',
    '  "latest_mix_url": "https://s3.amazonaws.com/mixes/b1c2.../final_mix.wav?..."',
    '}',
])

heading3('PUT /demixer/stems/{stem_id}  —  Edit stem parameters')
body('Updates edit settings (stored in DB only — does not re-process audio). Changes take effect at the next /mix call.')
code_block([
    'PUT /demixer/stems/a1b2c3d4-...',
    'Authorization: Bearer <clerk_jwt>',
    'Content-Type: application/json',
    '',
    '{',
    '  "pitch_shift":     2.5,',
    '  "timbre_strength": 0.8,',
    '  "volume":          1.2,',
    '  "is_muted":        false',
    '}',
])

heading3('POST /demixer/jobs/{job_id}/mix  —  Render final mix')
body('Triggers background mixing of all stems using their current parameters. Creates a DemixMix record.')
code_block([
    'POST /demixer/jobs/b1c2d3e4-.../mix',
    'Authorization: Bearer <clerk_jwt>',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "mix_id": "f9e8d7c6-...",',
    '  "status": "processing"',
    '}',
])

# ── 4.4 Transform ──────────────────────────────────────────────────────────────
heading2('4.4  Genre Transform')

heading3('GET /transform/genres  —  Available genre presets')
body('Public endpoint — no authentication required.')
code_block([
    '{',
    '  "available_genres": ["blues","classical","country","disco",',
    '                        "hiphop","jazz","metal","pop","reggae","rock"],',
    '  "presets": {',
    '    "pop":   "pop music, catchy melody, synth, upbeat, radio-friendly production",',
    '    "rock":  "rock music, electric guitar, live drums, bass, energetic, band performance",',
    '    "jazz":  "jazz music, improvised saxophone, swing rhythm, piano chords, double bass",',
    '    "..."',
    '  }',
    '}',
])

heading3('POST /transform/jobs  —  Upload & start transformation')
body(
    'Accepts an audio file and a target genre. Optional parameters let the client '
    'fine-tune how long a clip is transformed, where to start, and how the vocal '
    'and instrumental are blended in the output. A freeform text string may be '
    'supplied as target_genre to use a custom prompt instead of a preset.'
)
code_block([
    'POST /transform/jobs',
    'Authorization: Bearer <clerk_jwt>',
    'Content-Type: multipart/form-data',
    '',
    'audio_file=<binary>',
    'target_genre=jazz',
    'duration=12',
    'start_offset=8',
    'guidance=9.5',
    'vocal_mix=1.5',
    'instr_mix=1.0',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "job_id":       "c4d5e6f7-...",',
    '  "status":       "pending",',
    '  "target_genre": "jazz"',
    '}',
])

heading3('GET /transform/jobs/{job_id}  —  Poll status')
code_block([
    '{',
    '  "id":           "c4d5e6f7-...",',
    '  "status":       "completed",',
    '  "target_genre": "jazz",',
    '  "prompt_used":  "jazz music, improvised saxophone, swing rhythm, ...",',
    '  "download_url": "https://s3.amazonaws.com/transforms/c4d5.../output.wav?...",',
    '  "created_at":   "2024-11-10T10:00:00Z"',
    '}',
])

# ── 4.5 Library ──────────────────────────────────────────────────────────────
heading2('4.5  Library — GET /library')
body('Returns all demix and transform jobs for the authenticated user, sorted by creation date descending. Powers the Library tab in the app.')
code_block([
    'GET /library',
    'Authorization: Bearer <clerk_jwt>',
])
heading3('Response  200 OK')
code_block([
    '{',
    '  "items": [',
    '    {',
    '      "id":                "b1c2d3e4-...",',
    '      "type":              "demix",',
    '      "song_name":         "my_track",',
    '      "original_file_name":"my_track.mp3",',
    '      "status":            "completed",',
    '      "duration_seconds":  213.4,',
    '      "target_genre":      null,',
    '      "created_at":        "2024-11-10T09:00:00Z"',
    '    },',
    '    {',
    '      "id":                "c4d5e6f7-...",',
    '      "type":              "transform",',
    '      "song_name":         "my_track",',
    '      "original_file_name":"my_track.mp3",',
    '      "status":            "completed",',
    '      "duration_seconds":  null,',
    '      "target_genre":      "jazz",',
    '      "created_at":        "2024-11-10T10:00:00Z"',
    '    }',
    '  ]',
    '}',
])

# ── 4.6 Health ──────────────────────────────────────────────────────────────
heading2('4.6  Health Check — GET /health')
body('Returns server status and whether the ML API URL is configured. Used for deployment monitoring.')
code_block([
    '{ "status": "ok", "ml_api_url": "https://abc123.ngrok.io" }',
])

# ══════════════════════════════════════════════════════════════════════════════
# 5. BACKGROUND TASKS
# ══════════════════════════════════════════════════════════════════════════════
doc.add_page_break()
heading1('5. Background Task Processing')
body(
    'Heavy ML inference is handled outside the request/response cycle via '
    'FastAPI\'s BackgroundTasks. This prevents HTTP timeout errors and lets '
    'the API return immediately with a job ID for polling.'
)

heading2('5.1  _run_separation  (stem separation)')
code_block([
    'async def _run_separation(job_id, s3_key, filename, export_format):',
    '    # 1. Update DB status → "processing"',
    '    # 2. Download raw audio from S3',
    '    async with httpx.AsyncClient(timeout=300) as client:',
    '        resp = await client.post(',
    '            f"{ML_API_URL}/separate",',
    '            files={"audio": (filename, audio_bytes, "audio/wav")},',
    '            data={"job_id": job_id, "export_format": export_format},',
    '        )',
    '    # ML response: {"stems": {"vocals": "s3_key", "drums": "s3_key", ...}}',
    '    # 3. Create Stem rows in DB for each stem_type',
    '    # 4. Update status → "completed"  (or "failed" with error_message)',
])

heading2('5.2  _run_mix  (stem mixing)')
code_block([
    'async def _run_mix(job_id, mix_id, export_format):',
    '    stems = session.exec(select(Stem).where(Stem.job_id == job_id))',
    '    stems_payload = [',
    '        {"stem_type": s.stem_type, "s3_key": s.original_s3_key,',
    '         "pitch_shift": s.pitch_shift, "timbre_strength": s.timbre_strength,',
    '         "volume": s.volume, "is_muted": s.is_muted}',
    '        for s in stems',
    '    ]',
    '    async with httpx.AsyncClient(timeout=120) as client:',
    '        resp = await client.post(f"{ML_API_URL}/mix", json={...})',
    '    # ML response: {"output_s3_key": "mixes/{job_id}/final_mix.wav"}',
    '    # Update DemixMix.output_s3_key in DB',
])

heading2('5.3  _run_transform  (genre conversion)')
code_block([
    'async def _run_transform(job_id, export_format):',
    '    # 1. Download original audio from S3',
    '    # 2. POST to Colab /transform with all parameters',
    '    async with httpx.AsyncClient(timeout=600) as client:',
    '        resp = await client.post(',
    '            f"{ML_API_URL}/transform",',
    '            files={"audio": (filename, audio_bytes, "audio/wav")},',
    '            data={',
    '                "target_genre": job.target_genre,',
    '                "duration":     str(job.duration),',
    '                "start_offset": str(job.start_offset),',
    '                "guidance":     str(job.guidance),',
    '                "vocal_mix":    str(job.vocal_mix),',
    '                "instr_mix":    str(job.instr_mix),',
    '                "job_id":       job_id,',
    '                "export_format":export_format,',
    '            },',
    '        )',
    '    # ML response: {"output_s3_key": "...", "prompt_used": "..."}',
    '    # Update TransformJob.output_s3_key, prompt_used, status → "completed"',
])

# ══════════════════════════════════════════════════════════════════════════════
# 6. EXTERNAL SERVICE INTEGRATIONS
# ══════════════════════════════════════════════════════════════════════════════
heading1('6. External Service Integrations')

heading2('6.1  AWS S3 — Audio Storage')
body('All audio files (uploads, stems, mixes, transformed outputs) are stored in a single S3 bucket. The backend never exposes raw S3 credentials to clients; instead it generates short-lived presigned URLs.')

simple_table(
    ['Function', 'Direction', 'S3 Key Pattern', 'Expiry'],
    [
        ['upload_bytes()',        'App → S3', 'uploads/{user_id}/{job_id}/{filename}', '—'],
        ['download_bytes()',      'S3 → ML',  'Same key as upload',                    '—'],
        ['get_presigned_url()',   'S3 → App', 'Any key',                               '1 hour'],
        ['delete_object()',       'S3',       'Any key',                               '—'],
    ],
    col_widths=[1.5, 1.2, 2.4, 0.8]
)

heading2('6.2  Clerk — Identity & JWT')
body(
    'Clerk manages user registration, sign-in (email, Google, Apple), and '
    'session tokens. The backend performs stateless verification using Clerk\'s '
    'JWKS endpoint (RS256). No user passwords are stored.'
)
bullet('JWKS URL: https://<clerk-domain>/.well-known/jwks.json')
bullet('Token claim used: sub → clerk_user_id (stable across sign-in methods)')
bullet('POST /auth/sync must be called once per new Clerk user to create the local DB row')

heading2('6.3  Google Colab ML API (ngrok)')
body(
    'The ML models (Demucs, MusicGen, BigVGAN) run inside a Google Colab '
    'notebook to leverage free GPU allocation. An ngrok tunnel exposes the '
    'Colab FastAPI server on a public HTTPS URL, which is pasted into the '
    'backend .env as ML_API_URL.'
)
simple_table(
    ['Endpoint', 'Model', 'Timeout', 'Description'],
    [
        ['POST /separate',   'Demucs (htdemucs)',            '300 s',  'Splits audio into 4 stems'],
        ['POST /mix',        'scipy / librosa mixing',        '120 s',  'Combines stems with FX'],
        ['POST /transform',  'MusicGen-melody + Demucs',      '600 s',  'Full genre transform pipeline'],
        ['GET  /health',     '—',                             '10 s',   'Colab availability check'],
    ],
    col_widths=[1.5, 2.0, 0.9, 2.0]
)

# ══════════════════════════════════════════════════════════════════════════════
# 7. ENVIRONMENT VARIABLES
# ══════════════════════════════════════════════════════════════════════════════
heading1('7. Environment Variables')
simple_table(
    ['Variable', 'Required', 'Default', 'Purpose'],
    [
        ['DATABASE_URL',           'No',  'sqlite:///./vibeshift.db',  'SQLAlchemy connection string'],
        ['CLERK_SECRET_KEY',       'Yes', '—',                         'Clerk secret (sk_test_…)'],
        ['CLERK_JWKS_URL',         'Yes', '—',                         'Clerk JWKS endpoint for JWT validation'],
        ['AWS_ACCESS_KEY_ID',      'Yes', '—',                         'IAM access key for S3'],
        ['AWS_SECRET_ACCESS_KEY',  'Yes', '—',                         'IAM secret key for S3'],
        ['AWS_REGION',             'No',  'ap-southeast-1',            'S3 bucket region'],
        ['S3_BUCKET_NAME',         'No',  'vibeshift-audio-storage',   'Target S3 bucket name'],
        ['ML_API_URL',             'Yes', '(empty)',                    'Public ngrok URL for Colab ML server'],
    ],
    col_widths=[1.8, 0.8, 1.5, 2.3]
)

# ══════════════════════════════════════════════════════════════════════════════
# 8. END-TO-END WORKFLOWS
# ══════════════════════════════════════════════════════════════════════════════
doc.add_page_break()
heading1('8. End-to-End Workflow Scenarios')

heading2('8.1  Stem Demixing & Custom Mix')
steps = [
    ('Upload audio',            'App → POST /demixer/jobs (multipart)'),
    ('API saves to S3',         'Uploads raw audio; creates DemixJob (status=pending)'),
    ('Background task fires',   'Downloads from S3 → POST ML /separate (Demucs, ~1–3 min)'),
    ('Stems stored',            'Stem rows created in DB; DemixJob status → completed'),
    ('App polls',               'GET /demixer/jobs/{id} until status="completed"'),
    ('App fetches stems',       'Response includes presigned S3 URLs per stem (1-hr expiry)'),
    ('User edits stems',        'App sends PUT /demixer/stems/{id} for each changed stem'),
    ('User requests mix',       'App → POST /demixer/jobs/{id}/mix'),
    ('Background task fires',   'Sends stem params to ML /mix → result saved to S3'),
    ('App polls → download',    'GET /demixer/jobs/{id} returns latest_mix_url'),
]
for i, (label, detail) in enumerate(steps, 1):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.space_after = Pt(2)
    run_num = p.add_run(f'{i}. ')
    run_num.bold = True
    run_num.font.color.rgb = PURPLE
    run_num.font.size = Pt(10.5)
    run_label = p.add_run(f'{label}:  ')
    run_label.bold = True
    run_label.font.size = Pt(10.5)
    run_detail = p.add_run(detail)
    run_detail.font.size = Pt(10.5)
    run_detail.font.color.rgb = GREY

doc.add_paragraph()

heading2('8.2  Genre Transformation')
steps2 = [
    ('Select genre + upload',  'App → POST /transform/jobs (audio_file + target_genre + params)'),
    ('API saves & schedules',  'Raw audio → S3; TransformJob created (status=pending)'),
    ('Background task fires',  'Downloads audio → POST ML /transform (MusicGen pipeline, up to 10 min)'),
    ('ML pipeline',            'Demucs separates vocals ▸ MusicGen generates new instrumental ▸ blend'),
    ('Output saved',           'Output audio → S3; prompt_used recorded; status → completed'),
    ('App polls',              'GET /transform/jobs/{id} until status="completed"'),
    ('App downloads',          'Presigned download_url returned in response'),
]
for i, (label, detail) in enumerate(steps2, 1):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.space_after = Pt(2)
    run_num = p.add_run(f'{i}. ')
    run_num.bold = True
    run_num.font.color.rgb = PURPLE
    run_num.font.size = Pt(10.5)
    run_label = p.add_run(f'{label}:  ')
    run_label.bold = True
    run_label.font.size = Pt(10.5)
    run_detail = p.add_run(detail)
    run_detail.font.size = Pt(10.5)
    run_detail.font.color.rgb = GREY

# ══════════════════════════════════════════════════════════════════════════════
# 9. ERROR HANDLING
# ══════════════════════════════════════════════════════════════════════════════
heading1('9. Error Handling')
simple_table(
    ['Scenario', 'HTTP Code', 'Response Body', 'Resolution'],
    [
        ['Invalid / expired JWT',           '401', '{"detail": "Invalid token"}',       'Re-sign-in via Clerk'],
        ['User not in DB (unsync\'d)',       '404', '{"detail": "User not found"}',      'Call POST /auth/sync'],
        ['ML API unreachable',              '500', '{"detail": "ML API error: ..."}',   'Restart Colab + update ML_API_URL'],
        ['Job ID not found',               '404', '{"detail": "Job not found"}',        'Verify job_id'],
        ['Transform duration > 60 s',      '422', 'Pydantic validation error',          'Keep duration ≤ 60 s'],
        ['S3 upload fails',                '500', 'error_message in job row',            'Check AWS credentials / bucket policy'],
        ['Stem separation fails (Demucs)', 'n/a', 'status="failed" in DB',              'Job status endpoint returns error_message'],
    ],
    col_widths=[1.8, 0.9, 1.9, 1.8]
)

# ══════════════════════════════════════════════════════════════════════════════
# 10. ML MODULES
# ══════════════════════════════════════════════════════════════════════════════
heading1('10. ML Module Architecture')

heading2('10.1  Demixer Pipeline')
bullet('Model: Demucs htdemucs (hybrid Transformer + U-Net)')
bullet('Output: 4 stems — vocals, drums, bass, other — uploaded to S3')
bullet('Post-processing: pitch_shift (librosa), timbre blending, volume scaling, muting')
bullet('Mixing: numpy/scipy weighted sum of stems → final WAV/MP3/FLAC')

heading2('10.2  Genre Transform Pipeline (MusicGen approach)')
bullet('Step 1 — Demucs: isolate vocals from input audio')
bullet('Step 2 — Vocal FX: apply genre-specific effects (reverb, EQ, chorus) to vocals')
bullet('Step 3 — MusicGen (facebook/musicgen-melody): condition on genre prompt → generate new instrumental')
bullet('Step 4 — Tempo Match: stretch MusicGen output to match input BPM')
bullet('Step 5 — Mix: blend FX vocals (vocal_mix) + generated instrumental (instr_mix)')
bullet('Model sample rate: 32 000 Hz; output resampled to match input sample rate')

heading2('10.3  CycleGAN Approach (Research Track)')
bullet('Converts audio → 80-bin log Mel-spectrogram → treated as 2D image')
bullet('Architecture: Encoder → 6 ResBlocks → Decoder (instance normalisation)')
bullet('Discriminator: PatchGAN (70×70 receptive field)')
bullet('Losses: Adversarial + Cycle Consistency (λ=10) + Identity (λ=5) + Multi-Scale STFT')
bullet('Reconstruction: BigVGAN-v2 (Hugging Face) converts Mel back to waveform')
bullet('Dataset: GTZAN (1 000 clips, 10 genres, 30 s each)')

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
output_path = r'c:\Users\Insiya Fakhruddin\Desktop\fyp_project\VibeShift_Database_API_Report.docx'
doc.save(output_path)
print(f'Saved: {output_path}')
