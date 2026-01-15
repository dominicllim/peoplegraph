import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a note parser for a personal CRM. Extract the person's name and structured information from casual notes about people.

Parse this input: "${input}"

Respond in JSON only, no markdown:
{
  "extracted_name": "The person's name as mentioned in the note",
  "extracted_notes": ["Array of distinct facts/observations, each a complete thought"],
  "tags": ["Optional tags like: career, family, travel, health, interests, plans"]
}

If multiple people are mentioned, focus on the primary subject. Keep extracted notes concise but complete.`
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const parsed = JSON.parse(content.text);
    
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse note' },
      { status: 500 }
    );
  }
}
