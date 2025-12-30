import { Question } from '@/constants/questions';

// Open Trivia Database API - free, unlimited questions
const API_BASE_URL = 'https://opentdb.com/api.php';

// Category mapping from Open Trivia DB categories to your categories
const CATEGORY_MAP: Record<number, string> = {
  9: 'General Knowledge',
  10: 'Entertainment',
  17: 'Science',
  22: 'Geography',
  23: 'History',
  11: 'Entertainment',
  12: 'Entertainment',
  14: 'Entertainment',
  15: 'Entertainment',
  16: 'Entertainment',
  21: 'Sports',
  18: 'Science',
  19: 'Science',
  30: 'Science',
  20: 'Mythology',
  24: 'Politics',
  25: 'Art',
  26: 'Celebrities',
  27: 'Animals',
  28: 'Vehicles',
  31: 'Entertainment',
};

// Reverse mapping: category name to Open Trivia DB category ID
// Maps your app's category names to the primary Open Trivia DB category ID
// Open Trivia DB categories: https://opentdb.com/api_category.php
const CATEGORY_NAME_TO_ID: Record<string, number> = {
  'Science': 17,              // Science: Nature
  'History': 23,              // History
  'Sports': 21,               // Sports
  'Entertainment': 10,        // Entertainment: Books
  'Geography': 22,            // Geography
  'General Knowledge': 9,     // General Knowledge
  'Technology': 18,           // Science: Computers
};

// Decode HTML entities (React Native compatible)
function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&auml;/g, 'ä')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&aacute;/g, 'á')
    .replace(/&deg;/g, '°')
    .replace(/&reg;/g, '®')
    .replace(/&copy;/g, '©');
}

// Convert Open Trivia DB format to our Question format
interface OpenTriviaQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTriviaResponse {
  response_code: number;
  results: OpenTriviaQuestion[];
}

// Transform API response to our Question format
function transformQuestion(apiQuestion: OpenTriviaQuestion, index: number): Question {
  const answers = [...apiQuestion.incorrect_answers, apiQuestion.correct_answer]
    .map(decodeHtml)
    .sort(() => Math.random() - 0.5); // Shuffle answers
  
  const correctAnswerIndex = answers.indexOf(decodeHtml(apiQuestion.correct_answer));

  return {
    id: `api-${Date.now()}-${index}`,
    category: apiQuestion.category.replace(/^[^:]+: /, ''), // Remove prefix like "Entertainment: "
    question: decodeHtml(apiQuestion.question),
    answers,
    correctAnswer: correctAnswerIndex,
    difficulty: apiQuestion.difficulty as 'easy' | 'medium' | 'hard',
  };
}

// Fetch questions from Open Trivia Database
export async function fetchQuestions(
  amount: number = 5,
  category?: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  try {
    const params = new URLSearchParams({
      amount: amount.toString(),
      type: 'multiple', // Multiple choice only
      // Note: Using default encoding (HTML entities) - easier to decode
    });

    if (category) {
      params.append('category', category.toString());
    }

    if (difficulty) {
      params.append('difficulty', difficulty);
    }

    const url = `${API_BASE_URL}?${params.toString()}`;
    console.log('[questionsService] API URL =', url);
    console.log('[questionsService] 📡 Fetching from API:', url);

    const response = await fetch(url);
    
    console.log('[questionsService] 📥 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorMsg = `API request failed: ${response.status} ${response.statusText}`;
      console.error('[questionsService] ❌', errorMsg);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded (429). Please wait a moment and try again.');
      }
      if (response.status === 404) {
        throw new Error('API endpoint not found (404).');
      }
      
      throw new Error(errorMsg);
    }

    const data: OpenTriviaResponse = await response.json();

    console.log('[questionsService] 📦 Response data:', {
      response_code: data.response_code,
      results_count: data.results?.length || 0
    });

    if (data.response_code !== 0) {
      const errorMsg = `API error: response_code ${data.response_code}`;
      console.error('[questionsService] ❌', errorMsg);
      
      if (data.response_code === 1) {
        throw new Error('No results found. The API doesn\'t have enough questions for your query.');
      }
      if (data.response_code === 2) {
        throw new Error('Invalid parameter. Check your category and amount settings.');
      }
      if (data.response_code === 3) {
        throw new Error('Session token not found.');
      }
      if (data.response_code === 4) {
        throw new Error('Session token has returned all possible questions.');
      }
      
      throw new Error(errorMsg);
    }

    if (!data.results || data.results.length === 0) {
      console.error('[questionsService] ❌ API returned empty results array');
      throw new Error('API returned no questions');
    }

    const transformed = data.results.map((q, index) => transformQuestion(q, index));
    console.log('[questionsService] ✅ Transformed', transformed.length, 'questions');
    
    return transformed;
  } catch (error: any) {
    console.error('[questionsService] ❌ Failed to fetch questions from API');
    console.error('[questionsService] Error:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.substring(0, 200)
    });
    throw error;
  }
}

