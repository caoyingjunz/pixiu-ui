<template>
  <div class="deploy-create-page">
    <div class="deploy-create-header">
      <ElButton text class="deploy-create-back-btn" @click="goBack">
        <ElIcon><ArrowLeft /></ElIcon>
        <span>返回</span>
      </ElButton>
      <ElDivider direction="vertical" class="deploy-create-header-divider" />
      <ElBreadcrumb separator="/">
        <ElBreadcrumbItem :to="{ path: '/container/workloads', query: { cluster } }"
          >工作负载</ElBreadcrumbItem
        >
        <ElBreadcrumbItem>创建 Deployment</ElBreadcrumbItem>
      </ElBreadcrumb>
    </div>

    <ElCard class="deploy-create-card">
      <div class="deploy-create-main">
        <ElTabs v-model="activeStep" tab-position="left" class="deploy-create-tabs">
          <ElTabPane label="基础信息" name="basic">
            <ElForm ref="basicFormRef" :model="form" :rules="basicRules" label-width="100px">
              <ElFormItem label="名称" prop="name">
                <ElInput v-model="form.name" placeholder="请输入 Deployment 名称" />
              </ElFormItem>
              <ElFormItem label="命名空间" prop="namespace">
                <ElSelect v-model="form.namespace" filterable placeholder="请选择命名空间">
                  <ElOption v-for="ns in namespaces" :key="ns" :label="ns" :value="ns" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="副本数量" prop="replicas">
                <ElInputNumber
                  v-model="form.replicas"
                  :min="0"
                  :precision="0"
                  controls-position="right"
                />
              </ElFormItem>
              <ElFormItem label="标签">
                <div class="kv-list">
                  <div v-for="(item, idx) in form.labels" :key="`label-${idx}`" class="kv-row">
                    <ElInput v-model="item.key" placeholder="key" />
                    <ElInput v-model="item.value" placeholder="value" />
                    <ElButton link type="danger" @click="removeLabel(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addLabel">新增标签</ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="注释">
                <div class="kv-list">
                  <div
                    v-for="(item, idx) in form.annotations"
                    :key="`annotation-${idx}`"
                    class="kv-row"
                  >
                    <ElInput v-model="item.key" placeholder="key" />
                    <ElInput v-model="item.value" placeholder="value" />
                    <ElButton link type="danger" @click="removeAnnotation(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addAnnotation">新增注释</ElButton>
                </div>
              </ElFormItem>
            </ElForm>
          </ElTabPane>

          <ElTabPane label="容器配置" name="container">
            <ElForm
              ref="containerFormRef"
              :model="form"
              :rules="containerRules"
              label-width="100px"
            >
              <ElFormItem label="容器名称" prop="containerName">
                <ElInput v-model="form.containerName" placeholder="如 nginx" />
              </ElFormItem>
              <ElFormItem label="镜像" prop="image">
                <ElInput v-model="form.image" placeholder="如 nginx:latest" />
              </ElFormItem>
              <ElFormItem label="拉取策略">
                <ElSelect v-model="form.imagePullPolicy">
                  <ElOption label="IfNotPresent" value="IfNotPresent" />
                  <ElOption label="Always" value="Always" />
                  <ElOption label="Never" value="Never" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="容器端口">
                <div class="kv-list">
                  <div v-for="(item, idx) in form.ports" :key="`port-${idx}`" class="port-row">
                    <ElInputNumber
                      v-model="item.containerPort"
                      :min="1"
                      :max="65535"
                      :precision="0"
                    />
                    <ElInput v-model="item.name" placeholder="端口名称(可选)" />
                    <ElSelect v-model="item.protocol" style="width: 120px">
                      <ElOption label="TCP" value="TCP" />
                      <ElOption label="UDP" value="UDP" />
                    </ElSelect>
                    <ElButton link type="danger" @click="removePort(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addPort">新增端口</ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="环境变量">
                <div class="kv-list">
                  <div v-for="(item, idx) in form.envs" :key="`env-${idx}`" class="env-row">
                    <ElInput v-model="item.name" placeholder="变量名，如 APP_ENV" />
                    <ElSelect v-model="item.mode" style="width: 140px">
                      <ElOption label="value" value="value" />
                      <ElOption label="ConfigMapKeyRef" value="configMap" />
                      <ElOption label="SecretKeyRef" value="secret" />
                    </ElSelect>
                    <ElInput
                      v-if="item.mode === 'value'"
                      v-model="item.value"
                      placeholder="变量值"
                    />
                    <template v-else>
                      <ElInput v-model="item.sourceName" placeholder="来源名称" />
                      <ElInput v-model="item.sourceKey" placeholder="键名 key" />
                    </template>
                    <ElButton link type="danger" @click="removeEnv(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addEnv">新增环境变量</ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="启动命令">
                <ElInput
                  v-model="form.commandText"
                  type="textarea"
                  :rows="3"
                  placeholder="每行一个 command 参数，如 /bin/sh"
                />
              </ElFormItem>
              <ElFormItem label="启动参数">
                <ElInput
                  v-model="form.argsText"
                  type="textarea"
                  :rows="3"
                  placeholder="每行一个 args 参数，如 -c"
                />
              </ElFormItem>
              <ElFormItem label="CPU Request">
                <ElInput v-model="form.cpuRequest" placeholder="如 100m" />
              </ElFormItem>
              <ElFormItem label="CPU Limit">
                <ElInput v-model="form.cpuLimit" placeholder="如 500m" />
              </ElFormItem>
              <ElFormItem label="内存 Request">
                <ElInput v-model="form.memoryRequest" placeholder="如 128Mi" />
              </ElFormItem>
              <ElFormItem label="内存 Limit">
                <ElInput v-model="form.memoryLimit" placeholder="如 512Mi" />
              </ElFormItem>
              <ElFormItem label="存活探针路径">
                <ElInput v-model="form.livenessPath" placeholder="如 /healthz" />
              </ElFormItem>
              <ElFormItem label="存活探针端口">
                <ElInputNumber v-model="form.livenessPort" :min="1" :max="65535" :precision="0" />
              </ElFormItem>
              <ElFormItem label="存活探针参数">
                <div class="probe-grid">
                  <ElInputNumber
                    v-model="form.livenessInitialDelaySeconds"
                    :min="0"
                    :precision="0"
                    placeholder="initialDelaySeconds"
                  />
                  <ElInputNumber
                    v-model="form.livenessPeriodSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="periodSeconds"
                  />
                  <ElInputNumber
                    v-model="form.livenessTimeoutSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="timeoutSeconds"
                  />
                  <ElInputNumber
                    v-model="form.livenessSuccessThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="successThreshold"
                  />
                  <ElInputNumber
                    v-model="form.livenessFailureThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="failureThreshold"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="就绪探针路径">
                <ElInput v-model="form.readinessPath" placeholder="如 /ready" />
              </ElFormItem>
              <ElFormItem label="就绪探针端口">
                <ElInputNumber v-model="form.readinessPort" :min="1" :max="65535" :precision="0" />
              </ElFormItem>
              <ElFormItem label="就绪探针参数">
                <div class="probe-grid">
                  <ElInputNumber
                    v-model="form.readinessInitialDelaySeconds"
                    :min="0"
                    :precision="0"
                    placeholder="initialDelaySeconds"
                  />
                  <ElInputNumber
                    v-model="form.readinessPeriodSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="periodSeconds"
                  />
                  <ElInputNumber
                    v-model="form.readinessTimeoutSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="timeoutSeconds"
                  />
                  <ElInputNumber
                    v-model="form.readinessSuccessThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="successThreshold"
                  />
                  <ElInputNumber
                    v-model="form.readinessFailureThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="failureThreshold"
                  />
                </div>
              </ElFormItem>
              <ElFormItem label="启动探针路径">
                <ElInput v-model="form.startupPath" placeholder="如 /startup" />
              </ElFormItem>
              <ElFormItem label="启动探针端口">
                <ElInputNumber v-model="form.startupPort" :min="1" :max="65535" :precision="0" />
              </ElFormItem>
              <ElFormItem label="启动探针参数">
                <div class="probe-grid">
                  <ElInputNumber
                    v-model="form.startupInitialDelaySeconds"
                    :min="0"
                    :precision="0"
                    placeholder="initialDelaySeconds"
                  />
                  <ElInputNumber
                    v-model="form.startupPeriodSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="periodSeconds"
                  />
                  <ElInputNumber
                    v-model="form.startupTimeoutSeconds"
                    :min="1"
                    :precision="0"
                    placeholder="timeoutSeconds"
                  />
                  <ElInputNumber
                    v-model="form.startupSuccessThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="successThreshold"
                  />
                  <ElInputNumber
                    v-model="form.startupFailureThreshold"
                    :min="1"
                    :precision="0"
                    placeholder="failureThreshold"
                  />
                </div>
              </ElFormItem>
              <ElDivider content-position="left">卷挂载</ElDivider>
              <ElFormItem label="VolumeMounts">
                <div class="kv-list">
                  <div v-for="(item, idx) in form.volumeMounts" :key="`vm-${idx}`" class="vm-row">
                    <ElInput v-model="item.name" placeholder="卷名(name)" />
                    <ElInput v-model="item.mountPath" placeholder="挂载路径(mountPath)" />
                    <ElSwitch
                      v-model="item.readOnly"
                      inline-prompt
                      active-text="只读"
                      inactive-text="读写"
                    />
                    <ElButton link type="danger" @click="removeVolumeMount(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addVolumeMount">新增挂载</ElButton>
                </div>
              </ElFormItem>
              <ElFormItem label="Volumes">
                <div class="kv-list">
                  <div v-for="(item, idx) in form.volumes" :key="`vol-${idx}`" class="vol-row">
                    <ElInput v-model="item.name" placeholder="卷名(name)" />
                    <ElSelect v-model="item.type" style="width: 140px">
                      <ElOption label="emptyDir" value="emptyDir" />
                      <ElOption label="configMap" value="configMap" />
                    </ElSelect>
                    <ElInput
                      v-if="item.type === 'configMap'"
                      v-model="item.configMapName"
                      placeholder="ConfigMap 名称"
                    />
                    <ElButton link type="danger" @click="removeVolume(idx)">删除</ElButton>
                  </div>
                  <ElButton link type="primary" @click="addVolume">新增卷</ElButton>
                </div>
              </ElFormItem>
            </ElForm>
          </ElTabPane>

          <ElTabPane label="高级选项" name="advanced">
            <ElForm label-width="120px">
              <ElFormItem label="升级策略">
                <ElSelect v-model="form.strategyType">
                  <ElOption label="RollingUpdate" value="RollingUpdate" />
                  <ElOption label="Recreate" value="Recreate" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem v-if="form.strategyType === 'RollingUpdate'" label="maxUnavailable">
                <ElInput v-model="form.maxUnavailable" placeholder="25%" />
              </ElFormItem>
              <ElFormItem v-if="form.strategyType === 'RollingUpdate'" label="maxSurge">
                <ElInput v-model="form.maxSurge" placeholder="25%" />
              </ElFormItem>
            </ElForm>
          </ElTabPane>
        </ElTabs>

      </div>

      <div class="deploy-create-footer">
        <ElButton :disabled="activeStep === 'basic'" @click="prevStep">上一步</ElButton>
        <ElButton v-if="activeStep !== 'advanced'" type="primary" @click="nextStep"
          >下一步</ElButton
        >
        <ElButton @click="goBack">取消</ElButton>
        <ElButton
          v-if="activeStep === 'advanced'"
          type="primary"
          :loading="submitting"
          @click="submit"
        >
          确定
        </ElButton>
      </div>
    </ElCard>

    <ElDialog v-model="yamlVisible" title="预览 YAML" width="760px">
      <ElInput v-model="yamlText" type="textarea" :rows="22" readonly />
      <template #footer>
        <ElButton type="primary" @click="yamlVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { ArrowLeft } from '@element-plus/icons-vue'
  import { useRoute, useRouter } from 'vue-router'
  import yaml from 'js-yaml'
  import { createK8sDeployment } from '@/api/kubernetes/deployment'
  import { fetchK8sNamespaceList } from '@/api/kubernetes/namespace'

  defineOptions({ name: 'DeploymentCreatePage' })

  type StepKey = 'basic' | 'container' | 'advanced'

  const route = useRoute()
  const router = useRouter()
  const cluster = computed(() => String(route.query.cluster ?? ''))
  const defaultNamespace = computed(() => String(route.query.namespace ?? ''))

  const namespaces = ref<string[]>([])
  const activeStep = ref<StepKey>('basic')
  const yamlVisible = ref(false)
  const yamlText = ref('')
  const submitting = ref(false)

  const form = ref({
    name: '',
    namespace: '',
    replicas: 1,
    labels: [{ key: 'app', value: '' }],
    annotations: [] as Array<{ key: string; value: string }>,
    containerName: '',
    image: '',
    imagePullPolicy: 'IfNotPresent',
    ports: [{ containerPort: 80, name: '', protocol: 'TCP' as 'TCP' | 'UDP' }],
    envs: [] as Array<{
      name: string
      mode: 'value' | 'configMap' | 'secret'
      value: string
      sourceName: string
      sourceKey: string
    }>,
    commandText: '',
    argsText: '',
    cpuRequest: '',
    cpuLimit: '',
    memoryRequest: '',
    memoryLimit: '',
    livenessPath: '',
    livenessPort: 80,
    livenessInitialDelaySeconds: 0,
    livenessPeriodSeconds: 10,
    livenessTimeoutSeconds: 1,
    livenessSuccessThreshold: 1,
    livenessFailureThreshold: 3,
    readinessPath: '',
    readinessPort: 80,
    readinessInitialDelaySeconds: 0,
    readinessPeriodSeconds: 10,
    readinessTimeoutSeconds: 1,
    readinessSuccessThreshold: 1,
    readinessFailureThreshold: 3,
    startupPath: '',
    startupPort: 80,
    startupInitialDelaySeconds: 0,
    startupPeriodSeconds: 10,
    startupTimeoutSeconds: 1,
    startupSuccessThreshold: 1,
    startupFailureThreshold: 30,
    volumeMounts: [] as Array<{ name: string; mountPath: string; readOnly: boolean }>,
    volumes: [] as Array<{ name: string; type: 'emptyDir' | 'configMap'; configMapName: string }>,
    strategyType: 'RollingUpdate',
    maxUnavailable: '25%',
    maxSurge: '25%'
  })

  const basicFormRef = ref<FormInstance>()
  const containerFormRef = ref<FormInstance>()

  const basicRules: FormRules = {
    name: [
      { required: true, message: '请输入名称', trigger: 'blur' },
      { min: 2, max: 63, message: '长度 2-63', trigger: 'blur' },
      {
        pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
        message: '名称需符合 Kubernetes 命名规范（小写字母/数字/中划线）',
        trigger: 'blur'
      }
    ],
    namespace: [{ required: true, message: '请选择命名空间', trigger: 'change' }]
  }
  const containerRules: FormRules = {
    containerName: [
      { required: true, message: '请输入容器名称', trigger: 'blur' },
      {
        pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
        message: '容器名称需符合 Kubernetes 命名规范',
        trigger: 'blur'
      }
    ],
    image: [{ required: true, message: '请输入镜像', trigger: 'blur' }]
  }

  function kvPairsToObject(list: Array<{ key: string; value: string }>): Record<string, string> {
    return list.reduce<Record<string, string>>((acc, item) => {
      const key = item.key.trim()
      if (!key) return acc
      acc[key] = item.value.trim()
      return acc
    }, {})
  }

  function addLabel() {
    form.value.labels.push({ key: '', value: '' })
  }
  function removeLabel(index: number) {
    form.value.labels.splice(index, 1)
  }
  function addAnnotation() {
    form.value.annotations.push({ key: '', value: '' })
  }
  function removeAnnotation(index: number) {
    form.value.annotations.splice(index, 1)
  }
  function addVolumeMount() {
    form.value.volumeMounts.push({ name: '', mountPath: '', readOnly: false })
  }
  function removeVolumeMount(index: number) {
    form.value.volumeMounts.splice(index, 1)
  }
  function addVolume() {
    form.value.volumes.push({ name: '', type: 'emptyDir', configMapName: '' })
  }
  function removeVolume(index: number) {
    form.value.volumes.splice(index, 1)
  }

  function addPort() {
    form.value.ports.push({ containerPort: 80, name: '', protocol: 'TCP' })
  }
  function removePort(index: number) {
    form.value.ports.splice(index, 1)
  }
  function addEnv() {
    form.value.envs.push({ name: '', mode: 'value', value: '', sourceName: '', sourceKey: '' })
  }
  function removeEnv(index: number) {
    form.value.envs.splice(index, 1)
  }

  function buildEnv() {
    return form.value.envs
      .map((item) => {
        const name = item.name.trim()
        if (!name) return null
        if (item.mode === 'value') {
          return { name, value: item.value }
        }
        const sourceName = item.sourceName.trim()
        const sourceKey = item.sourceKey.trim()
        if (!sourceName || !sourceKey) return null
        if (item.mode === 'configMap') {
          return {
            name,
            valueFrom: {
              configMapKeyRef: { name: sourceName, key: sourceKey }
            }
          }
        }
        return {
          name,
          valueFrom: {
            secretKeyRef: { name: sourceName, key: sourceKey }
          }
        }
      })
      .filter(
        (
          item
        ): item is {
          name: string
          value?: string
          valueFrom?: Record<string, { name: string; key: string }>
        } => item !== null
      )
  }

  function parseCommandLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  function validateResourceFormats(): boolean {
    const cpuPattern = /^(\d+m|\d+(\.\d+)?)$/
    const memPattern = /^\d+(\.\d+)?(Ki|Mi|Gi|Ti|K|M|G|T|Ei|Pi)?$/
    const checks: Array<[string, string, RegExp]> = [
      ['CPU Request', form.value.cpuRequest.trim(), cpuPattern],
      ['CPU Limit', form.value.cpuLimit.trim(), cpuPattern],
      ['内存 Request', form.value.memoryRequest.trim(), memPattern],
      ['内存 Limit', form.value.memoryLimit.trim(), memPattern]
    ]
    for (const [label, value, pattern] of checks) {
      if (!value) continue
      if (!pattern.test(value)) {
        ElMessage.warning(`${label} 格式不正确`)
        return false
      }
    }
    return true
  }

  function validateUniqueKeys(
    list: Array<{ key: string; value?: string }>,
    label: string
  ): boolean {
    const seen = new Set<string>()
    for (const item of list) {
      const key = item.key.trim()
      if (!key) continue
      if (seen.has(key)) {
        ElMessage.warning(`${label} 存在重复 key: ${key}`)
        return false
      }
      seen.add(key)
    }
    return true
  }

  function validateContainerSemantics(): boolean {
    const validPorts = form.value.ports.filter(
      (p) => Number.isFinite(Number(p.containerPort)) && Number(p.containerPort) > 0
    )
    if (!validPorts.length) {
      ElMessage.warning('请至少配置一个有效容器端口')
      return false
    }

    const portSeen = new Set<string>()
    for (const p of validPorts) {
      const signature = `${Number(p.containerPort)}-${p.protocol}`
      if (portSeen.has(signature)) {
        ElMessage.warning(`存在重复端口协议组合: ${signature}`)
        return false
      }
      portSeen.add(signature)
    }

    const envSeen = new Set<string>()
    for (const e of form.value.envs) {
      const name = e.name.trim()
      if (!name) continue
      if (envSeen.has(name)) {
        ElMessage.warning(`环境变量名重复: ${name}`)
        return false
      }
      envSeen.add(name)
      if (e.mode !== 'value' && (!e.sourceName.trim() || !e.sourceKey.trim())) {
        ElMessage.warning(`环境变量 ${name} 的来源名称与 key 不能为空`)
        return false
      }
    }

    const volumeNameSet = new Set<string>()
    for (const v of form.value.volumes) {
      const name = v.name.trim()
      if (!name) continue
      if (volumeNameSet.has(name)) {
        ElMessage.warning(`卷名称重复: ${name}`)
        return false
      }
      volumeNameSet.add(name)
      if (v.type === 'configMap' && !v.configMapName.trim()) {
        ElMessage.warning(`卷 ${name} 缺少 ConfigMap 名称`)
        return false
      }
    }

    for (const m of form.value.volumeMounts) {
      const mountName = m.name.trim()
      const mountPath = m.mountPath.trim()
      if (!mountName && !mountPath) continue
      if (!mountName || !mountPath) {
        ElMessage.warning('VolumeMount 需要同时填写卷名和挂载路径')
        return false
      }
      if (!volumeNameSet.has(mountName)) {
        ElMessage.warning(`VolumeMount 引用了不存在的卷: ${mountName}`)
        return false
      }
    }

    if (!validateUniqueKeys(form.value.labels, '标签')) return false
    if (!validateUniqueKeys(form.value.annotations, '注释')) return false

    return true
  }

  function buildResources() {
    const requests: Record<string, string> = {}
    const limits: Record<string, string> = {}
    if (form.value.cpuRequest.trim()) requests.cpu = form.value.cpuRequest.trim()
    if (form.value.memoryRequest.trim()) requests.memory = form.value.memoryRequest.trim()
    if (form.value.cpuLimit.trim()) limits.cpu = form.value.cpuLimit.trim()
    if (form.value.memoryLimit.trim()) limits.memory = form.value.memoryLimit.trim()
    if (!Object.keys(requests).length && !Object.keys(limits).length) return undefined
    return {
      ...(Object.keys(requests).length ? { requests } : {}),
      ...(Object.keys(limits).length ? { limits } : {})
    }
  }

  function buildDeploymentManifest() {
    const labels = kvPairsToObject(form.value.labels)
    const annotations = kvPairsToObject(form.value.annotations)
    const appLabel = labels.app || form.value.name
    const finalLabels = { app: appLabel, ...labels }
    const env = buildEnv()
    const resources = buildResources()
    const ports = form.value.ports
      .map((p) => ({
        containerPort: Number(p.containerPort),
        ...(p.name.trim() ? { name: p.name.trim() } : {}),
        ...(p.protocol ? { protocol: p.protocol } : {})
      }))
      .filter((p) => Number.isFinite(p.containerPort) && p.containerPort > 0)
    const fallbackPort = ports[0]?.containerPort ?? 80
    const buildProbe = (
      path: string,
      port: number,
      initialDelaySeconds: number,
      periodSeconds: number,
      timeoutSeconds: number,
      successThreshold: number,
      failureThreshold: number
    ) => {
      if (!path.trim()) return undefined
      return {
        httpGet: {
          path: path.trim(),
          port: port || fallbackPort
        },
        initialDelaySeconds,
        periodSeconds,
        timeoutSeconds,
        successThreshold,
        failureThreshold
      }
    }
    const livenessProbe = buildProbe(
      form.value.livenessPath,
      form.value.livenessPort,
      form.value.livenessInitialDelaySeconds,
      form.value.livenessPeriodSeconds,
      form.value.livenessTimeoutSeconds,
      form.value.livenessSuccessThreshold,
      form.value.livenessFailureThreshold
    )
    const readinessProbe = buildProbe(
      form.value.readinessPath,
      form.value.readinessPort,
      form.value.readinessInitialDelaySeconds,
      form.value.readinessPeriodSeconds,
      form.value.readinessTimeoutSeconds,
      form.value.readinessSuccessThreshold,
      form.value.readinessFailureThreshold
    )
    const startupProbe = buildProbe(
      form.value.startupPath,
      form.value.startupPort,
      form.value.startupInitialDelaySeconds,
      form.value.startupPeriodSeconds,
      form.value.startupTimeoutSeconds,
      form.value.startupSuccessThreshold,
      form.value.startupFailureThreshold
    )
    const command = parseCommandLines(form.value.commandText)
    const args = parseCommandLines(form.value.argsText)
    const volumeMounts = form.value.volumeMounts
      .map((m) => ({
        name: m.name.trim(),
        mountPath: m.mountPath.trim(),
        readOnly: m.readOnly
      }))
      .filter((m) => m.name && m.mountPath)
    const volumes = form.value.volumes
      .map((v) => {
        const name = v.name.trim()
        if (!name) return null
        if (v.type === 'configMap') {
          const cm = v.configMapName.trim()
          if (!cm) return null
          return { name, configMap: { name: cm } }
        }
        return { name, emptyDir: {} }
      })
      .filter(
        (
          v
        ): v is { name: string; emptyDir?: Record<string, never>; configMap?: { name: string } } =>
          v !== null
      )
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: form.value.name.trim(),
        namespace: form.value.namespace,
        labels: finalLabels,
        annotations
      },
      spec: {
        replicas: form.value.replicas,
        selector: {
          matchLabels: { app: appLabel }
        },
        strategy:
          form.value.strategyType === 'RollingUpdate'
            ? {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxUnavailable: form.value.maxUnavailable || '25%',
                  maxSurge: form.value.maxSurge || '25%'
                }
              }
            : { type: 'Recreate' },
        template: {
          metadata: {
            labels: { app: appLabel, ...finalLabels }
          },
          spec: {
            containers: [
              {
                name: form.value.containerName.trim(),
                image: form.value.image.trim(),
                imagePullPolicy: form.value.imagePullPolicy,
                ...(ports.length ? { ports } : {}),
                ...(env.length ? { env } : {}),
                ...(resources ? { resources } : {}),
                ...(livenessProbe ? { livenessProbe } : {}),
                ...(readinessProbe ? { readinessProbe } : {}),
                ...(startupProbe ? { startupProbe } : {}),
                ...(command.length ? { command } : {}),
                ...(args.length ? { args } : {}),
                ...(volumeMounts.length ? { volumeMounts } : {})
              }
            ],
            ...(volumes.length ? { volumes } : {})
          }
        }
      }
    }
  }

  async function nextStep() {
    if (activeStep.value === 'basic') {
      const ok = await basicFormRef.value
        ?.validate()
        .then(() => true)
        .catch(() => false)
      if (!ok) return
      activeStep.value = 'container'
      return
    }
    if (activeStep.value === 'container') {
      const ok = await containerFormRef.value
        ?.validate()
        .then(() => true)
        .catch(() => false)
      if (!ok) return
      if (!validateContainerSemantics()) return
      activeStep.value = 'advanced'
    }
  }

  function prevStep() {
    if (activeStep.value === 'advanced') activeStep.value = 'container'
    else if (activeStep.value === 'container') activeStep.value = 'basic'
  }

  function goBack() {
    router.push({ path: '/container/workloads', query: { cluster: cluster.value } })
  }

  function previewYaml() {
    if (!validateResourceFormats()) return
    if (!validateContainerSemantics()) return
    yamlText.value = yaml.dump(buildDeploymentManifest(), { quotingType: '"' })
    yamlVisible.value = true
  }

  async function submit() {
    const basicOk = await basicFormRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false)
    if (!basicOk) {
      activeStep.value = 'basic'
      return
    }
    const containerOk = await containerFormRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false)
    if (!containerOk) {
      activeStep.value = 'container'
      return
    }
    if (!cluster.value) {
      ElMessage.warning('缺少集群参数')
      return
    }
    if (!validateResourceFormats()) return
    if (!validateContainerSemantics()) return
    submitting.value = true
    try {
      const manifest = buildDeploymentManifest()
      await createK8sDeployment(cluster.value, form.value.namespace, manifest)
      ElMessage.success(`Deployment(${form.value.name}) 创建成功`)
      goBack()
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      submitting.value = false
    }
  }

  async function loadNamespaces() {
    if (!cluster.value) return
    try {
      const { items } = await fetchK8sNamespaceList(cluster.value, { page: 1, limit: 500 })
      namespaces.value = items.map((n) => n.metadata.name).sort()
    } catch {
      namespaces.value = []
    }
    form.value.namespace = defaultNamespace.value || namespaces.value[0] || 'default'
  }

  onMounted(() => {
    void loadNamespaces()
  })

  watch(
    () => form.value.name,
    (name, oldName) => {
      const n = name.trim()
      const o = (oldName ?? '').trim()
      if (!form.value.containerName.trim() || form.value.containerName.trim() === o) {
        form.value.containerName = n
      }
      const appLabel = form.value.labels.find((item) => item.key.trim() === 'app')
      if (appLabel && (!appLabel.value.trim() || appLabel.value.trim() === o)) {
        appLabel.value = n
      }
    }
  )
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

  .deploy-create-tabs :deep(.el-tab-pane > .el-form > .el-form-item:first-child) {
    margin-top: 6px;
  }

  .deploy-create-aside {
    width: 120px;
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
  }

  .deploy-create-footer {
    margin-top: 10px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .kv-list {
    width: 100%;
  }

  .kv-row,
  .vm-row,
  .vol-row {
    display: grid;
    gap: 8px;
    margin-bottom: 8px;
  }

  .kv-row {
    grid-template-columns: 1fr 1fr auto;
  }

  .vm-row {
    grid-template-columns: 1fr 1fr 120px auto;
  }

  .vol-row {
    grid-template-columns: 1fr 140px 1fr auto;
  }

  .port-row {
    display: grid;
    grid-template-columns: 170px 1fr 120px auto;
    gap: 8px;
    margin-bottom: 8px;
  }

  .env-row {
    display: grid;
    grid-template-columns: 1fr 140px 1fr 1fr auto;
    gap: 8px;
    margin-bottom: 8px;
  }

  .probe-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    gap: 8px;
  }
</style>
