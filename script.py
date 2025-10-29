import os
import frontmatter
from markdown_it import MarkdownIt
from bs4 import BeautifulSoup
from datetime import datetime
import json

md = MarkdownIt("commonmark")


def handle_md_content(content: str) -> str:
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        n = line.count('#')
        if n > 0 :
            h = "h" + str(n)
            new_line = line.replace('#' * n, f'<{h}>', 1).rsplit('#', 1)[0] + f'</{h}>'
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    return '\n'.join(new_lines)

# print(new_content)

def render_html(meta: dict, content: str) -> str:

    html_template = open('./pages/newspaper_template.html', 'r')
    soup = BeautifulSoup(
        html_template,
        features="html.parser"
    )

    title = meta['title']
    _date = meta['date']
    author = meta['author']
    _tags = meta['tags']

        
    soup.title.string.replace_with(title)
    # print(soup.title.string)
    soup.body.find(class_="newspaper-title").string.replace_with(title)
    soup.body.find(class_="newspaper-info-author").string.replace_with(f'By {author}')
    soup.body.find(class_="newspaper-info-date").string.replace_with(_date.strftime('%m/%d/%Y'))
    tags = soup.body.find(class_="newspaper-info-tags")

    tags['data-tags'] = ','.join(_tags)
    soup.body.find(class_="newspaper-info-tags").replace_with(tags)

    container = soup.body.find(class_="newspaper-container")
    container.clear()
    fragment = BeautifulSoup(new_content, 'html.parser')
    container.append(fragment)
    slugify = lambda s: s.lower().replace(' ', '-')
    output_filename = f"./pages/news/{slugify(title)}.html"
    with open(output_filename, 'w') as outf:
        outf.write(str(soup))

    data_path = './data/article_data.json'
    entry = {
        "title": title,
        "author": author,
        "date": _date.strftime("%Y-%m-%d"),
        "tags": _tags,
        "filename": f"{slugify(title)}.html"
    }

    try:
        with open(data_path, 'r', encoding='utf-8') as jf:
            try:
                data = json.load(jf)
                if not isinstance(data, list):
                    data = []
            except json.JSONDecodeError:
                data = []
    except FileNotFoundError:
        data = []

    data.append(entry)
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

    print(f'Generated {output_filename}')

if __name__ == "__main__":
    input_dir = './md/'
    with os.scandir(input_dir) as entries:
        list_entries = []
        for entry in sorted(entries, key=lambda e: e.name):
            if entry.name.endswith('.md') and entry.is_file():
                # list_entries.append(entry)
                post = frontmatter.load(entry.path)
                meta = post.metadata
                content = post.content
                new_content = handle_md_content(content)
                render_html(meta, new_content)

    # print('\n'.join([e.name for e in sorted(list_entries, key=lambda x: x.name)]))