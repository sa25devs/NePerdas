# SimplyFresh

Track food expiry dates by scanning package labels on iOS and Android.

## Features

- **Scan** packages with the camera (or photo library)
- **On-device OCR** (ML Kit / Apple Vision) — free, offline
- Save name, photo, expiration date, and reminder date
- **Local notifications** on the reminder date
- Optional **calendar alarm**
- Settings: days-before-expiry (default 1), reminder time, calendar default

## Requirements

Native modules (OCR, calendar) need a **development build**, not Expo Go:

```bash
npm install
npx expo run:ios
# or
npx expo run:android
```

## Architecture notes

Label extraction goes through `getLabelExtractor()` → `OnDeviceOcrExtractor`.
A `FirebaseAiExtractor` stub exists for a later **paid** Gemini path via Firebase AI Logic; it is not wired in v1.
