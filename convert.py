import html
import re
import subprocess
from pathlib import Path

INPUT_FILE = Path("paper.md")
OUTPUT_FILE = Path("index.html")


def run_pandoc(markdown_text: str, hard_breaks: bool = False) -> str:
	fmt = "markdown+hard_line_breaks" if hard_breaks else "markdown"
	return subprocess.run(
		["pandoc", "-f", fmt, "-t", "html5"],
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


def slugify(text: str) -> str:
	text = text.lower()
	text = re.sub(r"[’']", "", text)
	text = re.sub(r"[^a-z0-9\s-]", "", text)
	text = re.sub(r"\s+", "-", text.strip())
	text = re.sub(r"-+", "-", text)
	return text or "section"


def extract_sections(blocks: list[tuple[str, str]]) -> list[dict[str, str]]:
	sections = []
	for kind, text in blocks:
		if kind != "prose":
			continue
		for line in text.splitlines():
			match = re.match(r"^\s*##\s+(.+?)\s*$", line)
			if match:
				title = match.group(1).strip()
				sections.append({"title": title, "id": slugify(title)})
	return sections


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


def process_external_links(html_text: str) -> str:
	pattern = re.compile(r'<a\s+([^>]*href=["\'](http[s]?://[^"\']+)["\'][^>]*)>', re.IGNORECASE)

	def replacer(match: re.Match[str]) -> str:
		attrs = match.group(1)
		if not re.search(r'\btarget\s*=', attrs, re.IGNORECASE):
			return f'<a target="_blank" {attrs}>'
		return match.group(0)

	return pattern.sub(replacer, html_text)


def style_prose_html(html_text: str) -> str:
	html_text = add_class_to_tag(html_text, "p", "text-paragraph")
	html_text = add_class_to_tag(html_text, "h2", "text-3xl font-bold mb-8 text-primary scroll-mt-8")
	html_text = add_class_to_tag(html_text, "h3", "text-2xl font-semibold mb-6 text-primary")
	html_text = add_class_to_tag(html_text, "ul", "bullet-list mt-4 mb-10 max-w-4xl")
	html_text = add_class_to_tag(html_text, "ol", "list-decimal pl-6 text-[#2c2e33] space-y-2 mt-4 mb-10 max-w-4xl")
	html_text = re.sub(r"<hr\s*/?>", '<hr class="my-20 border-primary-dark/30 max-w-4xl">', html_text, flags=re.IGNORECASE)
	return html_text


def style_card_body_html(html_text: str) -> str:
	html_text = add_class_to_tag(html_text, "ul", "bullet-list mt-6")
	html_text = add_class_to_tag(html_text, "ol", "list-decimal pl-6 text-[#2c2e33] space-y-2 mt-6")
	html_text = re.sub(r"<hr\s*/?>", '<hr class="my-8 border-primary-dark/30">', html_text, flags=re.IGNORECASE)
	
	# Replace interactive elemental macros -> HTML
	html_text = re.sub(
		r"\{\{button:(.*?):(.*?)\}\}",
		r'<button id="\1" class="px-5 py-2.5 mr-3 mb-3 bg-primary/10 text-primary font-semibold rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">\2</button>',
		html_text,
		flags=re.DOTALL
	)
	html_text = re.sub(
		r"\{\{slider:(.*?)\}\}",
		r'<div class="mt-6 mb-1"><input type="range" id="\1" class="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary" min="8" max="320" value="128" step="8"></div>',
		html_text,
		flags=re.DOTALL
	)
	html_text = re.sub(
		r"\{\{info:(.*?):(.*?)\}\}",
		r'<p id="\1" class="text-base text-primary/70 mt-1 mb-8 pl-1 font-medium">\2</p>',
		html_text,
		flags=re.DOTALL
	)
	html_text = re.sub(
		r"\{\{hidden_button:(.*?):(.*?)\}\}",
		r'<button id="\1" class="hidden px-5 py-2.5 mr-3 mb-3 bg-primary/10 text-primary font-semibold rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">\2</button>',
		html_text,
		flags=re.DOTALL
	)
	html_text = re.sub(
		r"\{\{hidden_graph:(.*?)\}\}",
		r'<div id="\1" class="hidden w-full h-[600px] rounded-lg border border-primary/20 mt-4 mb-4"></div>',
		html_text,
		flags=re.DOTALL
	)
	html_text = re.sub(
		r"\{\{hidden_audio:(.*?):(.*?)\}\}",
		r'<audio id="\1" src="\2" class="hidden w-full mt-4 mb-4" controls></audio>',
		html_text,
		flags=re.DOTALL
	)
	return html_text


def style_footer_html(html_text: str) -> str:
	html_text = re.sub(
		r"<p>References:</p>",
		r'<p class="text-xl font-semibold mb-6 text-primary">References:</p>\n<div class="references-list">',
		html_text,
		flags=re.IGNORECASE
	)
	html_text = re.sub(
		r"<p>\[(\d+)\]\s*(.*?)</p>",
		r'<div class="reference-item"><span class="reference-number">[\1]</span><span class="reference-text">\2</span></div>',
		html_text,
		flags=re.DOTALL | re.IGNORECASE
	)
	if '<div class="references-list' in html_text:
		html_text += "\n</div>"
	return html_text


def replace_eyebrows(markdown_text: str) -> str:
	out = []
	for line in markdown_text.splitlines():
		match = re.match(r"^\s*~(.+?)~\s*$", line)
		if match:
			out.append(f'<div class="eyebrow mb-3">{html.escape(match.group(1).strip())}</div>')
		else:
			out.append(line)
	return "\n".join(out)


def apply_section_ids(html_text: str, sections: list[dict[str, str]], start_index: int) -> tuple[str, int]:
	index = start_index

	def replacer(match: re.Match[str]) -> str:
		nonlocal index
		attrs = match.group(1) or ""
		attrs = re.sub(r'\s+id\s*=\s*"[^"]*"', "", attrs, flags=re.IGNORECASE)
		if index >= len(sections):
			return f"<h2{attrs}>"
		head_id = sections[index]["id"]
		index += 1
		return f'<h2 id="{head_id}"{attrs}>'

	html_text = re.sub(r"<h2(\s+[^>]*)?>", replacer, html_text, flags=re.IGNORECASE)
	return html_text, index


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
		out.append(f'  <p class="eyebrow">{html.escape(label)}</p>')
	if title:
		out.append(f'  <h2 class="card-heading">{html.escape(title)}</h2>')
	if body:
		lines = body.splitlines()
		new_lines = []
		seen_text = False
		added_space = False
		for line in lines:
			if line.strip() and not line.strip().startswith('{{'):
				seen_text = True
			if line.strip().startswith('{{') and seen_text and not added_space:
				new_lines.extend(["", '<div class="mt-6"></div>', ""])
				added_space = True
			new_lines.append(line)
		body = "\n".join(new_lines)
		body_html = style_card_body_html(run_pandoc(body, hard_breaks=True))
		out.append('  <div class="card-paragraph">')
		out.extend(f"    {line}" if line.strip() else "" for line in body_html.splitlines())
		out.append("  </div>")
	out.append("</div>")
	return "\n".join(out)


def replace_sidebar_points(template: str, sections: list[dict[str, str]]) -> str:
	if not sections:
		return template

	mobile_items = "\n".join(
		f'      <li><a class="sidebar-link" href="#{section["id"]}">{html.escape(section["title"])}</a></li>'
		for section in sections
	)
	desktop_items = "\n".join(
		f'            <p>- <a class="sidebar-link" href="#{section["id"]}">{html.escape(section["title"])}</a></p>'
		for section in sections
	)

	template = re.sub(
		r"(<ul class=\"mobile-points\">)(.*?)(</ul>)",
		lambda match: f"{match.group(1)}\n{mobile_items}\n    {match.group(3)}",
		template,
		count=1,
		flags=re.DOTALL,
	)

	template = re.sub(
		r"(<div class=\"sidebar-points\">)(.*?)(</div>)",
		lambda match: f"{match.group(1)}\n{desktop_items}\n          {match.group(3)}",
		template,
		count=1,
		flags=re.DOTALL,
	)

	return template


def main() -> None:
	markdown_text = INPUT_FILE.read_text(encoding="utf-8")
	template = OUTPUT_FILE.read_text(encoding="utf-8")
	site_title, markdown_text = pop_title(markdown_text)

	footer_markdown = ""
	if "{footer}" in markdown_text:
		parts = markdown_text.split("{footer}", 1)
		markdown_text = parts[0].strip()
		footer_markdown = parts[1].strip()

	blocks = split_blocks(markdown_text)
	sections = extract_sections(blocks)

	rendered = []
	section_index = 0
	for kind, text in blocks:
		if kind == "prose":
			prose_html = style_prose_html(run_pandoc(replace_eyebrows(text)))
			prose_html, section_index = apply_section_ids(prose_html, sections, section_index)
			rendered.append(prose_html)
		else:
			rendered.append(render_card(text))

	if footer_markdown:
		footer_html = style_footer_html(run_pandoc(footer_markdown))
		footer_html = "\n".join(f"  {line}" for line in footer_html.splitlines())
		rendered.append(f'<footer class="page-footer">\n{footer_html}\n</footer>')
	else:
		rendered.append('<footer class="page-footer">\n  <p>References: 😜</p>\n</footer>')

	main_content = "\n\n".join(block for block in rendered if block.strip())
	main_content = process_external_links(main_content)

	main_pattern = re.compile(r"(<main class=\"main-container\">)(.*?)(</main>)", re.DOTALL)
	main_html = "\n".join(f"      {line}" if line else "" for line in main_content.strip().splitlines())
	template = main_pattern.sub(rf"\1\n{main_html}\n    \3", template, count=1)

	escaped = html.escape(site_title)
	template = re.sub(r"(<h1 class=\"title-text\">)(.*?)(</h1>)", rf"\1{escaped}\3", template)
	template = re.sub(r"(<title>)(.*?)(</title>)", rf"\1{escaped} | Home\3", template, count=1)
	template = replace_sidebar_points(template, sections)

	OUTPUT_FILE.write_text(template, encoding="utf-8")
	print(f"Updated {OUTPUT_FILE} from {INPUT_FILE}")


if __name__ == "__main__":
	main()
