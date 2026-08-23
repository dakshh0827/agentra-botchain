
const HTTP_URL = /^https?:\/\/\S+$/i

//handle duplicate valuelike urls
function dedupeByValue(entries) {
  const seen = new Set()
  return entries.filter(([, value]) => {
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

const ICON_BY_KEYWORD = [
  [/pdf/i, 'pdf'],
  [/xls|excel|workbook/i, 'excel'],
  [/csv|sheet/i, 'csv'],
  [/html|report|page/i, 'html'],
  [/image|png|jpe?g|chart/i, 'image'],
]

//icon key 
function iconForKey(key) {
  for (const [pattern, icon] of ICON_BY_KEYWORD) {
    if (pattern.test(key)) return icon
  }
  return 'download'
}

function labelForKey(key) {
  const stem = key.replace(/(url|link|href)$/i, '')
  const words = stem
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return 'Download'

  return words
    .map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
    .slice(0, 24)
}

//derive a capabiltiies fro agent payuload
function inferDeliverables(payload) {
  const candidates = Object.entries(payload).filter(
    ([key, value]) => /(?:url|link|href)$/i.test(key) && typeof value === 'string' && HTTP_URL.test(value),
  )

  return dedupeByValue(candidates)
    .slice(0, 8)
    .map(([key]) => ({ key, label: labelForKey(key), icon: iconForKey(key) }))
}

const SCORE_KEYS = ['overall', 'score', 'overallScore', 'rating', 'grade']

//bounded score field
function inferScoreField(payload) {
  for (const key of SCORE_KEYS) {
    const value = payload[key]
    // Only a bounded number reads as a score. A raw count would render as "4200 / 100".
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) {
      return key
    }
  }
  return null
}

const TITLE_KEYS = ['host', 'title', 'name', 'domain', 'target', 'subject', 'url']

function inferTitleField(payload) {
  return TITLE_KEYS.find((key) => typeof payload[key] === 'string' && payload[key].trim()) || null
}


const SUBTITLE_KEY = /^(pages?|items?|records?|files?|rows?|urls?|links?)[A-Z]/

function inferSubtitle(payload) {
  const key = Object.keys(payload).find(
    (k) => SUBTITLE_KEY.test(k) && typeof payload[k] === 'number' && payload[k] > 0,
  )
  if (!key) return null

  const label = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .slice(0, 40)

  return { subtitleField: key, subtitleLabel: label }
}

const COUNTS_KEYS = ['counts', 'summary', 'stats', 'totals', 'breakdown']

//bounded counts field
function inferCounts(payload) {
  for (const key of COUNTS_KEYS) {
    const value = payload[key]
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue

    const numeric = Object.entries(value).filter(([, v]) => typeof v === 'number')
    if (!numeric.length) continue

    // A `total` sits next to its own parts; showing both reads as double counting.
    const shown = numeric.map(([k]) => k).filter((k) => !/^(total|all|sum|count)$/i.test(k))
    if (!shown.length) continue

    return { countsField: key, countsInclude: shown.slice(0, 6) }
  }
  return null
}

const CATEGORY_KEYS = ['categories', 'sections', 'breakdown', 'groups']

//bounded categories field
function inferCategoriesField(payload) {
  return (
    CATEGORY_KEYS.find((key) => {
      const value = payload[key]
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((row) => row && typeof row === 'object' && 'name' in row && typeof row.score === 'number')
      )
    }) || null
  )
}

const NOTICE_KEYS = ['selfCheckFailed', 'warnings', 'notice', 'caveats', 'sampleWarning']

function inferNoticeField(payload) {
  return (
    NOTICE_KEYS.find((key) => {
      const value = payload[key]
      if (typeof value === 'string') return value.trim().length > 0
      return Array.isArray(value)
    }) || null
  )
}


export function inferCapabilities(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const deliverables = inferDeliverables(payload)
  const scoreField = inferScoreField(payload)
  const titleField = inferTitleField(payload)
  const subtitle = inferSubtitle(payload)
  const counts = inferCounts(payload)
  const categoriesField = inferCategoriesField(payload)
  const noticeField = inferNoticeField(payload)

  const report = {
    ...(scoreField ? { scoreField, scoreMax: 100 } : {}),
    ...(titleField ? { titleField } : {}),
    ...(subtitle || {}),
    ...(counts || {}),
    ...(categoriesField ? { categoriesField } : {}),
    ...(noticeField ? { noticeField } : {}),
  }

  const worthKeeping = deliverables.length > 0 || scoreField || categoriesField
  if (!worthKeeping) return null

  return {
    version: 1,
    multiRun: false,
    ...(deliverables.length ? { deliverables } : {}),
    ...(Object.keys(report).length ? { report } : {}),
  }
}


export function capabilitiesFingerprint(capabilities) {
  if (!capabilities) return ''
  return JSON.stringify(capabilities, Object.keys(capabilities).sort())
}

export default { inferCapabilities, capabilitiesFingerprint }
