import { useState, useRef, useEffect, useMemo } from 'react'
import { marked } from 'marked'
import { sendChatMessage } from '../../../api/ai'
import { useChatStore, type ChatMessage, type ChatToolAction } from '../../../store/useChatStore'
import { emitOperationRefresh } from '../../../lib/operationSync'
import styles from './tabs.module.css'
import { useSimulationStore } from '../../../store/useSimulationStore'

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}

const TOOL_LABELS: Record<string, string> = {
  create_subject: '👤 Subject added',
  update_subject: '✏️ Subject updated',
  delete_subject: '🗑 Subject deleted',
  add_evidence: '🔍 Evidence logged',
  delete_evidence: '🗑 Evidence deleted',
  place_basecamp: '⛺ Basecamp placed',
  delete_basecamp: '🗑 Basecamp deleted',
  add_poi: '📍 POI added',
  delete_poi: '🗑 POI deleted',
  update_operation: '✏️ Operation updated',
  run_simulation: '🔄 Simulation run',
  get_status: '📊 Status fetched',
}

function ToolBadges({ actions }: { actions: ChatToolAction[] }) {
  if (!actions?.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {actions.map((a, i) => (
        <span
          key={i}
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: a.result?.ok ? 'rgba(100,200,100,0.12)' : 'rgba(200,80,80,0.12)',
            border: `1px solid ${a.result?.ok ? 'rgba(100,200,100,0.3)' : 'rgba(200,80,80,0.3)'}`,
            color: a.result?.ok ? '#7dc87d' : '#e07070',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {TOOL_LABELS[a.tool] ?? a.tool}
        </span>
      ))}
    </div>
  )
}

const MANUAL_QUICK = [
  'Summarize this operation',
  'List all subjects',
  'What evidence has been found?',
  'Recommend next search area',
  'Show survival risks',
  'Generate a briefing',
]

const AI_QUICK = [
  'Start the operation setup',
  'Add more data about the subject',
  'Log evidence',
  'Place a basecamp',
  'What should we do next?',
  'Get full status',
]

export default function ChatAI({
  operationId,
  mode,
  pickedCoords,
  onRequestPickOnMap,
}: {
  operationId: string
  mode: string
  pickedCoords?: { lat: number; lng: number } | null
  onRequestPickOnMap?: () => void
}) {
  const isAiDriven = mode === 'ai_driven'
  const { messagesByOperation, setMessages, appendMessage } = useChatStore()

  const initialMessages = useMemo<ChatMessage[]>(() => {
    return [
      {
        role: 'ai',
        text: isAiDriven
          ? `**TerraTrace AI — AI-Driven Mode active.**

I'm your primary operator. I'll guide this operation from start to finish and handle all data entry directly.

Let's begin. **What is the name of the missing person?**`
          : `**TerraTrace AI online.**

I have access to this operation's subjects, evidence, sectors, and simulations. Ask me anything or use a quick prompt below.`,
      },
    ]
  }, [isAiDriven])

  const messages = messagesByOperation[operationId] ?? initialMessages

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const setResults = useSimulationStore((s) => s.setResults)

  useEffect(() => {
    if (!messagesByOperation[operationId]) {
      setMessages(operationId, initialMessages)
    }
  }, [operationId, initialMessages, messagesByOperation, setMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!pickedCoords) return

    const coordText = `${pickedCoords.lat}, ${pickedCoords.lng}`

    setInput((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return coordText
      if (trimmed.includes(coordText)) return trimmed
      return `${trimmed} ${coordText}`
    })
  }, [pickedCoords])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    appendMessage(operationId, { role: 'user', text: msg })
    setLoading(true)

    const history = messages.map((m) => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }))

    try {
  const data = await sendChatMessage(operationId, msg, history, mode)

  // Push simulation results to map store if AI ran one
  if (Array.isArray(data.toolActions) && data.toolActions.length > 0) {
    for (const action of data.toolActions) {
  if (action.tool === 'run_simulation') {
    const sim = action.result?.simulation ?? action.result
    if (sim?.hotspots?.length) {
      setResults(
        sim.hotspots,
        sim.sectorProbabilities ?? [],
        sim.samplePaths ?? []
      )
    }
  }
    }

    const hasMeaningfulMutation = data.toolActions.some((a: any) =>
      [
        'create_subject',
        'update_subject',
        'delete_subject',
        'add_evidence',
        'delete_evidence',
        'place_basecamp',
        'delete_basecamp',
        'add_poi',
        'delete_poi',
        'update_operation',
        'run_simulation',
      ].includes(a.tool)
    )

    if (hasMeaningfulMutation) {
      emitOperationRefresh(operationId, 'ai_tool_action')
    }
  }

  appendMessage(operationId, {
    role: 'ai',
    text: data.reply,
    toolActions: data.toolActions ?? [],
  })
} catch (error: any) {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'Request failed.'

  appendMessage(operationId, {
    role: 'ai',
    text: `**Error:** ${message}`,
  })
} finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const quickPrompts = isAiDriven ? AI_QUICK : MANUAL_QUICK

  return (
    <div
      className={styles.wrap}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      <div
        className={styles.sectionHead}
        style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>
          AI ASSISTANT
          <span style={{ color: 'var(--success)', fontSize: 10, marginLeft: 6 }}>
            ● GROQ LLAMA 3.3
          </span>
        </span>

        <span
          style={{
            fontSize: 9,
            padding: '2px 8px',
            background: isAiDriven ? 'rgba(232,200,122,0.12)' : 'var(--bg3)',
            border: `1px solid ${isAiDriven ? 'rgba(232,200,122,0.3)' : 'var(--border2)'}`,
            color: isAiDriven ? 'var(--accent)' : 'var(--text3)',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
          }}
        >
          {isAiDriven ? '◈ AI DRIVEN' : '⚙ MANUAL'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {quickPrompts.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            style={{
              fontSize: 10,
              padding: '3px 8px',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              color: 'var(--text3)',
              cursor: 'pointer',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.5px',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRequestPickOnMap}
          style={{
            fontSize: 10,
            padding: '6px 10px',
            background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            cursor: 'pointer',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
          }}
        >
          PICK ON MAP
        </button>

        {pickedCoords && (
          <div
            style={{
              fontSize: 10,
              padding: '6px 10px',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              color: 'var(--text2)',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Picked coords appended: {pickedCoords.lat}, {pickedCoords.lng}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.chatMsg} ${m.role === 'ai' ? styles.chatMsgAi : styles.chatMsgUser}`}
          >
            <div className={styles.chatSender}>
              {m.role === 'ai' ? 'TERRATRACE AI' : 'YOU'}
            </div>

            {m.role === 'ai' ? (
              <>
                <div
                  className={styles.markdownContent}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                />
                {m.toolActions && <ToolBadges actions={m.toolActions} />}
              </>
            ) : (
              <div>{m.text}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className={`${styles.chatMsg} ${styles.chatMsgAi}`}>
            <div className={styles.chatSender}>TERRATRACE AI</div>
            <span style={{ opacity: 0.4 }}>
              {isAiDriven ? 'Processing and updating operation...' : 'Analysing operation data...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <textarea
        className={styles.chatInput}
        placeholder={
          isAiDriven
            ? 'Tell the AI anything... picked map coordinates will appear here for editing before send'
            : 'Ask anything... (Enter to send, Shift+Enter for new line)'
        }
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        style={{ resize: 'none' }}
      />
    </div>
  )
}