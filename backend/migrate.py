import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "vibeshift.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(users)")
columns = [row[1] for row in cursor.fetchall()]

if "bio" not in columns:
    cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT")
    print("Added 'bio' column to users table.")
else:
    print("'bio' column already exists.")

if "audio_quality" not in columns:
    cursor.execute("ALTER TABLE users ADD COLUMN audio_quality TEXT DEFAULT 'high'")
    print("Added 'audio_quality' column to users table.")
else:
    print("'audio_quality' column already exists.")

if "export_format" not in columns:
    cursor.execute("ALTER TABLE users ADD COLUMN export_format TEXT DEFAULT 'wav'")
    print("Added 'export_format' column to users table.")
else:
    print("'export_format' column already exists.")

conn.commit()
conn.close()
