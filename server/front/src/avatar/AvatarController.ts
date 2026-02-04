import type { AvatarDirective, AvatarEmotion } from "./types";
import type { ILive2DDriver } from "./ILive2DDriver";

type AvatarControllerOptions = {
  autoExpression?: boolean;
  emotionExpressionMap?: Partial<Record<AvatarEmotion, string | null>>;
  lockGaze?: boolean;
  gazeTarget?: { x: number; y: number };
  gazeCenter?: { x: number; y: number };
  gazeInvert?: { x: boolean; y: boolean };
  gazeParamIds?: { x: string; y: string };
};

const EMOTION_PARAMS = [
  "ParamAngleX",
  "ParamAngleY",
  "ParamAngleZ",
  "ParamBrowLY",
  "ParamBrowRY",
  "ParamMouthForm"
];

const EMOTION_PRESETS: Record<AvatarEmotion, Record<string, number>> = {
  neutral: {},
  happy: {
    ParamMouthForm: 0.6,
    ParamAngleZ: 0.08
  },
  sad: {
    ParamMouthForm: -0.3,
    ParamBrowLY: -0.3,
    ParamBrowRY: -0.3,
    ParamAngleX: -0.1,
    ParamAngleZ: -0.05
  },
  angry: {
    ParamMouthForm: -0.2,
    ParamBrowLY: 0.4,
    ParamBrowRY: 0.4,
    ParamAngleZ: 0.08
  },
  shy: {
    ParamAngleX: -0.2,
    ParamAngleY: -0.1,
    ParamMouthForm: 0.2
  },
  excited: {
    ParamMouthForm: 0.7,
    ParamAngleX: 0.15,
    ParamAngleY: 0.05
  },
  tired: {
    ParamMouthForm: -0.1,
    ParamBrowLY: -0.2,
    ParamBrowRY: -0.2,
    ParamAngleY: -0.15
  },
  surprised: {
    ParamMouthForm: 0.2,
    ParamBrowLY: 0.3,
    ParamBrowRY: 0.3,
    ParamAngleY: 0.2
  }
};

const DEFAULT_EMOTION_EXPRESSION_MAP: Record<AvatarEmotion, string | null> = {
  neutral: "neutral",
  happy: "happy",
  sad: "sad",
  angry: "angry",
  shy: "shy",
  excited: "excited",
  tired: "tired",
  surprised: "surprised"
};

export class AvatarController {
  private timelineTimers: number[] = [];
  private animations = new Map<string, number>();
  private paramCache = new Map<string, number>();
  private options: Required<AvatarControllerOptions>;

  constructor(driver: ILive2DDriver, options: AvatarControllerOptions = {}) {
    this.driver = driver;
    this.options = {
      autoExpression: options.autoExpression ?? true,
      emotionExpressionMap: {
        ...DEFAULT_EMOTION_EXPRESSION_MAP,
        ...(options.emotionExpressionMap ?? {})
      },
      lockGaze: options.lockGaze ?? true,
      gazeTarget: options.gazeTarget ?? { x: 0, y: 0 },
      gazeCenter: options.gazeCenter ?? { x: 0, y: 0 },
      gazeInvert: options.gazeInvert ?? { x: false, y: false },
      gazeParamIds: options.gazeParamIds ?? {
        x: "ParamEyeBallX",
        y: "ParamEyeBallY"
      }
    };
  }

  private driver: ILive2DDriver;

  async loadModel(modelUrl: string): Promise<void> {
    await this.driver.load(modelUrl);
    this.applyGaze();
  }

  unloadModel(): void {
    this.clearTimeline();
    this.driver.unload();
  }

