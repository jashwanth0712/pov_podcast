# ElevenLabs Text-to-Speech — Best Practices

> Mirrored from <https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices.md>
> for offline reference. Source of truth is the linked page.

This guide provides techniques to enhance text-to-speech outputs using ElevenLabs models. Experiment with these methods to discover what works best for your needs.

## Controls

> We are actively working on *Director's Mode* to give you even greater control over outputs.

These techniques provide a practical way to achieve nuanced results until advanced features like *Director's Mode* are rolled out.

### Pauses

> Eleven v3 does not support SSML break tags. Use the techniques described in the *Prompting Eleven v3* section for controlling pauses with v3.

Use `<break time="x.xs" />` for natural pauses up to 3 seconds.

> Using too many break tags in a single generation can cause instability. The AI might speed up, or introduce additional noises or audio artifacts.

```text
"Hold on, let me think." <break time="1.5s" /> "Alright, I've got it."
```

- **Consistency:** Use `<break>` tags consistently to maintain natural speech flow. Excessive use can lead to instability.
- **Voice-Specific Behavior:** Different voices may handle pauses differently, especially those trained with filler sounds like "uh" or "ah."

Alternatives to `<break>` include dashes (`-` or `--`) for short pauses or ellipses (`...`) for hesitant tones. However, these are less consistent.

```text
"It… well, it might work." "Wait — what's that noise?"
```

### Pronunciation

#### Phoneme Tags

Specify pronunciation using SSML phoneme tags. Supported alphabets include CMU Arpabet and IPA.

> Phoneme tags are only compatible with "Eleven Flash v2" and "Eleven English v1" models.

```xml
<phoneme alphabet="cmu-arpabet" ph="M AE1 D IH0 S AH0 N">
  Madison
</phoneme>
```

```xml
<phoneme alphabet="ipa" ph="ˈæktʃuəli">
  actually
</phoneme>
```

CMU Arpabet is recommended for consistent and predictable results. Ensure correct stress marking for multi-syllable words. Phoneme tags only work for individual words; for names, tag each word separately.

#### Alias Tags

For models that don't support phoneme tags, write words more phonetically (capitals, dashes, apostrophes around letters). For example, "trapezii" → "trapezIi" emphasises the "ii".

You can also use alias tags via a pronunciation dictionary:

```xml
<lexeme>
  <grapheme>Claughton</grapheme>
  <alias>Cloffton</alias>
</lexeme>
```

```xml
<lexeme>
  <grapheme>UN</grapheme>
  <alias>United Nations</alias>
</lexeme>
```

#### Pronunciation Dictionaries

Some tools (Studio, Dubbing) accept a pronunciation dictionary as TXT or `.PLS`. Whenever a matched word appears in a project, the model uses the specified replacement. Searches are case sensitive; the first match wins.

### Emotion

Convey emotions through narrative context or explicit dialogue tags.

```text
"You're leaving?" she asked, her voice trembling with sadness. "That's it!" he exclaimed triumphantly.
```

Explicit dialogue tags yield more predictable results than relying solely on context. The model will speak emotional delivery guides — strip them in post if unwanted.

### Pace

Pacing is dictated by the source recording. Use longer continuous samples when training a voice. The `speed` setting (0.7–1.2, default 1.0) adjusts playback. Extreme values may degrade quality. Pacing can also be controlled by writing in a natural, narrative style.

```text
"I… I thought you'd understand," he said, his voice slowing with disappointment.
```

### Tips

**Common Issues**

- Inconsistent pauses: ensure `<break time="x.xs" />` syntax is used.
- Pronunciation errors: use CMU Arpabet or IPA phoneme tags.
- Emotion mismatch: add narrative context or explicit tags. **Remember to remove emotional guidance text in post-production.**

**Tips for Improving Output** — experiment with phrasing for desired pacing or emotion. For complex sound effects, break prompts into smaller sequential elements and combine results manually.

### Creative control

1. **Narrative styling** — write prompts in a scriptwriting style.
2. **Layered outputs** — generate segments and layer them in audio editing software.
3. **Phonetic experimentation** — try alternate spellings or phonetic approximations.
4. **Manual adjustments** — combine sound effects in post for precise timing.
5. **Feedback iteration** — tweak descriptions, tags, and emotional cues.

