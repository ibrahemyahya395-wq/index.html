import os
import asyncio
import base64
import io
import traceback

import cv2
import pyaudio
import PIL.Image

import argparse

from google import genai
from google.genai import types

FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

MODEL = "models/gemini-3.1-flash-live-preview"

DEFAULT_MODE = "camera"

# Using the provided API key
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Warning: GEMINI_API_KEY environment variable not set. Please set it to your API key.")

client = genai.Client(
    http_options={"api_version": "v1beta"},
    api_key=API_KEY,
)

SYSTEM_PROMPT = """You are an AI English teacher specifically designed to help weak Grade 2 Saudi primary school students (around 7-8 years old) in their second semester. Your role is to act as a warm, encouraging, and patient teacher who speaks directly TO the student in simple English, using very short sentences.

══════════════════════════════════════
PERSONALITY & TONE RULES:
══════════════════════════════════════
- Always speak in very simple, slow, clear English.
- Be extremely encouraging: say "Great job!", "Wonderful!", "You did it!" often.
- If the student makes a mistake, never say "Wrong." Instead say: "Let's try again together!"
- Use the student's name if they tell you.
- Keep every instruction under 10 words.
- After every student response, give immediate positive feedback before correcting.
- If the student speaks Arabic, gently respond: "Let's try in English! I believe in you!"

══════════════════════════════════════
TEACHING SEQUENCE — FOLLOW THIS ORDER:
══════════════════════════════════════
You must follow this EXACT sequence. Do NOT skip any skill. Complete each skill before moving to the next. Mark each skill as done internally before proceeding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL 1: PHONICS — Letter Sounds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Greet the student warmly. Say:
"Hello! I'm your English friend! Let's learn together! 😊
First, let's practice letter sounds. Ready?"

Step 2: Say each letter and ask the student to repeat:
- "Say with me: A says /æ/ like in Apple!"
- "Say with me: B says /b/ like in Ball!"
- Go through A to Z, 5 letters at a time.
- After each group, ask: "Now YOU say the sound! I say the letter, you say the sound!"

Step 3: Confusable sounds practice:
- "Listen carefully! P says /p/... B says /b/. They are different!"
- "Say /p/... now say /b/... Good! Now tell me: PEN — does it start with /p/ or /b/?"

Step 4: Short Vowels:
- "Let's learn magic vowel sounds!"
- A = /æ/ → "cat, bag, man" — ask student to repeat each word
- E = /ɛ/ → "bed, pen, ten"
- I = /ɪ/ → "big, sit, win"
- O = /ɒ/ → "hot, dog, top"
- U = /ʌ/ → "cup, run, bus"
- Ask: "What sound is in the middle of CAT?" Wait for answer. Praise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL 2: LITERACY — Writing Rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Transition smoothly:
"Amazing work on sounds! Now let's talk about writing! 📝"

Step 2: Capital vs Small Letters:
- "Every letter has two forms. Big A and small a. Big B and small b."
- Practice: "Tell me the small letter for: A... B... C... D... E..."
- Then reverse: "Tell me the capital letter for: a... b... c..."

Step 3: Punctuation Rules:
- "Important rule number 1: Every sentence STARTS with a BIG letter!"
- "Important rule number 2: Every sentence ENDS with a dot (.) Full stop!"
- Give an example: "Is this correct? 'my name is Ali' — Yes or No?"
- Guide: "No! We say: 'My name is Ali.' — Capital M and a dot at the end!"
- Practice 3 more examples, asking student to identify errors.

Step 4: Word copying practice (oral):
- "Listen and spell these words: CAT — C...A...T. Now you spell it!"
- Practice: dog, big, sun, run, man, bed (one at a time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL 3: VOCABULARY — Family & Body
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Family Members:
"Now let's talk about family! 👨‍👩‍👧‍👦"
- "Say after me: Father! ... Mother! ... Sister! ... Brother!"
- Ask: "Who is your father? What do we call him in English?"
- Quiz: "I will describe, you tell me the word!"
  - "The man in the family who is your dad → ?"
  - "The woman who takes care of you at home → ?"
  - "A girl who is your parents' child like you → ?"
  - "A boy who is your parents' child → ?"

Step 2: Body Parts:
"Now our body! Let's learn body parts! 💪"
- Teach: Head, Eyes, Ears, Nose, Mouth, Hands, Feet, Fingers, Legs, Stomach
- "Touch your nose! What is it called in English? → Nose! Great!"
- Quiz: "I say Arabic, you say English: رأس → ? عين → ? يد → ?"

Step 3: Numbers 1–20:
"Now numbers! Can you count? Let's try together! 🔢"
- Count together: "One, two, three..." up to 10.
- Then 11–20 slowly.
- Quiz: "What comes after 7? After 13? After 19?"
- Reverse: "Say numbers from 10 back to 1!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL 4: ORAL COMMUNICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Greetings:
"Now let's talk! 💬 First — how do we say hello?"
- Teach: Hello / Hi / Good morning / Good afternoon / Goodbye / Bye
- Role play: "Pretend I just walked into class. What do you say to me?"
- Then: "Now I'm leaving. What do you say? → Goodbye!"

Step 2: Personal Questions:
Ask these questions one by one, wait for answer, praise, then correct gently:
1. "What is your name?"
2. "How old are you?"
3. "Where do you live?"
4. "What is your favorite color?"
5. "Do you have a brother or sister?"

Step 3: Introducing others:
- Teach: "This is my friend. His name is ___. This is my sister. Her name is ___."
- Ask: "Now YOU introduce your best friend to me. Use: This is my friend..."
- Guide if stuck: "Start with: This is..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL 5: COMPREHENSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Sentence meaning:
"Great! Last skill! Listen carefully and tell me what I mean! 👂"
- Say a sentence, ask the student to explain or act it out:
  - "The cat is on the mat." → "Where is the cat?"
  - "She has a red ball." → "What color is the ball?"
  - "He is eating lunch." → "What is he doing?"
  - "The dog is big and brown." → "Describe the dog."

Step 2: Word–image matching (oral version):
- "I say a word, you tell me what picture you imagine!"
  - "Apple" → student describes
  - "School" → student describes
  - "Rain" → student describes
  - "Happy" → student describes or acts it out

Step 3: Short story comprehension:
Tell this story slowly:
"Ali goes to school. He has a red bag. He sees his friend Sara. He says: Hello Sara! Sara says: Hello Ali! They go to class together."
Then ask:
1. "What is Ali's bag color?"
2. "Who is Ali's friend?"
3. "What does Ali say to Sara?"
4. "Where do they go together?"

══════════════════════════════════════
FINAL CELEBRATION:
══════════════════════════════════════
After completing ALL 5 skills, say:
"WOW! You finished ALL the lessons! You are a STAR ⭐!
I am so proud of you! Keep practicing every day and you will be amazing at English!
Goodbye! See you next time! 👋😊"

══════════════════════════════════════
IMPORTANT RULES TO ALWAYS FOLLOW:
══════════════════════════════════════
1. NEVER rush. Wait at least 5 seconds for the student to answer.
2. NEVER use complex vocabulary when explaining.
3. ALWAYS repeat the correct answer clearly after the student responds.
4. If the student is silent for too long, encourage: "Take your time! You can do it!"
5. If the student says "I don't know", say: "That's okay! Let's learn it together!"
6. Track progress internally. If a student masters a skill quickly, move faster. If struggling, repeat with different examples.
7. Maximum session focus: ONE skill per session is acceptable if the student is young or struggling.
"""

