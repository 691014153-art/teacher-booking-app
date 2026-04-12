import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/context/AppContext'
import { User, Plus, X, Save } from 'lucide-react'

export function TeacherSettings() {
  const { teacher, updateTeacher } = useApp()
  const [formData, setFormData] = useState({
    name: teacher.name,
    bio: teacher.bio || '',
    subjectInput: ''
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateTeacher({
      name: formData.name,
      bio: formData.bio,
      subjects: teacher.subjects
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addSubject = () => {
    if (formData.subjectInput.trim() && !teacher.subjects.includes(formData.subjectInput.trim())) {
      updateTeacher({
        subjects: [...teacher.subjects, formData.subjectInput.trim()]
      })
      setFormData(prev => ({ ...prev, subjectInput: '' }))
    }
  }

  const removeSubject = (subject: string) => {
    updateTeacher({
      subjects: teacher.subjects.filter(s => s !== subject)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSubject()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            教师信息设置
          </CardTitle>
          <CardDescription>
            编辑您的个人信息，家长在预约时会看到这些信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 姓名 */}
          <div className="space-y-2">
            <Label htmlFor="name">教师姓名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="请输入您的姓名"
            />
          </div>

          {/* 个人简介 */}
          <div className="space-y-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="介绍一下您的教学经验、擅长科目等..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              简洁地介绍自己，让家长了解您的教学背景
            </p>
          </div>

          {/* 教学科目 */}
          <div className="space-y-2">
            <Label>教学科目</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {teacher.subjects.map((subject, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="px-3 py-1 text-sm flex items-center gap-1"
                >
                  {subject}
                  <button
                    onClick={() => removeSubject(subject)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={formData.subjectInput}
                onChange={e => setFormData(prev => ({ ...prev, subjectInput: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="输入科目名称，按回车添加"
              />
              <Button variant="outline" onClick={addSubject}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-4 pt-4">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
            {saved && (
              <span className="text-sm text-success">保存成功！</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
