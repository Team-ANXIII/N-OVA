import type { AvatarDirective } from "./types";
import type { ILive2DDriver } from "./ILive2DDriver";

export class AvatarController {
  private timelineTimers: number[] = [];
  private animations = new Map<string, number>();
  private paramCache = new Map<string, number>();

  constructor(private driver: ILive2DDriver) {}

  async loadModel(modelUrl: string): Promise<void> {
    await this.driver.load(modelUrl);
  }

  unloadModel(): void {
    this.clearTimeline();
    this.driver.unload();
  }

  applyDirective(directive: AvatarDirective): void {
    this.clearTimeline();

    this.driver.setExpression(directive.expression);
    this.driver.triggerMotion(
      directive.gesture?.motion ?? null,
      directive.gesture?.priority ?? "normal"
    );

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
}