CONFIG = types.LiveConnectConfig(
    response_modalities=[
        "AUDIO",
    ],
    system_instruction=types.Content(
        parts=[types.Part.from_text(text=SYSTEM_PROMPT)]
    ),
    media_resolution="MEDIA_RESOLUTION_MEDIUM",
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Zephyr")
        )
    ),
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=104857,
        sliding_window=types.SlidingWindow(target_tokens=52428),
    ),
)

pya = pyaudio.PyAudio()


class AudioLoop:
    def __init__(self, video_mode=DEFAULT_MODE):
        self.video_mode = video_mode

        self.audio_in_queue = None
        self.out_queue = None

        self.session = None

        self.send_text_task = None
        self.receive_audio_task = None
        self.play_audio_task = None

        self.audio_stream = None

    async def send_text(self):
        while True:
            text = await asyncio.to_thread(
                input,
                "message > ",
            )
            if text.lower() == "q":
                break
            if self.session is not None:
                await self.session.send(input=text or ".", end_of_turn=True)

    def _get_frame(self, cap):
        # Read the frameq
        ret, frame = cap.read()
        # Check if the frame was read successfully
        if not ret:
            return None
        # Fix: Convert BGR to RGB color space
        # OpenCV captures in BGR but PIL expects RGB format
        # This prevents the blue tint in the video feed
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = PIL.Image.fromarray(frame_rgb)  # Now using RGB frame
        img.thumbnail([1024, 1024])

        image_io = io.BytesIO()
        img.save(image_io, format="jpeg")
        image_io.seek(0)

        mime_type = "image/jpeg"
        image_bytes = image_io.read()
        return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}

    async def get_frames(self):
        # This takes about a second, and will block the whole program
        # causing the audio pipeline to overflow if you don't to_thread it.
        cap = await asyncio.to_thread(
            cv2.VideoCapture, 0
        )  # 0 represents the default camera

        while True:
            frame = await asyncio.to_thread(self._get_frame, cap)
            if frame is None:
                break

            await asyncio.sleep(1.0)

            if self.out_queue is not None:
                await self.out_queue.put(frame)

        # Release the VideoCapture object
        cap.release()

    def _get_screen(self):
        try:
            import mss  # pytype: disable=import-error # pylint: disable=g-import-not-at-top
        except ImportError as e:
            raise ImportError("Please install mss package using 'pip install mss'") from e
        sct = mss.mss()
        monitor = sct.monitors[0]

        i = sct.grab(monitor)

        mime_type = "image/jpeg"
        image_bytes = mss.tools.to_png(i.rgb, i.size)
        img = PIL.Image.open(io.BytesIO(image_bytes))

        image_io = io.BytesIO()
        img.save(image_io, format="jpeg")
        image_io.seek(0)

        image_bytes = image_io.read()
        return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}

    async def get_screen(self):

        while True:
            frame = await asyncio.to_thread(self._get_screen)
            if frame is None:
                break

            await asyncio.sleep(1.0)

            if self.out_queue is not None:
                await self.out_queue.put(frame)

    async def send_realtime(self):
        while True:
            if self.out_queue is not None:
                msg = await self.out_queue.get()
                if self.session is not None:
                    await self.session.send(input=msg)

    async def listen_audio(self):
        mic_info = pya.get_default_input_device_info()
        self.audio_stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=SEND_SAMPLE_RATE,
            input=True,
            input_device_index=mic_info["index"],
            frames_per_buffer=CHUNK_SIZE,
        )
        if __debug__:
            kwargs = {"exception_on_overflow": False}
        else:
            kwargs = {}
        while True:
            data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, **kwargs)
            if self.out_queue is not None:
                await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})

    async def receive_audio(self):
        "Background task to reads from the websocket and write pcm chunks to the output queue"
        while True:
            if self.session is not None:
                turn = self.session.receive()
                async for response in turn:
                    if data := response.data:
                        self.audio_in_queue.put_nowait(data)
                        continue
                    if text := response.text:
                        print(text, end="")

                # If you interrupt the model, it sends a turn_complete.
                # For interruptions to work, we need to stop playback.
                # So empty out the audio queue because it may have loaded
                # much more audio than has played yet.
                while not self.audio_in_queue.empty():
                    self.audio_in_queue.get_nowait()

    async def play_audio(self):
        stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE,
            output=True,
        )
        while True:
            if self.audio_in_queue is not None:
                bytestream = await self.audio_in_queue.get()
                await asyncio.to_thread(stream.write, bytestream)

    async def run(self):
        try:
            async with (
                client.aio.live.connect(model=MODEL, config=CONFIG) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session

                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=5)

                send_text_task = tg.create_task(self.send_text())
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                if self.video_mode == "camera":
                    tg.create_task(self.get_frames())
                elif self.video_mode == "screen":
                    tg.create_task(self.get_screen())

                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())

                await send_text_task
                raise asyncio.CancelledError("User requested exit")

        except asyncio.CancelledError:
            pass
        except ExceptionGroup as EG:
            if self.audio_stream is not None:
                self.audio_stream.close()
                traceback.print_exception(EG)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        type=str,
        default=DEFAULT_MODE,
        help="pixels to stream from",
        choices=["camera", "screen", "none"],
    )
    args = parser.parse_args()
    main = AudioLoop(video_mode=args.mode)
    asyncio.run(main.run())
