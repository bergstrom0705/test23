export class SiliconFlowAI {
  private apiKey: string;
  private baseUrl: string = 'https://api.siliconflow.ai/v1/chat/completions';
  private static lastRequestTime: number = 0;
  private static requestCount: number = 0;
  private static readonly MIN_REQUEST_INTERVAL = 60; // 60ms 间隔以确保不超过 1000 RPM
  private static readonly MAX_REQUESTS_PER_MINUTE = 900; // 留一些余量，不要用满1000
  private static readonly TOKEN_LIMIT = 45000; // 每分钟token限制，留一些余量

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_SILICON_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SILICON_API_KEY is not set in environment variables');
    }
    this.apiKey = apiKey;
  }

  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - SiliconFlowAI.lastRequestTime;

    // 检查是否需要重置计数器（每分钟重置一次）
    if (timeSinceLastRequest >= 60000) {
      SiliconFlowAI.requestCount = 0;
      SiliconFlowAI.lastRequestTime = now;
    }

    // 检查请求数是否达到限制
    if (SiliconFlowAI.requestCount >= SiliconFlowAI.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - timeSinceLastRequest;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        SiliconFlowAI.requestCount = 0;
      }
    }

    // 确保请求间隔
    if (timeSinceLastRequest < SiliconFlowAI.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, SiliconFlowAI.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
  }

  // 估算token数量的简单方法
  private estimateTokens(text: string): number {
    // 粗略估计：每4个字符约等于1个token
    return Math.ceil(text.length / 4);
  }

  async complete(prompt: string): Promise<string> {
    try {
      // 估算prompt的token数量
      const estimatedPromptTokens = this.estimateTokens(prompt);
      if (estimatedPromptTokens > SiliconFlowAI.TOKEN_LIMIT) {
        throw new Error('Prompt too long, exceeds token limit');
      }

      // 等待速率限制
      await this.rateLimitWait();

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'claude-2.1',
          temperature: 0.7,
          max_tokens: Math.min(2000, SiliconFlowAI.TOKEN_LIMIT - estimatedPromptTokens), // 确保不超过总限制
        }),
      });

      // 更新请求计数和时间
      SiliconFlowAI.requestCount++;
      SiliconFlowAI.lastRequestTime = Date.now();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API request failed with status ${response.status}: ${
            errorData.error?.message || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from API');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling SiliconFlow API:', error);
      if (error instanceof Error) {
        throw new Error(`AI API Error: ${error.message}`);
      }
      throw new Error('Unknown AI API error');
    }
  }
} 