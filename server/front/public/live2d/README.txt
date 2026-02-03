Place your Live2D model folder here.

Example:
- server/front/public/live2d/YourModel/
  - YourModel.model3.json (or model.json)
  - motions/
  - textures/
  - expressions/

Cubism 4 models (model3.json) require the Cubism core runtime file:
- server/front/public/live2d/live2dcubismcore.min.js
You must supply this file from the official Live2D SDK (do not commit it).
If you already built the front-end, rebuild so the file is copied to dist
or manually copy it to server/front/dist/live2d/.

If you use older Cubism 2 models (model.json), you need live2d.min.js instead
and the driver import must switch to the Cubism 2 runtime.

In the UI, set the model path like:
  /live2d/YourModel/YourModel.model3.json

Do NOT commit model files into this repository.