  applyDirective(directive: AvatarDirective): void {
    this.clearTimeline();

    const expression =
      directive.expression ??
      (this.options.autoExpression
        ? this.options.emotionExpressionMap[directive.emotion] ?? null
        : null);
    this.driver.setExpression(expression);
    this.driver.triggerMotion(
      directive.gesture?.motion ?? null,
      directive.gesture?.priority ?? "normal"
    );
    this.applyEmotion(directive.emotion, directive.intensity);
    this.applyGaze();

    directive.microTimeline.forEach((frame) => {
      const timerId = window.setTimeout(() => {
        frame.params.forEach((param) => {
          const from = this.paramCache.get(param.id) ?? 0;
          this.animateParameter(param.id, from, param.value, param.fade);
        });
      }, frame.t * 1000);

      this.timelineTimers.push(timerId);
    });
  }

  setLipSync(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.driver.setParameter("ParamMouthOpenY", clamped);
    this.paramCache.set("ParamMouthOpenY", clamped);
  }

  dispose(): void {
    this.clearTimeline();
    this.driver.dispose();
  }

  setGazeConfig(update: {
    lockGaze?: boolean;
    gazeTarget?: { x: number; y: number };
    gazeCenter?: { x: number; y: number };
    gazeInvert?: { x: boolean; y: boolean };
    gazeParamIds?: { x: string; y: string };
  }): void {
    this.options = {
      ...this.options,
      ...update,
      gazeTarget: update.gazeTarget ?? this.options.gazeTarget,
      gazeCenter: update.gazeCenter ?? this.options.gazeCenter,
      gazeInvert: update.gazeInvert ?? this.options.gazeInvert,
      gazeParamIds: update.gazeParamIds ?? this.options.gazeParamIds
    };
    this.applyGaze();
  }

  private clearTimeline(): void {
    this.timelineTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.timelineTimers = [];
    this.clearAnimations();
  }

  private clearAnimations(): void {
    this.animations.forEach((rafId) => cancelAnimationFrame(rafId));
    this.animations.clear();
  }

  private animateParameter(id: string, from: number, to: number, fade: number): void {
    const duration = Math.max(0, fade);

    if (this.animations.has(id)) {
      const rafId = this.animations.get(id)!;
      cancelAnimationFrame(rafId);
      this.animations.delete(id);
    }

    if (duration === 0) {
      this.driver.setParameter(id, to);
      this.paramCache.set(id, to);
      return;
    }

    const start = performance.now();
    const step = () => {
      const elapsed = (performance.now() - start) / 1000;
      const t = Math.min(1, elapsed / duration);
      const value = from + (to - from) * t;
      this.driver.setParameter(id, value);
      this.paramCache.set(id, value);

      if (t < 1) {
        const rafId = requestAnimationFrame(step);
        this.animations.set(id, rafId);
      } else {
        this.animations.delete(id);
      }
    };

    const rafId = requestAnimationFrame(step);
    this.animations.set(id, rafId);
  }

  private applyEmotion(emotion: AvatarEmotion, intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    const preset = EMOTION_PRESETS[emotion] ?? {};
    const fade = 0.25;

    EMOTION_PARAMS.forEach((id) => {
      const base = preset[id] ?? 0;
      const from = this.paramCache.get(id) ?? 0;
      const to = base * clamped;
      this.animateParameter(id, from, to, fade);
    });
  }

  private applyGaze(): void {
    if (!this.options.lockGaze) return;
    const rawX = this.options.gazeTarget.x + this.options.gazeCenter.x;
    const rawY = this.options.gazeTarget.y + this.options.gazeCenter.y;
    const invX = this.options.gazeInvert.x ? -1 : 1;
    const invY = this.options.gazeInvert.y ? -1 : 1;
    const targetX = Math.max(-1, Math.min(1, rawX * invX));
    const targetY = Math.max(-1, Math.min(1, rawY * invY));
    const { x: xId, y: yId } = this.options.gazeParamIds;
    const fade = 0.2;

    const fromX = this.paramCache.get(xId) ?? 0;
    const fromY = this.paramCache.get(yId) ?? 0;
    this.animateParameter(xId, fromX, targetX, fade);
    this.animateParameter(yId, fromY, targetY, fade);
  }
}
