import { handleGenerateEmbeddings } from '../../src/api-core/embeddingHandler';

export async function onRequestPost(context: any) {
  try {
    const request = context.request;
    const body = await request.json().catch(() => ({}));
    const { texts, customKeys } = body;

    if (!texts || !Array.isArray(texts)) {
      return new Response(JSON.stringify({ error: 'texts array is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const result = await handleGenerateEmbeddings(texts, customKeys, context.env);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Embedding generation failed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}
