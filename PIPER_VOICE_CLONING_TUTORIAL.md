# 🎙️ The Definitive Offline Voice Cloning & Narration Master Guide
**High-Fidelity AI Narration for Android & Moon+ Reader Pro (Piper TTS, Kokoro-82M, Zero PC Server, 100% Offline)**

---

## 📖 Table of Contents
1. [Architecture & Philosophy: Why 60 MB Piper vs 320 MB Kokoro?](#1-architecture--philosophy)
2. [Dataset Preparation & The Golden Audio Rules](#2-dataset-preparation--golden-rules)
3. [The Complete Google Colab Training Pipeline (Epoch 0 ➔ 100)](#3-google-colab-training-pipeline)
4. [Google Drive Quota Management & Checkpoint Traps](#4-google-drive-quota--checkpoint-traps)
5. [Bulletproof ONNX Export & `tokens.txt` Generation](#5-bulletproof-onnx-export)
6. [Android Installation: SherpaTTS / ttsEngine](#6-android-installation)
7. [Moon+ Reader Pro Master Settings (The "Shadow Slave" Setup)](#7-moon-reader-pro-master-settings)
8. [Mobile Deep-Dive: Piper vs. Kokoro-82M on Snapdragon 8 Gen 3](#8-piper-vs-kokoro-deep-dive)
9. [The Complete Troubleshooting & Bug Matrix](#9-troubleshooting--bug-matrix)

---

## 1. Architecture & Philosophy

When aiming to listen to 2,000+ chapter web novels (such as *Shadow Slave*, ~4.5 million words / 150+ hours of audio), standard cloud solutions fail:
* **ElevenLabs / ElevenReader:** Impose 10-hour monthly caps, expensive subscription tiers, and aggressive IP rate-limiting.
* **Home PC Servers (XTTS / StyleTTS2):** Require leaving a high-power desktop rig running 24/7, VPNs, or port forwarding.
* **Batch Pre-Rendering:** Converting thousands of chapters to MP3s wastes gigabytes of storage and ruins reading spontaneity.

### The Offline Solution: Edge Neural TTS
By fine-tuning **Piper VITS** on a target voice (such as ElevenLabs "Callum") and exporting it to an ONNX computational graph, your Android phone synthesizes studio-grade narration **on the fly**, completely offline, directly inside **Moon+ Reader Pro**.

```
[EPUB / Text in Moon+ Reader Pro]
               │
               ▼ (Android System TTS Intent)
[SherpaTTS Engine (Next-gen Kaldi)]
               │
               ▼ (ONNX Runtime CPU Inference)
[callum.onnx + tokens.txt (60 MB Graph)]
               │
               ▼ (22,050 Hz 16-bit PCM Audio Stream)
[Android Audio Hardware / Headphones] (0 ms Latency, Zero Internet)
```

---

## 2. Dataset Preparation & Golden Rules

### The 1 to 3 Hour Sweet Spot
* **Do NOT use 20–50 hours of audio.**
* **Pre-Trained Base Model:** We fine-tune an existing English foundation (`en_US-lessac-medium` or `en_US-ryan-medium`), which has already learned 1,000+ hours of English grammar, phonetic alignment, and pronunciation.
* **Avoid Compression Artifacts:** YouTube/web audio is typically 128 kbps Opus or AAC. Feeding 20+ hours amplifies lossy codec smearing into a harsh metallic buzz.
* **Avoid Whisper Timestamp Drift:** Over 20+ hours, automatic aligners introduce minor misalignments that cause slurred syllables.
* **3 Hours is Peak Fidelity:** 3 hours of clean, isolated narrator speech provides complete coverage of all English phoneme diphthongs, fricatives, and plosives while preserving the base model's stability.

### Audio Checklist:
1. **Isolated Speech:** Zero background music, zero sound effects, zero ambient reverb.
2. **Consistent Mic Distance:** Studio proximity effect without clipping or popping.
3. **Download:** Use `yt-dlp` (PC) or **Seal+** (Android) to download the highest quality `.m4a` or `.wav`.

---

## 3. The Complete Google Colab Training Pipeline

Piper requires an isolated **Python 3.10** environment with compiled C++ monotonic alignment binaries. Follow these four production cells in Google Colab (using a free T4 GPU).

### Cell 1: Hermetic Environment Setup & Base Checkpoint
```python
from google.colab import drive
import os, glob, urllib.request

# 1. Mount Google Drive
drive.mount('/content/drive')

# 2. System dependencies
!apt-get update -qq && apt-get install -y -qq espeak-ng ffmpeg build-essential

# 3. Setup isolated Python 3.10 environment via uv
!pip install -q uv openai-whisper pydub
!uv python install 3.10
!rm -rf /content/piper_env
!uv venv --seed /content/piper_env --python 3.10

# 4. Install pinned dependencies (Prevents NumPy 2.0 & PyTorch Lightning deprecation crashes)
!uv pip install --python /content/piper_env torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu121
!uv pip install --python /content/piper_env "numpy<2" "setuptools<70" pytorch-lightning==1.9.5 torchmetrics==0.11.4 piper-phonemize==1.1.0 onnx onnxruntime librosa cython tensorboard

# 5. Clone Piper and compile C++ monotonic alignment extension
!rm -rf /content/piper
!git clone -q https://github.com/rhasspy/piper.git /content/piper
!cd /content/piper/src/python && /content/piper_env/bin/python piper_train/vits/monotonic_align/setup.py build_ext --inplace
!mkdir -p /content/piper/src/python/piper_train/vits/monotonic_align/monotonic_align
!cp /content/piper/src/python/piper_train/vits/monotonic_align/core*.so /content/piper/src/python/piper_train/vits/monotonic_align/monotonic_align/ 2>/dev/null || true
!uv pip install --python /content/piper_env --no-deps -e /content/piper/src/python

# 6. Download official English medium base checkpoint (Ryan or Lessac)
os.makedirs('/content/base_model', exist_ok=True)
base_url = 'https://huggingface.co/datasets/rhasspy/piper-checkpoints/resolve/main/en/en_US/lessac/medium/epoch%3D2164-step%3D1355540.ckpt'
urllib.request.urlretrieve(base_url, '/content/base_model/base.ckpt')

print("✅ Setup complete! Base model and C++ extensions compiled.")
```

---

### Cell 2: Whisper Audio Slicing & Phonemization
```python
import os, glob, whisper
from pydub import AudioSegment

# 1. Locate master audio file in Google Drive
VOICE_NAME = "callum"
candidates = glob.glob(f'/content/drive/MyDrive/**/{VOICE_NAME}.*', recursive=True)
if not candidates:
    raise FileNotFoundError(f"Could not find {VOICE_NAME} audio file in Google Drive!")

audio_path = candidates[0]
print(f"Loading master audio: {audio_path}")

# 2. Slice audio into sentence chunks (1.5s - 10s)
print("⏳ Transcribing and segmenting with Whisper...")
asr = whisper.load_model("base.en")
result = asr.transcribe(audio_path, language="en")

sound = AudioSegment.from_file(audio_path).set_frame_rate(22050).set_channels(1).set_sample_width(2)
os.makedirs("/content/dataset/wav", exist_ok=True)

count = 0
with open("/content/dataset/metadata.csv", "w", encoding="utf-8") as f:
    for seg in result["segments"]:
        start_ms, end_ms = int(seg["start"] * 1000), int(seg["end"] * 1000)
        duration = end_ms - start_ms
        text = seg["text"].strip()
        if 1500 <= duration <= 10000 and len(text) > 3:
            chunk = sound[start_ms:end_ms]
            file_id = f"{count:05d}"
            chunk.export(f"/content/dataset/wav/{file_id}.wav", format="wav")
            f.write(f"{file_id}|{text}\n")
            count += 1

print(f"✅ Created {count} audio slices.")

# 3. Phonemize dataset
print("⏳ Converting text to phoneme alignment tensors...")
!PYTHONPATH=/content/piper/src/python /content/piper_env/bin/python3 -m piper_train.preprocess \
  --language en-us \
  --input-dir /content/dataset \
  --output-dir /content/dataset \
  --dataset-format ljspeech \
  --single-speaker \
  --sample-rate 22050

# Ensure preprocessed directory symlink exists
!ln -sf /content/dataset /content/preprocessed
print("✅ Dataset preprocessing complete!")
```

---

### Cell 3: OOM-Proof GPU Training (Epoch 0 ➔ 70)
To prevent PyTorch from crashing the 15GB T4 GPU:
* Use `--batch-size 2` with `--max-phoneme-ids 300`.
* Set `--num-test-examples 0` to prevent `add_audio` logger crashes.
* Save checkpoints every 10 epochs directly into Google Drive.

```python
import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

CHECKPOINT_DIR = "/content/drive/MyDrive/Callum_3Hour_Master_Checkpoints"
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

!PYTHONPATH=/content/piper/src/python /content/piper_env/bin/python3 -m piper_train \
    --dataset-dir /content/dataset \
    --resume_from_single_speaker_checkpoint /content/base_model/base.ckpt \
    --checkpoint-epochs 10 \
    --max_epochs 70 \
    --batch-size 2 \
    --max-phoneme-ids 300 \
    --quality medium \
    --num-test-examples 0 \
    --default_root_dir "$CHECKPOINT_DIR"
```

---

### Cell 4: Resuming Across Accounts / Sessions (Epoch 70 ➔ 100)
When free Colab compute limits trigger, disconnect and open a second Google account:
1. Run **Cell 1** to initialize the environment.
2. Symlink your dataset from Google Drive:
   ```bash
   !ln -s "/content/drive/MyDrive/Callum_3Hour_Preprocessed" /content/dataset
   !ln -s /content/dataset /content/preprocessed
   ```
3. Resume directly from Epoch 69 (targeting Epoch 100):

```python
import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

RESUME_CKPT = "/content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=69.ckpt"
CHECKPOINT_DIR = "/content/drive/MyDrive/Callum_3Hour_Master_Checkpoints"

!PYTHONPATH=/content/piper/src/python /content/piper_env/bin/python3 -m piper_train \
    --dataset-dir /content/dataset \
    --resume_from_checkpoint "$RESUME_CKPT" \
    --checkpoint-epochs 10 \
    --max_epochs 100 \
    --batch-size 2 \
    --max-phoneme-ids 300 \
    --quality medium \
    --num-test-examples 0 \
    --default_root_dir "$CHECKPOINT_DIR"
```

---

## 4. Google Drive Quota & Checkpoint Traps

### ⚠️ The 806.7 MB Checkpoint Explosion
Every Piper medium checkpoint (`.ckpt`) stores full optimizer states (FP32 momentum buffers, generator weights, discriminator weights, and scheduler):
* **Size:** ~806.7 MB per checkpoint file.
* Saving every 10 epochs across 100 epochs creates **10 files = ~8.1 GB**.
* On a standard 15 GB free Google account (shared with Gmail and Google Photos), your Drive will trigger **`Google Drive storage quota has been exceeded`**.
* When quota is exceeded, Colab cannot sync writes to the cloud, making files appear missing in Drive's web interface.

### ⚠️ The Lightning Subfolder Redirection
When resuming training, PyTorch Lightning warns:
`The dirpath has changed to .../lightning_logs/version_X/checkpoints/`
New checkpoints are **not** written to the root checkpoint folder; they are saved 3 levels deep:
`Callum_3Hour_Master_Checkpoints/lightning_logs/version_3/checkpoints/epoch=99-step=74820.ckpt`

### Safe Quota Maintenance Script
Run this script to immediately recover ~4 GB of storage by deleting obsolete early checkpoints:
```python
# Safely purge redundant early checkpoints
!rm -f /content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=09.ckpt
!rm -f /content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=19.ckpt
!rm -f /content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=29.ckpt
!rm -f /content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=39.ckpt
!rm -f /content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/callum-master-epoch=49.ckpt
print("✅ Freed ~4 GB of Google Drive storage!")
```

---

## 5. Bulletproof ONNX Export & `tokens.txt` Generation

Do not invoke `export_onnx` through shell string interpolation (`!python3 -m ... "$var"`), as bash variable expansion can misparse paths as `/content`, throwing `IsADirectoryError: [Errno 21] Is a directory: '/content'`.

Run this dedicated, standalone Python exporter in Colab:

```python
# 1. Build the standalone exporter
export_code = '''
import sys
from pathlib import Path
import torch

sys.path.insert(0, "/content/piper/src/python")
from piper_train.vits.lightning import VitsModel

# Adjust path to your latest epoch=99 checkpoint
ckpt_path = Path("/content/drive/MyDrive/Callum_3Hour_Master_Checkpoints/lightning_logs/version_3/checkpoints/epoch=99-step=74820.ckpt")
output_path = Path("/content/drive/MyDrive/Callum_Epoch100_Final/callum.onnx")
output_path.parent.mkdir(parents=True, exist_ok=True)

print(f"Loading checkpoint: {ckpt_path} ...")
assert ckpt_path.is_file(), f"Checkpoint not found at {ckpt_path}"

model = VitsModel.load_from_checkpoint(ckpt_path, dataset=None)
model_g = model.model_g
num_symbols = model_g.n_vocab
num_speakers = model_g.n_speakers

model_g.eval()
with torch.no_grad():
    model_g.dec.remove_weight_norm()

def infer_forward(text, text_lengths, scales, sid=None):
    noise_scale = scales[0]
    length_scale = scales[1]
    noise_scale_w = scales[2]
    audio = model_g.infer(
        text,
        text_lengths,
        noise_scale=noise_scale,
        length_scale=length_scale,
        noise_scale_w=noise_scale_w,
        sid=sid,
    )[0].unsqueeze(1)
    return audio

model_g.forward = infer_forward

dummy_input_length = 50
sequences = torch.randint(low=0, high=num_symbols, size=(1, dummy_input_length), dtype=torch.long)
sequence_lengths = torch.LongTensor([sequences.size(1)])
sid = torch.LongTensor([0]) if num_speakers > 1 else None
scales = torch.FloatTensor([0.667, 1.0, 0.8])
dummy_input = (sequences, sequence_lengths, scales, sid)

print("Exporting ONNX computational graph...")
torch.onnx.export(
    model=model_g,
    args=dummy_input,
    f=str(output_path),
    verbose=False,
    opset_version=15,
    input_names=["input", "input_lengths", "scales", "sid"],
    output_names=["output"],
    dynamic_axes={
        "input": {0: "batch_size", 1: "phonemes"},
        "input_lengths": {0: "batch_size"},
        "output": {0: "batch_size", 1: "time"},
    },
)

print(f"✅ Successfully exported ONNX: {output_path} ({output_path.stat().st_size / (1024*1024):.2f} MB)")
'''

with open("/content/do_export.py", "w") as f:
    f.write(export_code)

# 2. Run export using piper_env Python
!/content/piper_env/bin/python3 /content/do_export.py

# 3. Generate tokens.txt directly from phoneme ID map
import json, os
from google.colab import files

final_dir = "/content/drive/MyDrive/Callum_Epoch100_Final"
config_path = "/content/dataset/config.json" if os.path.exists("/content/dataset/config.json") else "/content/preprocessed/config.json"

with open(config_path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

tokens_file = f"{final_dir}/tokens.txt"
with open(tokens_file, "w", encoding="utf-8") as f:
    for s, i in cfg["phoneme_id_map"].items():
        if s == "\n":
            continue
        if isinstance(i, list):
            i = i[0]
        f.write(f"{s} {i}\n")

!cp "$config_path" "$final_dir/callum.onnx.json"
os.sync()

print("\n✅ Final Model Files Generated in Google Drive:")
!ls -lh "$final_dir"

# 4. Trigger direct browser download
files.download(f"{final_dir}/callum.onnx")
files.download(f"{final_dir}/tokens.txt")
files.download(f"{final_dir}/callum.onnx.json")
```

---

## 6. Android Installation

### Step 1: Install SherpaTTS (Piper Edition)
1. Download and install **[SherpaTTS / ttsEngine APK (v3.2)](https://github.com/woheller69/ttsEngine/releases/download/V3.2/app-release_beta_16kb_aligned.apk)**.
2. Note: If you installed the Kokoro standalone app, you can have both side-by-side or choose the Piper APK for zero-lag reading.

### Step 2: Transfer Files to Phone
Transfer the three generated files to your phone's `Download` folder:
* `callum.onnx` (~60 MB)
* `tokens.txt` (~1 KB)
* `callum.onnx.json` (~7 KB)

### Step 3: Import the Voice into SherpaTTS ("Install from SD")
1. Open **SherpaTTS** (or **TTS Engine**).
2. Tap the **`+`** (or **Install from SD**) button.
3. Fill in the fields:
   * **Language Code:** `eng` *(IMPORTANT: Must be exactly 3 lowercase letters, e.g. `eng`)*
   * **Model Name:** `Callum Epoch 100`
   * **Model File:** Tap **Select Model** and pick `callum.onnx`
   * **Tokens File:** Tap **Select Tokens** and pick `tokens.txt`
4. Tap **Install**.
5. Tap **Test Voice** — hear your custom cloned voice speak instantly offline!

### Step 4: Configure Android & Moon+ Reader Pro
1. Open Android **Settings → Accessibility → Text-to-Speech Output**.
2. Change the **Preferred Engine** from Google Speech Services to **SherpaTTS** (or **TTS Engine**).
3. Open **Moon+ Reader Pro** and open any book/chapter.
4. Tap the screen center → tap **More (three dots `⋮`)** → tap **Speak (TTS)**.
5. Moon+ Reader Pro will stream your custom AI voice live sentence-by-sentence with zero delay and zero internet connection!

---

## 7. Moon+ Reader Pro Master Settings

To achieve studio-quality audiobook narration for massive fantasy novels like *Shadow Slave*, apply these two critical engine tweaks:

### Fix 1: Eliminating the "Skipped Initial Consonant" Bug
* **Symptom:** When Piper starts a sentence, words like *"By the time Sunny arrived"* sound like *"'y the time..."* (missing the "B").
* **Root Cause:** Android phone DACs (Digital-to-Analog Converters) have an automatic 20–30 ms power ramp-up fade-in when starting playback from pure silence.
* **Fix in Moon+ Reader Pro:**
  1. Open TTS controls (tap screen ➔ headphone icon).
  2. Tap **Settings (Gear icon)**.
  3. Set **Pause between sentences:** to **`200 ms`**.
  4. Enable **Continuous / Stream Playback**.
  *Result:* The audio stream remains alive between sentences; consonants are never cut off.

### Fix 2: Chinese & Fantasy Name Phonetic Replacement Dictionary
* **Symptom:** English phoneme models rush Chinese syllables (e.g. *Shi Zheng Yi* sounds like an unaccented 50 ms blip).
* **Fix in Moon+ Reader Pro:**
  1. Open TTS settings ➔ **More Operations** ➔ **Customize Text Replacement**.
  2. Add phonetic substitutions using **commas** (commas force natural human pauses and primary stress):

| Novel Term | Phonetic Replacement | Why |
| :--- | :--- | :--- |
| `Shi Zheng Yi` | `Shee, Jeng, Yee` | Commas force 150 ms pauses and distinct tone separation. |
| `Nephis` | `Nee-fis` | Prevents soft 'ph' slurring. |
| `Mongrel` | `Mun-grel` | Emphasizes harsh consonant cadence. |
| `Shards` | `Shah-rds` | Adds deep vocal fry resonance. |

---

## 8. Piper vs. Kokoro-82M Deep-Dive

Why did Kokoro feel laggy on a flagship **Samsung Galaxy S24 Ultra** (Snapdragon 8 Gen 3)?

```
┌───────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Feature                   │ Piper VITS (Callum)           │ Kokoro-82M (StyleTTS2)        │
├───────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Model Size                │ ~15 Million Parameters (60MB) │ ~82 Million Parameters (320MB)│
│ Sampling Rate             │ 22,050 Hz                     │ 24,000 Hz                     │
│ Architecture              │ 1D Feed-Forward Convolutions  │ ALBERT Transformer + Diffusion│
│ Mobile RTF (S24 Ultra)    │ 0.15 - 0.20 (5x Real-Time)    │ 1.57 (Slower than Real-Time!) │
│ Initial Sentence Latency  │ < 50 ms (Instantaneous)       │ 800 ms - 2,500 ms             │
│ Battery / Thermals        │ Cool; < 5% battery/hr         │ Warm; heavy CPU drain         │
│ Best For                  │ 150-Hour Epic Novels          │ Short Audio / Server Hosting  │
└───────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

### The Snapdragon 8 Gen 3 Core Synchronization Trap
* The S24 Ultra has 1x Cortex-X4 (monster prime core), 5x A720 performance cores, and 2x A520 efficiency cores.
* When Android launches Kokoro with `threads = 4`, the OS scheduler assigns threads across big and little cores.
* In neural network inference, layer barriers require all threads to synchronize. The Cortex-X4 core is forced to idle while waiting for the tiny A520 efficiency core!
* **Conclusion:** For reading long novels in Moon+ Reader Pro, **Piper Callum Epoch 100** provides the ultimate balance of vocal clarity, zero lag, and all-day battery life.

---

## 9. Troubleshooting & Bug Matrix

| Error Message / Symptom | Exact Cause | Verified Solution |
| :--- | :--- | :--- |
| `IsADirectoryError: [Errno 21] Is a directory: '/content'` | Bash variable `$ckpt` expanded empty or improperly in Colab subshell. | Use the standalone Python exporter (`do_export.py`) via `piper_env/bin/python3`. |
| `Google Drive storage quota has been exceeded` | 9+ checkpoints at 806.7 MB each consumed >7.2 GB of Drive storage. | Delete early checkpoints (Epoch 09–49) or export to local `/content/` and use `files.download()`. |
| `Missing checkpoint / cannot see file in Drive` | PyTorch Lightning redirected checkpoint saves to `lightning_logs/version_X/checkpoints/`. | Inspect `lightning_logs/version_3/checkpoints/` or run `find /content -name "*.ckpt"`. |
| `export_onnx.py: error: unrecognized arguments: --checkpoint` | `export_onnx.py` takes positional arguments (`checkpoint output`), not flags. | Pass arguments as positional parameters: `python -m piper_train.export_onnx input.ckpt output.onnx`. |
| `AttributeError: 'ExperimentWriter' has no attribute 'add_audio'` | TensorBoard was not installed, so Lightning used CSVLogger which lacks audio logging. | `uv pip install tensorboard` and pass `--num-test-examples 0`. |
| `CUDA out of memory on T4 GPU` | Batch size 16 exceeds 15 GB VRAM on longer phoneme utterances. | Use `--batch-size 2`, `--max-phoneme-ids 300`, and `expandable_segments:True`. |
| `ModuleNotFoundError: No module named 'piper_train'` | Called system python `/usr/bin/python3` instead of `/content/piper_env/bin/python3`. | Always prefix commands with `/content/piper_env/bin/python3` or set `PYTHONPATH`. |
| `Language code error` in Android app | Entered 2-letter language code (`en`). | Always enter 3-letter ISO-639-3 code: **`eng`**. |
| `Skipping initial 'B' in 'By'` in Moon+ Reader | Android DAC 25 ms audio hardware ramp-up fade-in. | Set Moon+ Reader TTS "Pause between sentences" to **`200 ms`**. |
