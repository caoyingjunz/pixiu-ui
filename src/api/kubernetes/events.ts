import { kubeProxyAxios } from '@/api/kubeProxy'
import { fetchKubeListPage } from './list'

/** 通过 `/pixiu/proxy/...` 直连 Kubernetes events API */
export async function fetchKubeRawEventList(
  cluster: string,
  params: {
    uid?: string
    namespace?: string
    name?: string
    kind?: string
    namespaced?: boolean
    page?: number
    limit?: number
  }
): Promise<{ items: unknown[]; total: number }> {
  const namespace = params.namespace?.trim()
  const path =
    params.namespaced && namespace
      ? `/pixiu/proxy/${encodeURIComponent(cluster)}/api/v1/namespaces/${encodeURIComponent(namespace)}/events`
      : `/pixiu/proxy/${encodeURIComponent(cluster)}/api/v1/events`

  const selectorParts: string[] = []
  if (params.uid) selectorParts.push(`involvedObject.uid=${params.uid}`)
  if (params.name) selectorParts.push(`involvedObject.name=${params.name}`)
  if (namespace) selectorParts.push(`involvedObject.namespace=${namespace}`)
  if (params.kind) selectorParts.push(`involvedObject.kind=${params.kind}`)

  return fetchKubeListPage<unknown>({
    path,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    fieldSelector: selectorParts.length > 0 ? selectorParts.join(',') : undefined
  })
}

export async function deleteK8sEvent(cluster: string, namespace: string, name: string): Promise<void> {
  await kubeProxyAxios.delete(
    `/pixiu/proxy/${encodeURIComponent(cluster)}/api/v1/namespaces/${encodeURIComponent(namespace)}/events/${encodeURIComponent(name)}`
  )
}
