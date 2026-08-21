import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
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
      // framer-motion `motion.div` does not count as a use of `motion` under plain
      // no-unused-vars; Icon-style destructured components are intentionally Capitalized.
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]|^(motion)$',
          argsIgnorePattern: '^[A-Z_]',
          ignoreRestSiblings: true,
        },
      ],
      // New react-hooks recommended rules flag every sync reset in useEffect across the
      // app (Explorer, TopBar, AgentDetail, …). Keep the classic hooks rules; these two
      // are noise until components are rewritten around them.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
