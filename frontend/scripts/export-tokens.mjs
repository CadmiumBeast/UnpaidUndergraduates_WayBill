// Reads src/styles/tokens.css and writes design/tokens.json for the Tokens Studio Figma plugin.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

function block(selector) {
  const start = css.indexOf(selector)
  if (start < 0) return {}
  const open = css.indexOf('{', start)
  const close = css.indexOf('\n}', open)
  const body = css.slice(open + 1, close)
  const out = {}
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function toSet(vars) {
  const set = { color: {}, radius: {}, font: {}, size: {} }
  for (const [name, value] of Object.entries(vars)) {
    if (/^#|^rgb/.test(value)) set.color[name] = { value, type: 'color' }
    else if (name === 'radius') set.radius[name] = { value: value.replace('rem', 'rem'), type: 'borderRadius' }
    else if (name.startsWith('font-')) set.font[name] = { value: value.split(',')[0].replace(/['"]/g, '').trim(), type: 'fontFamilies' }
    else set.size[name] = { value, type: 'sizing' }
  }
  return set
}

const light = block(':root')
const dark = { ...light, ...block("[data-mode='dark']") }

const tokens = {
  light: toSet(light),
  dark: toSet(dark),
  $themes: [],
  $metadata: { tokenSetOrder: ['light', 'dark'] },
}

mkdirSync(new URL('../design/', import.meta.url), { recursive: true })
writeFileSync(new URL('../design/tokens.json', import.meta.url), JSON.stringify(tokens, null, 2) + '\n')
console.log(`Wrote design/tokens.json (${Object.keys(light).length} light tokens, ${Object.keys(dark).length} dark tokens)`)
