export interface Question {
  id: string;
  category: string;
  question: string;
  answers: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const questions: Question[] = [
  {
    id: '1',
    category: 'Science',
    question: 'What is the chemical symbol for gold?',
    answers: ['Go', 'Au', 'Gd', 'Ag'],
    correctAnswer: 1,
    difficulty: 'easy',
  },
  {
    id: '2',
    category: 'History',
    question: 'In which year did World War II end?',
    answers: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
    difficulty: 'medium',
  },
  {
    id: '3',
    category: 'Sports',
    question: 'How many players are on a basketball team on the court at once?',
    answers: ['4', '5', '6', '7'],
    correctAnswer: 1,
    difficulty: 'easy',
  },
  {
    id: '4',
    category: 'Geography',
    question: 'What is the capital of Australia?',
    answers: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 2,
    difficulty: 'medium',
  },
  {
    id: '5',
    category: 'Entertainment',
    question: 'Who directed the movie "Inception"?',
    answers: ['Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese', 'Quentin Tarantino'],
    correctAnswer: 1,
    difficulty: 'medium',
  },
  {
    id: '6',
    category: 'Science',
    question: 'What is the speed of light in a vacuum?',
    answers: ['299,792,458 m/s', '150,000,000 m/s', '450,000,000 m/s', '100,000,000 m/s'],
    correctAnswer: 0,
    difficulty: 'hard',
  },
  {
    id: '7',
    category: 'Technology',
    question: 'What does "HTTP" stand for?',
    answers: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'Hyper Transfer Text Process', 'Home Transfer Text Protocol'],
    correctAnswer: 0,
    difficulty: 'easy',
  },
  {
    id: '8',
    category: 'Geography',
    question: 'Which is the largest ocean on Earth?',
    answers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctAnswer: 3,
    difficulty: 'easy',
  },
];

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

