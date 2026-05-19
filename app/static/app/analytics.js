export function trackUmami(event) {
  if (typeof umami !== "undefined") umami.track(event);
}
