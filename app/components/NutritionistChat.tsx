'use client'

import { useState } from 'react'

interface ChatMessage {
  id: number;
  content: string;
  isUser: boolean;
}

export default function NutritionistChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      content: "你好！我是你的营养健康顾问。请问有什么可以帮助你的吗？",
      isUser: false
    }
  ])
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: messages.length + 1,
      content: input,
      isUser: true
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')

    try {
      // 调用 AI API
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: new Headers({
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICON_API_KEY}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            {
              role: "system",
              content: "你是一位专业的营养师，请根据用户的问题提供专业的营养建议。注意回答要简洁专业，并强调均衡饮食的重要性。"
            },
            {
              role: "user",
              content: input
            }
          ]
        })
      })

      const data = await response.json()
      
      // 添加营养师回复
      const nutritionistMessage: ChatMessage = {
        id: messages.length + 2,
        content: data.choices[0].message.content,
        isUser: false
      }
      setMessages(prev => [...prev, nutritionistMessage])
    } catch (error) {
      console.error('Error:', error)
      // 添加错误提示消息
      setMessages(prev => [...prev, {
        id: messages.length + 2,
        content: "抱歉，我现在无法回答，请稍后再试。",
        isUser: false
      }])
    }
  }

  return (
    <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">营养师在线咨询</h2>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入您的问题..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
} 
