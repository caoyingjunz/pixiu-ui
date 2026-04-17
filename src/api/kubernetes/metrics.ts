import { kubeProxyAxios } from '@/api/kubeProxy'

/** 与 dashboard getNodeUsageMetrics 路径一致 */
export async function fetchNodeUsageMetrics(
  cluster: string,
  nodeName: string,
  metricsName: 'cpu' | 'memory',
  subPath: 'usage' | 'usage_rate'
): Promise<{ items?: Array<{ metricPoints?: Array<{ timestamp: string; value: number }> }> }> {
  const { data } = await kubeProxyAxios.get(
    `/pixiu/proxy/${encodeURIComponent(cluster)}/apis/metrics.pixiu.io/v1beta1/api/v1/dashboard/nodes/${encodeURIComponent(nodeName)}/metrics/${metricsName}/${subPath}`
  )
  return data
}
