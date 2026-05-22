import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM warehouses ORDER BY created_at DESC').all()
    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { code, name, type, country, address, contact, phone } = req.body

    if (!code || !name || !type) {
      res.status(400).json({ success: false, error: 'code, name, type are required' })
      return
    }

    const result = db.prepare(`
      INSERT INTO warehouses (code, name, type, country, address, contact, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(code, name, type, country || '', address || '', contact || '', phone || '')

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid)
    res.json({ success: true, data: warehouse })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id)

    if (!warehouse) {
      res.status(404).json({ success: false, error: 'Warehouse not found' })
      return
    }

    const { code, name, type, country, address, contact, phone, enabled } = req.body

    const fields: string[] = []
    const values: any[] = []

    if (code !== undefined) { fields.push('code = ?'); values.push(code) }
    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (type !== undefined) { fields.push('type = ?'); values.push(type) }
    if (country !== undefined) { fields.push('country = ?'); values.push(country) }
    if (address !== undefined) { fields.push('address = ?'); values.push(address) }
    if (contact !== undefined) { fields.push('contact = ?'); values.push(contact) }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone) }
    if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled) }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE warehouses SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
