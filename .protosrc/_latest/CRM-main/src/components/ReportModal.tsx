import { Descriptions, Modal, Rate, Tag, Typography } from 'antd'
import type { LessonRecord } from '../types'
import { reportKind } from '../lessons'
import { useI18n } from '../i18n'

const { Text, Paragraph } = Typography

// Trial Report / Lesson Report 详情弹窗
export function ReportModal({ lesson, onClose }: { lesson: LessonRecord | null; onClose: () => void }) {
  const { t } = useI18n()
  const kind = lesson ? reportKind(lesson) : 'Trial Report'
  const report = lesson?.report
  return (
    <Modal open={!!lesson} title={kind} footer={null} onCancel={onClose} width={620} destroyOnClose>
      {lesson && (
        <div style={{ marginTop: 8 }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('lesson.col.label')}>
              <Text code>{lesson.courseLabel}</Text>
              <Tag style={{ marginInlineStart: 8 }} color={lesson.lessonType === '体验课' ? 'purple' : 'blue'}>
                {t(`lesson.type.${lesson.lessonType}`)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('report.teacher')}>{lesson.teacher || '—'}</Descriptions.Item>
            <Descriptions.Item label={t('lesson.col.completedAt')}>{lesson.completedAt || '—'}</Descriptions.Item>
          </Descriptions>

          {report ? (
            <>
              <div style={{ marginTop: 16 }}>
                <Text strong>{t('report.ratings')}</Text>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {report.ratings.map((r) => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 130, color: '#595959' }}>{r.label}</span>
                      <Rate disabled value={r.score} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Text strong>{t('report.summary')}</Text>
                <Paragraph style={{ marginTop: 6 }}>{report.summary}</Paragraph>
              </div>

              <div style={{ marginTop: 8 }}>
                <Text strong>{t('report.teacherComment')}</Text>
                <Paragraph style={{ marginTop: 6 }} italic type="secondary">
                  {report.teacherComment}
                </Paragraph>
              </div>

              {report.homework && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>{t('report.homework')}</Text>
                  <Paragraph style={{ marginTop: 6 }}>{report.homework}</Paragraph>
                </div>
              )}
            </>
          ) : (
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              {t('lesson.noReport')}
            </Paragraph>
          )}
        </div>
      )}
    </Modal>
  )
}
