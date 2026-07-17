#!/usr/bin/env node
/**
 * pnpm new — 交互式新建笔记/博客
 *
 * 流程：选类型 →（笔记）选/建系列 → 标题/简介/标签/slug → 写文件。
 * 只依赖 node 标准库；系列元数据读 src/content/series/*.yaml（自家格式，行解析即可）。
 */
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTES_DIR = path.join(root, 'src/content/notes');
const BLOG_DIR = path.join(root, 'src/content/blog');
const SERIES_DIR = path.join(root, 'src/content/series');

// 自建行队列：管道输入会一次性灌入，readline question 间隙到达的行会丢失
const rl = createInterface({ input: stdin, terminal: stdin.isTTY ?? false });
const buffered = [];
let waiting = null;
rl.on('line', (line) => {
    if (waiting) { const w = waiting; waiting = null; w(line); }
    else buffered.push(line);
});
const nextLine = () =>
    buffered.length ? Promise.resolve(buffered.shift()) : new Promise((res) => { waiting = res; });

const ask = async (q, def = '') => {
    stdout.write(`${q}${def ? ` (${def})` : ''}: `);
    const ans = (await nextLine()).trim();
    return ans || def;
};

const today = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const slugify = (s) =>
    s.toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '');

function listSeries() {
    if (!fs.existsSync(SERIES_DIR)) return [];
    return fs.readdirSync(SERIES_DIR)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
        .map((f) => {
            const text = fs.readFileSync(path.join(SERIES_DIR, f), 'utf8');
            const pick = (key) => text.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'))?.[1] ?? '';
            return { slug: f.replace(/\.ya?ml$/, ''), title: pick('title'), description: pick('description') };
        });
}

function nextSeriesOrder(seriesSlug) {
    let max = 0;
    for (const f of fs.readdirSync(NOTES_DIR)) {
        if (!f.endsWith('.mdx') && !f.endsWith('.md')) continue;
        const text = fs.readFileSync(path.join(NOTES_DIR, f), 'utf8');
        const fm = text.match(/^---\n([\s\S]*?)\n---/);
        if (!fm) continue;
        if (!new RegExp(`^series:\\s*["']?${seriesSlug}["']?\\s*$`, 'm').test(fm[1])) continue;
        const order = Number(fm[1].match(/^seriesOrder:\s*([\d.]+)\s*$/m)?.[1] ?? 0);
        if (order > max) max = order;
    }
    return Math.floor(max) + 1;
}

const fmtTags = (raw) =>
    raw.split(/[,，]/).map((t) => t.trim()).filter(Boolean);

async function createSeries() {
    const slug = slugify(await ask('新系列 slug（英文小写，如 llm-sys）'));
    if (!slug) return null;
    const title = await ask('系列标题');
    const description = await ask('系列一句话简介');
    const planned = await ask('计划章数（可留空）');
    const yaml = [
        `title: "${title}"`,
        `description: "${description}"`,
        `status: "ongoing"`,
        `order: 99`,
        `featured: false`,
        planned && `plannedChapters: ${planned}`,
        ``,
    ].filter((l) => l !== undefined && l !== false).join('\n');
    fs.writeFileSync(path.join(SERIES_DIR, `${slug}.yaml`), yaml);
    console.log(`  ✓ 已创建系列 src/content/series/${slug}.yaml`);
    return { slug, title };
}

async function newNote() {
    const series = listSeries();
    console.log('\n现有系列：');
    series.forEach((s, i) => console.log(`  ${i + 1}. ${s.slug} — ${s.title}`));
    console.log('  0. 新建系列');
    console.log('  -. 无系列（独立笔记）');
    const pick = await ask('选择系列编号', '1');

    let seriesEntry = null;
    if (pick === '0') {
        seriesEntry = await createSeries();
        if (!seriesEntry) { console.log('已取消'); return; }
    } else if (pick !== '-') {
        seriesEntry = series[Number(pick) - 1] ?? null;
        if (!seriesEntry) { console.log('无效编号'); return; }
    }

    const title = await ask('标题');
    if (!title) { console.log('已取消'); return; }
    const description = await ask('一句话简介（书架/列表展示用）');
    const tags = fmtTags(await ask('标签（逗号分隔，可留空）'));

    let seriesOrder = null;
    let defSlug = slugify(title);
    if (seriesEntry) {
        seriesOrder = nextSeriesOrder(seriesEntry.slug);
        defSlug = `${seriesEntry.slug}${String(seriesOrder).padStart(2, '0')}`;
    }
    const slug = slugify(await ask('文件 slug', defSlug));
    const file = path.join(NOTES_DIR, `${slug}.mdx`);
    if (fs.existsSync(file)) { console.log(`已存在：${file}`); return; }

    const fm = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `description: "${description.replace(/"/g, '\\"')}"`,
        `pubDate: ${today()}`,
        tags.length && `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
        seriesEntry && `series: "${seriesEntry.slug}"`,
        seriesOrder != null && `seriesOrder: ${seriesOrder}`,
        '---',
        '',
        '',
    ].filter((l) => l !== false && l !== null && l !== 0).join('\n');
    fs.writeFileSync(file, fm);
    console.log(`\n✓ 已创建 src/content/notes/${slug}.mdx${seriesOrder != null ? `（第 ${seriesOrder} 章）` : ''}`);
}

async function newBlog() {
    const title = await ask('标题');
    if (!title) { console.log('已取消'); return; }
    const description = await ask('一句话简介');
    const tags = fmtTags(await ask('标签（逗号分隔，可留空）'));
    const slug = slugify(await ask('文件 slug', slugify(title)));
    const file = path.join(BLOG_DIR, `${slug}.mdx`);
    if (fs.existsSync(file)) { console.log(`已存在：${file}`); return; }

    const fm = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `description: "${description.replace(/"/g, '\\"')}"`,
        `pubDate: ${today()}`,
        tags.length && `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
        'draft: true',
        '---',
        '',
        '',
    ].filter(Boolean).join('\n');
    fs.writeFileSync(file, fm);
    console.log(`\n✓ 已创建 src/content/blog/${slug}.mdx（draft: true，发布前记得改为 false）`);
}

const kind = await ask('新建什么？1=note（系列笔记） 2=blog（独立博文）', '1');
if (kind === '2') await newBlog();
else await newNote();
rl.close();
console.log('下一步：写入正文后 `pnpm build` 检查，`git add` 提交即可。');
