/**
 * Minimal markdown → HTML converter for Chrome AI output.
 * Handles: **bold**, *italic*, `code`, unordered lists (* / -), headings (##), paragraphs.
 * Source is local AI model, not user input — no sanitization needed.
 */

function inlineMarkdown(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`(.+?)`/g, "<code>$1</code>");
}

export function renderMarkdown(md: string): string {
	const lines = md.split("\n");
	const html: string[] = [];
	let inList = false;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "") {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			continue;
		}

		const listMatch = trimmed.match(/^[*-]\s+(.*)/);
		if (listMatch) {
			if (!inList) {
				html.push("<ul>");
				inList = true;
			}
			const [, item = ""] = listMatch;
			html.push(`<li>${inlineMarkdown(item)}</li>`);
			continue;
		}

		if (inList) {
			html.push("</ul>");
			inList = false;
		}

		const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
		if (headingMatch) {
			const [, hashes = "", content = ""] = headingMatch;
			const level = Math.min(hashes.length + 2, 6);
			html.push(`<h${level}>${inlineMarkdown(content)}</h${level}>`);
			continue;
		}

		html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
	}

	if (inList) html.push("</ul>");
	return html.join("");
}
