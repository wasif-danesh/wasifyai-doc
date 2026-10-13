import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  BookOpenCheck,
  Check,
  CircleAlert,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
type Document = { id: string; filename: string; chunk_count: number; created_at: string }
type Result = { filename: string; chunk_index: number; text: string; score: number }
type Message = { role: 'user' | 'assistant'; content: string; sources?: Result[] }

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [health, setHealth] = useState<{ status: string; services: Record<string, string>; chat_model: string } | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    try {
      const [docs, status] = await Promise.all([fetch(`${API}/documents`), fetch(`${API}/health`)])
      if (!docs.ok || !status.ok) throw new Error('API is unavailable')
      setDocuments(await docs.json())
      setHealth(await status.json())
      setError('')
    } catch {
      setError('Can’t reach the local API. Start the backend and refresh this page.')
    }
  }

  useEffect(() => { void refresh() }, [])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(`${API}/documents`, { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail ?? 'Upload failed')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      input.value = ''
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail ?? 'Search failed')
      setResults(body.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setBusy(false)
    }
  }

  async function chat(event: FormEvent) {
    event.preventDefault()
    const prompt = question.trim()
    if (!prompt) return
    setMessages(current => [...current, { role: 'user', content: prompt }])
    setQuestion('')
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail ?? 'Chat failed')
      setMessages(current => [...current, { role: 'assistant', content: body.answer, sources: body.sources }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat failed')
    } finally {
      setBusy(false)
    }
  }

  const ollamaReady = health?.services?.ollama === 'ready'

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpenCheck className="size-5" aria-hidden="true" />
            </span>
            <span>Local RAG</span>
          </a>
          <Badge variant={ollamaReady ? 'success' : 'secondary'} className="gap-1.5 px-3 py-1">
            <span className={`size-1.5 rounded-full ${ollamaReady ? 'bg-success-foreground' : 'bg-muted-foreground'}`} />
            {ollamaReady ? `Ollama · ${health?.chat_model}` : 'Ollama offline'}
          </Badge>
        </div>
      </header>

      <main id="home" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Private by design · runs on your machine
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your knowledge, in conversation.</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Add a few documents, find the passages that matter, and ask questions grounded in your own material.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="rounded px-1 font-semibold hover:bg-destructive/10">×</button>
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle>Knowledge base</CardTitle>
                  <CardDescription>{documents.length} {documents.length === 1 ? 'document' : 'documents'} indexed</CardDescription>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <FileText className="size-4" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-4 text-center transition-colors hover:border-primary/40 hover:bg-accent/50 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                    onChange={upload}
                    disabled={busy}
                    className="sr-only"
                  />
                  {busy ? <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" /> : <Upload className="size-5 text-primary" aria-hidden="true" />}
                  <span className="text-sm font-medium">{busy ? 'Working…' : 'Choose a file to add'}</span>
                  <span className="text-xs text-muted-foreground">TXT, Markdown, or CSV · up to 25 MB</span>
                </label>

                <div className="mt-4 divide-y">
                  {documents.length ? documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <FileText className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={doc.filename}>{doc.filename}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{doc.chunk_count} chunks</p>
                      </div>
                      <Badge variant="outline" className="gap-1 text-success-foreground">
                        <Check className="size-3" aria-hidden="true" /> Indexed
                      </Badge>
                    </div>
                  )) : (
                    <div className="py-5 text-center text-sm text-muted-foreground">Your indexed documents will appear here.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="size-4 text-primary" aria-hidden="true" /> Semantic search</CardTitle>
                <CardDescription>Search by meaning, not just matching words.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={search} className="flex gap-2">
                  <Input
                    aria-label="Search your documents"
                    placeholder="Try “project risks” or “key dates”"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                  />
                  <Button type="submit" size="icon" aria-label="Search documents" disabled={busy || !query.trim()}>
                    {busy ? <LoaderCircle className="animate-spin" /> : <Search />}
                  </Button>
                </form>
                {results.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {results.map((result, index) => (
                      <article key={`${result.filename}-${result.chunk_index}-${index}`} className="rounded-lg border bg-muted/30 p-3">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-primary">{result.filename} · chunk {result.chunk_index + 1}</p>
                          <span className="text-xs tabular-nums text-muted-foreground">{(result.score * 100).toFixed(0)}% match</span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{result.text}</p>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="flex min-h-[34rem] flex-col overflow-hidden">
            <CardHeader className="border-b bg-card sm:p-6">
              <CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" aria-hidden="true" /> Ask your documents</CardTitle>
              <CardDescription>Answers use the passages most relevant to your question.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0 sm:p-0">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                      <MessageSquareText className="size-5" aria-hidden="true" />
                    </div>
                    <p className="font-medium">Start with a question</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Add a document, then ask for a summary, a fact, or a connection between ideas.</p>
                  </div>
                ) : messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{message.role === 'user' ? 'You' : 'Assistant'}</p>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      {message.sources?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/10 pt-2.5">
                          {message.sources.map((source, sourceIndex) => (
                            <Badge key={`${source.filename}-${source.chunk_index}-${sourceIndex}`} variant={message.role === 'user' ? 'secondary' : 'outline'} className="max-w-full truncate">
                              [{sourceIndex + 1}] {source.filename}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {busy && messages.at(-1)?.role === 'user' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Searching your documents…</div>
                )}
              </div>
              <form onSubmit={chat} className="border-t bg-muted/20 p-3 sm:p-4">
                <div className="flex items-center gap-2 rounded-xl border bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
                  <Input
                    aria-label="Ask a question"
                    placeholder="Ask a question about your files…"
                    value={question}
                    onChange={event => setQuestion(event.target.value)}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button type="submit" size="icon" aria-label="Send question" disabled={busy || !question.trim()} className="size-9 rounded-lg">
                    <Send />
                  </Button>
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Responses are generated locally with {health?.chat_model ?? 'Ollama'}.</p>
              </form>
            </CardContent>
          </Card>
        </div>

        {health && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Local services</span>
            <span>Qdrant: {health.services.qdrant}</span>
            <span>Ollama: {health.services.ollama}</span>
          </div>
        )}
      </main>
    </div>
  )
}
