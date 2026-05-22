import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const {
      keyword, source, logisticsStatus, carrierId,
      originWarehouseId, destWarehouseId, teamId,
      isAbnormal, startDate, endDate,
      page = '1', pageSize = '10'
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const sizeNum = parseInt(pageSize as string, 10)
    const offset = (pageNum - 1) * sizeNum

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (keyword) {
      where += ' AND (t.biz_order_no LIKE ? OR t.transfer_order_no LIKE ? OR t.tracking_no LIKE ? OR t.product_name LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw, kw, kw)
    }
    if (source) {
      where += ' AND t.source = ?'
      params.push(source)
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
    if (isAbnormal === '1' || isAbnormal === 'true') {
      where += ' AND (t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1)'
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

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const transfer = db.prepare(`
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
      WHERE t.id = ?
    `).get(req.params.id)

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(req.params.id)
    const logs = db.prepare('SELECT * FROM transfer_logs WHERE transfer_id = ? ORDER BY created_at').all(req.params.id)
    const originWarehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get((transfer as any).origin_warehouse_id)
    const destWarehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get((transfer as any).dest_warehouse_id)
    const carrier = (transfer as any).carrier_id ? db.prepare('SELECT * FROM carriers WHERE id = ?').get((transfer as any).carrier_id) : null
    const team = (transfer as any).team_id ? db.prepare('SELECT * FROM teams WHERE id = ?').get((transfer as any).team_id) : null

    res.json({
      success: true,
      data: {
        ...(transfer as any),
        items,
        logs,
        originWarehouse,
        destWarehouse,
        carrier,
        team,
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
      source = 'MANUAL', origin_warehouse_id, dest_warehouse_id,
      team_id, product_name, box_count, planned_qty,
      logistics_status = 'PENDING',
      is_customs_declared, customs_factory, sla_days,
      order_remark, transport_type, carrier_id, carrier_order_no,
      tracking_no, pickup_time, estimated_delivery, estimated_shelve,
      estimated_unit_price, estimated_freight, box_spec,
      declared_value, remark, items, operator = '系统'
    } = req.body

    if (!biz_order_no || !origin_warehouse_id || !dest_warehouse_id) {
      res.status(400).json({ success: false, error: 'biz_order_no, origin_warehouse_id, dest_warehouse_id are required' })
      return
    }

    let finalSlaDays = sla_days || 0
    if (!finalSlaDays && dest_warehouse_id && transport_type) {
      const rule = db.prepare(
        'SELECT sla_days FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
      ).get(dest_warehouse_id, transport_type) as { sla_days: number } | undefined
      if (rule) finalSlaDays = rule.sla_days
    }

    let finalEstimatedDelivery = estimated_delivery || null
    let finalEstimatedShelve = estimated_shelve || null
    if (finalSlaDays && pickup_time && !finalEstimatedDelivery) {
      finalEstimatedDelivery = addDays(pickup_time, finalSlaDays)
      finalEstimatedShelve = addDays(finalEstimatedDelivery, 2)
    }

    const insertTransfer = db.prepare(`
      INSERT INTO transfers (
        biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
        source, origin_warehouse_id, dest_warehouse_id, team_id, product_name,
        box_count, planned_qty, logistics_status,
        is_customs_declared, customs_factory, sla_days, order_remark,
        transport_type, carrier_id, carrier_order_no, tracking_no,
        pickup_time, estimated_delivery, estimated_shelve,
        estimated_unit_price, estimated_freight, box_spec, declared_value,
        remark
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `)

    const insertItem = db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
    const insertLog = db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')

    const createTransfer = db.transaction(() => {
      const result = insertTransfer.run(
        biz_order_no, transfer_order_no || '', outbound_order_no || '', third_party_inbound_no || '',
        source, origin_warehouse_id, dest_warehouse_id, team_id || null, product_name || '',
        box_count || 0, planned_qty || 0, logistics_status,
        is_customs_declared || 0, customs_factory || '', finalSlaDays, order_remark || '',
        transport_type || '', carrier_id || null, carrier_order_no || '', tracking_no || '',
        pickup_time || null, finalEstimatedDelivery, finalEstimatedShelve,
        estimated_unit_price || 0, estimated_freight || 0, box_spec || '', declared_value || 0,
        remark || ''
      )
      const transferId = result.lastInsertRowid

      if (items && Array.isArray(items)) {
        for (const item of items) {
          insertItem.run(transferId, item.sku, item.quantity, item.box_no || '')
        }
      }

      insertLog.run(transferId, 'CREATE', operator, '创建调拨单')

      return transferId
    })

    const transferId = createTransfer()
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId)
    const transferItems = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(transferId)
    const transferLogs = db.prepare('SELECT * FROM transfer_logs WHERE transfer_id = ? ORDER BY created_at').all(transferId)

    res.json({
      success: true,
      data: { ...(transfer as any), items: transferItems, logs: transferLogs }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const {
      transfer_order_no, outbound_order_no, third_party_inbound_no,
      team_id, product_name, box_count, planned_qty, shelved_qty,
      is_customs_declared, customs_factory, sla_days, order_remark,
      transport_type, carrier_id, carrier_order_no, tracking_no,
      is_reconciled, is_paid, remark, items, operator = '系统'
    } = req.body

    const updateTransfer = db.transaction(() => {
      const fields: string[] = []
      const values: any[] = []

      if (transfer_order_no !== undefined) { fields.push('transfer_order_no = ?'); values.push(transfer_order_no) }
      if (outbound_order_no !== undefined) { fields.push('outbound_order_no = ?'); values.push(outbound_order_no) }
      if (third_party_inbound_no !== undefined) { fields.push('third_party_inbound_no = ?'); values.push(third_party_inbound_no) }
      if (team_id !== undefined) { fields.push('team_id = ?'); values.push(team_id || null) }
      if (product_name !== undefined) { fields.push('product_name = ?'); values.push(product_name) }
      if (box_count !== undefined) { fields.push('box_count = ?'); values.push(box_count) }
      if (planned_qty !== undefined) { fields.push('planned_qty = ?'); values.push(planned_qty) }
      if (shelved_qty !== undefined) { fields.push('shelved_qty = ?'); values.push(shelved_qty) }
      if (is_customs_declared !== undefined) { fields.push('is_customs_declared = ?'); values.push(is_customs_declared) }
      if (customs_factory !== undefined) { fields.push('customs_factory = ?'); values.push(customs_factory) }
      if (sla_days !== undefined) { fields.push('sla_days = ?'); values.push(sla_days) }
      if (order_remark !== undefined) { fields.push('order_remark = ?'); values.push(order_remark) }
      if (transport_type !== undefined) { fields.push('transport_type = ?'); values.push(transport_type) }
      if (carrier_id !== undefined) { fields.push('carrier_id = ?'); values.push(carrier_id || null) }
      if (carrier_order_no !== undefined) { fields.push('carrier_order_no = ?'); values.push(carrier_order_no) }
      if (tracking_no !== undefined) { fields.push('tracking_no = ?'); values.push(tracking_no) }
      if (is_reconciled !== undefined) { fields.push('is_reconciled = ?'); values.push(is_reconciled) }
      if (is_paid !== undefined) { fields.push('is_paid = ?'); values.push(is_paid) }
      if (remark !== undefined) { fields.push('remark = ?'); values.push(remark) }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')")
        values.push(id)
        db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      if (items && Array.isArray(items)) {
        db.prepare('DELETE FROM transfer_items WHERE transfer_id = ?').run(id)
        const insertItem = db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
        for (const item of items) {
          insertItem.run(Number(id), item.sku, item.quantity, item.box_no || '')
        }
      }

      db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'UPDATE', operator, '更新调拨单')
    })

    updateTransfer()
    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/batch-import', (req: Request, res: Response): void => {
  try {
    const { transfers, operator = '系统' } = req.body

    if (!Array.isArray(transfers) || transfers.length === 0) {
      res.status(400).json({ success: false, error: 'transfers array is required and must not be empty' })
      return
    }

    const insertTransfer = db.prepare(`
      INSERT INTO transfers (
        biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
        source, origin_warehouse_id, dest_warehouse_id, team_id, product_name,
        box_count, planned_qty, logistics_status,
        is_customs_declared, customs_factory, sla_days, order_remark,
        transport_type, carrier_id, carrier_order_no, tracking_no,
        pickup_time, estimated_delivery, estimated_shelve,
        estimated_unit_price, estimated_freight, box_spec, declared_value,
        remark
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `)

    const insertItem = db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
    const insertLog = db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')

    const batchImport = db.transaction(() => {
      const results: any[] = []

      for (const t of transfers) {
        let slaDays = t.sla_days || 0
        if (!slaDays && t.dest_warehouse_id && t.transport_type) {
          const rule = db.prepare(
            'SELECT sla_days FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
          ).get(t.dest_warehouse_id, t.transport_type) as { sla_days: number } | undefined
          if (rule) slaDays = rule.sla_days
        }

        let estimatedDelivery = t.estimated_delivery || null
        let estimatedShelve = t.estimated_shelve || null
        if (slaDays && t.pickup_time && !estimatedDelivery) {
          estimatedDelivery = addDays(t.pickup_time, slaDays)
          estimatedShelve = addDays(estimatedDelivery, 2)
        }

        const result = insertTransfer.run(
          t.biz_order_no, t.transfer_order_no || '', t.outbound_order_no || '', t.third_party_inbound_no || '',
          t.source || 'MANUAL', t.origin_warehouse_id, t.dest_warehouse_id, t.team_id || null, t.product_name || '',
          t.box_count || 0, t.planned_qty || 0, t.logistics_status || 'PENDING',
          t.is_customs_declared || 0, t.customs_factory || '', slaDays, t.order_remark || '',
          t.transport_type || '', t.carrier_id || null, t.carrier_order_no || '', t.tracking_no || '',
          t.pickup_time || null, estimatedDelivery, estimatedShelve,
          t.estimated_unit_price || 0, t.estimated_freight || 0, t.box_spec || '', t.declared_value || 0,
          t.remark || ''
        )
        const transferId = result.lastInsertRowid

        if (t.items && Array.isArray(t.items)) {
          for (const item of t.items) {
            insertItem.run(transferId, item.sku, item.quantity, item.box_no || '')
          }
        }

        insertLog.run(transferId, 'CREATE', operator, '批量导入创建调拨单')
        results.push({ id: transferId, biz_order_no: t.biz_order_no })
      }

      return results
    })

    const results = batchImport()
    res.json({ success: true, data: results })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/logistics-nodes', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const {
      pickup_time, depart_time, arrive_port_time, clearance_time,
      last_mile_time, delivery_time, unload_time, shelve_time,
      logistics_status, operator = '系统'
    } = req.body

    const updateNodes = db.transaction(() => {
      const fields: string[] = []
      const values: any[] = []

      if (pickup_time !== undefined) { fields.push('pickup_time = ?'); values.push(pickup_time) }
      if (depart_time !== undefined) { fields.push('depart_time = ?'); values.push(depart_time) }
      if (arrive_port_time !== undefined) { fields.push('arrive_port_time = ?'); values.push(arrive_port_time) }
      if (clearance_time !== undefined) { fields.push('clearance_time = ?'); values.push(clearance_time) }
      if (last_mile_time !== undefined) { fields.push('last_mile_time = ?'); values.push(last_mile_time) }
      if (delivery_time !== undefined) { fields.push('delivery_time = ?'); values.push(delivery_time) }
      if (unload_time !== undefined) { fields.push('unload_time = ?'); values.push(unload_time) }
      if (shelve_time !== undefined) { fields.push('shelve_time = ?'); values.push(shelve_time) }
      if (logistics_status !== undefined) { fields.push('logistics_status = ?'); values.push(logistics_status) }

      const finalLogisticsStatus = logistics_status || transfer.logistics_status
      const finalPickupTime = pickup_time !== undefined ? pickup_time : transfer.pickup_time
      const finalDeliveryTime = delivery_time !== undefined ? delivery_time : transfer.delivery_time

      if (transfer.sla_days && finalPickupTime) {
        const expectedDelivery = addDays(finalPickupTime, transfer.sla_days)
        const now = new Date().toISOString().split('T')[0]

        if (finalDeliveryTime && finalDeliveryTime > expectedDelivery) {
          fields.push('is_logistics_abnormal = 1')
          fields.push("logistics_abnormal_type = 'DELAY'")
          fields.push('logistics_abnormal_remark = ?')
          values.push(`物流超时，预计送达日期：${expectedDelivery}，实际送达日期：${finalDeliveryTime}`)
        } else if (!finalDeliveryTime && !['DELIVERED', 'UNLOADED', 'SHELVED'].includes(finalLogisticsStatus) && now > expectedDelivery) {
          fields.push('is_logistics_abnormal = 1')
          fields.push("logistics_abnormal_type = 'OVERDUE'")
          fields.push('logistics_abnormal_remark = ?')
          values.push(`物流超时，预计送达日期：${expectedDelivery}`)
        }
      }

      if (shelve_time !== undefined && transfer.estimated_shelve && shelve_time > transfer.estimated_shelve) {
        fields.push('is_shelve_abnormal = 1')
        fields.push("shelve_abnormal_type = 'DELAY'")
        fields.push('shelve_abnormal_remark = ?')
        values.push(`上架超时，预计上架日期：${transfer.estimated_shelve}，实际上架日期：${shelve_time}`)
      }

      if (finalLogisticsStatus === 'SHELVED') {
        fields.push("status = 'COMPLETED'")
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')")
        values.push(id)
        db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }

      db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'LOGISTICS_UPDATE', operator, '更新物流节点')
    })

    updateNodes()
    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/abnormal', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const {
      is_logistics_abnormal, logistics_abnormal_type, logistics_abnormal_remark,
      is_shelve_abnormal, shelve_abnormal_type, shelve_abnormal_remark,
      operator = '系统'
    } = req.body

    const fields: string[] = []
    const values: any[] = []

    if (is_logistics_abnormal !== undefined) { fields.push('is_logistics_abnormal = ?'); values.push(is_logistics_abnormal) }
    if (logistics_abnormal_type !== undefined) { fields.push('logistics_abnormal_type = ?'); values.push(logistics_abnormal_type) }
    if (logistics_abnormal_remark !== undefined) { fields.push('logistics_abnormal_remark = ?'); values.push(logistics_abnormal_remark) }
    if (is_shelve_abnormal !== undefined) { fields.push('is_shelve_abnormal = ?'); values.push(is_shelve_abnormal) }
    if (shelve_abnormal_type !== undefined) { fields.push('shelve_abnormal_type = ?'); values.push(shelve_abnormal_type) }
    if (shelve_abnormal_remark !== undefined) { fields.push('shelve_abnormal_remark = ?'); values.push(shelve_abnormal_remark) }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'ABNORMAL_UPDATE', operator, '更新异常信息')

    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/freight', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const {
      estimated_unit_price, estimated_freight, box_spec,
      declared_value, final_freight, operator = '系统'
    } = req.body

    const fields: string[] = []
    const values: any[] = []

    if (estimated_unit_price !== undefined) { fields.push('estimated_unit_price = ?'); values.push(estimated_unit_price) }
    if (estimated_freight !== undefined) { fields.push('estimated_freight = ?'); values.push(estimated_freight) }
    if (box_spec !== undefined) { fields.push('box_spec = ?'); values.push(box_spec) }
    if (declared_value !== undefined) { fields.push('declared_value = ?'); values.push(declared_value) }
    if (final_freight !== undefined) { fields.push('final_freight = ?'); values.push(final_freight) }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'FREIGHT_UPDATE', operator, '更新运费信息')

    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id/reconcile', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const { operator = '系统' } = req.body

    db.prepare("UPDATE transfers SET is_reconciled = 1, updated_at = datetime('now') WHERE id = ?").run(id)
    db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'RECONCILE', operator, '对账确认')

    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id/pay', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any

    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer not found' })
      return
    }

    const { operator = '系统' } = req.body

    db.prepare("UPDATE transfers SET is_paid = 1, updated_at = datetime('now') WHERE id = ?").run(id)
    db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)').run(id, 'PAY', operator, '付款确认')

    const updated = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
