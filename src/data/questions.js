const allQuestions = [
  {
    id: 1,
    prompt: "Is it more important to be understood, or to be loved?",
    axes: {
      left: "Must be understood",
      right: "Must be loved",
      top: "Both are inseparable",
      bottom: "I need neither — I am self-sufficient"
    }
  },
  {
    id: 2,
    prompt: "When facing a major decision, do you trust your head or your heart?",
    axes: {
      left: "Always my head",
      right: "Always my heart",
      top: "I need both to agree",
      bottom: "I trust external guidance"
    }
  },
  {
    id: 3,
    prompt: "Is it better to be feared or respected?",
    axes: {
      left: "Feared",
      right: "Respected",
      top: "Both equally",
      bottom: "Neither matters to me"
    }
  },
  {
    id: 4,
    prompt: "Would you rather have many acquaintances or a few close friends?",
    axes: {
      left: "Many acquaintances",
      right: "Few close friends",
      top: "I want both",
      bottom: "I prefer solitude"
    }
  },
  {
    id: 5,
    prompt: "Is tradition something to preserve or something to question?",
    axes: {
      left: "Always preserve",
      right: "Always question",
      top: "Depends on the tradition",
      bottom: "Tradition is irrelevant"
    }
  },
  {
    id: 6,
    prompt: "Do you live for today or plan for tomorrow?",
    axes: {
      left: "Live for today",
      right: "Plan for tomorrow",
      top: "Balance both",
      bottom: "Neither — I live in the past"
    }
  },
  {
    id: 7,
    prompt: "Is honesty always the best policy?",
    axes: {
      left: "Absolute honesty always",
      right: "White lies are acceptable",
      top: "Context determines honesty",
      bottom: "Truth is subjective"
    }
  },
  {
    id: 8,
    prompt: "Would you rather be famous or anonymous?",
    axes: {
      left: "Famous",
      right: "Anonymous",
      top: "Known in my field only",
      bottom: "It doesn't matter"
    }
  },
  {
    id: 9,
    prompt: "Is it more important to be right or to be kind?",
    axes: {
      left: "Always be right",
      right: "Always be kind",
      top: "Both are equally important",
      bottom: "Neither defines me"
    }
  },
  {
    id: 10,
    prompt: "Do you prefer routine or spontaneity?",
    axes: {
      left: "Strict routine",
      right: "Total spontaneity",
      top: "Flexible structure",
      bottom: "I have no preference"
    }
  },
  {
    id: 11,
    prompt: "Is failure a lesson or a setback?",
    axes: {
      left: "Always a lesson",
      right: "Always a setback",
      top: "Both simultaneously",
      bottom: "Failure is inevitable"
    }
  },
  {
    id: 12,
    prompt: "Would you rather be wealthy or fulfilled?",
    axes: {
      left: "Wealthy",
      right: "Fulfilled",
      top: "They're the same to me",
      bottom: "Neither brings happiness"
    }
  },
  {
    id: 13,
    prompt: "Is change exciting or threatening?",
    axes: {
      left: "Always exciting",
      right: "Always threatening",
      top: "Depends on the change",
      bottom: "Change is constant"
    }
  },
  {
    id: 14,
    prompt: "Do you believe people are fundamentally good or bad?",
    axes: {
      left: "Fundamentally good",
      right: "Fundamentally bad",
      top: "A mix of both",
      bottom: "Beyond such labels"
    }
  },
  {
    id: 15,
    prompt: "Is it better to lead or to follow?",
    axes: {
      left: "Always lead",
      right: "Always follow",
      top: "Situational leadership",
      bottom: "Work independently"
    }
  },
  {
    id: 16,
    prompt: "Would you sacrifice personal happiness for a greater cause?",
    axes: {
      left: "Always sacrifice",
      right: "Never sacrifice",
      top: "Depends on the cause",
      bottom: "Happiness is the cause"
    }
  },
  {
    id: 17,
    prompt: "Is art meant to comfort or to challenge?",
    axes: {
      left: "Always comfort",
      right: "Always challenge",
      top: "Both purposes are valid",
      bottom: "Art has no inherent purpose"
    }
  },
  {
    id: 18,
    prompt: "Do you trust logic or intuition?",
    axes: {
      left: "Pure logic",
      right: "Pure intuition",
      top: "Both inform each other",
      bottom: "Neither is reliable"
    }
  },
  {
    id: 19,
    prompt: "Is privacy a right or a luxury?",
    axes: {
      left: "Absolute right",
      right: "Modern luxury",
      top: "Somewhere between",
      bottom: "Privacy is outdated"
    }
  },
  {
    id: 20,
    prompt: "Would you rather ask for forgiveness or permission?",
    axes: {
      left: "Always forgiveness",
      right: "Always permission",
      top: "Context determines",
      bottom: "I need neither"
    }
  },
  {
    id: 21,
    prompt: "Is progress more important than preservation?",
    axes: {
      left: "Progress always",
      right: "Preservation always",
      top: "Balance is key",
      bottom: "Both are illusions"
    }
  },
  {
    id: 22,
    prompt: "Do you value knowledge or wisdom?",
    axes: {
      left: "Knowledge",
      right: "Wisdom",
      top: "They're inseparable",
      bottom: "Neither defines value"
    }
  },
  {
    id: 23,
    prompt: "Is sacrifice noble or foolish?",
    axes: {
      left: "Always noble",
      right: "Always foolish",
      top: "Depends on what's sacrificed",
      bottom: "Everything is sacrifice"
    }
  },
  {
    id: 24,
    prompt: "Would you rather be feared for your strength or loved for your kindness?",
    axes: {
      left: "Feared for strength",
      right: "Loved for kindness",
      top: "Both are valuable",
      bottom: "Neither defines me"
    }
  },
  {
    id: 25,
    prompt: "Is time a friend or an enemy?",
    axes: {
      left: "Always a friend",
      right: "Always an enemy",
      top: "It's what you make it",
      bottom: "Time is an illusion"
    }
  },
  {
    id: 26,
    prompt: "Do you believe in destiny or free will?",
    axes: {
      left: "Pure destiny",
      right: "Pure free will",
      top: "Both coexist",
      bottom: "Neither exists"
    }
  },
  {
    id: 27,
    prompt: "Is competition healthy or harmful?",
    axes: {
      left: "Always healthy",
      right: "Always harmful",
      top: "Healthy in moderation",
      bottom: "Competition is artificial"
    }
  },
  {
    id: 28,
    prompt: "Would you rather be remembered or forgotten?",
    axes: {
      left: "Remembered forever",
      right: "Peacefully forgotten",
      top: "Remembered by a few",
      bottom: "Memory is meaningless"
    }
  },
  {
    id: 29,
    prompt: "Is perfection worth pursuing?",
    axes: {
      left: "Always pursue perfection",
      right: "Embrace imperfection",
      top: "Strive but accept limits",
      bottom: "Perfection is subjective"
    }
  },
  {
    id: 30,
    prompt: "Do you live to work or work to live?",
    axes: {
      left: "Live to work",
      right: "Work to live",
      top: "Work-life integration",
      bottom: "Work is just survival"
    }
  },
  {
    id: 31,
    prompt: "Is loneliness a state of mind or circumstance?",
    axes: {
      left: "State of mind",
      right: "Circumstance",
      top: "Both together",
      bottom: "Loneliness is chosen"
    }
  },
  {
    id: 32,
    prompt: "Would you rather be intelligent or happy?",
    axes: {
      left: "Intelligent",
      right: "Happy",
      top: "Both are possible",
      bottom: "Neither guarantees fulfillment"
    }
  },
  {
    id: 33,
    prompt: "Is conflict necessary for growth?",
    axes: {
      left: "Absolutely necessary",
      right: "Never necessary",
      top: "Sometimes necessary",
      bottom: "Growth is overrated"
    }
  },
  {
    id: 34,
    prompt: "Do you value consistency or adaptability?",
    axes: {
      left: "Consistency",
      right: "Adaptability",
      top: "Both are strengths",
      bottom: "Neither matters"
    }
  },
  {
    id: 35,
    prompt: "Is hope empowering or dangerous?",
    axes: {
      left: "Always empowering",
      right: "Always dangerous",
      top: "Can be both",
      bottom: "Hope is an illusion"
    }
  }
];

export { allQuestions }

// Kept for non-multiplayer fallback — in multiplayer the host
// shares question indices via Playroom so both players see the same set.
export const questions = allQuestions
  .sort(() => Math.random() - 0.5)
  .slice(0, 5)
