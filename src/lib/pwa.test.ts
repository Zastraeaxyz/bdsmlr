import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface ManifestShortcut {
  name: string;
  url: string;
}

interface Manifest {
  id?: string;
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  prefer_related_applications?: boolean;
  icons?: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
}

const publicFile = (path: string) =>
  fileURLToPath(new URL(`../../public${path}`, import.meta.url));

const manifest: Manifest = JSON.parse(
  readFileSync(publicFile("/manifest.webmanifest"), "utf8"),
);

function pngSize(buffer: Buffer): { width: number; height: number } {
  const signature = buffer.subarray(0, 4).toString("hex");
  expect(signature).toBe("89504e47");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("web app manifest", () => {
  it("declares what Chrome needs to offer an install", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.prefer_related_applications).toBe(false);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps the start url and shortcuts inside the app scope", () => {
    const urls = [
      manifest.start_url ?? "",
      ...(manifest.shortcuts ?? []).map((shortcut) => shortcut.url),
    ];
    for (const url of urls) {
      expect(url.startsWith("/")).toBe(true);
    }
    for (const shortcut of manifest.shortcuts ?? []) {
      expect(shortcut.name).toBeTruthy();
    }
  });

  it("has the 192px and 512px any and maskable icons", () => {
    const icons = manifest.icons ?? [];
    const has = (purpose: string, size: string) =>
      icons.some(
        (icon) => icon.purpose === purpose && icon.sizes === size,
      );

    expect(has("any", "192x192")).toBe(true);
    expect(has("any", "512x512")).toBe(true);
    expect(has("maskable", "192x192")).toBe(true);
    expect(has("maskable", "512x512")).toBe(true);
  });

  it("points every icon at a real file of the declared size", () => {
    for (const icon of manifest.icons ?? []) {
      expect(icon.type).toBe("image/png");
      const path = publicFile(icon.src);
      expect(existsSync(path), `${icon.src} is missing`).toBe(true);

      const [width, height] = icon.sizes.split("x").map(Number);
      expect(pngSize(readFileSync(path))).toEqual({ width, height });
    }
  });

  it("ships an apple touch icon for iOS", () => {
    const path = publicFile("/icons/apple-touch-icon.png");
    expect(existsSync(path)).toBe(true);
    expect(pngSize(readFileSync(path))).toEqual({ width: 180, height: 180 });
  });
});
