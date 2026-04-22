"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";

function buildAvatarPrompt(
  name: string,
  role: string,
  era: string,
  timePeriod: string,
  gender: string,
  age: number,
  origin: string,
  traits: string[],
  backstory: string,
  speakingStyle: string
): string {
  const traitsStr = traits.slice(0, 5).join(", ");

  // Extract key emotional/physical cues from backstory
  const backstoryHint = backstory.slice(0, 200);

  return `Photorealistic portrait photograph of ${name}, a ${age}-year-old ${gender} ${role} from ${origin} during the ${era} era (${timePeriod}).

SUBJECT DESCRIPTION:
- Age: ${age} years old, with age-appropriate features and skin texture
- Gender: ${gender}
- Origin: ${origin} - with ethnically accurate facial features
- Role: ${role}
- Personality visible in expression: ${traitsStr}

PORTRAIT STYLE:
- Photorealistic, cinematic portrait photography
- Shot on 85mm lens, f/1.8 aperture for soft background blur
- Professional studio-quality lighting with dramatic shadows
- Eye-level camera angle, slight three-quarter face turn
- Sharp focus on eyes and facial features
- Natural skin texture with pores, subtle imperfections
- Period-accurate clothing, hairstyle, and accessories for ${era} era

BACKGROUND:
- Contextual background suggesting their ${era} era environment
- Soft bokeh effect, muted colors that complement the subject
- Environmental hints of their role as ${role}

MOOD & EXPRESSION:
- Expression reflecting: ${traitsStr}
- Eyes conveying depth of character and ${era} era worldview
- Subtle emotional undertones from their story: ${backstoryHint}...

TECHNICAL:
- 8K resolution, hyperdetailed
- Professional color grading
- Photorealistic human rendering

Negative prompt: cartoon, anime, painting, illustration, artistic, stylized, blurry, low quality, distorted features, extra limbs, disfigured, bad anatomy, watermark, text, logo, signature, frame, border, cropped`;
}

function buildBannerPrompt(
  title: string,
  era: string,
  timePeriod: string,
  description: string
): string {
  return `Photorealistic cinematic wide shot depicting "${title}" from the ${era} era (${timePeriod}).

SCENE DESCRIPTION:
${description}

VISUAL STYLE:
- Photorealistic, cinematic film still quality
- Shot on ARRI Alexa with anamorphic lens
- Epic wide establishing shot composition
- Golden hour or dramatic atmospheric lighting
- Rich, period-accurate color palette for ${era} era

ENVIRONMENT:
- Historically accurate architecture, vehicles, and props for ${timePeriod}
- Atmospheric effects: dust, smoke, fog, or haze appropriate to the scene
- Background crowds or environmental details suggesting the scale of events
- Weather and lighting matching the historical moment

COMPOSITION:
- Rule of thirds with strong focal point
- Leading lines drawing eye into the scene
- Depth through foreground, midground, and background elements
- No prominent faces - environmental/atmospheric focus

TECHNICAL:
- 8K resolution, hyperdetailed environments
- Professional film color grading
- Photorealistic textures on all surfaces
- Volumetric lighting and atmospheric depth

Negative prompt: people facing camera, portrait, close-up faces, cartoon, anime, painting, illustration, blurry, low quality, watermark, text, logo, modern elements, anachronistic objects`;
}

export const exportAllPrompts = action({
  args: {},
  handler: async (ctx) => {
    const scenarios = await ctx.runQuery(api.scenarios.getPrebuiltScenarios, { era: undefined });

    const bannerPrompts: Array<{
      scenarioId: string;
      title: string;
      era: string;
      timePeriod: string;
      status: string;
      prompt: string;
    }> = [];

    const avatarPrompts: Array<{
      personaId: string;
      name: string;
      role: string;
      scenarioTitle: string;
      era: string;
      status: string;
      prompt: string;
    }> = [];

    for (const s of scenarios) {
      // Banner prompt
      bannerPrompts.push({
        scenarioId: s._id,
        title: s.title,
        era: s.era,
        timePeriod: s.timePeriod,
        status: s.bannerGenerationStatus ?? "pending",
        prompt: buildBannerPrompt(s.title, s.era, s.timePeriod, s.description),
      });

      // Persona prompts
      const personas = await ctx.runQuery(api.scenarios.getPersonasForScenario, { scenarioId: s._id });
      for (const p of personas) {
        avatarPrompts.push({
          personaId: p._id,
          name: p.name,
          role: p.historicalRole,
          scenarioTitle: s.title,
          era: s.era,
          status: p.avatarGenerationStatus,
          prompt: buildAvatarPrompt(
            p.name,
            p.historicalRole,
            s.era,
            s.timePeriod,
            p.gender,
            p.estimatedAge,
            p.geographicOrigin,
            p.personalityTraits,
            p.emotionalBackstory,
            p.speakingStyle
          ),
        });
      }
    }

    return {
      totalBanners: bannerPrompts.length,
      totalAvatars: avatarPrompts.length,
      banners: bannerPrompts,
      avatars: avatarPrompts,
    };
  },
});
