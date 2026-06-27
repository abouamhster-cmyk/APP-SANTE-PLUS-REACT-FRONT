import { useCallback, useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// 🔥 CONFIG SUPABASE (remplace)
const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
)

// 🔥 TYPES
interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

// 🔥 HELPERS
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString()

// 🔥 CONST
const GLOBAL_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001'

export default function MessagesPage() {
  // ⚡ USER (simple version)
  const [userId, setUserId] = useState<string | null>(null)

  // ⚡ STATE
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const endRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  // 🔽 INIT USER
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id || null)
    }
    init()
  }, [])

  // 🔽 SCROLL
  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      })
    }, 80)
  }

  // 🔽 FETCH
  const fetchMessages = useCallback(async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', GLOBAL_CONVERSATION_ID)
      .order('created_at', { ascending: true })

    if (error) return

    setMessages(data || [])

    const unread = (data || []).filter(
      (m) => !m.is_read && m.sender_id !== userId
    ).length

    setUnreadCount(unread)
    scrollToBottom(false)
  }, [userId])

  // 🔽 MARK READ
  const markAllAsRead = async () => {
    if (!userId) return

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', GLOBAL_CONVERSATION_ID)
      .neq('sender_id', userId)

    setUnreadCount(0)
  }

  // 🔽 SEND
  const sendMessage = async () => {
    if (!input.trim() || !userId) return

    setIsSending(true)

    const { data } = await supabase
      .from('messages')
      .insert({
        conversation_id: GLOBAL_CONVERSATION_ID,
        sender_id: userId,
        content: input.trim(),
        is_read: false,
      })
      .select()
      .single()

    setMessages((prev) => [...prev, data])
    setInput('')
    setIsSending(false)
    scrollToBottom(true)
  }

  // 🔽 REALTIME
  const setupRealtime = useCallback(() => {
    if (!userId) return

    channelRef.current = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${GLOBAL_CONVERSATION_ID}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })

          if (payload.new.sender_id !== userId) {
            setUnreadCount((c) => c + 1)
          }

          scrollToBottom(true)
        }
      )
      .subscribe()
  }, [userId])

  // 🔽 INIT
  useEffect(() => {
    if (!userId) return

    fetchMessages()
    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, fetchMessages, setupRealtime])

  // 🔽 UI
  return (
    <div className="h-screen flex flex-col bg-white">

      {/* HEADER */}
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <div>
          <h1 className="text-sm font-semibold">Discussion</h1>
          <p className="text-xs text-gray-500">
            {messages.length} messages • {unreadCount} non lus
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs bg-gray-100 px-2 py-1 rounded"
          >
            Tout lire
          </button>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId

          const showDate =
            i === 0 ||
            formatDate(msg.created_at) !==
              formatDate(messages[i - 1]?.created_at)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-2">
                  {formatDate(msg.created_at)}
                </div>
              )}

              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`px-3 py-2 rounded-lg text-sm max-w-[75%] ${
                    isMe
                      ? 'bg-black text-white'
                      : 'bg-white border text-gray-900'
                  }`}
                >
                  <p>{msg.content}</p>

                  <div className="text-[10px] mt-1 text-gray-400 text-right">
                    {formatTime(msg.created_at)} {isMe && (msg.is_read ? '✓✓' : '✓')}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={endRef} />
      </div>

      {/* INPUT */}
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-sm"
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="bg-black text-white px-3 py-2 rounded"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
