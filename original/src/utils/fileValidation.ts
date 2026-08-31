const ALLOWED_FILENAME_REGEX = /^[\p{L}\p{N} ._-]+$/u;

const DANGEROUS_EXTENSION_SET = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "pif",
  "scr",
  "vbs",
  "vbe",
  "jse",
  "wsf",
  "wsh",
  "msc",
  "msi",
  "msp",
  "hta",
  "cpl",
  "dll",
  "ocx",
  "sh",
  "bash",
  "zsh",
  "fish",
  "csh",
  "ksh",
  "php",
  "php3",
  "php4",
  "php5",
  "phtml",
  "asp",
  "aspx",
  "asa",
  "asax",
  "py",
  "pyc",
  "pyw",
  "rb",
  "pl",
  "cgi",
  "ps1",
  "psm1",
  "psd1",
]);

const BLOCKED_EXTENSIONS_SET = new Set(["svg", "svgz", "html", "htm", "xhtml", "mhtml", "xml"]);

export function isFilenameSafe(name: string): boolean {
  if (!name) return false;
  if (name.startsWith(".")) return false;
  if (name.includes("..")) return false;
  if (!ALLOWED_FILENAME_REGEX.test(name)) return false;
  return true;
}

export function hasDoubleExtension(name: string): boolean {
  return name.split(".").length > 2;
}

export function hasHiddenDangerousExtension(name: string): boolean {
  const parts = name.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DANGEROUS_EXTENSION_SET.has(parts[i].toLowerCase())) return true;
  }
  return false;
}

export function isBlockedExtension(name: string): boolean {
  if (!name) return false;
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex === -1) return false;
  const extension = name.substring(lastDotIndex + 1).toLowerCase();
  return BLOCKED_EXTENSIONS_SET.has(extension);
}
