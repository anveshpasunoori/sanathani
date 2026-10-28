// Files in public/ are written as root paths ("/audio/x.mp3"). The web build can be served from a
// sub-folder (GitHub Pages: /nitya/), so they are resolved against the build's base path.
// The phone apps and local dev use "/", where nothing changes.
export const asset = (path: string) => (path.startsWith('/') ? import.meta.env.BASE_URL + path.slice(1) : path);
