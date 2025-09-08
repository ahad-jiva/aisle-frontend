import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { chat, health, type ProductCard } from '../api/client'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  products?: ProductCard[]
  hasImage?: boolean
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    health().then(setIsHealthy).catch(() => setIsHealthy(false))
    const saved = localStorage.getItem('palona_session_id')
    if (saved) setSessionId(saved)
  }, [])

  useEffect(() => {
    let isActive = true
    const check = async () => {
      try {
        const ok = await health()
        if (isActive) setIsHealthy(ok)
      } catch {
        if (isActive) setIsHealthy(false)
      }
    }
    const id = setInterval(check, 5000)
    return () => {
      isActive = false
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const placeholder = useMemo(() => {
    if (isHealthy === false) return 'Backend not reachable. Try again later...'
    if (isSending) return 'Sending...'
    return 'Ask about products, styles, budgets, etc.'
  }, [isHealthy, isSending])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if ((!trimmed && !imageData) || isSending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      hasImage: !!imageData,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)
    try {
      const { reply, sessionId: newSession, products } = await chat({
        message: trimmed || '(no message)'.trim(),
        sessionId,
        image_search: !!imageData,
        image_data: imageData,
      })
      if (newSession && newSession !== sessionId) {
        setSessionId(newSession)
        localStorage.setItem('palona_session_id', newSession)
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply || '*No response received.*',
        products: products,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${(err as Error).message}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
      setImageData(null)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">Palona Shopping Agent</div>
        <div className={`status-dot ${isHealthy ? 'ok' : isHealthy === false ? 'bad' : 'unknown'}`} />
      </div>
      <div className="chat-history" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-title">Ask me to find products for you</div>
            <div className="empty-tip">Examples: "Under $50 black sneakers", "Show similar to my photo"</div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-bubble">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(codeProps) {
                    const { inline, className, children, ...rest } = codeProps as any
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneLight as any}
                        language={match[1]}
                        PreTag="div"
                        {...rest}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {m.content}
              </ReactMarkdown>
              {m.role === 'user' && m.hasImage && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <span style={{ background: 'var(--accent)', color: '#555', border: '1px solid var(--border)', borderRadius: 999, fontSize: 11, padding: '4px 8px' }}>Image attached</span>
                </div>
              )}
              {m.role === 'assistant' && Array.isArray(m.products) && m.products.length > 0 && (
                <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
                  {m.products.map((p, idx) => {
                    const img = p.image_url ?? p.imgURL ?? p.imgUrl
                    const href = p.product_url ?? p.productURL
                    const title = p.title ?? 'Untitled'
                    const price = typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : (p.price as any) ?? ''
                    const rating = typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.rating as any) ?? ''
                    const card = (
                      <div key={idx} className="product-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 8 }}>
                        {img && (
                          <div style={{ width: '100%', height: 120, overflow: 'hidden', borderRadius: 8, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={img} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={title}>
                          {title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)' }}>
                          <span style={{ fontWeight: 700 }}>{price}</span>
                          <span style={{ color: 'var(--muted)' }}>{rating ? `${rating}★` : ''}</span>
                        </div>
                      </div>
                    )
                    return href ? (
                      <a key={idx} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        {card}
                      </a>
                    ) : card
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="msg assistant">
            <div className="msg-bubble">
              <div className="thinking" role="status" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <form className="chat-input" onSubmit={onSubmit}>
        <div className="input-combo" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 8px' }}>
          {!imageData ? (
            <label className="upload-btn" title="Attach image" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', borderRadius: 8, background: '#f2f2f2', color: '#555', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Attach image
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = reader.result as string
                    setImageData(result)
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setImageData(null)}
              title="Remove image"
              style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--accent)', color: '#555', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#ffdddd'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#a33'
                ;(e.currentTarget as HTMLButtonElement).textContent = '✖ Remove image'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#555'
                ;(e.currentTarget as HTMLButtonElement).textContent = 'Image attached ✓'
              }}
            >
              Image attached ✓
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isSending || isHealthy === false}
            aria-label="Message"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 8px', minWidth: 0 }}
          />
        </div>
        <button type="submit" disabled={isSending || (!input.trim() && !imageData)}>
          Send
        </button>
      </form>
      {sessionId && <div className="session-id">Session: {sessionId}</div>}
    </div>
  )
}


