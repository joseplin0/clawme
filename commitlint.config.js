export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
  prompt: {
    messages: {
      'header-max-length': 'Commit 标题太长了！最多允许 {{value}} 字符，当前 {{length}} 字符',
    },
  },
}
