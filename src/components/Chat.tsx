import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { chat, health } from '../api/client'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)

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
    if (!trimmed || isSending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsSending(true)
    try {
      const { reply, sessionId: newSession } = await chat({ message: trimmed, sessionId })
      if (newSession && newSession !== sessionId) {
        setSessionId(newSession)
        localStorage.setItem('palona_session_id', newSession)
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply || '*No response received.*',
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isSending || isHealthy === false}
          aria-label="Message"
        />
        <button type="submit" disabled={isSending || !input.trim()}>
          Send
        </button>
      </form>
      {sessionId && <div className="session-id">Session: {sessionId}</div>}
    </div>
  )
}


