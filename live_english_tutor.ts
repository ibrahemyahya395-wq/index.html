// To run this code you need to install the following dependencies:
// npm install @google/genai
// npm install -D @types/node tsx
import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from '@google/genai';
import { writeFile } from 'fs';

const SYSTEM_PROMPT = `You are an AI English teacher specifically designed to help weak Grade 2 Saudi primary school students (around 7-8 years old) in their second semester. Your role is to act as a warm, encouraging, and patient teacher who speaks directly TO the student in simple English, using very short sentences.

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
`;

const responseQueue: LiveServerMessage[] = [];
let session: Session | undefined = undefined;

async function handleTurn(): Promise<LiveServerMessage[]> {
  const turn: LiveServerMessage[] = [];
  let done = false;
  while (!done) {
    const message = await waitMessage();
    turn.push(message);
    if (message.serverContent && message.serverContent.turnComplete) {
      done = true;
    }
  }
  return turn;
}

async function waitMessage(): Promise<LiveServerMessage> {
  let done = false;
  let message: LiveServerMessage | undefined = undefined;
  while (!done) {
    message = responseQueue.shift();
    if (message) {
      handleModelTurn(message);
      done = true;
    } else {
      await new Promise((resolve) => { setTimeout(resolve, 100); });
    }
  }
  return message!;
}

const audioParts: string[] = [];
function handleModelTurn(message: LiveServerMessage) {
  if(message.serverContent?.modelTurn?.parts) {
    const part = message.serverContent?.modelTurn?.parts?.[0];

    if(part?.fileData) {
      console.log(`File: ${part?.fileData.fileUri}`);
    }

    if (part?.inlineData) {
      const fileName = 'audio.wav';
      const inlineData = part?.inlineData;

      audioParts.push(inlineData?.data ?? '');

      const buffer = convertToWav(audioParts, inlineData.mimeType ?? '');
      saveBinaryFile(fileName, buffer);
    }

    if(part?.text) {
      console.log(part?.text);
    }
  }
}

function saveBinaryFile(fileName: string, content: Buffer) {
  // @ts-ignore
  writeFile(fileName, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`Appending stream content to file ${fileName}.`);
  });
}

interface WavConversionOptions {
  numChannels : number,
  sampleRate: number,
  bitsPerSample: number
}

function convertToWav(rawData: string[], mimeType: string) {
  const options = parseMimeType(mimeType);
  const dataLength = rawData.reduce((a, b) => a + b.length, 0);
  const wavHeader = createWavHeader(dataLength, options);
  const buffer = Buffer.concat(
  // @ts-ignore
    rawData.map(data => Buffer.from(data, 'base64')));

  // @ts-ignore
  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType : string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [, format] = fileType.split('/');

  const options : Partial<WavConversionOptions> = {
    numChannels: 1,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  // http://soundfile.sapp.org/doc/WaveFormat

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
}

async function main() {
  const API_KEY = process.env['GEMINI_API_KEY'];
  if (!API_KEY) {
    console.warn("Warning: GEMINI_API_KEY environment variable not set. Please set it to your API key.");
  }

  const ai = new GoogleGenAI({
    apiKey: API_KEY,
  });

  const model = 'models/gemini-3.1-flash-live-preview'

  const config = {
    responseModalities: [
        Modality.AUDIO,
    ],
    systemInstruction: {
      parts: [
        { text: SYSTEM_PROMPT }
      ]
    },
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Zephyr',
        }
      }
    },
    contextWindowCompression: {
        triggerTokens: '104857',
        slidingWindow: { targetTokens: '52428' },
    },
  };

  session = await ai.live.connect({
    model,
    callbacks: {
      onopen: function () {
        console.debug('Opened connection to Gemini Live API');
      },
      onmessage: function (message: LiveServerMessage) {
        responseQueue.push(message);
      },
      onerror: function (e: ErrorEvent) {
        console.debug('Error:', e.message);
      },
      onclose: function (e: CloseEvent) {
        console.debug('Close:', e.reason);
      },
    },
    // @ts-ignore: the config requires more types but we use the basic ones from quickstart
    config
  });

  console.log("Teacher is ready. Saying hello...");
  session.sendClientContent({
    turns: [
      {
        parts: [
          { text: "Hello teacher, I am your student. I am ready to start my English lesson." }
        ]
      }
    ]
  });

  await handleTurn();

  session.close();
}
main();