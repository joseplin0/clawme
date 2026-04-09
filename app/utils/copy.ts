export async function copyText(text: string) {
  const value = text.trim();

  if (!value || !import.meta.client) {
    return false;
  }

  if (globalThis.navigator?.clipboard?.writeText) {
    try {
      await globalThis.navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to the legacy selection-based copy flow below.
    }
  }

  const textarea = globalThis.document?.createElement("textarea");
  if (!textarea) {
    return false;
  }

  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";

  globalThis.document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    return globalThis.document.execCommand("copy");
  } catch {
    return false;
  } finally {
    globalThis.document.body.removeChild(textarea);
  }
}