// Fetch random questions from multiple categories (simulates 40k+ question bank)
export async function fetchRandomQuestions(amount: number = 5, categoryName?: string): Promise<Question[]> {
  console.log('========================================');
  console.log('[questionsService] fetchRandomQuestions called');
  console.log('[questionsService] CATEGORY PASSED =', categoryName || 'undefined');
  console.log('[questionsService] AMOUNT REQUESTED =', amount);
  
  try {
    // If category is specified, map it to Open Trivia DB category ID
    let categoryId: number | undefined;
    if (categoryName) {
      categoryId = CATEGORY_NAME_TO_ID[categoryName];
      if (!categoryId) {
        console.warn('[questionsService] ⚠️ Category "' + categoryName + '" not found in mapping');
        console.warn('[questionsService] ⚠️ Available categories:', Object.keys(CATEGORY_NAME_TO_ID).join(', '));
        console.warn('[questionsService] ⚠️ Fetching random questions without category filter');
      } else {
        console.log('[questionsService] ✅ Mapped category "' + categoryName + '" to API ID:', categoryId);
      }
    } else {
      console.log('[questionsService] ℹ️ No category specified, fetching random questions');
    }
    
    console.log('[questionsService] API CATEGORY =', categoryName || 'undefined');
    console.log('[questionsService] API CATEGORY ID =', categoryId || 'undefined');
    
    // Fetch questions with optional category filter
    console.log('[questionsService] 🚀 Calling fetchQuestions with:', { amount, categoryId });
    const questions = await fetchQuestions(amount, categoryId);
    
    console.log('[questionsService] FETCH RESULT LENGTH =', questions?.length || 0);
    console.log('[questionsService] ✅ fetchQuestions returned', questions?.length || 0, 'questions');
    
    if (!questions || questions.length === 0) {
      console.error('[questionsService] ❌ Received empty questions array!');
      throw new Error('API returned empty questions array');
    }
    
    if (questions.length < amount) {
      console.warn('[questionsService] ⚠️ API returned', questions.length, 'questions but', amount, 'were requested');
    }
    
    console.log('[questionsService] FALLBACK TRIGGERED =', false);
    console.log('========================================');
    
    return questions;
  } catch (error: any) {
    console.error('[questionsService] ❌ fetchRandomQuestions failed:', error);
    console.error('[questionsService] FALLBACK TRIGGERED =', true);
    console.error('[questionsService] Error details:', {
      message: error?.message,
      status: error?.status,
      name: error?.name
    });
    console.log('========================================');
    throw error;
  }
}

// Get available categories
export async function getCategories(): Promise<Array<{ id: number; name: string }>> {
  try {
    const response = await fetch('https://opentdb.com/api_category.php');
    const data = await response.json();
    return data.trivia_categories || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

