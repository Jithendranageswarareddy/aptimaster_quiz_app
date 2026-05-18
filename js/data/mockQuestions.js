/*
  Purpose: Ready practice question bank used when AI generation is unavailable.
*/

export const MOCK_QUESTIONS = [
  {
    id: 1,
    category: 'quantitative',
    topic: 'number-systems',
    difficulty: 'easy',
    question: 'If 18 + x = 31, what is the value of x?',
    options: ['11', '12', '13', '14'],
    answer: '13',
    explanation: 'Subtract 18 from both sides: 31 - 18 = 13.'
  },
  {
    id: 2,
    category: 'quantitative',
    topic: 'percentages',
    difficulty: 'medium',
    question: 'What is 15% of 320?',
    options: ['42', '48', '52', '56'],
    answer: '48',
    explanation: '10% of 320 is 32 and 5% is 16, so 15% is 48.'
  },
  {
    id: 3,
    category: 'quantitative',
    topic: 'time-speed-distance',
    difficulty: 'medium',
    question: 'A train covers 120 km in 2 hours. What is its speed?',
    options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],
    answer: '60 km/h',
    explanation: 'Speed equals distance divided by time: 120 / 2 = 60 km/h.'
  },
  {
    id: 4,
    category: 'quantitative',
    topic: 'averages',
    difficulty: 'easy',
    question: 'What is the average of 6, 8, and 10?',
    options: ['7', '8', '9', '10'],
    answer: '8',
    explanation: 'Add the numbers and divide by 3: (6 + 8 + 10) / 3 = 8.'
  },
  {
    id: 5,
    category: 'logical',
    topic: 'analogy',
    difficulty: 'medium',
    question: 'Find the odd one out: 3, 5, 11, 14, 17',
    options: ['3', '5', '11', '14'],
    answer: '14',
    explanation: '3, 5, 11, and 17 are prime numbers, while 14 is not.'
  },
  {
    id: 6,
    category: 'logical',
    topic: 'coding-decoding',
    difficulty: 'hard',
    question: 'If CAT = 24 and DOG = 26, then BAT = ?',
    options: ['22', '23', '24', '25'],
    answer: '23',
    explanation: 'Use alphabet positions: B + A + T = 2 + 1 + 20 = 23.'
  },
  {
    id: 7,
    category: 'logical',
    topic: 'number-series',
    difficulty: 'easy',
    question: 'Which number comes next: 2, 4, 8, 16, ?',
    options: ['18', '24', '30', '32'],
    answer: '32',
    explanation: 'Each term doubles, so 16 x 2 = 32.'
  },
  {
    id: 8,
    category: 'logical',
    topic: 'blood-relations',
    difficulty: 'medium',
    question: 'A is the brother of B. B is the sister of C. How is A related to C?',
    options: ['Brother', 'Sister', 'Father', 'Mother'],
    answer: 'Brother',
    explanation: 'A is male and B and C are siblings, so A is C\'s brother.'
  },
  {
    id: 9,
    category: 'verbal',
    topic: 'vocabulary',
    difficulty: 'easy',
    question: 'Choose the correctly spelled word.',
    options: ['Enviroment', 'Environment', 'Envirnment', 'Enviornment'],
    answer: 'Environment',
    explanation: 'Environment is the standard spelling.'
  },
  {
    id: 10,
    category: 'verbal',
    topic: 'antonyms',
    difficulty: 'medium',
    question: 'Choose the antonym of "scarce".',
    options: ['Rare', 'Plentiful', 'Limited', 'Little'],
    answer: 'Plentiful',
    explanation: 'Scarce means not enough; plentiful means available in large amounts.'
  },
  {
    id: 11,
    category: 'verbal',
    topic: 'sentence-correction',
    difficulty: 'hard',
    question: 'Identify the sentence with correct subject-verb agreement.',
    options: [
      'The list of items are on the desk.',
      'The list of items is on the desk.',
      'The lists of item is on desk.',
      'The list on the desks are complete.'
    ],
    answer: 'The list of items is on the desk.',
    explanation: 'The subject is "list", which is singular, so it takes "is".'
  },
  {
    id: 12,
    category: 'verbal',
    topic: 'synonyms',
    difficulty: 'easy',
    question: 'Choose the synonym of "brief".',
    options: ['Short', 'Heavy', 'Late', 'Loud'],
    answer: 'Short',
    explanation: 'Brief means short in duration or length.'
  }
];
