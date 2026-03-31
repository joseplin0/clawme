import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    pool: "forks",
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.{test,spec}.ts'], 
        }
      },
      {
        test: {
          name: 'e2e',
          environment: 'node', // E2E 测试必须用 Node 环境！
          include: ['tests/e2e/*.{test,spec}.ts'], // E2E 测试路径
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
    globals: true,
    passWithNoTests: false,
  },
  // plugins: [
  //   {
  //     name: 'ignore-bun-test',
  //     enforce: 'pre',
  //     resolveId(id) {
  //       if (id === 'bun:test') {
  //         return { id: 'bun:test', external: true }
  //       }
  //     }
  //   }
  // ]
});
