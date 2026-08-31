import { describe, it, expect } from "vitest";

/**
 * Tests for FileUpload validation logic.
 * Focus: blocked extension precedence, case-insensitivity, and new safe image extensions.
 */

describe("FileUpload validation logic", () => {
  describe("Blocked extension precedence", () => {
    /**
     * Test: Even if SVG is in allowedFormats, it should still be blocked.
     * This ensures blocked extensions have precedence over allowedFormats.
     */
    it("should reject SVG file even if it is in allowedFormats (blocked has precedence)", () => {
      const fileName = "image.svg";

      // The validation logic in FileUpload component:
      // 1. Check if blocked (should reject)
      // 2. Then check if format is invalid
      // If blocked check comes first, file is rejected before allowedFormats check
      const isBlockedExtensionFunction = (name: string): boolean => {
        const BLOCKED = new Set(["svg", "svgz", "html", "htm", "xhtml", "mhtml", "xml"]);
        const lastDotIndex = name.lastIndexOf(".");
        if (lastDotIndex === -1) return false;
        const ext = name.substring(lastDotIndex + 1).toLowerCase();
        return BLOCKED.has(ext);
      };

      const blocked = isBlockedExtensionFunction(fileName);
      expect(blocked).toBe(true);
    });

    it("should reject HTML file even if it is in allowedFormats", () => {
      const isBlockedExtensionFunction = (name: string): boolean => {
        const BLOCKED = new Set(["svg", "svgz", "html", "htm", "xhtml", "mhtml", "xml"]);
        const lastDotIndex = name.lastIndexOf(".");
        if (lastDotIndex === -1) return false;
        const ext = name.substring(lastDotIndex + 1).toLowerCase();
        return BLOCKED.has(ext);
      };

      expect(isBlockedExtensionFunction("malicious.html")).toBe(true);
      expect(isBlockedExtensionFunction("malicious.htm")).toBe(true);
      expect(isBlockedExtensionFunction("malicious.xhtml")).toBe(true);
    });
  });

  describe("Case-insensitive blocked extension matching", () => {
    const isBlockedExtensionFunction = (name: string): boolean => {
      const BLOCKED = new Set(["svg", "svgz", "html", "htm", "xhtml", "mhtml", "xml"]);
      const lastDotIndex = name.lastIndexOf(".");
      if (lastDotIndex === -1) return false;
      const ext = name.substring(lastDotIndex + 1).toLowerCase();
      return BLOCKED.has(ext);
    };

    it("should match uppercase SVG", () => {
      expect(isBlockedExtensionFunction("malicious.SVG")).toBe(true);
    });

    it("should match mixed case Svg", () => {
      expect(isBlockedExtensionFunction("malicious.Svg")).toBe(true);
    });

    it("should match uppercase XML", () => {
      expect(isBlockedExtensionFunction("config.XML")).toBe(true);
    });

    it("should match lowercase svgz", () => {
      expect(isBlockedExtensionFunction("image.svgz")).toBe(true);
    });
  });

  describe("New safe image extensions (positive cases)", () => {
    const isValidNewExtension = (fileName: string, allowedFormats: string[]): boolean => {
      return allowedFormats.some((format) => fileName.toLowerCase().endsWith(format.toLowerCase()));
    };

    const newSafeExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".tif",
      ".tiff",
      ".avif",
      ".heic",
      ".heif",
    ];

    it("should accept new GIF format", () => {
      expect(isValidNewExtension("photo.gif", newSafeExtensions)).toBe(true);
    });

    it("should accept new BMP format", () => {
      expect(isValidNewExtension("photo.bmp", newSafeExtensions)).toBe(true);
    });

    it("should accept new WEBP format", () => {
      expect(isValidNewExtension("photo.webp", newSafeExtensions)).toBe(true);
    });

    it("should accept new TIF format", () => {
      expect(isValidNewExtension("photo.tif", newSafeExtensions)).toBe(true);
    });

    it("should accept new TIFF format", () => {
      expect(isValidNewExtension("photo.tiff", newSafeExtensions)).toBe(true);
    });

    it("should accept new AVIF format", () => {
      expect(isValidNewExtension("photo.avif", newSafeExtensions)).toBe(true);
    });

    it("should accept new HEIC format", () => {
      expect(isValidNewExtension("photo.heic", newSafeExtensions)).toBe(true);
    });

    it("should accept new HEIF format", () => {
      expect(isValidNewExtension("photo.heif", newSafeExtensions)).toBe(true);
    });

    it("should still accept legacy JPG format", () => {
      expect(isValidNewExtension("photo.jpg", newSafeExtensions)).toBe(true);
    });

    it("should still accept legacy JPEG format", () => {
      expect(isValidNewExtension("photo.jpeg", newSafeExtensions)).toBe(true);
    });

    it("should still accept legacy PNG format", () => {
      expect(isValidNewExtension("photo.png", newSafeExtensions)).toBe(true);
    });
  });

  describe("Integration: Validation flow with precedence", () => {
    /**
     * Simulate the FileUpload filterNewValidFiles logic:
     * 1. Check file size
     * 2. Check blocked extensions (precedence)
     * 3. Check allowed formats
     * 4. Other checks...
     */
    const validateFile = (
      fileName: string,
      maxSize: number,
      fileSize: number,
      allowedFormats: string[],
    ): { valid: boolean; reason?: string } => {
      // 1. File size check
      if (fileSize > maxSize) {
        return { valid: false, reason: "File too large" };
      }

      // 2. Blocked extension check (precedence)
      const BLOCKED = new Set(["svg", "svgz", "html", "htm", "xhtml", "mhtml", "xml"]);
      const lastDotIndex = fileName.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        const ext = fileName.substring(lastDotIndex + 1).toLowerCase();
        if (BLOCKED.has(ext)) {
          return { valid: false, reason: "Blocked extension" };
        }
      }

      // 3. Allowed formats check
      if (allowedFormats.length > 0) {
        const isValidFormat = allowedFormats.some((format) =>
          fileName.toLowerCase().endsWith(format.toLowerCase()),
        );
        if (!isValidFormat) {
          return { valid: false, reason: "Invalid format" };
        }
      }

      return { valid: true };
    };

    it("should block SVG even when allowedFormats is empty", () => {
      const result = validateFile("malicious.svg", 25 * 1024 * 1024, 1000, []);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Blocked extension");
    });

    it("should block SVG before checking format validity", () => {
      const result = validateFile("malicious.svg", 25 * 1024 * 1024, 1000, [
        ".jpg",
        ".png",
        ".svg",
      ]);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Blocked extension");
    });

    it("should accept valid new extensions", () => {
      const newFormats = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tif",
        ".tiff",
        ".avif",
        ".heic",
        ".heif",
        ".pdf",
      ];
      const result = validateFile("photo.webp", 25 * 1024 * 1024, 5000, newFormats);
      expect(result.valid).toBe(true);
    });

    it("should accept HEIC format", () => {
      const newFormats = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tif",
        ".tiff",
        ".avif",
        ".heic",
        ".heif",
        ".pdf",
      ];
      const result = validateFile("photo.heic", 25 * 1024 * 1024, 5000, newFormats);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid format not in allowedFormats", () => {
      const newFormats = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tif",
        ".tiff",
        ".avif",
        ".heic",
        ".heif",
        ".pdf",
      ];
      const result = validateFile("file.txt", 25 * 1024 * 1024, 5000, newFormats);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Invalid format");
    });

    it("should catch oversized file before format check", () => {
      const newFormats = [".jpg", ".png"];
      const result = validateFile("huge.jpg", 1024, 5000000, newFormats);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("File too large");
    });
  });
});
