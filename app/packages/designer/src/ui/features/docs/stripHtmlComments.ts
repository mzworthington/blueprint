/** Strip HTML comments so reporter placeholders are not shown as text. */
export function stripHtmlComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}
