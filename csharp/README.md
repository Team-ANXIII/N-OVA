# N:OVA WPF Host (Transparent Overlay)

This project hosts the web UI in a transparent WPF window using WebView2.

## Requirements
- Windows 10/11
- .NET 6 SDK
- WebView2 Runtime (Evergreen)

## Build & Run
1. Open `NNovaHost.sln` in Visual Studio.
2. Restore NuGet packages.
3. Build + run `NNovaHost`.

The app loads `http://localhost:3000` by default.
To override, set the environment variable `NNOVA_URL`.

## Transparency Notes
- `Window` uses `AllowsTransparency="True"`, `Background="Transparent"`, and `WindowStyle="None"`.
- WebView2 also sets `DefaultBackgroundColor = Transparent`.

Transparency support depends on GPU/driver combinations and Windows configuration.
If you see a black background, try a fallback:
- Use a solid background color in XAML.
- Use a chroma key color in the web UI and filter it in OBS.

Please test on your target environment.
