import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/context/AppContext'
import { CourseType } from '@/types'
import { Plus, Trash2, Edit2, Check, X, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#84CC16'
]

export function CourseSettings() {
  const { courseTypes, addCourseType, removeCourseType, updateCourseType } = useApp()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
    description: '',
    color: PRESET_COLORS[0]
  })

  const resetForm = () => {
    setFormData({
      name: '',
      duration: 60,
      description: '',
      color: PRESET_COLORS[0]
    })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!formData.name.trim()) return
    
    addCourseType({
      name: formData.name,
      duration: formData.duration,
      description: formData.description,
      color: formData.color
    })
    resetForm()
  }

  const handleEdit = (course: CourseType) => {
    setEditingId(course.id)
    setFormData({
      name: course.name,
      duration: course.duration,
      description: course.description || '',
      color: course.color
    })
    setIsAdding(false)
  }

  const handleSaveEdit = () => {
    if (!editingId || !formData.name.trim()) return
    
    updateCourseType(editingId, {
      name: formData.name,
      duration: formData.duration,
      description: formData.description,
      color: formData.color
    })
    resetForm()
  }

  return (
    <div className="space-y-6">
      {/* 添加课程按钮 */}
      {!isAdding && !editingId && (
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加课程类型
        </Button>
      )}

      {/* 添加/编辑表单 */}
      {(isAdding || editingId) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {isAdding ? '添加新课程' : '编辑课程'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>课程名称 *</Label>
                <Input
                  placeholder="如：数学辅导"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>课程时长（分钟）</Label>
                <Input
                  type="number"
                  min={30}
                  step={15}
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>课程描述</Label>
              <Textarea
                placeholder="简要描述课程内容..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>标识颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                      formData.color === color ? "border-foreground ring-2 ring-foreground/20" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={isAdding ? handleAdd : handleSaveEdit}>
                <Check className="w-4 h-4 mr-1" />
                {isAdding ? '添加' : '保存'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 课程列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courseTypes.map(course => (
          <Card key={course.id} className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <h3 className="font-semibold">{course.name}</h3>
                </div>
                <Badge variant="secondary">{course.duration}分钟</Badge>
              </div>
              
              {course.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {course.description}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(course)}
                  className="flex-1"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('确定要删除这个课程类型吗？')) {
                      removeCourseType(course.id)
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courseTypes.length === 0 && !isAdding && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">还没有添加课程类型</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加第一个课程
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
