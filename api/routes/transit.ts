import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

const IN_TRANSIT_STATUSES = ['PICKED_UP', 'DEPARTED', 'ARRIVED_PORT', 'CLEARED', 'LAST_MILE', 'DELIVERED', 'UNLOADED']

router.get('/overview', (_req: Request, res: Response): void => {
  try {
    const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',')

    const inTransitCount = db.prepare(
      `SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})`
    ).get(...IN_TRANSIT_STATUSES) as { count: number }

    const inTransitBoxes = db.prepare(
      `SELECT COALESCE(SUM(box_count), 0) as total FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})`
    ).get(...IN_TRANSIT_STATUSES) as { total: number }

    const statusDistribution = db.prepare(`
      SELECT logistics_status as status, COUNT(*) as count
      FROM transfers
      WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})
      GROUP BY logistics_status
    `).all(...IN_TRANSIT_STATUSES)

    const abnormalCount = db.prepare(
      "SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND (is_logistics_abnormal = 1 OR is_shelve_abnormal = 1)"
    ).get() as { count: number }

    res.json({
      success: true,
      data: {
        inTransitCount: inTransitCount.count,
        inTransitBoxes: inTransitBoxes.total,
        statusDistribution,
        abnormalCount: abnormalCount.count,
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/list', (req: Request, res: Response): void => {
  try {
    const {
      keyword, logisticsStatus, carrierId,
      originWarehouseId, destWarehouseId, teamId,
      startDate, endDate,
      page = '1', pageSize = '20'
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const sizeNum = parseInt(pageSize as string, 10)
    const offset = (pageNum - 1) * sizeNum

    let where = "WHERE t.status = 'ACTIVE'"
    const params: any[] = []

    if (keyword) {
      where += ' AND (t.biz_order_no LIKE ? OR t.tracking_no LIKE ? OR t.product_name LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (logisticsStatus) {
      where += ' AND t.logistics_status = ?'
      params.push(logisticsStatus)
    }
    if (carrierId) {
      where += ' AND t.carrier_id = ?'
      params.push(carrierId)
    }
    if (originWarehouseId) {
      where += ' AND t.origin_warehouse_id = ?'
      params.push(originWarehouseId)
    }
    if (destWarehouseId) {
      where += ' AND t.dest_warehouse_id = ?'
      params.push(destWarehouseId)
    }
    if (teamId) {
      where += ' AND t.team_id = ?'
      params.push(teamId)
    }
    if (startDate) {
      where += ' AND t.created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND t.created_at <= ?'
      params.push(endDate)
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM transfers t ${where}`).get(...params) as { total: number }
    const rows = db.prepare(`
      SELECT t.*,
        ow.name as origin_warehouse_name, ow.code as origin_warehouse_code,
        dw.name as dest_warehouse_name, dw.code as dest_warehouse_code,
        c.name as carrier_name,
        tm.name as team_name
      FROM transfers t
      LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
      LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
      LEFT JOIN carriers c ON t.carrier_id = c.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, sizeNum, offset)

    res.json({
      success: true,
      data: { list: rows, total: totalRow.total, page: pageNum, pageSize: sizeNum }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/by-warehouse', (_req: Request, res: Response): void => {
  try {
    const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',')

    const rows = db.prepare(`
      SELECT
        dw.id as warehouse_id, dw.name as warehouse_name, dw.code as warehouse_code,
        COUNT(t.id) as transfer_count,
        COALESCE(SUM(t.box_count), 0) as total_boxes,
        COALESCE(SUM(t.planned_qty), 0) as total_qty
      FROM warehouses dw
      LEFT JOIN transfers t ON t.dest_warehouse_id = dw.id
        AND t.status = 'ACTIVE'
        AND t.logistics_status IN (${statusPlaceholders})
      WHERE dw.enabled = 1
      GROUP BY dw.id
      HAVING transfer_count > 0
      ORDER BY transfer_count DESC
    `).all(...IN_TRANSIT_STATUSES)

    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/by-carrier', (_req: Request, res: Response): void => {
  try {
    const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',')

    const rows = db.prepare(`
      SELECT
        c.id as carrier_id, c.name as carrier_name,
        COUNT(t.id) as transfer_count,
        COALESCE(SUM(t.box_count), 0) as total_boxes,
        COALESCE(SUM(t.planned_qty), 0) as total_qty
      FROM carriers c
      LEFT JOIN transfers t ON t.carrier_id = c.id
        AND t.status = 'ACTIVE'
        AND t.logistics_status IN (${statusPlaceholders})
      WHERE c.active = 1
      GROUP BY c.id
      HAVING transfer_count > 0
      ORDER BY transfer_count DESC
    `).all(...IN_TRANSIT_STATUSES)

    res.json({ success: true, data: rows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/abnormal', (req: Request, res: Response): void => {
  try {
    const { type, page = '1', pageSize = '20' } = req.query
    const pageNum = parseInt(page as string, 10)
    const sizeNum = parseInt(pageSize as string, 10)
    const offset = (pageNum - 1) * sizeNum

    let where = "WHERE t.status = 'ACTIVE' AND (t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1)"
    const params: any[] = []

    if (type === 'logistics') {
      where = "WHERE t.status = 'ACTIVE' AND t.is_logistics_abnormal = 1"
    } else if (type === 'shelve') {
      where = "WHERE t.status = 'ACTIVE' AND t.is_shelve_abnormal = 1"
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM transfers t ${where}`).get(...params) as { total: number }
    const rows = db.prepare(`
      SELECT t.*,
        ow.name as origin_warehouse_name,
        dw.name as dest_warehouse_name,
        c.name as carrier_name,
        tm.name as team_name
      FROM transfers t
      LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
      LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
      LEFT JOIN carriers c ON t.carrier_id = c.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      ${where}
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, sizeNum, offset)

    res.json({
      success: true,
      data: { list: rows, total: totalRow.total, page: pageNum, pageSize: sizeNum }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/export', (req: Request, res: Response): void => {
  try {
    const { logisticsStatus, carrierId, destWarehouseId } = req.query

    let where = "WHERE t.status = 'ACTIVE'"
    const params: any[] = []

    if (logisticsStatus) {
      where += ' AND t.logistics_status = ?'
      params.push(logisticsStatus)
    }
    if (carrierId) {
      where += ' AND t.carrier_id = ?'
      params.push(carrierId)
    }
    if (destWarehouseId) {
      where += ' AND t.dest_warehouse_id = ?'
      params.push(destWarehouseId)
    }

    const rows = db.prepare(`
      SELECT t.*,
        ow.name as origin_warehouse_name,
        dw.name as dest_warehouse_name,
        c.name as carrier_name,
        tm.name as team_name
      FROM transfers t
      LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
      LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
      LEFT JOIN carriers c ON t.carrier_id = c.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      ${where}
      ORDER BY t.created_at DESC
    `).all(...params) as any[]

    const headers = [
      '业务单号', '调拨单号', '第三方入库单号', '来源', '始发仓', '目的仓',
      '团队', '产品名称', '箱数', '计划数量', '已上架数量', '物流状态',
      '运输方式', '物流商', '物流单号', '提货时间', '离港时间', '到港时间',
      '清关时间', '尾程时间', '签收时间', '卸货时间', '上架时间',
      '预计送达', '预计上架', '是否物流异常', '物流异常类型', '是否上架异常',
      '创建时间'
    ]

    const csvRows = [headers.join(',')]

    for (const r of rows) {
      csvRows.push([
        r.biz_order_no, r.transfer_order_no || '', r.third_party_inbound_no || '',
        r.source, r.origin_warehouse_name, r.dest_warehouse_name,
        r.team_name || '', r.product_name, r.box_count, r.planned_qty, r.shelved_qty,
        r.logistics_status, r.transport_type, r.carrier_name || '', r.tracking_no || '',
        r.pickup_time || '', r.depart_time || '', r.arrive_port_time || '',
        r.clearance_time || '', r.last_mile_time || '', r.delivery_time || '',
        r.unload_time || '', r.shelve_time || '',
        r.estimated_delivery || '', r.estimated_shelve || '',
        r.is_logistics_abnormal ? '是' : '否', r.logistics_abnormal_type || '',
        r.is_shelve_abnormal ? '是' : '否',
        r.created_at
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=transit_export.csv')
    res.send('\uFEFF' + csvRows.join('\n'))
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