## Text normalization

Complex items like phone numbers, zip codes and emails can be mispronounced. Normalization is enabled by default for all TTS models.

### Why models read inputs differently

Larger models (Multilingual v2) generalise better — `$1,000,000` becomes "one million dollars". Smaller models (Flash v2.5) may say "one thousand thousand dollars".

Models often struggle with:

- Phone numbers (`123-456-7890`)
- Currencies (`$47,345.67`)
- Calendar events (`2024-01-01`)
- Time (`9:23 AM`)
- Addresses (`123 Main St, Anytown, USA`)
- URLs (`example.com/link/to/resource`)
- Unit abbreviations (`TB` instead of `Terabyte`)
- Shortcuts (`Ctrl + Z`)

### Mitigation

#### Use trained models

Use a larger model (e.g. Multilingual v2) when latency permits.

#### Apply normalization in LLM prompts

1. **Use clear and explicit prompts** — specify that text must be readable as speech.
2. **Handle different number formats**:
   - Cardinal: `123` → "one hundred twenty-three"
   - Ordinal: `2nd` → "second"
   - Monetary: `$45.67` → "forty-five dollars and sixty-seven cents"
   - Phone: `123-456-7890` → "one two three, four five six, seven eight nine zero"
   - Decimals & fractions: `3.5` → "three point five", `⅔` → "two-thirds"
   - Roman numerals: `XIV` → "fourteen" (or "the fourteenth")
3. **Remove or expand abbreviations** — `Dr.` → "Doctor", `Ave.` → "Avenue", `St.` → "Street" (but keep "St. Patrick").
4. **Alphanumeric normalization** — `Ctrl + Z` → "control z", `100km` → "one hundred kilometers", `100%` → "one hundred percent", URLs spoken out, dates expanded.
5. **Consider edge cases** — locale-dependent dates, 24h vs 12h time.

A starter prompt:

```text
Convert the output text into a format suitable for text-to-speech. Ensure that numbers, symbols, and abbreviations are expanded for clarity when read aloud. Expand all abbreviations to their full spoken forms.

Example input and output:

"$42.50" → "forty-two dollars and fifty cents"
"£1,001.32" → "one thousand and one pounds and thirty-two pence"
"1234" → "one thousand two hundred thirty-four"
"3.14" → "three point one four"
"555-555-5555" → "five five five, five five five, five five five five"
"2nd" → "second"
"XIV" → "fourteen" - unless it's a title, then it's "the fourteenth"
"3.5" → "three point five"
"⅔" → "two-thirds"
"Dr." → "Doctor"
"Ave." → "Avenue"
"St." → "Street" (but saints like "St. Patrick" should remain)
"Ctrl + Z" → "control z"
"100km" → "one hundred kilometers"
"100%" → "one hundred percent"
"elevenlabs.io/docs" → "eleven labs dot io slash docs"
"2024-01-01" → "January first, two-thousand twenty-four"
"123 Main St, Anytown, USA" → "one two three Main Street, Anytown, United States of America"
"14:30" → "two thirty PM"
"01/02/2023" → "January second, two-thousand twenty-three" or "the first of February, two-thousand twenty-three", depending on locale of the user
```

#### Use regex for preprocessing

```typescript
import { toWords } from 'number-to-words';

function normalizeText(text: string): string {
  return text
    .replace(/([$£€¥])(\d+(?:,\d{3})*(?:\.\d{2})?)/g, (_, currency, num) => {
      const numWithoutCommas = num.replace(/,/g, '');
      const currencyMap: Record<string, string> = {
        $: 'dollars', '£': 'pounds', '€': 'euros', '¥': 'yen',
      };
      if (numWithoutCommas.includes('.')) {
        const [dollars, cents] = numWithoutCommas.split('.');
        return `${toWords(Number.parseInt(dollars))} ${currencyMap[currency] || 'currency'}${cents ? ` and ${toWords(Number.parseInt(cents))} cents` : ''}`;
      }
      return `${toWords(Number.parseInt(numWithoutCommas))} ${currencyMap[currency] || 'currency'}`;
    })
    .replace(/(\d{3})-(\d{3})-(\d{4})/g, (_, p1, p2, p3) =>
      `${spellOutDigits(p1)}, ${spellOutDigits(p2)}, ${spellOutDigits(p3)}`
    );
}

function spellOutDigits(num: string): string {
  return num.split('').map((d) => toWords(Number.parseInt(d))).join(' ');
}
```

