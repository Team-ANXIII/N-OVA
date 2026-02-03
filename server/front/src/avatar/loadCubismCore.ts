let loadPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function hasCubismCore(): boolean {
  return Boolean((window as any).Live2DCubismCore);
}

export async function ensureCubismCore(): Promise<void> {
  if (hasCubismCore()) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const candidates = [
      "/live2d/live2dcubismcore.min.js",
      "/live2d/live2dcubismcore.js"
    ];

    for (const src of candidates) {
      try {
        await loadScript(src);
        if (hasCubismCore()) return;
      } catch (error) {
        // Try next candidate
      }
    }

    throw new Error(
      "Live2D 런타임 파일을 찾을 수 없습니다. /public/live2d/에 live2dcubismcore.min.js(또는 .js)를 넣고 다시 빌드하세요."
    );
  })();

  return loadPromise;
}
