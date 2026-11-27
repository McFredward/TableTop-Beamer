// OpenCV uses importScripts, so the worker starts as a classic script.
void import("./camera-automation-observer.js").then(({ runCameraAutomation }) => runCameraAutomation());
