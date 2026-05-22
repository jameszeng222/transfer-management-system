import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at').all()
    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { username, name, phone, role } = req.body

    if (!username || !name) {
      res.status(400).json({ success: false, error: 'username, name are required' })
      return
    }

    const result = db.prepare(`
      INSERT INTO users (username, name, phone, role)
      VALUES (?, ?, ?, ?)
    `).run(username, name, phone || '', role || 'OPERATOR')

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    res.json({ success: true, data: user })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    const { name, phone, role, enabled } = req.body

    const fields: string[] = []
    const values: any[] = []

    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone) }
    if (role !== undefined) { fields.push('role = ?'); values.push(role) }
    if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled) }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
