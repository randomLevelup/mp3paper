import html
import re
import subprocess
from pathlib import Path

INPUT_FILE = Path("paper.md")
OUTPUT_FILE = Path("index.html")


def run_pandoc(markdown_text: str) -> str:
	return subprocess.run(
		["pandoc", "-f", "markdown", "-t", "html5"],
		input=markdown_text,
		text=True,
		capture_output=True,
		check=True,
	).stdout.strip()


def split_blocks(markdown_text: str) -> list[tuple[str, str]]:
	blocks = []
	buffer = []
	in_card = False

	for line in markdown_text.splitlines():
		if line.strip() == '"""':
			chunk = "\n".join(buffer).strip()
			if chunk:
				blocks.append(("card" if in_card else "prose", chunk))
			buffer = []
			in_card = not in_card
			continue
		buffer.append(line)

	if in_card:
		raise ValueError('Unclosed card block: missing closing """ delimiter')

	chunk = "\n".join(buffer).strip()
	if chunk:
		blocks.append(("prose", chunk))

	return blocks


def pop_title(markdown_text: str) -> tuple[str, str]:
	lines = markdown_text.splitlines()
	for i, line in enumerate(lines):
		match = re.match(r"^\s*#(?!#)\s+(.+?)\s*$", line)
		if match:
			title = match.group(1).strip()
			del lines[i]
			return title, "\n".join(lines)
	return "Site Title", markdown_text


def add_class_to_tag(html_text: str, tag: str, class_names: str) -> str:
	pattern = re.compile(rf"<{tag}(\s+[^>]*)?>", re.IGNORECASE)

	def replacer(match: re.Match[str]) -> str:
		attrs = match.group(1) or ""
		class_match = re.search(r'class\s*=\s*"([^"]*)"', attrs, re.IGNORECASE)
		if class_match:
			existing = class_match.group(1).strip()
			merged = f"{existing} {class_names}".strip()
			attrs = f"{attrs[:class_match.start()]} class=\"{merged}\"{attrs[class_match.end():]}"
			return f"<{tag}{attrs}>"
		return f"<{tag}{attrs} class=\"{class_names}\">"

	return pattern.sub(replacer, html_text)


def style_prose_html(html_text: str) -> str:
	html_text = add_class_to_tag(html_text, "p", "text-paragraph")
	html_text = add_class_to_tag(html_text, "h2", "text-3xl font-bold mb-8 text-primary")
	html_text = add_class_to_tag(html_text, "h3", "text-2xl font-semibold mb-6 text-primary")
	html_text = add_class_to_tag(html_text, "ul", "bullet-list mt-4 mb-10 max-w-4xl")
	html_text = add_class_to_tag(html_text, "ol", "list-decimal pl-6 text-[#2c2e33] space-y-2 mt-4 mb-10 max-w-4xl")
	html_text = re.sub(r"<hr\s*/?>", '<hr class="my-10 border-primary-dark/30 max-w-4xl">', html_text, flags=re.IGNORECASE)
	return html_text


def style_card_body_html(html_text: str) -> str:
	html_text = add_class_to_tag(html_text, "ul", "bullet-list mt-6")
	html_text = add_class_to_tag(html_text, "ol", "list-decimal pl-6 text-[#2c2e33] space-y-2 mt-6")
	html_text = re.sub(r"<hr\s*/?>", '<hr class="my-8 border-primary-dark/30">', html_text, flags=re.IGNORECASE)
	return html_text


def replace_eyebrows(markdown_text: str) -> str:
	out = []
	for line in markdown_text.splitlines():
		match = re.match(r"^\s*~(.+?)~\s*$", line)
		if match:
			out.append(f'<div class="card-label mb-3">{html.escape(match.group(1).strip())}</div>')
		else:
			out.append(line)
	return "\n".join(out)


def parse_card(markdown_block: str) -> tuple[str | None, str | None, str]:
	lines = markdown_block.splitlines()
	while lines and not lines[0].strip():
		lines.pop(0)

	label = None
	title = None

	if lines and re.match(r"^\s*~(.+?)~\s*$", lines[0]):
		label = re.match(r"^\s*~(.+?)~\s*$", lines[0]).group(1).strip()
		lines = lines[1:]

	while lines and not lines[0].strip():
		lines.pop(0)

	if lines and re.match(r"^\s*##\s+(.+?)\s*$", lines[0]):
		title = re.match(r"^\s*##\s+(.+?)\s*$", lines[0]).group(1).strip()
		lines = lines[1:]

	return label, title, "\n".join(lines).strip()


def render_card(markdown_block: str) -> str:
	label, title, body = parse_card(markdown_block)
	out = ['<div class="card">']
	if label:
		out.append(f'  <p class="card-label">{html.escape(label)}</p>')
	if title:
		out.append(f'  <h2 class="card-heading">{html.escape(title)}</h2>')
	if body:
		body_html = style_card_body_html(run_pandoc(body))
		out.append('  <div class="content-paragraph">')
		out.extend(f"    {line}" if line.strip() else "" for line in body_html.splitlines())
		out.append("  </div>")
	out.append("</div>")
	return "\n".join(out)


def main() -> None:
	markdown_text = INPUT_FILE.read_text(encoding="utf-8")
	template = OUTPUT_FILE.read_text(encoding="utf-8")
	site_title, markdown_text = pop_title(markdown_text)

	rendered = []
	for kind, text in split_blocks(markdown_text):
		if kind == "prose":
			prose_html = style_prose_html(run_pandoc(replace_eyebrows(text)))
			rendered.append(prose_html)
		else:
			rendered.append(render_card(text))

	rendered.append('<footer class="page-footer">\n  <p>Site Content © 2026</p>\n</footer>')
	main_content = "\n\n".join(block for block in rendered if block.strip())

	main_pattern = re.compile(r"(<main class=\"main-container\">)(.*?)(</main>)", re.DOTALL)
	main_html = "\n".join(f"      {line}" if line else "" for line in main_content.strip().splitlines())
	template = main_pattern.sub(rf"\1\n{main_html}\n    \3", template, count=1)

	escaped = html.escape(site_title)
	template = re.sub(r"(<h1 class=\"title-text\">)(.*?)(</h1>)", rf"\1{escaped}\3", template)
	template = re.sub(r"(<title>)(.*?)(</title>)", rf"\1{escaped} | Home\3", template, count=1)

	OUTPUT_FILE.write_text(template, encoding="utf-8")
	print(f"Updated {OUTPUT_FILE} from {INPUT_FILE}")


if __name__ == "__main__":
	main()
