"""
Text-to-Speech (TTS) module.
Handles speech synthesis configurations, language mappings, and direct audio stream generation
for senior-friendly audio in English and Tamil (தமிழ்).
"""
import io
import re

def contains_tamil(text: str) -> bool:
    """Checks if text contains Tamil Unicode characters."""
    return any(0x0B80 <= ord(char) <= 0x0BFF for char in text)

class TextToSpeechService:
    def __init__(self):
        # Elder-friendly defaults: slower rate (0.85-0.90x), clear pitch
        self.default_rate = 0.88
        self.default_pitch = 1.0

    def clean_text(self, text: str) -> str:
        """Removes markdown symbols, URLs, and excessive punctuation for clean speech."""
        if not text:
            return ""
        # Remove markdown bold/italics/code/headers
        cleaned = re.sub(r"[*#_`~>]", "", text)
        # Remove URLs
        cleaned = re.sub(r"https?://\S+", "", cleaned)
        # Simplify multiple whitespace / newlines
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def get_speech_config(self, language="en"):
        """Returns recommended speech synthesis parameters for senior citizens."""
        if language in ("ta", "ta-IN") or (isinstance(language, str) and language.startswith("ta")):
            return {
                "lang": "ta-IN",
                "voice_preference": [
                    "Google தமிழ்",
                    "Microsoft Valluvar - Tamil (India)",
                    "Microsoft Pallavi - Tamil (India)",
                    "Tamil India",
                    "ta-IN",
                    "ta"
                ],
                "rate": 0.85,
                "pitch": 1.0
            }
        return {
            "lang": "en-IN",
            "voice_preference": [
                "Google UK English Female",
                "Google US English",
                "Microsoft Heera - English (India)",
                "Microsoft Neerja - English (India)",
                "en-IN",
                "en-US"
            ],
            "rate": 0.88,
            "pitch": 1.0
        }

    def synthesize_audio(self, text: str, lang: str = "auto") -> io.BytesIO:
        """
        Synthesizes speech into an in-memory MP3 audio stream using gTTS.
        Supports native Tamil (ta) and Indian/International English (en).
        """
        from gtts import gTTS

        cleaned = self.clean_text(text)
        if not cleaned:
            cleaned = "No speech text provided"

        # Auto-detect language if not explicitly specified
        if lang == "auto" or not lang:
            target_lang = "ta" if contains_tamil(cleaned) else "en"
        elif lang.startswith("ta"):
            target_lang = "ta"
        else:
            target_lang = "en"

        fp = io.BytesIO()
        # gTTS produces high-fidelity, clear pronunciation
        tts = gTTS(text=cleaned, lang=target_lang, slow=False)
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp
