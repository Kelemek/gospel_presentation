'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BIBLE_TRANSLATION_CODES,
  mergeTranslationReportCodes,
  REMOTE_SCRIPTURE_CACHE_CODES,
} from '@/lib/bible-translations'
import { logger } from '@/lib/logger'

interface ReportResult {
  columns: string[]
  data: Record<string, unknown>[]
}

interface ReportDefinition {
  id: string
  label: string
  description: string
}

type SortDirection = 'asc' | 'desc' | null

type CacheStatRow = {
  count: number
  totalVerses: number
  verseLimit: number
  withinLimit: boolean
}

export default function ReportsPage() {
  // Full list on first paint so per-translation summaries (incl. NASB, NIV, NLT) are never omitted while fetch runs.
  const [translations, setTranslations] = useState<string[]>(() => mergeTranslationReportCodes([]))
  const [selectedReport, setSelectedReport] = useState<string>('esv_summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ReportResult | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [cacheStats, setCacheStats] = useState<Record<string, CacheStatRow> | null>(null)
  const [cacheStatsLoading, setCacheStatsLoading] = useState(true)
  const [cacheStatsError, setCacheStatsError] = useState<string | null>(null)

  async function loadCacheStats() {
    setCacheStatsLoading(true)
    setCacheStatsError(null)
    try {
      const response = await fetch('/api/admin/scripture-cache-stats')
      const data = await response.json()
      if (!response.ok) {
        setCacheStatsError(data.error || 'Failed to load cache stats')
        setCacheStats(null)
        return
      }
      if (data.translations) {
        setCacheStats(data.translations as Record<string, CacheStatRow>)
      }
    } catch (e) {
      logger.error('Error loading scripture cache stats:', e)
      setCacheStatsError('Failed to load cache stats')
      setCacheStats(null)
    } finally {
      setCacheStatsLoading(false)
    }
  }

  // Fetch available translations from database on mount
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch('/api/admin/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportType: 'get_translations' })
        })
        
        if (response.ok) {
          const data = await response.json()
          const raw = Array.isArray(data.translations) ? data.translations : []
          const merged = mergeTranslationReportCodes(raw)
          setTranslations(merged)
          setSelectedReport(`${merged[0]}_summary`)
        } else {
          setTranslations([...BIBLE_TRANSLATION_CODES])
          setSelectedReport('esv_summary')
        }
      } catch {
        setTranslations([...BIBLE_TRANSLATION_CODES])
        setSelectedReport('esv_summary')
      }
    }

    fetchTranslations()
  }, [])

  useEffect(() => {
    loadCacheStats()
  }, [])

  // Build report list from available translations and generic reports
  const buildReports = (): ReportDefinition[] => {
    const reports: ReportDefinition[] = []

    // Add translation-specific summary reports
    for (const trans of translations) {
      reports.push({
        id: `${trans}_summary`,
        label: `${trans.toUpperCase()} Usage Summary`,
        description: `Annual usage statistics for ${trans.toUpperCase()}`
      })
    }

    // Add generic reports
    reports.push({
      id: 'unique_sessions',
      label: 'Unique Sessions by Translation',
      description: 'How many unique sessions accessed each translation per year'
    })
    reports.push({
      id: 'all_translations',
      label: 'All Translations Comparison',
      description: 'Complete statistics for all translations'
    })
    reports.push({
      id: 'top_scriptures',
      label: 'Top Scriptures Accessed',
      description: 'Most frequently accessed scriptures'
    })

    return reports
  }

  const reports = buildReports()

  async function runReport() {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: selectedReport })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('not found')) {
          setError(
            'Scripture access logs table not found.\n\n' +
            'To set up the database:\n' +
            '1. Go to Supabase SQL Editor\n' +
            '2. Run the SQL from sql/create_scripture_access_logs.sql\n' +
            '3. Reload this page'
          )
        } else {
          setError(data.error || `API error: ${response.statusText}`)
        }
        return
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report')
    } finally {
      setLoading(false)
    }
  }

  const router = useRouter()

  function handleSort(column: string) {
    if (sortColumn === column) {
      // Cycle: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      // New column, start with asc
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function getSortedData() {
    if (!results || !sortColumn || !sortDirection) {
      return results?.data || []
    }

    const sorted = [...results.data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1

      // Compare values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      const cmp = aStr.localeCompare(bStr)
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return sorted
  }

  function downloadCSV() {
    if (!results) return

    const csv = [
      results.columns.join(','),
      ...results.data.map(row =>
        results.columns.map(col => {
          const val = row[col]
          if (val === null || val === undefined) return ''
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`
          return val
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Translation Usage Reports</h1>
              <p className="text-slate-600 mt-2">Run analytics reports on scripture access by translation</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Server scripture cache (ESV + API.Bible) */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Server scripture cache</h2>
              <p className="text-sm text-slate-600 mt-1">
                ESV and each API.Bible translation (NIV, NLT, CSB) store passages in{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">scripture_cache</code> with a{' '}
                <strong>500-verse</strong> limit per translation (LRU eviction).
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadCacheStats()}
              disabled={cacheStatsLoading}
              className="shrink-0 px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-lg transition-colors"
            >
              {cacheStatsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {cacheStatsError && (
            <p className="text-sm text-red-700 mb-3">{cacheStatsError}</p>
          )}
          {cacheStatsLoading && !cacheStats ? (
            <p className="text-sm text-slate-500">Loading cache stats…</p>
          ) : cacheStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {REMOTE_SCRIPTURE_CACHE_CODES.map((code) => {
                const row = cacheStats[code]
                if (!row) return null
                const label = code === 'esv' ? 'ESV' : `${code.toUpperCase()} (API.Bible)`
                return (
                  <div
                    key={code}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                    <p className="text-sm text-slate-700 mt-2">
                      <span className="text-slate-500">References:</span> {row.count}
                    </p>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        row.withinLimit ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      Verses cached: {row.totalVerses}/{row.verseLimit}
                      {row.withinLimit ? ' — Compliant' : ' — Over limit'}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Report Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-4">Available Reports</h2>
              <div className="space-y-2">
                {reports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report.id)
                      setResults(null)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedReport === report.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {report.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Area - Report Details */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              {/* Report Info */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {reports.find(r => r.id === selectedReport)?.label}
                </h2>
                <p className="text-slate-600 text-sm">
                  {reports.find(r => r.id === selectedReport)?.description}
                </p>
              </div>

              {/* Run Button */}
              <div className="mb-6">
                <button
                  onClick={runReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Running...' : 'Run Report'}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Error running report:</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Results */}
              {results && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">
                      Results ({results.data.length} rows)
                    </h3>
                    <button
                      onClick={downloadCSV}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      ↓ Download CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {results.columns.map(col => (
                            <th
                              key={col}
                              onClick={() => handleSort(col)}
                              className="px-4 py-3 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {col}
                                {sortColumn === col && (
                                  <span className="text-xs font-bold">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedData().map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            {results.columns.map(col => (
                              <td
                                key={`${idx}-${col}`}
                                className="px-4 py-3 text-slate-700"
                              >
                                {row[col] === null || row[col] === undefined
                                  ? '—'
                                  : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
