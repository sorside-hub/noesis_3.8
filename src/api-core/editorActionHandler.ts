import { KeySlotId } from '../lib/ai/types';
import { executeWithFailover } from '../lib/ai/failoverAdapter';
import { balancedCascade } from '../lib/ai/cascadeProfiles';

export type EditorActionType = 'grammar' | 'summarize' | 'tone' | 'translate' | 'expand' | 'custom' | 'ask';

export async function handleEditorAction(
  action: EditorActionType,
  text: string,
  extraContext?: string,
  customKeys?: Partial<Record<KeySlotId, string>>,
  envObj: Record<string, string | undefined> = (typeof process !== 'undefined' ? process.env : {})
) {
  return executeWithFailover(
    { pair: 'feature', cascade: balancedCascade, customKeys, envObj }, 
    async (client, slotId, role, model) => {
      let prompt = '';

      switch (action) {
        case 'grammar':
          prompt = `Fix spelling, grammar, and typography in the following text. Preserve the original language and meaning. Return ONLY the corrected text without any preamble, explanation, or quotes.\n\nText:\n${text}`;
          break;
        case 'summarize':
          prompt = `Summarize the following text concisely. Return ONLY the summary without any preamble, explanation, or quotes.\n\nText:\n${text}`;
          break;
        case 'tone':
          const targetTone = extraContext || 'professional';
          prompt = `Rewrite the following text in a ${targetTone} tone. Preserve the original meaning. Return ONLY the rewritten text without any preamble, explanation, or quotes.\n\nText:\n${text}`;
          break;
        case 'translate':
          const targetLang = extraContext || 'English';
          prompt = `Translate the following text into ${targetLang}. Return ONLY the translated text without any preamble, explanation, or quotes.\n\nText:\n${text}`;
          break;
        case 'expand':
          prompt = `Expand upon the following text, providing more detail and context while maintaining the original language and core message. Return ONLY the expanded text without any preamble, explanation, or quotes.\n\nText:\n${text}`;
          break;
        case 'custom':
          prompt = `Perform the following instruction on the provided text. Return ONLY the resulting text without any preamble, explanation, or quotes.\n\nInstruction: ${extraContext || 'Process the text'}\n\nText:\n${text}`;
          break;
        case 'ask':
          // For 'ask', the 'text' is the note context, and 'extraContext' is the user's question.
          prompt = `Based on the following note content, answer the prompt. Provide a helpful, clear, and direct answer.\n\nPrompt: ${extraContext || 'Summarize this'}\n\nNote Content:\n${text}`;
          break;
        default:
          throw new Error(`Unsupported editor action: ${action}`);
      }
      
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
      });

      return { text: response.text, modelUsed: model };
    }
  );
}
