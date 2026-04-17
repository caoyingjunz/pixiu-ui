import axios from 'axios'
import { useUserStore } from '@/store/modules/user'

/** 直连 `/pixiu/proxy/...` 的 K8s API，响应体为原生 JSON（非 { code, result }） */
export const kubeProxyAxios = axios.create({
  baseURL: '/',
  timeout: 120000
})

kubeProxyAxios.interceptors.request.use((config) => {
  const { accessToken } = useUserStore()
  if (accessToken) config.headers.set('Authorization', accessToken)
  return config
})
