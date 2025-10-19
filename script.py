import frontmatter
from markdown_it import MarkdownIt
from bs4 import BeautifulSoup
from datetime import datetime
import json

md = MarkdownIt("commonmark")

post = frontmatter.load('template.md')

meta = post.metadata

content = post.content

# print(meta, content)

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
new_content = md.render(handle_md_content(content))

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
    output_filename = f"./pages/{slugify(title)}.html"
    with open(output_filename, 'w') as outf:
        outf.write(str(soup))

    with open('./data/article_data.json', 'w') as json_file:
        entry = {
            "title": title,
            "author": author,
            "date": _date.strftime("%Y-%m-%d"),
            "tags": _tags,
            "filename": f"{slugify(title)}.html"
        }
        json_file.write(json.dumps(entry) + ",\n")

    print(f'Generated {output_filename}')

render_html(meta, new_content)