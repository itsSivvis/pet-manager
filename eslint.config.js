import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/dev-dist',
      '**/coverage',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // MUI 9 removed system props: color="text.secondary" silently falls back
      // to the default color. Use variant names or sx={{ color: ... }}.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='color'][value.value=/\\./]",
          message:
            'Use a variant name (textSecondary, warning, …) or sx={{ color: "text.secondary" }} – MUI 9 ignores theme paths in the color prop.',
        },
      ],
      // JSX usage is not tracked by core no-unused-vars without the React plugin.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|[A-Z])' }],
    },
  },
  {
    files: ['client/public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
];
