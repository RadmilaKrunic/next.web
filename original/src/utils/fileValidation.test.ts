import { describe, it, expect } from "vitest";
import {
  isFilenameSafe,
  hasDoubleExtension,
  hasHiddenDangerousExtension,
  isBlockedExtension,
} from "./fileValidation";

describe("isFilenameSafe", () => {
  it('returns true for "document.pdf"', () => {
    expect(isFilenameSafe("document.pdf")).toBe(true);
  });

  it('returns true for "Invoice 2024.pdf" (space allowed)', () => {
    expect(isFilenameSafe("Invoice 2024.pdf")).toBe(true);
  });

  it('returns true for "résumé.pdf" (accented chars are allowed)', () => {
    expect(isFilenameSafe("r\u00e9sum\u00e9.pdf")).toBe(true);
  });

  it("returns true for CJK unicode filename (allowed)", () => {
    expect(isFilenameSafe("\u5831\u544a\u66f8.pdf")).toBe(true);
  });

  it('returns false for "../etc/passwd" (path traversal)', () => {
    expect(isFilenameSafe("../etc/passwd")).toBe(false);
  });

  it('returns false for "file;name.pdf"', () => {
    expect(isFilenameSafe("file;name.pdf")).toBe(false);
  });

  it('returns false for "file:name.pdf"', () => {
    expect(isFilenameSafe("file:name.pdf")).toBe(false);
  });

  it("returns false for a filename containing a backslash (not allowed)", () => {
    expect(isFilenameSafe(String.raw`file\name.pdf`)).toBe(false);
  });

  it("returns false for filename with null byte", () => {
    expect(isFilenameSafe("file\x00name.pdf")).toBe(false);
  });

  it('returns false for ".hidden" (leading dot)', () => {
    expect(isFilenameSafe(".hidden")).toBe(false);
  });

  it('returns false for "" (empty)', () => {
    expect(isFilenameSafe("")).toBe(false);
  });

  it('returns false for "php%00.jpg" (percent-encoded null byte)', () => {
    expect(isFilenameSafe("php%00.jpg")).toBe(false);
  });

  it('returns false for "%2F" (percent-encoded slash)', () => {
    expect(isFilenameSafe("file%2Fname.pdf")).toBe(false);
  });

  it("returns false for malformed percent encoding", () => {
    expect(isFilenameSafe("file%ZZname.pdf")).toBe(false);
  });
});

describe("hasDoubleExtension", () => {
  it('returns false for "document.pdf"', () => {
    expect(hasDoubleExtension("document.pdf")).toBe(false);
  });

  it('returns true for "report.final.pdf"', () => {
    expect(hasDoubleExtension("report.final.pdf")).toBe(true);
  });

  it('returns true for "archive.tar.gz"', () => {
    expect(hasDoubleExtension("archive.tar.gz")).toBe(true);
  });

  it('returns false for "nodotfile"', () => {
    expect(hasDoubleExtension("nodotfile")).toBe(false);
  });
});

describe("hasHiddenDangerousExtension", () => {
  it('returns false for "document.pdf"', () => {
    expect(hasHiddenDangerousExtension("document.pdf")).toBe(false);
  });

  it('returns false for "Invoice 2024.pdf"', () => {
    expect(hasHiddenDangerousExtension("Invoice 2024.pdf")).toBe(false);
  });

  it('returns true for "exe.jpg" (stem is dangerous extension)', () => {
    expect(hasHiddenDangerousExtension("exe.jpg")).toBe(true);
  });

  it('returns true for "malware.exe.jpg"', () => {
    expect(hasHiddenDangerousExtension("malware.exe.jpg")).toBe(true);
  });

  it('returns true for "script.php.jpg"', () => {
    expect(hasHiddenDangerousExtension("script.php.jpg")).toBe(true);
  });

  it('returns true for "attack.bat.pdf"', () => {
    expect(hasHiddenDangerousExtension("attack.bat.pdf")).toBe(true);
  });

  it('returns false for "report.final.pdf" (non-dangerous segments)', () => {
    expect(hasHiddenDangerousExtension("report.final.pdf")).toBe(false);
  });

  it('returns false for "nodotfile"', () => {
    expect(hasHiddenDangerousExtension("nodotfile")).toBe(false);
  });
});

