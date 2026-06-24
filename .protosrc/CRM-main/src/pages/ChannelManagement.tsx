import { useState } from 'react'
import type { Key } from 'react'
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  PlusSquareOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { genChannelCode, setState, uid, useStore } from '../store'
import type { ChannelLevelNode, ChannelLine, ChannelType } from '../types'
import { useI18n } from '../i18n'

const { Text } = Typography
const LEVEL_COLOR = ['', 'blue', 'cyan', 'green']
const EXPAND_KEY = 'dinoai_crm_channel_expanded'

type AddCtx =
  | { kind: 'line' }
  | { kind: 'type'; lineId: string }
  | { kind: 'child'; lineId: string; typeId: string; parentId?: string; nextLevel: 1 | 2 | 3 }

export default function ChannelManagement() {
  const { t } = useI18n()
  const channels = useStore((s) => s.channels)
  const [addCtx, setAddCtx] = useState<AddCtx | null>(null)
  const [renameNode, setRenameNode] = useState<{ id: string; name: string } | null>(null)
  const [form] = Form.useForm()
  // 默认各业务线收起；展开/收起状态记忆到 localStorage
  const [expandedKeys, setExpandedKeys] = useState<Key[]>(() => {
    try {
      const raw = localStorage.getItem(EXPAND_KEY)
      if (raw) return JSON.parse(raw) as Key[]
    } catch {
      /* ignore */
    }
    return []
  })

  const onExpand = (keys: Key[]) => {
    setExpandedKeys(keys)
    try {
      localStorage.setItem(EXPAND_KEY, JSON.stringify(keys))
    } catch {
      /* ignore */
    }
  }

  const levelLabel = (level: 1 | 2 | 3) => t(`ch.level${level}`)

  const updateLine = (lineId: string, fn: (l: ChannelLine) => ChannelLine) =>
    setState((prev) => ({
      ...prev,
      channels: prev.channels.map((l) => (l.id === lineId ? fn(l) : l)),
    }))

  const updateType = (lineId: string, typeId: string, fn: (t: ChannelType) => ChannelType) =>
    updateLine(lineId, (l) => ({
      ...l,
      children: l.children.map((tp) => (tp.id === typeId ? fn(tp) : tp)),
    }))

  const walk = (
    nodes: ChannelLevelNode[],
    targetId: string,
    fn: (n: ChannelLevelNode) => ChannelLevelNode,
  ): ChannelLevelNode[] =>
    nodes.map((n) =>
      n.id === targetId ? fn(n) : { ...n, children: walk(n.children, targetId, fn) },
    )

  const removeNode = (nodes: ChannelLevelNode[], targetId: string): ChannelLevelNode[] =>
    nodes
      .filter((n) => n.id !== targetId)
      .map((n) => ({ ...n, children: removeNode(n.children, targetId) }))

  const openAdd = (ctx: AddCtx) => {
    setAddCtx(ctx)
    form.resetFields()
  }

  const submitAdd = async () => {
    const { name } = await form.validateFields()
    if (!addCtx) return
    if (addCtx.kind === 'line') {
      setState((prev) => ({
        ...prev,
        channels: [...prev.channels, { id: uid('bl_'), name, children: [] }],
      }))
      message.success(t('ch.lineCreated'))
    } else if (addCtx.kind === 'type') {
      updateLine(addCtx.lineId, (l) => ({ ...l, children: [...l.children, { id: uid('ct_'), name, children: [] }] }))
      message.success(t('ch.typeCreated'))
    } else {
      const node: ChannelLevelNode = {
        id: uid('c_'),
        name,
        level: addCtx.nextLevel,
        children: [],
      }
      updateType(addCtx.lineId, addCtx.typeId, (tp) => {
        if (!addCtx.parentId) return { ...tp, children: [...tp.children, node] }
        return { ...tp, children: walk(tp.children, addCtx.parentId, (p) => ({ ...p, children: [...p.children, node] })) }
      })
      message.success(t('ch.levelCreated', { level: levelLabel(addCtx.nextLevel) }))
    }
    setAddCtx(null)
  }

  const generateCode = (lineId: string, typeId: string, node: ChannelLevelNode) => {
    const code = node.code ?? genChannelCode()
    updateType(lineId, typeId, (tp) => ({ ...tp, children: walk(tp.children, node.id, (n) => ({ ...n, code })) }))
    Modal.success({
      title: node.code ? t('ch.codeTitleView') : t('ch.codeTitleGen'),
      content: (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{t('ch.codeDesc')}</Text>
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: '#f5f7fa',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{code}</span>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard?.writeText(code)
                message.success(t('common.copied'))
              }}
            >
              {t('common.copy')}
            </Button>
          </div>
        </div>
      ),
    })
  }

  const submitRename = async () => {
    const { name } = await form.validateFields()
    if (!renameNode) return
    const isLine = channels.some((l) => l.id === renameNode.id)
    if (isLine) {
      updateLine(renameNode.id, (l) => ({ ...l, name }))
    } else {
      const lineOfType = channels.find((l) => l.children.some((tp) => tp.id === renameNode.id))
      if (lineOfType) {
        updateType(lineOfType.id, renameNode.id, (tp) => ({ ...tp, name }))
      } else {
        for (const l of channels) {
          const tp = l.children.find((t) => containsNode(t.children, renameNode.id))
          if (tp) {
            updateType(l.id, tp.id, (t) => ({ ...t, children: walk(t.children, renameNode.id, (n) => ({ ...n, name })) }))
            break
          }
        }
      }
    }
    message.success(t('ch.renamed'))
    setRenameNode(null)
  }

  const containsNode = (nodes: ChannelLevelNode[], id: string): boolean =>
    nodes.some((n) => n.id === id || containsNode(n.children, id))

  const deleteLine = (lineId: string) =>
    Modal.confirm({
      title: t('ch.delLineTitle'),
      content: t('ch.delLineContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => setState((prev) => ({ ...prev, channels: prev.channels.filter((l) => l.id !== lineId) })),
    })

  const deleteType = (lineId: string, typeId: string) =>
    Modal.confirm({
      title: t('ch.delTypeTitle'),
      content: t('ch.delTypeContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => updateLine(lineId, (l) => ({ ...l, children: l.children.filter((tp) => tp.id !== typeId) })),
    })

  const deleteLevel = (lineId: string, typeId: string, nodeId: string) =>
    Modal.confirm({
      title: t('ch.delLevelTitle'),
      content: t('ch.delLevelContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => updateType(lineId, typeId, (tp) => ({ ...tp, children: removeNode(tp.children, nodeId) })),
    })

  const renderLevelTitle = (lineId: string, typeId: string, n: ChannelLevelNode) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Tag color={LEVEL_COLOR[n.level]} style={{ margin: 0 }}>
        {levelLabel(n.level)}
      </Tag>
      <span>{n.name}</span>
      {n.code && (
        <Tag color="gold" style={{ margin: 0, fontFamily: 'monospace' }}>
          code: {n.code}
        </Tag>
      )}
      <Space size={2} className="node-actions">
        {n.level < 3 && (
          <Tooltip title={t('ch.addChild', { level: levelLabel((n.level + 1) as 1 | 2 | 3) })}>
            <Button
              type="text"
              size="small"
              icon={<PlusSquareOutlined />}
              onClick={() =>
                openAdd({ kind: 'child', lineId, typeId, parentId: n.id, nextLevel: (n.level + 1) as 1 | 2 | 3 })
              }
            />
          </Tooltip>
        )}
        <Tooltip title={n.code ? t('ch.codeView') : t('ch.codeGen')}>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            style={{ color: n.code ? '#faad14' : '#2F6BFF' }}
            onClick={() => generateCode(lineId, typeId, n)}
          />
        </Tooltip>
        <Tooltip title={t('ch.rename')}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setRenameNode({ id: n.id, name: n.name })
              form.setFieldsValue({ name: n.name })
            }}
          />
        </Tooltip>
        <Tooltip title={t('common.delete')}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteLevel(lineId, typeId, n.id)} />
        </Tooltip>
      </Space>
    </span>
  )

  const toDataNode = (lineId: string, typeId: string, n: ChannelLevelNode): DataNode => ({
    key: n.id,
    title: renderLevelTitle(lineId, typeId, n),
    children: n.children.map((c) => toDataNode(lineId, typeId, c)),
  })

  const renderTypeTitle = (lineId: string, tp: ChannelType) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Tag color="purple" style={{ margin: 0 }}>
        {t('ch.type')}
      </Tag>
      <Text strong>{tp.name}</Text>
      <Space size={2} className="node-actions">
        <Tooltip title={t('ch.addChild', { level: levelLabel(1) })}>
          <Button
            type="text"
            size="small"
            icon={<PlusSquareOutlined />}
            onClick={() => openAdd({ kind: 'child', lineId, typeId: tp.id, nextLevel: 1 })}
          />
        </Tooltip>
        <Tooltip title={t('ch.rename')}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setRenameNode({ id: tp.id, name: tp.name })
              form.setFieldsValue({ name: tp.name })
            }}
          />
        </Tooltip>
        <Tooltip title={t('common.delete')}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteType(lineId, tp.id)} />
        </Tooltip>
      </Space>
    </span>
  )

  const treeData: DataNode[] = channels.map((line) => ({
    key: line.id,
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Tag color="magenta" style={{ margin: 0 }}>
          {t('ch.line')}
        </Tag>
        <Text strong>{line.name}</Text>
        <Space size={2} className="node-actions">
          <Tooltip title={t('ch.addType')}>
            <Button
              type="text"
              size="small"
              icon={<PlusSquareOutlined />}
              onClick={() => openAdd({ kind: 'type', lineId: line.id })}
            />
          </Tooltip>
          <Tooltip title={t('ch.rename')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setRenameNode({ id: line.id, name: line.name })
                form.setFieldsValue({ name: line.name })
              }}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteLine(line.id)} />
          </Tooltip>
        </Space>
      </span>
    ),
    children: line.children.map((tp) => ({
      key: tp.id,
      title: renderTypeTitle(line.id, tp),
      children: tp.children.map((c) => toDataNode(line.id, tp.id, c)),
    })),
  }))

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('ch.title')}</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd({ kind: 'line' })}>
          {t('ch.addLine')}
        </Button>
      }
    >
      <style>{`
        .node-actions { opacity: 0; transition: opacity .15s; }
        .ant-tree-treenode:hover .node-actions { opacity: 1; }
        .ant-tree-node-content-wrapper { width: 100%; }
        .ant-tree .ant-tree-treenode { padding: 4px 0; align-items: center; }
      `}</style>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">{t('ch.intro')}</Text>
      </div>
      {channels.length === 0 ? (
        <Empty description={t('ch.empty')} />
      ) : (
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          blockNode
          selectable={false}
        />
      )}

      <Modal
        open={!!addCtx}
        title={
          addCtx?.kind === 'line'
            ? t('ch.addLine')
            : addCtx?.kind === 'type'
              ? t('ch.addType')
              : t('ch.addChild', { level: addCtx ? levelLabel(addCtx.nextLevel) : '' })
        }
        onCancel={() => setAddCtx(null)}
        onOk={submitAdd}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {addCtx?.kind === 'line' ? (
            <Form.Item
              name="name"
              label={t('ch.lineNameLabel')}
              rules={[{ required: true, message: t('ch.lineNamePlaceholder') }]}
              extra={t('ch.lineNameExtra')}
            >
              <Input placeholder={t('ch.lineNamePlaceholder')} />
            </Form.Item>
          ) : addCtx?.kind === 'type' ? (
            <Form.Item
              name="name"
              label={t('ch.typeNameLabel')}
              rules={[{ required: true, message: t('ch.typeNamePlaceholder') }]}
              extra={t('ch.typeNameExtra')}
            >
              <Input placeholder={t('ch.typeNamePlaceholder')} />
            </Form.Item>
          ) : (
            <Form.Item
              name="name"
              label={t('ch.levelNameLabel', { level: addCtx ? levelLabel(addCtx.nextLevel) : '' })}
              rules={[{ required: true, message: t('ch.nameRequired') }]}
            >
              <Input placeholder={t('ch.levelNamePlaceholder')} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={!!renameNode}
        title={t('ch.rename')}
        onCancel={() => setRenameNode(null)}
        onOk={submitRename}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label={t('ch.nameLabel')} rules={[{ required: true, message: t('ch.nameRequired') }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
