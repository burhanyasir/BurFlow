export type FrameworkId = 'ape' | 'race' | 'create' | 'spark';

export interface FrameworkInfo {
  id: FrameworkId;
  name: string;
  expansion: string;
}

export const FRAMEWORKS: FrameworkInfo[] = [
  { id: 'ape', name: 'APE', expansion: 'Action · Purpose · Expectation' },
  { id: 'race', name: 'RACE', expansion: 'Role · Action · Context · Execution' },
  { id: 'create', name: 'CREATE', expansion: 'Context · Request · Examples · Action · Transform · Evaluate' },
  { id: 'spark', name: 'SPARK', expansion: 'Scenario · Purpose · Audience · Requirements · Keep' },
];

export const TONES = ['Professional', 'Friendly', 'Persuasive', 'Concise', 'Authoritative', 'Casual'];

export function buildPrompt(framework: FrameworkId, task: string, audience: string, tone: string): string {
  const audienceLine = audience.trim() || 'the intended audience';
  const toneLine = tone.toLowerCase();
  switch (framework) {
    case 'ape':
      return `ACTION\n${task.trim() || '[Describe the specific action you want performed]'}\n\nPURPOSE\nExplain the outcome this action should achieve — the problem it solves or the value it delivers.\n\nEXPECTATION\nDeliver the result in a ${toneLine} tone, tailored to ${audienceLine}. Include exactly what is required so it can be used immediately.`;
    case 'race':
      return `ROLE\nAct as an experienced professional who specializes in serving ${audienceLine}.\n\nACTION\n${task.trim() || '[Describe the action or task to perform]'}\n\nCONTEXT\nYou are helping ${audienceLine}. Use a ${toneLine} tone, draw on best practices, and stay focused on their goals.\n\nEXECUTION\nComplete the action step by step. Format the output so it is ready to use, and state any assumptions you made.`;
    case 'create':
      return `CONTEXT\nThis prompt is for ${audienceLine}. The desired tone is ${toneLine}.\n\nREQUEST\n${task.trim() || '[Describe your request clearly and specifically]'}\n\nEXAMPLES\nInclude 2–3 concrete examples that illustrate the expected quality and style of the output.\n\nACTION\nWork through the request in logical steps before producing the final version.\n\nTRANSFORM\nReturn the result in a clean, structured format — headings, bullets, and short paragraphs as appropriate.\n\nEVALUATE\nReview the output against the request: Is it accurate, complete, and tailored to ${audienceLine}? Fix any gaps before presenting it.`;
    case 'spark':
      return `SCENARIO\nSet the scene: ${task.trim() || '[Describe the situation this prompt is about]'}\n\nPURPOSE\nState clearly why this output matters and what the audience should take away from it.\n\nAUDIENCE\nTailor the response for ${audienceLine}.\n\nREQUIREMENTS\n- Use a ${toneLine} tone\n- Keep sentences short and direct\n- Structure the answer with headings or bullets\n- Avoid jargon unless it is defined\n\nKEEP IT\nDeliver a focused, high-quality result that requires no follow-up.`;
  }
}

/** Rewrites an existing prompt into a chosen framework, keeping the user's intent. */
export function optimizePrompt(framework: FrameworkId, existing: string, audience: string, tone: string): string {
  const task = existing.trim() || 'Describe the task you want performed';
  const audienceLine = audience.trim() || 'the intended audience';
  const toneLine = tone.toLowerCase();
  switch (framework) {
    case 'ape': {
      const match = task.match(/^(.*?)(?:[.!?]\s|$)/);
      const action = match ? match[1] : task;
      return `ACTION\n${action}\n\nPURPOSE\n${task}\n\nEXPECTATION\nDeliver the result in a ${toneLine} tone, tailored to ${audienceLine}. Include exactly what is required so it can be used immediately.`;
    }
    case 'race':
      return `ROLE\nAct as an experienced professional who specializes in serving ${audienceLine}.\n\nACTION\n${task}\n\nCONTEXT\nYou are helping ${audienceLine}. Use a ${toneLine} tone, draw on best practices, and stay focused on their goals.\n\nEXECUTION\nComplete the action step by step. Format the output so it is ready to use, and state any assumptions you made.`;
    case 'create':
      return `CONTEXT\nThis prompt is for ${audienceLine}. The desired tone is ${toneLine}.\n\nREQUEST\n${task}\n\nEXAMPLES\nInclude 2–3 concrete examples that illustrate the expected quality and style of the output.\n\nACTION\nWork through the request in logical steps before producing the final version.\n\nTRANSFORM\nReturn the result in a clean, structured format — headings, bullets, and short paragraphs as appropriate.\n\nEVALUATE\nReview the output against the request: Is it accurate, complete, and tailored to ${audienceLine}? Fix any gaps before presenting it.`;
    case 'spark':
      return `SCENARIO\nSet the scene: ${task}\n\nPURPOSE\nState clearly why this output matters and what the audience should take away from it.\n\nAUDIENCE\nTailor the response for ${audienceLine}.\n\nREQUIREMENTS\n- Use a ${toneLine} tone\n- Keep sentences short and direct\n- Structure the answer with headings or bullets\n- Avoid jargon unless it is defined\n\nKEEP IT\nDeliver a focused, high-quality result that requires no follow-up.`;
  }
}