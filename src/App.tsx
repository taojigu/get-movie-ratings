import { useEffect, useState } from 'react'
import './App.css'
import InvalidUrlView from './component/InvalidUrlView.tsx'

const VALID_HOST_ARRAY = ['yfsp.tv', 'www.yfsp.tv', 'iyf.tv', 'www.iyf.tv']
const ALLOWED_HOSTS = new Set(VALID_HOST_ARRAY)

interface Movie {
  title: string
  imageUrl: string
}

interface PageInfo {
  tabId: number
  label: string
  movies: Movie[]
}

type Route =
  | { view: 'list' }
  | { view: 'search'; title: string; url: string }

// Runs inside the target page via chrome.scripting.executeScript.
// Must be self-contained — no imports or closures over outer scope.
async function scrapeMovies(): Promise<{ title: string; imageUrl: string }[]> {
  const seen = new Set<string>()
  const raw: { title: string; imageUrl: string }[] = []

  function push(title: string, imageUrl: string) {
    title = title.trim()
    if (!title || seen.has(title)) return
    seen.add(title)
    raw.push({ title, imageUrl })
  }

  // Strategy 1: img.poster with alt attribute (yfsp.tv / typical streaming sites)
  for (const img of document.querySelectorAll<HTMLImageElement>('img.poster[alt], img[class*="poster"][alt]')) {
    const title = img.getAttribute('alt') || ''
    const imageUrl = img.src || img.getAttribute('data-src') || ''
    if (title && imageUrl) push(title, imageUrl)
  }

  // Strategy 2: a[title] wrapping an img
  if (raw.length === 0) {
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[title]')) {
      const img = a.querySelector<HTMLImageElement>('img')
      if (!img) continue
      const title = (a.getAttribute('title') || '').trim()
      const imageUrl = img.src || img.getAttribute('data-src') || ''
      if (title && imageUrl && title.length > 1) push(title, imageUrl)
    }
  }

  // Strategy 3: li elements containing an img and a text element
  if (raw.length === 0) {
    for (const li of document.querySelectorAll('li')) {
      const img = li.querySelector<HTMLImageElement>('img')
      if (!img) continue
      const titleEl = li.querySelector('a, h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]')
      const title = (
        titleEl?.getAttribute('title') || titleEl?.textContent || img.getAttribute('alt') || ''
      ).trim()
      const imageUrl = img.src || img.getAttribute('data-src') || ''
      if (title && imageUrl) push(title, imageUrl)
    }
  }

  const limited = raw.slice(0, 120)

  async function localToBase64(url: string): Promise<string> {
    if (!url.startsWith('file://')) return url
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      if (blob.size > 120_000) return ''
      return await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
    } catch {
      return ''
    }
  }

  return Promise.all(limited.map(async (m) => ({
    title: m.title,
    imageUrl: await localToBase64(m.imageUrl),
  })))
}

function doubanUrl(title: string): string {
  return `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(title)}&cat=1002`
}

function tabLabel(tab: chrome.tabs.Tab): string {
  if (!tab.url) return tab.title || 'Page'
  try {
    const u = new URL(tab.url)
    const parts = u.pathname.replace(/\/$/, '').split('/')
    const segment = parts[parts.length - 1]
    if (segment) return decodeURIComponent(segment)
  } catch { /* ignore */ }
  return tab.title || 'Page'
}

function shorten(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

export default function App() {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [wrongUrl, setWrongUrl] = useState(false)
  const [route, setRoute] = useState<Route>({ view: 'list' })

  useEffect(() => {
    async function load() {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

        let isAllowed = false
        if (activeTab?.url) {
          try { isAllowed = ALLOWED_HOSTS.has(new URL(activeTab.url).hostname) } catch { /* ignore */ }
        }
        if (!isAllowed) {
          setWrongUrl(true)
          return
        }

        const allTabs = await chrome.tabs.query({})

        const ordered = [
          activeTab,
          ...allTabs.filter((t) => t.id !== activeTab?.id),
        ].filter((t) => {
          const url = t.url || ''
          return t.id !== undefined && url && !url.startsWith('chrome://') && !url.startsWith('about:')
        })

        const collected: PageInfo[] = []

        for (const tab of ordered) {
          if (tab.id === undefined) continue
          try {
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: scrapeMovies,
            })
            if (result?.result && result.result.length > 0) {
              collected.push({
                tabId: tab.id,
                label: tabLabel(tab),
                movies: result.result,
              })
            }
          } catch {
            // Tab is not scriptable
          }
        }

        setPages(collected)
      } catch (e) {
        setErrorMsg(String(e))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function openSearch(title: string) {
    setRoute({ view: 'search', title, url: doubanUrl(title) })
  }

  function goBack() {
    setRoute({ view: 'list' })
  }

  const current = pages[selected]

  if (loading) return <div className="state">Loading…</div>
  if (wrongUrl) return <InvalidUrlView urlArray={VALID_HOST_ARRAY} />
  if (errorMsg) return <div className="state error">{errorMsg}</div>
  if (pages.length === 0) return <div className="state">No movie collections found on open pages.</div>

  return (
    <div className="app">
      <nav className="nav" role="navigation">
        {route.view === 'search' ? (
          <>
            <button className="nav-back" onClick={goBack} title="Back to list">
              ← Back
            </button>
            <span className="nav-search-title" title={route.title}>
              {shorten(route.title, 22)}
            </span>
          </>
        ) : (
          pages.map((page, i) => (
            <button
              key={page.tabId}
              role="tab"
              aria-selected={i === selected}
              className={`nav-tab${i === selected ? ' active' : ''}`}
              onClick={() => setSelected(i)}
              title={page.label}
            >
              {shorten(page.label, 16)}
            </button>
          ))
        )}
      </nav>

      {route.view === 'list' ? (
        <ul className="movie-list" role="list">
          {current?.movies.map((movie, i) => (
            <li key={i} className="movie-item">
              {movie.imageUrl
                ? <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="movie-thumb"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                : <div className="movie-thumb placeholder" aria-hidden="true" />
              }
              <span className="movie-title">{movie.title}</span>
              <button className="open-btn" onClick={() => openSearch(movie.title)}>
                Open
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <iframe
          className="search-frame"
          src={route.url}
          title={`Douban search: ${route.title}`
        }
        />
      )}
    </div>
  )
}