import { AppRouteRecord } from '@/types/router'

export const safeguardRoutes: AppRouteRecord = {
  path: '/safeguard',
  name: 'Safeguard',
  component: '/index/index',
  meta: {
    title: 'menus.safeguard.title',
    icon: 'ri:shield-check-line',
    keepAlive: false
  },
  children: [
    {
      path: 'audit',
      name: 'SafeguardAudit',
      component: '/safeguard/audit',
      meta: {
        title: 'menus.safeguard.audit',
        icon: 'ri:shield-check-line',
        keepAlive: true
      }
    }
  ]
}
