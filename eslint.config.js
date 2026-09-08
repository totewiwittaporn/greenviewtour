import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/frontend/**', '**/backend/**', '**/database/**', '**/infrastructure/**', '**/public-web/**', '**/backoffice/**', '@greenviewtour/public-web', '@greenviewtour/backoffice', '@greenviewtour/api'], message: 'Keep applications isolated; share only browser-safe contracts.' },
      ] }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['backend/**/*.js'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/frontend/**', '@greenviewtour/public-web', '@greenviewtour/backoffice'], message: 'Backend must not import frontend code.' },
      ] }],
    },
  },
])
