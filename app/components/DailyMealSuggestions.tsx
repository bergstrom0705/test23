'use client'

import { useState, useEffect } from 'react'

interface Recipe {
  title: string;
  ingredients: string[];
  nutrition: string;
  description: string;
}

export default function DailyMealSuggestions() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  const optimizeRecipeContent = async (recipeText: string): Promise<Recipe> => {
    try {
      // 使用 LLM 优化和补充内容
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICON_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            {
              role: "system",
              content: "你是一位专业的营养师和厨师。请根据提供的菜谱信息，优化并补充完整的菜谱详情。确保包含：1. 菜品名称 2. 详细的食材清单及用量 3. 完整的营养价值说明 4. 详细的烹饪步骤"
            },
            {
              role: "user",
              content: `请优化并补充以下菜谱信息，确保内容完整且格式统一：\n\n${recipeText}`
            }
          ]
        })
      })

      const data = await response.json()
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('优化内容返回格式错误')
      }

      const optimizedText = data.choices[0].message.content
      return parseRecipeText(optimizedText)
    } catch (error) {
      console.error('Error optimizing recipe:', error)
      throw error
    }
  }

  const parseRecipeText = (text: string): Recipe => {
    const sections = text.split('\n\n').filter(Boolean)
    
    // 初步解析
    let parsedRecipe = {
      title: '',
      ingredients: [] as string[],
      nutrition: '',
      description: ''
    }

    // 遍历所有段落，根据内容特征分类
    sections.forEach(section => {
      if (section.includes('食材') || section.includes('用料')) {
        parsedRecipe.ingredients = section
          .split('\n')
          .filter(line => line.trim() && !line.includes('食材') && !line.includes('用料'))
          .map(line => line.replace(/^\d+[\.\、]\s*/, '').trim())
      } else if (section.includes('营养')) {
        parsedRecipe.nutrition = section.replace(/^营养[价值信息]*[：:]\s*/, '').trim()
      } else if (section.includes('步骤') || section.includes('做法') || section.includes('说明')) {
        parsedRecipe.description = section.replace(/^[烹饪制作]*[步骤做法说明]+[：:]\s*/, '').trim()
      } else if (!parsedRecipe.title && !section.includes('主要') && !section.includes('食材')) {
        parsedRecipe.title = section.trim()
      }
    })

    return parsedRecipe
  }

  const fetchNewRecipe = async () => {
    setLoading(true)
    try {
      // 第一次调用获取基础菜谱
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICON_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            {
              role: "system",
              content: "你是一位专业的营养师。请推荐一道健康的中式菜品，格式要求：\n1. 菜品名称\n2. 主要食材（需要具体用量）\n3. 营养价值\n4. 详细的烹饪步骤"
            },
            {
              role: "user",
              content: "请推荐一道营养均衡、适合日常制作的菜品。"
            }
          ]
        })
      })

      const data = await response.json()
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('获取菜谱失败')
      }

      // 使用第二个 LLM 调用优化内容
      const initialRecipe = data.choices[0].message.content
      const optimizedRecipe = await optimizeRecipeContent(initialRecipe)
      setRecipe(optimizedRecipe)

    } catch (error) {
      console.error('Error in recipe process:', error)
      // 设置默认菜谱
      setRecipe({
        title: '五彩时蔬炒菜',
        ingredients: [
          '西兰花 200g',
          '胡萝卜 1根',
          '玉米笋 100g',
          '木耳 50g',
          '蒜末 适量',
          '油盐 适量'
        ],
        nutrition: '本菜品富含维生素C、膳食纤维和矿物质，热量适中，有助于维持健康的饮食结构。',
        description: '1. 所有食材洗净切块\n2. 锅中加油烧热，爆香蒜末\n3. 加入所有食材翻炒\n4. 适时加盐调味即可'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNewRecipe()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">
        {recipe.title}
      </h3>

      <div className="space-y-4 bg-white rounded-lg p-6 shadow-sm">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">主要食材：</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">营养价值：</h4>
          <p className="text-gray-600">{recipe.nutrition}</p>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">烹饪说明：</h4>
          <p className="text-gray-600 whitespace-pre-line">{recipe.description}</p>
        </div>

        <div className="pt-4 flex justify-center">
          <button
            onClick={fetchNewRecipe}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <span>换一换</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
} 