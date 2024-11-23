import DailyNutritionTips from './components/DailyNutritionTips'
import DailyMealSuggestions from './components/DailyMealSuggestions'
import NutritionistChat from './components/NutritionistChat'
import FoodNutrition from './components/FoodNutrition'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部区域 */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">营养健康顾问</h1>
          <p className="text-xl text-gray-600">专业的营养指导，科学的健康建议</p>
        </header>

        {/* 主要内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 每日营养餐部分 */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">每日营养建议</h2>
              <DailyNutritionTips />
            </section>

            {/* 营养餐推荐部分 */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">今日推荐菜谱</h2>
              <DailyMealSuggestions />
            </section>
          </div>

          {/* 右侧区域 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 营养师对话区 */}
            <NutritionistChat />
            
            {/* 食物营养成分查询 */}
            <FoodNutrition />
          </div>
        </div>
      </main>
    </div>
  )
}
