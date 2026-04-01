from modules.audio_to_mel import audio_to_mel
from modules.mel_to_audio import MelToAudio

# Step 1: audio → mel
mel = audio_to_mel(r"test_cases\full song.mp3")

# Step 2: mel → audio
m2a = MelToAudio()
audio = m2a.convert(mel)

# Step 3: save
m2a.save(audio, "reconstructed.wav")