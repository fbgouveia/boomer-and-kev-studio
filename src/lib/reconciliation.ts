// BK-17 (incremento 1) — reconciliação de predições pagas incertas.
// Contrato: predição paga com resultado incerto exige consulta ao provedor antes
// de qualquer nova geração. Nunca lançar predição nova apenas porque o resultado
// não está no disco — isso duplica cobrança.

export type PredictionOutcome =
  | { kind: 'succeeded'; outputUrl: string }
  | { kind: 'failed'; error?: string }
  | { kind: 'processing' }
  | { kind: 'unknown'; reason?: string };

export type ReconciliationAction = 'REUSE' | 'RELAUNCH' | 'KEEP_POLLING' | 'RECONCILE_UNAVAILABLE';

type PredictionLike = {
  status?: unknown;
  output?: unknown;
  error?: unknown;
};

type PredictionClient = {
  predictions: {
    get(id: string): Promise<PredictionLike>;
  };
};

export async function fetchPredictionOutcome(
  client: PredictionClient,
  predictionId: string,
): Promise<PredictionOutcome> {
  try {
    const prediction = await client.predictions.get(predictionId);
    if (prediction?.status === 'succeeded') {
      const output = prediction.output;
      const url = Array.isArray(output) ? output[0] : output;
      if (typeof url === 'string' && url) return { kind: 'succeeded', outputUrl: url };
      return { kind: 'failed', error: 'prediction succeeded sem output utilizável' };
    }
    if (prediction?.status === 'failed' || prediction?.status === 'canceled') {
      const error = typeof prediction.error === 'string' ? prediction.error : prediction.status;
      return { kind: 'failed', error };
    }
    if (prediction?.status === 'processing' || prediction?.status === 'starting') {
      return { kind: 'processing' };
    }
    return { kind: 'unknown', reason: `status inesperado: ${String(prediction?.status)}` };
  } catch (error) {
    return { kind: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
}

export function reconciliationAction(outcome: PredictionOutcome): ReconciliationAction {
  switch (outcome.kind) {
    case 'succeeded':
      return 'REUSE';
    case 'failed':
      return 'RELAUNCH';
    case 'processing':
      return 'KEEP_POLLING';
    default:
      return 'RECONCILE_UNAVAILABLE';
  }
}

export type SceneReconciliation = {
  sceneId: string;
  predictionId: string;
  action: ReconciliationAction;
  detail?: string;
};

type PendingRequestLike = { predictionId: string };

// BK-17 (incremento 2): reconciliação em lote para a rota de status — o operador
// vê o destino de cada predição paga no GET, sem precisar retomar o job.
export async function reconcileProviderRequests(
  client: PredictionClient | null,
  requests: Record<string, PendingRequestLike>,
): Promise<Record<string, SceneReconciliation>> {
  if (!client) return {};
  const results: Record<string, SceneReconciliation> = {};
  for (const [sceneId, request] of Object.entries(requests)) {
    if (!request?.predictionId) continue;
    const outcome = await fetchPredictionOutcome(client, request.predictionId);
    results[sceneId] = {
      sceneId,
      predictionId: request.predictionId,
      action: reconciliationAction(outcome),
      detail: outcome.kind === 'succeeded'
        ? outcome.outputUrl
        : outcome.kind === 'failed'
          ? outcome.error
          : outcome.kind === 'unknown'
            ? outcome.reason
            : undefined,
    };
  }
  return results;
}
