import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const totalTransfers = db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE'").get() as { count: number }
    const inTransit = db.prepare(
      "SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND logistics_status NOT IN ('PENDING', 'SHELVED')"
    ).get() as { count: number }
    const logisticsAbnormal = db.prepare("SELECT COUNT(*) as count FROM transfers WHERE is_logistics_abnormal = 1").get() as { count: number }
    const shelveAbnormal = db.prepare("SELECT COUNT(*) as count FROM transfers WHERE is_shelve_abnormal = 1").get() as { count: number }
    const completed = db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'COMPLETED'").get() as { count: number }
    const totalEstimatedFreight = db.prepare("SELECT COALESCE(SUM(estimated_freight), 0) as total FROM transfers").get() as { total: number }
    const totalFinalFreight = db.prepare("SELECT COALESCE(SUM(final_freight), 0) as total FROM transfers").get() as { total: number }

    const logisticsStatusDistribution = db.prepare(`
      SELECT logistics_status as status, COUNT(*) as count
      FROM transfers
      WHERE status = 'ACTIVE'
      GROUP BY logistics_status
    `).all()

    const sourceDistribution = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM transfers
      GROUP BY source
    `).all()

    const abnormalDistribution = db.prepare(`
      SELECT type, SUM(count) as count FROM (
        SELECT logistics_abnormal_type as type, COUNT(*) as count
        FROM transfers
        WHERE is_logistics_abnormal = 1 AND logistics_abnormal_type != ''
        GROUP BY logistics_abnormal_type
        UNION ALL
        SELECT shelve_abnormal_type as type, COUNT(*) as count
        FROM transfers
        WHERE is_shelve_abnormal = 1 AND shelve_abnormal_type != ''
        GROUP BY shelve_abnormal_type
      )
      GROUP BY type
    `).all()

    const recentAbnormals = db.prepare(`
      SELECT t.*,
        ow.name as origin_warehouse_name,
        dw.name as dest_warehouse_name,
        c.name as carrier_name
      FROM transfers t
      LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
      LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
      LEFT JOIN carriers c ON t.carrier_id = c.id
      WHERE t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1
      ORDER BY t.updated_at DESC
      LIMIT 10
    `).all()

    const estimated = totalEstimatedFreight.total
    const actual = totalFinalFreight.total
    const deviation = actual - estimated

    const slaTotal = db.prepare(
      "SELECT COUNT(*) as count FROM transfers WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL"
    ).get() as { count: number }

    let onTime = 0
    let overdue = 0

    if (slaTotal.count > 0) {
      onTime = (db.prepare(`
        SELECT COUNT(*) as count FROM transfers
        WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL
          AND (
            (delivery_time IS NOT NULL AND delivery_time <= estimated_delivery)
            OR (delivery_time IS NULL AND date('now') <= estimated_delivery AND logistics_status NOT IN ('DELIVERED', 'UNLOADED', 'SHELVED'))
            OR logistics_status = 'SHELVED'
          )
      `).get() as { count: number }).count

      overdue = (db.prepare(`
        SELECT COUNT(*) as count FROM transfers
        WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL
          AND (
            (delivery_time IS NOT NULL AND delivery_time > estimated_delivery)
            OR (delivery_time IS NULL AND date('now') > estimated_delivery AND logistics_status NOT IN ('DELIVERED', 'UNLOADED', 'SHELVED'))
          )
      `).get() as { count: number }).count
    }

    const rate = slaTotal.count > 0 ? Math.round(onTime / (onTime + overdue) * 100) : 0

    res.json({
      success: true,
      data: {
        stats: {
          totalTransfers: totalTransfers.count,
          inTransit: inTransit.count,
          logisticsAbnormal: logisticsAbnormal.count,
          shelveAbnormal: shelveAbnormal.count,
          completed: completed.count,
          totalEstimatedFreight: estimated,
          totalFinalFreight: actual,
        },
        logisticsStatusDistribution,
        sourceDistribution,
        abnormalDistribution,
        recentAbnormals,
        freightOverview: { estimated, actual, deviation },
        slaCompliance: { onTime, overdue, rate },
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
