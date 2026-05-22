import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM teams ORDER BY created_at').all()
    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' })
      return
    }

    const result = db.prepare('INSERT INTO teams (name) VALUES (?)').run(name)
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(result.lastInsertRowid)
    res.json({ success: true, data: team })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
