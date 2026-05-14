import type {
  AgenticPattern, AssessmentSuggestion, ComplexityClass,
  LLMConfig, PrivacyLevel, ProcessElement,
} from '../types';

const VALID_PATTERNS = new Set<AgenticPattern>([
  'human_in_the_loop', 'agent_autonomous', 'agent_with_approval',
  'rule_based_automation', 'mcp_or_api_call', 'local_code_execution',
  'notification_and_wait', 'llm_classification', 'llm_generation', 'needs_clarification',
]);
const VALID_PRIVACY = new Set<PrivacyLevel>(['pii_confirmed', 'pii_likely', 'pseudonymized', 'no_pii', 'unknown']);
const VALID_COMPLEXITY = new Set<ComplexityClass>(['low', 'medium', 'high', 'unknown']);

export function buildBatchPrompt(elements: ProcessElement[]): string {
  const steps = elements.map((el, i) => {
    const doc = el.documentation ? `\n   Dokumentation: "${el.documentation}"` : '';
    return `${i + 1}. ID="${el.id}" Name="${el.name}" Lane="${el.laneName ?? 'unbekannt'}" Typ="${el.bpmnType}"${doc}`;
  }).join('\n');

  const ids = elements.map((el) => `"${el.id}"`).join(', ');

  return `Du bist Experte für KI-Automatisierung von Geschäftsprozessen. Analysiere den Prozess und bewerte jeden Schritt.

Schritte:
${steps}

Antworte NUR mit einem JSON-Array. Pro Schritt ein Objekt:
{
  "id": "<exakte BPMN-ID aus der Liste>",
  "pattern": "human_in_the_loop|agent_autonomous|agent_with_approval|rule_based_automation|mcp_or_api_call|local_code_execution|notification_and_wait|llm_classification|llm_generation|needs_clarification",
  "privacy": "pii_confirmed|pii_likely|pseudonymized|no_pii|unknown",
  "complexity": "low|medium|high|unknown",
  "rationale": "<2-3 Sätze Begründung auf Deutsch>",
  "implementation_hint": "<konkreter Hinweis: welches System, welcher Endpoint, welche Voraussetzung — kein generisches 'API verwenden'>",
  "risk": "<was kann schiefgehen, auf Deutsch>",
  "quick_win": true|false
}

quick_win=true nur wenn: hoher Automatisierungsnutzen UND complexity=low.
Alle IDs: ${ids}
Kein Markdown, kein Text vor oder nach dem Array.`;
}

export async function analyzeBatch(
  elements: ProcessElement[],
  config: LLMConfig,
): Promise<Record<string, AssessmentSuggestion>> {
  const prompt = buildBatchPrompt(elements);

  let responseText: string;
  if (config.provider === 'ollama') {
    responseText = await callOllama(prompt, config);
  } else if (config.provider === 'anthropic') {
    responseText = await callAnthropic(prompt, config);
  } else {
    throw new Error('Kein LLM konfiguriert');
  }

  return parseLLMResponse(responseText, elements);
}

async function callOllama(prompt: string, config: LLMConfig): Promise<string> {
  const response = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.ollamaModel, prompt, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Ollama: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { response?: string };

  if (!data.response) {
    throw new Error('Ollama hat leere Antwort zurückgegeben');
  }

  return data.response;
}

async function callAnthropic(prompt: string, config: LLMConfig): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic: ${response.status} — ${body.slice(0, 200)}`);
  }

  const data = await response.json() as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text;

  if (!text) {
    throw new Error('Anthropic hat leere Antwort zurückgegeben');
  }

  return text;
}

export function parseLLMResponse(
  responseText: string,
  elements: ProcessElement[],
): Record<string, AssessmentSuggestion> {
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error('LLM-Antwort enthält kein gültiges JSON-Array');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
  const elementIds = new Set(elements.map((el) => el.id));
  const suggestions: Record<string, AssessmentSuggestion> = {};

  for (const item of parsed) {
    const id = typeof item['id'] === 'string' ? item['id'] : null;

    if (!id || !elementIds.has(id)) {
      continue;
    }

    suggestions[id] = {
      elementId: id,
      pattern: VALID_PATTERNS.has(item['pattern'] as AgenticPattern)
        ? (item['pattern'] as AgenticPattern)
        : 'needs_clarification',
      privacy: VALID_PRIVACY.has(item['privacy'] as PrivacyLevel)
        ? (item['privacy'] as PrivacyLevel)
        : 'unknown',
      complexity: VALID_COMPLEXITY.has(item['complexity'] as ComplexityClass)
        ? (item['complexity'] as ComplexityClass)
        : 'unknown',
      rationale: typeof item['rationale'] === 'string' ? item['rationale'] : '',
      implementation_hint: typeof item['implementation_hint'] === 'string' ? item['implementation_hint'] : '',
      risk: typeof item['risk'] === 'string' ? item['risk'] : '',
      quick_win: item['quick_win'] === true,
      source: 'llm',
      matchedKeywords: [],
    };
  }

  return suggestions;
}
