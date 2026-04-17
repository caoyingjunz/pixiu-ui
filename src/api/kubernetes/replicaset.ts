import { kubeProxyAxios } from '@/api/kubeProxy'

export interface K8sReplicaSet {
  metadata?: {
    name?: string
    namespace?: string
    uid?: string
    creationTimestamp?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    ownerReferences?: Array<{ kind: string; name: string; uid: string }>
  }
  spec?: {
    replicas?: number
    selector?: { matchLabels?: Record<string, string> }
    template?: { spec?: { containers?: Array<{ name?: string; image?: string }> } }
  }
  status?: {
    replicas?: number
    readyReplicas?: number
    availableReplicas?: number
  }
}

export async function fetchK8sReplicaSetList(
  cluster: string,
  params: { namespace: string; labelSelector?: string }
): Promise<{ items: K8sReplicaSet[] }> {
  const base = `/pixiu/proxy/${encodeURIComponent(cluster)}/apis/apps/v1/namespaces/${encodeURIComponent(params.namespace)}/replicasets`
  const query: Record<string, unknown> = { limit: 500 }
  if (params.labelSelector) query.labelSelector = params.labelSelector
  const { data } = await kubeProxyAxios.get<{ items?: K8sReplicaSet[] }>(base, { params: query })
  return { items: data.items ?? [] }
}
