/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'; // 引入
export default {
    // 👇 这行就是关键！告诉 Tailwind 扫描 src 目录下所有的文件
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                'void-blue': '#0B1021',
                'acid-green': '#CCFF00',
                'klein-blue': '#002FA7',
                'paper-grey': '#F0F0F0',
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
        },
    },
    plugins: [
        typography(), // 注册插件
    ],
}