describe("isBlockedExtension", () => {
  // Blocked extensions: svg, svgz, html, htm, xhtml, mhtml, xml

  it('returns true for "malicious.svg" (blocked: SVG)', () => {
    expect(isBlockedExtension("malicious.svg")).toBe(true);
  });

  it('returns true for "malicious.SVG" (case-insensitive: uppercase SVG)', () => {
    expect(isBlockedExtension("malicious.SVG")).toBe(true);
  });

  it('returns true for "malicious.html" (blocked: HTML)', () => {
    expect(isBlockedExtension("malicious.html")).toBe(true);
  });

  it('returns true for "malicious.HTM" (case-insensitive: uppercase HTM)', () => {
    expect(isBlockedExtension("malicious.HTM")).toBe(true);
  });

  it('returns true for "malicious.xhtml" (blocked: XHTML)', () => {
    expect(isBlockedExtension("malicious.xhtml")).toBe(true);
  });

  it('returns true for "malicious.mhtml" (blocked: MHTML)', () => {
    expect(isBlockedExtension("malicious.mhtml")).toBe(true);
  });

  it('returns true for "malicious.xml" (blocked: XML)', () => {
    expect(isBlockedExtension("malicious.xml")).toBe(true);
  });

  it('returns true for "malicious.svgz" (blocked: SVGZ)', () => {
    expect(isBlockedExtension("malicious.svgz")).toBe(true);
  });

  it('returns true for "malicious.Svg" (case-insensitive: mixed case SVG)', () => {
    expect(isBlockedExtension("malicious.Svg")).toBe(true);
  });

  it('returns false for "photo.jpg" (allowed: JPG)', () => {
    expect(isBlockedExtension("photo.jpg")).toBe(false);
  });

  it('returns false for "photo.png" (allowed: PNG)', () => {
    expect(isBlockedExtension("photo.png")).toBe(false);
  });

  it('returns false for "photo.gif" (allowed: GIF)', () => {
    expect(isBlockedExtension("photo.gif")).toBe(false);
  });

  it('returns false for "photo.bmp" (allowed: BMP)', () => {
    expect(isBlockedExtension("photo.bmp")).toBe(false);
  });

  it('returns false for "photo.webp" (allowed: WEBP)', () => {
    expect(isBlockedExtension("photo.webp")).toBe(false);
  });

  it('returns false for "photo.tif" (allowed: TIF)', () => {
    expect(isBlockedExtension("photo.tif")).toBe(false);
  });

  it('returns false for "photo.tiff" (allowed: TIFF)', () => {
    expect(isBlockedExtension("photo.tiff")).toBe(false);
  });

  it('returns false for "photo.avif" (allowed: AVIF)', () => {
    expect(isBlockedExtension("photo.avif")).toBe(false);
  });

  it('returns false for "photo.heic" (allowed: HEIC)', () => {
    expect(isBlockedExtension("photo.heic")).toBe(false);
  });

  it('returns false for "photo.heif" (allowed: HEIF)', () => {
    expect(isBlockedExtension("photo.heif")).toBe(false);
  });

  it('returns false for "document.pdf" (allowed: PDF)', () => {
    expect(isBlockedExtension("document.pdf")).toBe(false);
  });

  it('returns false for "file.txt" (not in blocked list)', () => {
    expect(isBlockedExtension("file.txt")).toBe(false);
  });

  it('returns false for "nodotfile" (no extension)', () => {
    expect(isBlockedExtension("nodotfile")).toBe(false);
  });

  it('returns false for "" (empty string)', () => {
    expect(isBlockedExtension("")).toBe(false);
  });
});
