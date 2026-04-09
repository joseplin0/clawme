import re

# Update DESIGN.md
with open('DESIGN.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Font replacements
content = content.replace('Airbnb Cereal VF', 'Public Sans')
content = content.replace('Cereal VF', 'Public Sans')

# Variables replacements
content = content.replace('--palette-bg-primary-core', 'var(--color-primary)')
content = content.replace('--palette-bg-tertiary-core', 'var(--color-primary-dark)')
content = content.replace('--palette-text-primary-error', 'var(--color-error)')
content = content.replace('--palette-text-secondary-error-hover', 'var(--color-error-hover)')
content = content.replace('--palette-text-primary', 'var(--ui-text)')
content = content.replace('--palette-text-focused', 'var(--color-focused)')
content = content.replace('--palette-text-material-disabled', 'var(--color-disabled)')
content = content.replace('--palette-text-link-disabled', 'var(--color-link-disabled)')
content = content.replace('--palette-text-legal', 'var(--color-info)')
content = content.replace('--palette-*', 'var(--color-*) / var(--ui-*)')

# Fix Nuxt UI 4 palette var names if needed
# We can also update "--palette-bg-primary-luxe" etc if we want, but they are just examples
content = content.replace('--palette-bg-primary-luxe', 'var(--color-luxe)')
content = content.replace('--palette-bg-primary-plus', 'var(--color-plus)')

with open('DESIGN.md', 'w', encoding='utf-8') as f:
    f.write(content)

# Update main.css
with open('app/assets/css/main.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

css_content = css_content.replace('Airbnb Cereal VF', 'Public Sans')

# Ensure we have some of the variables in main.css so they match
# For example, adding --ui-text-muted, etc.
if '--color-focused:' not in css_content:
    # Just insert it under --color-surface
    css_content = css_content.replace('--color-surface: #f2f2f2;', '--color-surface: #f2f2f2;\n  --color-focused: #3f3f3f;\n  --color-disabled: rgba(0,0,0,0.24);\n  --color-border: #c1c1c1;')

with open('app/assets/css/main.css', 'w', encoding='utf-8') as f:
    f.write(css_content)
