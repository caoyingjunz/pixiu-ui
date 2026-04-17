import { kubeProxyAxios } from '@/api/kubeProxy'

type KubeListResponse<T> = {
  items?: T[]
  metadata?: { continue?: string }
}

type FetchKubeListPageParams = {
  path: string
  page: number
  limit: number
  fieldSelector?: string
  extraQuery?: Record<string, unknown>
  chunkLimit?: number
}

export async function fetchKubeListPage<T>(
  params: FetchKubeListPageParams
): Promise<{ items: T[]; total: number }> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.max(1, params.limit || 10)
  const chunkLimit = Math.max(1, params.chunkLimit || 500)

  const allItems: T[] = []
  let continueToken: string | undefined

  do {
    const query: Record<string, unknown> = { limit: chunkLimit }
    if (params.fieldSelector) query.fieldSelector = params.fieldSelector
    if (params.extraQuery) Object.assign(query, params.extraQuery)
    if (continueToken) query.continue = continueToken

    const { data } = await kubeProxyAxios.get<KubeListResponse<T>>(params.path, { params: query })
    allItems.push(...(data.items ?? []))
    continueToken = data.metadata?.continue || undefined
  } while (continueToken)

  const start = (page - 1) * limit
  const end = start + limit
  return {
    items: allItems.slice(start, end),
    total: allItems.length
  }
}
