import { useMemo } from 'react'
import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, PlayCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import type { LessonRecord, LoginMethod, UserStatus, UserType } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { resolveUserType } from '../userType'
import { completedLessons, openReplayVideo, reportKind, resolveUserStatus, TRIAL_REPORT_URL } from '../lessons'
import { businessLineOf, lineLabel, registerChannelText } from '../channel'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const STATUS_COLOR: Record<UserStatus, string> = {
  '未付费-未体验': 'default',
  '未付费-体验中': 'gold',
  '未付费-已体验': 'blue',
  付费: 'green',
  付费逾期: 'red',
}
const USER_TYPE_COLOR: Record<UserType, string> = { 正式用户: 'green', 测试用户: 'gold' }

export default function UserDetail() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { studentId = '' } = useParams()
  const students = useStore((s) => s.students)
  const channels = useStore((s) => s.channels)
  const lessons = useStore((s) => s.lessons ?? [])
  const { allowedLines } = usePerm()
  const scope = allowedLines()

  const student = useMemo(() => students.find((s) => s.studentId === studentId), [students, studentId])
  const inScope = student && (!scope || scope.includes(student.businessLine))
  const courseData = useMemo(() => completedLessons(lessons, studentId), [lessons, studentId])

  const back = (
    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users-v2')}>
      {t('user.back')}
    </Button>
  )

  if (!student || !inScope) {
    return (
      <Card className="page-card" bordered={false} title={<span className="section-title">{t('user.detail')}</span>} extra={back}>
        <Text type="secondary">{t('user.detailNotFound')}</Text>
      </Card>
    )
  }

  const courseColumns: ColumnsType<LessonRecord> = [
    { title: t('lesson.col.label'), dataIndex: 'courseLabel', width: 200, render: (v) => <Text code>{v}</Text> },
    {
      title: t('lesson.col.type'),
      dataIndex: 'lessonType',
      width: 110,
      render: (v: LessonRecord['lessonType']) => (
        <Tag color={v === '体验课' ? 'purple' : 'blue'}>{t(`lesson.type.${v}`)}</Tag>
      ),
    },
    { title: t('lesson.col.teacher'), dataIndex: 'teacher', width: 130, render: (v) => v || <Text type="secondary">—</Text> },
    {
      title: t('lesson.col.completedAt'),
      dataIndex: 'completedAt',
      width: 200,
      render: (v: string | undefined) => <LocalTime time={v} country={student.country || student.businessLine} />,
    },
    {
      title: t('lesson.col.report'),
      key: 'report',
      width: 150,
      render: (_: unknown, r: LessonRecord) => (
        // Trial Report / Lesson Report 交互一致：均跳转外部原型页（内容暂复用 Trial Report）
        <Button
          type="link"
          style={{ padding: 0 }}
          icon={<FileTextOutlined />}
          onClick={() => window.open(TRIAL_REPORT_URL, '_blank', 'noopener,noreferrer')}
        >
          {reportKind(r)}
        </Button>
      ),
    },
    {
      title: t('lesson.col.replay'),
      key: 'replay',
      width: 110,
      render: (_: unknown, r: LessonRecord) =>
        r.replayUrl ? (
          <Button type="link" style={{ padding: 0 }} icon={<PlayCircleOutlined />} onClick={() => openReplayVideo(r.replayUrl)}>
            {t('lesson.viewReplay')}
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        className="page-card"
        bordered={false}
        title={<span className="section-title">{t('user.detail')}</span>}
        extra={back}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label={t('user.col.id')}>{student.studentId}</Descriptions.Item>
          <Descriptions.Item label={t('user.col.name')}>{student.localName || student.name}</Descriptions.Item>
          <Descriptions.Item label={t('user.col.status')}>
            {(() => {
              const st = resolveUserStatus(student, lessons)
              return <Tag color={STATUS_COLOR[st]}>{t(`enum.status.${st}`)}</Tag>
            })()}
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.userType')}>
            <Tag color={USER_TYPE_COLOR[resolveUserType(student)]}>{t(`enum.userType.${resolveUserType(student)}`)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.ageGroup')}>
            {student.ageGroup ? <Tag color="geekblue">{student.ageGroup}</Tag> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.method')}>
            {t(`enum.method.${student.loginMethod as LoginMethod}`)}
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.account')}>{student.account}</Descriptions.Item>
          <Descriptions.Item label={t('user.col.line')}>
            {businessLineOf(channels, student) ? (
              <Tag>{businessLineOf(channels, student)}</Tag>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.country')}>
            <Tag>{lineLabel(student)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.channel')}>{registerChannelText(channels, student)}</Descriptions.Item>
          <Descriptions.Item label={t('user.col.code')}>
            {student.channelCode ? <Text code>{student.channelCode}</Text> : <Text type="secondary">-</Text>}
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.regTime')}>
            <LocalTime time={student.registerTime} country={student.country || student.businessLine} />
          </Descriptions.Item>
          <Descriptions.Item label={t('user.col.expireTime')}>
            <LocalTime time={student.expireTime} country={student.country || student.businessLine} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="page-card" bordered={false} title={<span className="section-title">{t('user.courseInfo')}</span>}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('user.courseInfoTip')}
        </Text>
        <Table
          rowKey="id"
          columns={courseColumns}
          dataSource={courseData}
          scroll={{ x: 900 }}
          locale={{ emptyText: t('lesson.empty') }}
          pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
        />
      </Card>
    </Space>
  )
}
