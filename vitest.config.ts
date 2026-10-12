import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tool-tests/**/*.vitest.ts'],
  },
})