## Prompting Eleven v3

> Eleven v3 does not support SSML break tags. Use audio tags, punctuation (ellipses), and text structure to control pauses and pacing with v3.

### Voice selection

Voice choice is the most important parameter for v3. The reference voice must be similar enough to the desired delivery — a meditative voice will not respond well to `[shout]`. When creating IVCs include a broader emotional range. Neutral voices tend to be more stable across languages and styles.

> Professional Voice Clones (PVCs) are not yet fully optimised for Eleven v3. Prefer an Instant Voice Clone (IVC) or designed voice during the v3 research preview.

### Settings

#### Stability

The stability slider has three v3 presets:

- **Creative** — most expressive, but prone to hallucinations.
- **Natural** — closest to the reference recording (balanced default).
- **Robust** — highly stable, but less responsive to directional prompts.

For maximum expressiveness with audio tags, use **Creative** or **Natural**. **Robust** reduces responsiveness to directional prompts.

### Audio tags

v3 introduces emotional control through audio tags. You can direct voices to laugh, whisper, act sarcastic, or express curiosity. Speed is also controlled through audio tags.

> The voice you choose and its training samples affect tag effectiveness. Don't expect a whispering voice to suddenly shout with `[shout]`.

#### Voice-related

- `[laughs]`, `[laughs harder]`, `[starts laughing]`, `[wheezing]`
- `[whispers]`
- `[sighs]`, `[exhales]`
- `[sarcastic]`, `[curious]`, `[excited]`, `[crying]`, `[snorts]`, `[mischievously]`

```text
[whispers] I never knew it could be this way, but I'm glad we're here.
```

#### Sound effects

- `[gunshot]`, `[applause]`, `[clapping]`, `[explosion]`
- `[swallows]`, `[gulps]`

```text
[applause] Thank you all for coming tonight! [gunshot] What was that?
```

#### Unique and special

- `[strong X accent]` (replace X with desired accent)
- `[sings]`, `[woo]`, `[fart]`

```text
[strong French accent] "Zat's life, my friend — you can't control everysing."
```

### Punctuation

- **Ellipses (`...`)** add pauses and weight.
- **Capitalization** increases emphasis.
- **Standard punctuation** provides natural rhythm.

```text
"It was a VERY long day [sigh] … nobody listens anymore."
```

### Multi-speaker dialogue

v3 handles multi-voice prompts effectively. Assign distinct voices for each speaker.

```text
Speaker 1: [excitedly] Sam! Have you tried the new Eleven V3?
Speaker 2: [curiously] Just got it! The clarity is amazing. I can actually do whispers now—
[whispers] like this!
```

### Enhancing input — the official "Enhance" prompt (reference)

The non-exhaustive tag list used by the in-app Enhance feature includes:

**Directions:** `[happy]`, `[sad]`, `[excited]`, `[angry]`, `[whisper]`, `[annoyed]`, `[appalled]`, `[thoughtful]`, `[surprised]`

**Non-verbal:** `[laughing]`, `[chuckles]`, `[sighs]`, `[clears throat]`, `[short pause]`, `[long pause]`, `[exhales sharply]`, `[inhales deeply]`

Rules: tags must describe something **auditory** for the voice — never music, sound effects, or physical actions like `[standing]`, `[grinning]`, `[pacing]`.

### Tips

- **Tag combinations** — combine multiple tags for complex delivery.
- **Voice matching** — match tags to the voice's character; serious voices may not respond to `[giggles]`.
- **Text structure** — natural punctuation and clear emotional context produce the best results.
- **Experimentation** — there are many more effective tags beyond this list.
