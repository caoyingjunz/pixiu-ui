<template>
  <div class="deploy-create-page">
    <div class="deploy-create-header">
      <ElButton text class="deploy-create-back-btn" @click="goBack">
        <ElIcon><ArrowLeft /></ElIcon>
        <span>返回</span>
      </ElButton>
      <ElDivider direction="vertical" class="deploy-create-header-divider" />
      <ElBreadcrumb separator="/">
        <ElBreadcrumbItem :to="{ path: '/container/cluster' }">集群管理</ElBreadcrumbItem>
        <ElBreadcrumbItem>{{ pageTitle }}</ElBreadcrumbItem>
      </ElBreadcrumb>
    </div>

    <ElCard class="deploy-create-card">
      <div class="deploy-create-main">
        <ElTabs v-model="activeTabName" tab-position="left" class="deploy-create-tabs">
          <ElTabPane label="集群信息" name="0">
            <StepBasic
              ref="stepBasicRef"
              :form="form"
              :read-only="isDetailMode"
              @update:form="form = $event"
            />
          </ElTabPane>
          <ElTabPane label="集群配置" name="1">
            <StepClusterConfig
              ref="stepClusterConfigRef"
              :form="form"
              :read-only="isDetailMode"
              @update:form="form = $event"
            />
          </ElTabPane>
          <ElTabPane label="节点" name="2">
            <StepNodes
              ref="stepNodesRef"
              :form="form"
              :read-only="isDetailMode"
              @update:form="form = $event"
            />
          </ElTabPane>
          <ElTabPane label="信息确认" name="3">
            <StepConfirm
              ref="stepConfirmRef"
              :form="form"
              :read-only="isDetailMode"
              @update:form="form = $event"
              @go-step="goToStep"
            />
          </ElTabPane>
        </ElTabs>
      </div>

      <div class="deploy-create-footer">
        <ElButton v-if="!isDetailMode && currentStep > 0" :disabled="stepping" @click="prevStep"
          >上一步</ElButton
        >
        <ElButton
          v-if="!isDetailMode && currentStep < 3"
          type="primary"
          :loading="stepping"
          @click="nextStep"
          >下一步</ElButton
        >
        <ElButton @click="goBack">{{ isDetailMode ? '返回列表' : '取消' }}</ElButton>
        <ElButton
          v-if="!isDetailMode && currentStep === 3"
          type="primary"
          :loading="submitting"
          @click="onSubmit"
        >
          确认提交
        </ElButton>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ArrowLeft } from '@element-plus/icons-vue'
  import { useRoute, useRouter } from 'vue-router'
  import { fetchCreatePlan, fetchPlanWithResources } from '@/api/plan'
  import StepBasic from './steps/StepBasic.vue'
  import StepNodes from './steps/StepNodes.vue'
  import StepClusterConfig from './steps/StepClusterConfig.vue'
  import StepConfirm from './steps/StepConfirm.vue'
  import type { DeployClusterForm, NodeConfig } from './steps/StepBasic.vue'

  defineOptions({ name: 'DeployClusterWizard' })

  type StepRef = { validate: () => Promise<boolean> } | null

  const route = useRoute()
  const router = useRouter()

  const currentPlanId = computed(() => Number(route.query.planId ?? 0))
  const isDetailMode = computed(() => Number.isFinite(currentPlanId.value) && currentPlanId.value > 0)
  const pageTitle = computed(() => (isDetailMode.value ? '部署详情' : '新建部署集群'))

  // activeTabName 是唯一状态源，currentStep 由它派生
  const activeTabName = ref('0')
  const currentStep = computed(() => Number(activeTabName.value))

  const stepping = ref(false)
  const submitting = ref(false)

  const stepBasicRef = ref<StepRef>(null)
  const stepClusterConfigRef = ref<StepRef>(null)
  const stepNodesRef = ref<StepRef>(null)
  const stepConfirmRef = ref<StepRef>(null)

  function getStepRef(idx: number): StepRef {
    const refs: StepRef[] = [
      stepBasicRef.value,
      stepClusterConfigRef.value,
      stepNodesRef.value,
      stepConfirmRef.value
    ]
    return refs[idx] ?? null
  }

  const defaultForm = (): DeployClusterForm => ({
    name: '',
    kubernetesVersion: '1.28.12',
    runtime: 'containerd',
    osType: '',
    osImage: '',
    description: '',
    networkInterface: 'eth0',
    cni: 'calico',
    podNetwork: '172.30.0.0/16',
    serviceNetwork: '10.254.0.0/16',
    highAvailability: false,
    selfLoadBalance: false,
    apiServerAddress: '',
    apiServerPort: 6443,
    kubeProxyMode: 'iptables',
    nodes: [] as NodeConfig[],
    enablePrometheus: false,
    enableLogging: false
  })

  const form = ref<DeployClusterForm>(defaultForm())

  function detectOsTypeFromImage(osImage: string): string {
    const image = osImage.toLowerCase()
    if (image.startsWith('centos')) return 'centos'
    if (image.startsWith('ubuntu')) return 'ubuntu'
    if (image.startsWith('debian')) return 'debian'
    if (image.startsWith('openeuler')) return 'openEuler'
    if (image.startsWith('rocky')) return 'rocky'
    return ''
  }

  function mapNodeFromApi(node: any): NodeConfig {
    const authType = node?.auth?.type === 'key' ? 'key' : 'password'
    return {
      name: node?.name ?? '',
      role: (node?.role ?? []) as ('master' | 'node')[],
      ip: node?.ip ?? '',
      authType,
      user: node?.auth?.password?.user ?? 'root',
      password: node?.auth?.password?.password ?? '',
      privateKey: node?.auth?.key?.data ?? ''
    }
  }

  async function loadPlanDetail(planId: number) {
    try {
      const detail = await fetchPlanWithResources(planId)
      const cfg = detail.config ?? {}
      const osImage = cfg.os_image ?? ''
      const highAvailability = Boolean((cfg.kubernetes as any)?.high_availability)
      const apiServerPortRaw = Number((cfg.network as any)?.api_server_port ?? (highAvailability ? 8443 : 6443))
      const apiServerPort = Number.isFinite(apiServerPortRaw) ? apiServerPortRaw : highAvailability ? 8443 : 6443
      form.value = {
        name: detail.name ?? '',
        kubernetesVersion: cfg.kubernetes?.kubernetes_version ?? '1.28.12',
        runtime: (cfg.runtime?.runtime ?? 'containerd') as 'docker' | 'containerd',
        osType: detectOsTypeFromImage(osImage),
        osImage,
        description: detail.description ?? '',
        networkInterface: cfg.network?.network_interface ?? 'eth0',
        cni: cfg.network?.cni ?? 'calico',
        podNetwork: cfg.network?.pod_network ?? '172.30.0.0/16',
        serviceNetwork: cfg.network?.service_network ?? '10.254.0.0/16',
        highAvailability,
        selfLoadBalance: highAvailability && Boolean((cfg.network as any)?.self_load_balance),
        apiServerAddress: String((cfg.network as any)?.api_server_address ?? ''),
        apiServerPort,
        kubeProxyMode: 'iptables',
        nodes: (detail.nodes ?? []).map(mapNodeFromApi),
        enablePrometheus: Boolean(cfg.component?.prometheus?.enabled),
        enableLogging: Boolean(cfg.component?.logging?.enabled)
      }
      activeTabName.value = '3'
    } catch (e: unknown) {
      const err = e as Error
      ElMessage.error(err.message || '加载部署详情失败')
    }
  }

  function goToStep(step: number) {
    if (!isDetailMode.value) activeTabName.value = String(step)
  }

  async function nextStep() {
    const ref = getStepRef(currentStep.value)
    stepping.value = true
    try {
      if (ref) {
        const valid = await ref.validate()
        if (!valid) return
      }
      activeTabName.value = String(currentStep.value + 1)
    } finally {
      stepping.value = false
    }
  }

  function prevStep() {
    if (currentStep.value > 0) activeTabName.value = String(currentStep.value - 1)
  }

  function goBack() {
    if (isDetailMode.value) {
      router.push('/container/plan')
    } else {
      router.push('/container/cluster')
    }
  }

  async function onSubmit() {
    // 提交前逐步校验
    for (let i = 0; i < 4; i++) {
      const ref = getStepRef(i)
      if (ref) {
        const valid = await ref.validate()
        if (!valid) {
          activeTabName.value = String(i)
          return
        }
      }
    }

    submitting.value = true
    try {
      const f = form.value
      const nodes = f.nodes.map((n) => ({
        name: n.name,
        role: n.role as string[],
        cri: f.runtime,
        ip: n.ip,
        auth:
          n.authType === 'password'
            ? { type: 'password' as const, password: { user: n.user, password: n.password } }
            : { type: 'key' as const, key: { data: n.privateKey } }
      }))

      await fetchCreatePlan({
        name: f.name,
        description: f.description,
        config: {
          os_image: f.osImage,
          kubernetes: {
            kubernetes_version: f.kubernetesVersion,
            high_availability: f.highAvailability
          },
          network: {
            network_interface: f.networkInterface,
            cni: f.cni,
            pod_network: f.podNetwork,
            service_network: f.serviceNetwork,
            api_server_address: f.apiServerAddress || undefined,
            api_server_port: f.apiServerPort,
            self_load_balance: f.selfLoadBalance,
            kube_proxy_mode: f.kubeProxyMode
          },
          runtime: { runtime: f.runtime },
          component: {
            ...(f.enablePrometheus ? { prometheus: { enabled: true } } : {}),
            ...(f.enableLogging ? { logging: { enabled: true } } : {})
          }
        },
        nodes
      })

      ElMessage.success('部署集群创建成功，正在跳转...')
      router.push('/container/cluster')
    } catch (e: unknown) {
      const err = e as Error
      ElMessage.error(err.message || '创建失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    if (isDetailMode.value) {
      void loadPlanDetail(currentPlanId.value)
    }
  })
</script>

<style scoped>
  .deploy-create-page {
    padding: 0 clamp(16px, 4vw, 48px) 0;
  }

  .deploy-create-header {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 12px;
    margin-left: -8px;
  }

  .deploy-create-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px 0 2px;
  }

  .deploy-create-header-divider {
    margin: 0 12px;
    height: 16px;
  }

  .deploy-create-card :deep(.el-card__body) {
    padding: 16px 20px;
  }

  @media (max-width: 1200px) {
    .deploy-create-page {
      padding-left: 20px;
      padding-right: 20px;
    }
  }

  @media (max-width: 768px) {
    .deploy-create-page {
      padding-left: 12px;
      padding-right: 12px;
    }
  }

  .deploy-create-main {
    display: flex;
    gap: 14px;
  }

  .deploy-create-tabs {
    flex: 1;
    min-width: 0;
  }

  .deploy-create-tabs :deep(.el-tabs__content) {
    min-height: 420px;
    padding-top: 12px;
  }

  .deploy-create-footer {
    margin-top: 10px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
</style>
