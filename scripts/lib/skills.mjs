/*
 * Shared table + tiny helpers for the three Claude Code skills this
 * package ships and packages — used by scripts/build-skills.mjs (prepack
 * copy + CI freshness gate) and scripts/test-skills.mjs (content
 * validation).
 *
 * `.claude/skills/<name>/SKILL.md` is the ONE canonical, hand-authored
 * copy of each skill (also what a local Claude Code session in this repo
 * reads directly). `skills/<name>/SKILL.md` is a generated packaging
 * copy — same relationship tokens.json has to the CSS tiers: one source
 * of truth, a derived artifact kept fresh by a --check gate, never
 * hand-edited independently.
 */

export const SKILLS = [
  {
    name: 'remarque',
    canonical: '.claude/skills/remarque/SKILL.md',
    packaged: 'skills/remarque/SKILL.md',
    exportName: './skills/remarque',
  },
  {
    name: 'remarque-adopt',
    canonical: '.claude/skills/remarque-adopt/SKILL.md',
    packaged: 'skills/remarque-adopt/SKILL.md',
    exportName: './skills/adopt',
  },
  {
    name: 'remarque-new-page',
    canonical: '.claude/skills/remarque-new-page/SKILL.md',
    packaged: 'skills/remarque-new-page/SKILL.md',
    exportName: './skills/new-page',
  },
];

/*
 * Minimal frontmatter reader — enough to check required keys are present
 * and non-empty. Handles the one YAML shape these files actually use:
 * plain `key: value` scalars, and a folded block scalar (`key: >`)
 * followed by indented continuation lines, which is how both skills
 * author their (long) `description` field.
 */
export function readFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const fm = {};
  let currentKey = null;
  let buf = [];
  const flush = () => {
    if (currentKey) fm[currentKey] = buf.join(' ').trim();
    buf = [];
  };
  for (const line of lines) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      flush();
      currentKey = kv[1];
      const rest = kv[2].trim();
      if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
        buf = [];
      } else {
        buf = rest ? [rest] : [];
        flush();
        currentKey = null;
      }
    } else if (currentKey && /^\s+\S/.test(line)) {
      buf.push(line.trim());
    }
  }
  flush();
  return fm;
}
