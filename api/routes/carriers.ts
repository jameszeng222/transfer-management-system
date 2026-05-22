import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM carriers ORDER BY created_at DESC').all()
    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, type, contact_person, contact_phone, service_routes } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' })
      return
    }

    const result = db.prepare(`
      INSERT INTO carriers (name, type, contact_person, contact_phone, service_routes)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, type || '', contact_person || '', contact_phone || '', service_routes || '')

    const carrier = db.prepare('SELECT * FROM carriers WHERE id = ?').get(result.lastInsertRowid)
    res.json({ success: true, data: carrier })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const carrier = db.prepare('SELECT * FROM carriers WHERE id = ?').get(id)

    if (!carrier) {
      res.status(404).json({ success: false, error: 'Carrier not found' })
      return
    }

    const { name, type, contact_person, contact_phone, service_routes, active } = req.body

    const fields: string[] = []
    const values: any[] = []

    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (type !== undefined) { fields.push('type = ?'); values.push(type) }
    if (contact_person !== undefined) { fields.push('contact_person = ?'); values.push(contact_person) }
    if (contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(contact_phone) }
    if (service_routes !== undefined) { fields.push('service_routes = ?'); values.push(service_routes) }
    if (active !== undefined) { fields.push('active = ?'); values.push(active) }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE carriers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = db.prepare('SELECT * FROM carriers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
