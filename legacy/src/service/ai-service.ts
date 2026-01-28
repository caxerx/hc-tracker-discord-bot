import { getIncompleteCharacters } from "./character-service";

interface RaidProgress {
  raid: string;
  target: number;
  completed: number;
}

export interface CharacterDetectionResult {
  detectedCharacter: string[];
  detectedDate: string | null;
}

interface AIApiRequest {
  max_tokens: number;
  messages: Array<{
    role: string;
    content: Array<{
      type: string;
      source: {
        type: string;
        url: string;
      };
    }>;
  }>;
  output_format: {
    type: string;
    schema: object;
  };
  model: string;
}

interface AIApiResponse {
  model: string;
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    cache_creation: {
      ephemeral_5m_input_tokens: number;
      ephemeral_1h_input_tokens: number;
    };
    output_tokens: number;
    service_tier: string;
  };
}

export async function analyzeRaidImage(imageUrl: string): Promise<RaidProgress[]> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error('AI_API_KEY or AI_API_URL is not set in environment variables');
  }

  const requestBody: AIApiRequest = {
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
        ],
      },
    ],
    output_format: {
      type: 'json_schema',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            raid: {
              type: 'string',
              description: 'The name of the raid boss (e.g., Carno, Kirollas, Zenas, Erenia, Belial, Paimon).',
            },
            target: {
              type: 'integer',
              description: 'The total goal count required for the quest.',
            },
            completed: {
              type: 'integer',
              description: 'The current progress count.',
            },
          },
          required: ['raid', 'target', 'completed'],
        },
      },
    },
    model: 'claude-opus-4-5-20251101',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'anthropic-beta': 'structured-outputs-2025-11-13',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AIApiResponse;

  // Extract the content from the response
  // The API returns the structured output in the content field
  const textContent = data.content?.[0]?.text;
  if (textContent) {
    return JSON.parse(textContent) as RaidProgress[];
  }

  throw new Error('Invalid response format from AI API');
}

export async function detectCharactersAndDate(imageUrls: string[], raidDate: Date): Promise<CharacterDetectionResult> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error('AI_API_KEY or AI_API_URL is not set in environment variables');
  }

  // Get list of characters who haven't completed all raids today
  const whitelistedCharacters = await getIncompleteCharacters(raidDate);

  const requestBody: AIApiRequest = {
    max_tokens: 10000,
    messages: [
      {
        role: 'user',
        content: imageUrls.map(url => ({
          type: 'image',
          source: {
            type: 'url',
            url,
          },
        })),
      },
    ],
    output_format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          detectedCharacter: {
            type: 'array',
            description: 'A list of all whitelisted character names detected in the image. Return an empty array if no names are found.',
            items: {
              type: 'string',
            },
          },
          detectedDate: {
            type: ['string', 'null'],
            format: 'date-time',
            description: 'The date string detected in the image. Return null if no date string is detected in the image. If multiple dates are detected, use the one written in yellow text.',
          },
        },
        required: ['detectedCharacter'],
        additionalProperties: false,
      },
    },
    model: 'claude-opus-4-5-20251101',
  };

  const systemPrompt = `Detect all date string and character string in the image. Only the following whitelisted character name should be output if detected in the image: \n${whitelistedCharacters.join('\n')}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'anthropic-beta': 'structured-outputs-2025-11-13',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...requestBody,
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as AIApiResponse;

  const textContent = data.content?.[0]?.text;
  if (textContent) {
    return JSON.parse(textContent) as CharacterDetectionResult;
  }

  throw new Error('Invalid response format from AI API');
}
