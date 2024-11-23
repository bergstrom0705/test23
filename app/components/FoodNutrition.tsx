'use client';

import { useState, ChangeEvent } from 'react';

interface NutrientInfo {
  name: string;
  amount: number;
  unit: string;
}

export default function FoodNutrition() {
  const [foodName, setFoodName] = useState('');
  const [loading, setLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutrientInfo[]>([]);
  const [error, setError] = useState('');

  const searchFood = async () => {
    if (!foodName.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/food-nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ foodName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || '查询失败');
      }
      
      setNutritionData(data.nutrients);
      console.log('营养数据:', data);
    } catch (err) {
      console.error('查询错误:', err);
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFoodName(e.target.value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4">
        <h3 className="text-xl font-bold mb-4">食物营养成分查询</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="输入食物名称"
            value={foodName}
            onChange={handleInputChange}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={searchFood}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">
            {error}
          </p>
        )}

        {nutritionData.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-2">营养成分:</h4>
            {nutritionData.map((nutrient, index) => (
              <div key={index} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span className="text-gray-700">{nutrient.name}</span>
                <span className="text-gray-900 font-medium">
                  {nutrient.amount} {nutrient.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 