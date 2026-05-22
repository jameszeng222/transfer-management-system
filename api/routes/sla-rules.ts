import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare(`
      SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
      FROM sla_rules sr
      LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id
      ORDER BY w.name, sr.transport_type
    `).all()
    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { dest_warehouse_id, transport_type, sla_days } = req.body

    if (!dest_warehouse_id || !transport_type || !sla_days) {
      res.status(400).json({ success: false, error: 'dest_warehouse_id, transport_type, sla_days are required' })
      return
    }

    const existing = db.prepare(
      'SELECT id FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
    ).get(dest_warehouse_id, transport_type)

    if (existing) {
      db.prepare('UPDATE sla_rules SET sla_days = ? WHERE id = ?').run(sla_days, (existing as any).id)
      const updated = db.prepare(`
        SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
        FROM sla_rules sr
        LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id
        WHERE sr.id = ?
      `).get((existing as any).id)
      res.json({ success: true, data: updated })
    } else {
      const result = db.prepare(
        'INSERT INTO sla_rules (dest_warehouse_id, transport_type, sla_days) VALUES (?, ?, ?)'
      ).run(dest_warehouse_id, transport_type, sla_days)

      const rule = db.prepare(`
        SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
        FROM sla_rules sr
        LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id
        WHERE sr.id = ?
      `).get(result.lastInsertRowid)
      res.json({ success: true, data: rule })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const rule = db.prepare('SELECT * FROM sla_rules WHERE id = ?').get(id)

    if (!rule) {
      res.status(404).json({ success: false, error: 'SLA rule not found' })
      return
    }

    db.prepare('DELETE FROM sla_rules WHERE id = ?').run(id)
    res.json({ success: true, data: null })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
