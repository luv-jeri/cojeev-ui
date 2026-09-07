"use client";

export function ThemeControl() {
  return <label className="flex items-center gap-2 text-sm">
    Theme
    <select aria-label="Preview theme" defaultValue="light" className="rounded-md border border-current px-2 py-1" onChange={event => {
      document.documentElement.dataset.mode = event.target.value;
    }}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>;
}
