import { useState, useRef, useEffect } from 'react'
import { marked } from 'marked'
import { sendChatMessage } from '../../../api/ai'
import styles from './tabs.module.css'

interface Message {
  role: 'ai' | 'user'
  text: string
}

// Configure marked
marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}

const INITIAL: Message[] = [
  { role: 'ai', text: 'TerraTrace AI online. I have access to this operation\'s subjects, evidence, sectors, and simulation results. Ask me anything about the operation.' },
]

const QUICK = [
  'Summarize this operation',
  'Why is SEC-A ranked highest?',
  'Generate a search briefing',
  'List all subjects',
  'What evidence has been found?',
  'What are the survival risks?',
  'Recommend next search area',
  'Show latest simulation results',
]

export default function ChatAI({ operationId }: { operationId: string }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setLoading(true)

    const history = messages.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user' as 'user' | 'assistant',
      content: m.text,
    }))

    try {
      const data = await sendChatMessage(operationId, msg, history)
      setMessages((m) => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: '**Error:** Connection failed. Check that the backend is running.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className={styles.wrap} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className={styles.sectionHead} style={{ marginBottom: 8 }}>
        AI ASSISTANT
        <span style={{ color: 'var(--success)', fontSize: 10, marginLeft: 6 }}>● GROQ LLAMA 3.3</span>
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            style={{
              fontSize: 10, padding: '3px 8px',
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              color: 'var(--text3)', cursor: 'pointer', borderRadius: 2,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.target as HTMLElement
              el.style.color = 'var(--accent)'
              el.style.borderColor = 'rgba(232,200,122,0.4)'
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLElement
              el.style.color = 'var(--text3)'
              el.style.borderColor = 'var(--border2)'
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.chatMsg} ${m.role === 'ai' ? styles.chatMsgAi : styles.chatMsgUser}`}
          >
            <div className={styles.chatSender}>
              {m.role === 'ai' ? 'TERRATRACE AI' : 'YOU'}
            </div>
            {m.role === 'ai' ? (
              <div
                className={styles.markdownContent}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
              />
            ) : (
              <div>{m.text}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className={`${styles.chatMsg} ${styles.chatMsgAi}`}>
            <div className={styles.chatSender}>TERRATRACE AI</div>
            <span style={{ opacity: 0.4 }}>Analysing operation data...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <textarea
        className={styles.chatInput}
        placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        rows={2}
        style={{ resize: 'none' }}
      />
    </div>
  )
}