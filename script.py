import frontmatter
from markdown_it import MarkdownIt

md = MarkdownIt("commonmark")

post = frontmatter.load('template.md')

meta = post.metadata
content = post.content

print(meta, content)

def handle(content: str) -> str:
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
new_content = md.render(handle(content))
print(new_content)

