export const stripHtml = (html?: string | null): string => {
  if (!html) return "";
  let text = html.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/li>/gi, "; ");
  text = text.replace(/<[^>]*>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Clean up duplicate/trailing semicolons
  text = text.replace(/;\s*;/g, ";");
  text = text.trim();
  if (text.endsWith(";")) {
    text = text.slice(0, -1);
  }
  return text.trim();
};
