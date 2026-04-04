import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['docs/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  }
)
