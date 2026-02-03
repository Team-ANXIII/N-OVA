import { z } from "zod";

export const AvatarDirectiveSchema = z.object({
  spokenText: z.string(),
  emotion: z.enum([
    "neutral",
    "happy",
    "sad",
    "angry",
    "shy",
    "excited",
    "tired",
    "surprised"
  ]),
  intensity: z.number().min(0).max(1),
  gesture: z.object({
    motion: z.string().nullable(),
    priority: z.enum(["idle", "normal", "force"])
  }),
  expression: z.string().nullable(),
  microTimeline: z
    .array(
      z.object({
        t: z.number().min(0),
        params: z.array(
          z.object({
            id: z.string(),
            value: z.number(),
            fade: z.number().min(0)
          })
        )
      })
    )
    .default([]),
  tts: z.object({
    voice: z.string().nullable(),
    speed: z.number().nullable(),
    pitch: z.number().nullable()
  })
});

export type AvatarDirective = z.infer<typeof AvatarDirectiveSchema>;

export type AvatarEmotion = AvatarDirective["emotion"];
export type MotionPriority = AvatarDirective["gesture"]["priority"];
