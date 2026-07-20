/** Strip HTML comments so reporter placeholders are not shown as text. */
export function stripHtmlComments(markdown: string): string {
  let current = markdown;
  let previous: string;

  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?-->/g, '');
  } while (current !== previous);

  return current;
}
