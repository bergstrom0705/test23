'use client'

import { useEffect, useState } from 'react'

interface NutritionTip {
  title: string;
  content: string;
  emoji: string;
}

const EMOJI_MAP: { [key: string]: string } = {
  '谷物': '🌾',
  '全谷物': '🌾',
  '蔬菜': '🥬',
  '水果': '🍎',
  '维生素': '🥗',
  '蛋白质': '🥩',
  '水分': '💧',
  '营养': '🥗',
  '健康': '💪',
  '脂肪': '🥑',
  '饮食': '🍽️',
  '均衡': '⚖️',
  '早餐': '🍳',
  '午餐': '🍱',
  '晚餐': '🍲',
  '运动': '🏃‍♀️',
  '睡眠': '😴',
  '食物': '🍴',
  '豆制品': '🫘',
  '鱼': '🐟',
  '肉': '🥩',
  '蛋': '🥚',
  '奶制品': '🥛',
  '坚果': '🥜',
}

function findRelevantEmoji(title: string, content: string): string {
  const text = title + content;
  
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (text.includes(keyword)) {
      return emoji;
    }
  }
  
  return '✨';
}

export default function DailyNutritionTips() {
  const [tips, setTips] = useState<NutritionTip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDailyTips() {
      try {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: new Headers({
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICON_API_KEY}`,
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            model: "Qwen/Qwen2.5-7B-Instruct",
            messages: [
              {
                role: "system",
                content: "You are a professional nutritionist. Please provide 5 daily nutrition tips. Format each tip with a title in **title** format, followed by detailed content."
              },
              {
                role: "user",
                content: "请给出今天的营养建议要点，包括饮食搭配、营养均衡等方面。每条建议都要有标题，用**标题**的格式。"
              }
            ]
          })
        })

        const data = await response.json()
        const tipsArray = data.choices[0].message.content
          .split('\n')
          .filter((tip: string) => tip.trim())
          .map((tip: string) => {
            const titleMatch = tip.match(/\*\*(.*?)\*\*/)
            if (titleMatch) {
              const title = titleMatch[1]
              const content = tip.replace(/\*\*.*?\*\*:?\s*/, '').trim()
              const emoji = findRelevantEmoji(title, content)
              return { title, content, emoji }
            }
            return null
          })
          .filter((tip: NutritionTip | null): tip is NutritionTip => tip !== null)

        setTips(tipsArray)
      } catch (error) {
        console.error('Error fetching tips:', error)
        setTips([{ 
          title: '提示', 
          content: '获取今日营养建议失败，请稍后再试',
          emoji: '⚠️'
        }])
      } finally {
        setLoading(false)
      }
    }

    fetchDailyTips()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div 
            key={index} 
            className="group px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg" role="img" aria-label="nutrition icon">
                {tip.emoji}
              </span>
              <h4 className="font-bold text-base text-gray-900">
                {tip.title}
              </h4>
            </div>
            <p className="text-gray-700 leading-snug ml-6">
              {tip.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
} 