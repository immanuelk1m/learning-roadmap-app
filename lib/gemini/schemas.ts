export interface KnowledgeNode {
  name: string
  description: string
  level: number
  prerequisites: string[]
  children: KnowledgeNode[]
}

export interface KnowledgeTreeResponse {
  nodes: KnowledgeNode[]
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  source_quote: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizResponse {
  questions: QuizQuestion[]
}

export const knowledgeTreeSchema = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          level: { type: "number" },
          prerequisites: {
            type: "array",
            items: { type: "string" }
          },
          children: {
            type: "array",
            items: { $ref: "#/definitions/node" }
          }
        },
        required: ["name", "description", "level", "prerequisites", "children"]
      }
    }
  },
  required: ["nodes"],
  definitions: {
    node: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        level: { type: "number" },
        prerequisites: {
          type: "array",
          items: { type: "string" }
        },
        children: {
          type: "array",
          items: { $ref: "#/definitions/node" }
        }
      },
      required: ["name", "description", "level", "prerequisites", "children"]
    }
  }
}

export const quizSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4
          },
          correct_answer: { type: "string" },
          explanation: { type: "string" },
          source_quote: { type: "string" },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"]
          }
        },
        required: ["question", "options", "correct_answer", "explanation", "source_quote", "difficulty"]
      }
    }
  },
  required: ["questions"]
}