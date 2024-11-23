import { NextResponse } from 'next/server';
import { SiliconFlowAI } from '@/lib/siliconflow';

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// 预定义的营养成分翻译映射
const nutrientTranslations: Record<string, string> = {
  'Energy': '热量',
  'Protein': '蛋白质',
  'Total lipid (fat)': '脂肪',
  'Carbohydrate, by difference': '碳水化合物',
  'Fiber, total dietary': '膳食纤维',
  'Total Sugars': '总糖',
  'Calcium, Ca': '钙',
  'Potassium, K': '钾',
  'Sodium, Na': '钠',
  'Vitamin A, IU': '维生素A',
  'Vitamin C, total ascorbic acid': '维生素C',
  'Vitamin D (D2 + D3), International Units': '维生素D',
  'Cholesterol': '胆固醇',
  'Fatty acids, total saturated': '饱和脂肪酸',
  'Iron, Fe': '铁',
  'Zinc, Zn': '锌',
  'Magnesium, Mg': '镁',
  'Phosphorus, P': '磷'
};

// 单位翻译映射
const unitTranslations: Record<string, string> = {
  'G': '克',
  'MG': '毫克',
  'KCAL': '千卡',
  'IU': '国际单位',
  'UG': '微克'
};

// 营养成分排序顺序
const nutrientOrder = [
  '热量', '蛋白质', '脂肪', '碳水化合物', '膳食纤维', 
  '总糖', '钙', '钾', '钠', '维生素A', '维生素C', 
  '维生素D', '胆固醇', '饱和脂肪酸', '铁', '锌', '镁', '磷'
];

// 简单的中英文食物名称映射
const foodNameMap: Record<string, string> = {
  '牛奶': 'milk',
  '面包': 'bread',
  '米饭': 'rice',
  '鸡蛋': 'egg',
  '苹果': 'apple',
};

export async function POST(request: Request) {
  try {
    const { foodName } = await request.json();
    console.log('原始搜索食物:', foodName);
    
    // 转换食物名称为英文
    const englishFoodName = foodNameMap[foodName] || foodName;
    console.log('转换后的食物名称:', englishFoodName);
    
    // 1. 首先从 USDA 搜索食物
    const searchUrl = `${USDA_API_BASE}/foods/search?api_key=${process.env.USDA_API_KEY}&query=${encodeURIComponent(englishFoodName)}`;
    const searchResponse = await fetch(searchUrl, { method: 'GET' });
    const searchData = await searchResponse.json();
    
    if (!searchData.foods?.length) {
      console.log('未找到食物');
      return NextResponse.json(
        { message: `未找到食物: ${foodName} (${englishFoodName})` },
        { status: 404 }
      );
    }

    try {
      // 尝试使用 AI 处理
      const ai = new SiliconFlowAI();
      
      // 2. 使用 LLM 选择最合适的食物
      const foodChoicePrompt = `
        以下是搜索"${foodName}"返回的食物列表:
        ${searchData.foods.slice(0, 5).map((f, i) => `${i}. ${f.description}`).join('\n')}
        
        请选择最普遍、最大众化的一种食物，只返回对应的索引数字(0-4)。
      `;
      
      const chosenIndex = parseInt(await ai.complete(foodChoicePrompt));
      if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= searchData.foods.length) {
        throw new Error(`Invalid AI response: ${chosenIndex}`);
      }
      
      const chosenFood = searchData.foods[chosenIndex];

      // 3. 获取选中食物的详细营养信息
      const nutrientsUrl = `${USDA_API_BASE}/food/${chosenFood.fdcId}?api_key=${process.env.USDA_API_KEY}`;
      const nutrientsResponse = await fetch(nutrientsUrl, { method: 'GET' });
      const nutrientsData = await nutrientsResponse.json();
      
      // 4. 提取主要营养成分
      const mainNutrients = nutrientsData.foodNutrients
        .filter((n: any) => n.nutrient?.name && n.amount)
        .map((n: any) => ({
          name: n.nutrient.name,
          amount: n.amount,
          unit: n.nutrient.unitName
        }));

      // 5. 使用 LLM 翻译营养成分
      const translationPrompt = `
        请将以下食物营养成分信息翻译成中文，保持数值和单位不变，只翻译营养成分的名称。
        同时，请按照以下顺序排列（如果存在的话）：热量、蛋白质、脂肪、碳水化合物、膳食纤维、糖类、钙、钾、钠、维生素A、维生素C、维生素D、胆固醇、饱和脂肪酸。
        
        营养成分列表：
        ${mainNutrients.map(n => `${n.name}: ${n.amount} ${n.unit}`).join('\n')}
        
        请以JSON格式返回，格式如下：
        [
          {"name": "中文名称", "amount": 数值, "unit": "单位"},
          ...
        ]
      `;

      const translatedNutrientsStr = await ai.complete(translationPrompt);
      const translatedNutrients = JSON.parse(translatedNutrientsStr);

      return NextResponse.json({
        foodName: chosenFood.description,
        nutrients: translatedNutrients
      });
    } catch (aiError) {
      console.error('AI 处理错误，使用后备翻译:', aiError);
      
      // 使用预定义映射进行翻译
      const firstFood = searchData.foods[0];
      const nutrients = firstFood.foodNutrients
        .filter((n: any) => n.nutrient?.name && n.amount)
        .map((n: any) => ({
          name: nutrientTranslations[n.nutrient.name] || n.nutrient.name,
          amount: n.amount,
          unit: unitTranslations[n.nutrient.unitName] || n.nutrient.unitName
        }))
        .filter(n => nutrientTranslations[n.name]) // 只保留我们定义了翻译的营养成分
        .sort((a, b) => {
          const indexA = nutrientOrder.indexOf(a.name);
          const indexB = nutrientOrder.indexOf(b.name);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

      return NextResponse.json({
        foodName: firstFood.description,
        nutrients: nutrients
      });
    }
  } catch (error) {
    console.error('食物营养 API 错误:', error);
    return NextResponse.json(
      { message: '服务器错误', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 