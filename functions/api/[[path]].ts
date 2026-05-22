interface Env {
  DB: D1Database;
}

function addDays(dateStr: string | null, days: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function success(data: any) {
  return json({ success: true, data });
}

function error(msg: string, status = 500) {
  return json({ success: false, error: msg }, status);
}

function getQueryParams(url: string) {
  const u = new URL(url);
  const params: Record<string, string> = {};
  u.searchParams.forEach((v, k) => { params[k] = v; });
  return params;
}

const IN_TRANSIT_STATUSES = ['PICKED_UP', 'DEPARTED', 'ARRIVED_PORT', 'CLEARED', 'LAST_MILE', 'DELIVERED', 'UNLOADED'];

async function handleDashboard(db: D1Database, url: string) {
  const totalTransfers = await db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE'").first<{ count: number }>();
  const inTransit = await db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND logistics_status NOT IN ('PENDING', 'SHELVED')").first<{ count: number }>();
  const logisticsAbnormal = await db.prepare("SELECT COUNT(*) as count FROM transfers WHERE is_logistics_abnormal = 1").first<{ count: number }>();
  const shelveAbnormal = await db.prepare("SELECT COUNT(*) as count FROM transfers WHERE is_shelve_abnormal = 1").first<{ count: number }>();
  const completed = await db.prepare("SELECT COUNT(*) as count FROM transfers WHERE status = 'COMPLETED'").first<{ count: number }>();
  const totalEstimatedFreight = await db.prepare("SELECT COALESCE(SUM(estimated_freight), 0) as total FROM transfers").first<{ total: number }>();
  const totalFinalFreight = await db.prepare("SELECT COALESCE(SUM(final_freight), 0) as total FROM transfers").first<{ total: number }>();

  const logisticsStatusDistribution = await db.prepare(`
    SELECT logistics_status as status, COUNT(*) as count
    FROM transfers WHERE status = 'ACTIVE' GROUP BY logistics_status
  `).all();

  const sourceDistribution = await db.prepare(`
    SELECT source, COUNT(*) as count FROM transfers GROUP BY source
  `).all();

  const abnormalDistribution = await db.prepare(`
    SELECT type, SUM(count) as count FROM (
      SELECT logistics_abnormal_type as type, COUNT(*) as count
      FROM transfers WHERE is_logistics_abnormal = 1 AND logistics_abnormal_type != '' GROUP BY logistics_abnormal_type
      UNION ALL
      SELECT shelve_abnormal_type as type, COUNT(*) as count
      FROM transfers WHERE is_shelve_abnormal = 1 AND shelve_abnormal_type != '' GROUP BY shelve_abnormal_type
    ) GROUP BY type
  `).all();

  const recentAbnormals = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, dw.name as dest_warehouse_name, c.name as carrier_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    WHERE t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1
    ORDER BY t.updated_at DESC LIMIT 10
  `).all();

  const estimated = totalEstimatedFreight!.total;
  const actual = totalFinalFreight!.total;
  const deviation = actual - estimated;

  const slaTotal = await db.prepare(
    "SELECT COUNT(*) as count FROM transfers WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL"
  ).first<{ count: number }>();

  let onTime = 0;
  let overdue = 0;

  if (slaTotal!.count > 0) {
    const onTimeResult = await db.prepare(`
      SELECT COUNT(*) as count FROM transfers
      WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL
        AND (
          (delivery_time IS NOT NULL AND delivery_time <= estimated_delivery)
          OR (delivery_time IS NULL AND date('now') <= estimated_delivery AND logistics_status NOT IN ('DELIVERED', 'UNLOADED', 'SHELVED'))
          OR logistics_status = 'SHELVED'
        )
    `).first<{ count: number }>();
    onTime = onTimeResult!.count;

    const overdueResult = await db.prepare(`
      SELECT COUNT(*) as count FROM transfers
      WHERE estimated_delivery IS NOT NULL AND pickup_time IS NOT NULL
        AND (
          (delivery_time IS NOT NULL AND delivery_time > estimated_delivery)
          OR (delivery_time IS NULL AND date('now') > estimated_delivery AND logistics_status NOT IN ('DELIVERED', 'UNLOADED', 'SHELVED'))
        )
    `).first<{ count: number }>();
    overdue = overdueResult!.count;
  }

  const rate = (onTime + overdue) > 0 ? Math.round(onTime / (onTime + overdue) * 100) : 0;

  return success({
    stats: {
      totalTransfers: totalTransfers!.count,
      inTransit: inTransit!.count,
      logisticsAbnormal: logisticsAbnormal!.count,
      shelveAbnormal: shelveAbnormal!.count,
      completed: completed!.count,
      totalEstimatedFreight: estimated,
      totalFinalFreight: actual,
    },
    logisticsStatusDistribution: logisticsStatusDistribution.results,
    sourceDistribution: sourceDistribution.results,
    abnormalDistribution: abnormalDistribution.results,
    recentAbnormals: recentAbnormals.results,
    freightOverview: { estimated, actual, deviation },
    slaCompliance: { onTime, overdue, rate },
  });
}

async function handleTransfersList(db: D1Database, url: string) {
  const q = getQueryParams(url);
  const { keyword, source, logisticsStatus, carrierId, originWarehouseId, destWarehouseId, teamId, isAbnormal, startDate, endDate, page = '1', pageSize = '10' } = q;
  const pageNum = parseInt(page, 10);
  const sizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * sizeNum;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (t.biz_order_no LIKE ? OR t.transfer_order_no LIKE ? OR t.tracking_no LIKE ? OR t.product_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (source) { where += ' AND t.source = ?'; params.push(source); }
  if (logisticsStatus) { where += ' AND t.logistics_status = ?'; params.push(logisticsStatus); }
  if (carrierId) { where += ' AND t.carrier_id = ?'; params.push(carrierId); }
  if (originWarehouseId) { where += ' AND t.origin_warehouse_id = ?'; params.push(originWarehouseId); }
  if (destWarehouseId) { where += ' AND t.dest_warehouse_id = ?'; params.push(destWarehouseId); }
  if (teamId) { where += ' AND t.team_id = ?'; params.push(teamId); }
  if (isAbnormal === '1' || isAbnormal === 'true') {
    where += ' AND (t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1)';
  }
  if (startDate) { where += ' AND t.created_at >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND t.created_at <= ?'; params.push(endDate); }

  const totalRow = await db.prepare(`SELECT COUNT(*) as total FROM transfers t ${where}`).bind(...params).first<{ total: number }>();

  const rows = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, ow.code as origin_warehouse_code,
      dw.name as dest_warehouse_name, dw.code as dest_warehouse_code,
      c.name as carrier_name, tm.name as team_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    ${where}
    ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).bind(...params, sizeNum, offset).all();

  return success({ list: rows.results, total: totalRow!.total, page: pageNum, pageSize: sizeNum });
}

async function handleTransferDetail(db: D1Database, id: string) {
  const transfer = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, ow.code as origin_warehouse_code,
      dw.name as dest_warehouse_name, dw.code as dest_warehouse_code,
      c.name as carrier_name, tm.name as team_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    WHERE t.id = ?
  `).bind(id).first();

  if (!transfer) return error('Transfer not found', 404);

  const items = await db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').bind(id).all();
  const logs = await db.prepare('SELECT * FROM transfer_logs WHERE transfer_id = ? ORDER BY created_at').bind(id).all();
  const t = transfer as any;
  const originWarehouse = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(t.origin_warehouse_id).first();
  const destWarehouse = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(t.dest_warehouse_id).first();
  const carrier = t.carrier_id ? await db.prepare('SELECT * FROM carriers WHERE id = ?').bind(t.carrier_id).first() : null;
  const team = t.team_id ? await db.prepare('SELECT * FROM teams WHERE id = ?').bind(t.team_id).first() : null;

  return success({ ...t, items: items.results, logs: logs.results, originWarehouse, destWarehouse, carrier, team });
}

async function handleTransferCreate(db: D1Database, body: any) {
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
  } = body;

  if (!biz_order_no || !origin_warehouse_id || !dest_warehouse_id) {
    return error('biz_order_no, origin_warehouse_id, dest_warehouse_id are required', 400);
  }

  let finalSlaDays = sla_days || 0;
  if (!finalSlaDays && dest_warehouse_id && transport_type) {
    const rule = await db.prepare(
      'SELECT sla_days FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
    ).bind(dest_warehouse_id, transport_type).first<{ sla_days: number }>();
    if (rule) finalSlaDays = rule.sla_days;
  }

  let finalEstimatedDelivery = estimated_delivery || null;
  let finalEstimatedShelve = estimated_shelve || null;
  if (finalSlaDays && pickup_time && !finalEstimatedDelivery) {
    finalEstimatedDelivery = addDays(pickup_time, finalSlaDays);
    finalEstimatedShelve = addDays(finalEstimatedDelivery, 2);
  }

  const result = await db.prepare(`
    INSERT INTO transfers (biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
      source, origin_warehouse_id, dest_warehouse_id, team_id, product_name,
      box_count, planned_qty, logistics_status,
      is_customs_declared, customs_factory, sla_days, order_remark,
      transport_type, carrier_id, carrier_order_no, tracking_no,
      pickup_time, estimated_delivery, estimated_shelve,
      estimated_unit_price, estimated_freight, box_spec, declared_value, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    biz_order_no, transfer_order_no || '', outbound_order_no || '', third_party_inbound_no || '',
    source, origin_warehouse_id, dest_warehouse_id, team_id || null, product_name || '',
    box_count || 0, planned_qty || 0, logistics_status,
    is_customs_declared || 0, customs_factory || '', finalSlaDays, order_remark || '',
    transport_type || '', carrier_id || null, carrier_order_no || '', tracking_no || '',
    pickup_time || null, finalEstimatedDelivery, finalEstimatedShelve,
    estimated_unit_price || 0, estimated_freight || 0, box_spec || '', declared_value || 0, remark || ''
  ).run();

  const transferId = result.meta.last_row_id;

  if (items && Array.isArray(items)) {
    for (const item of items) {
      await db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
        .bind(transferId, item.sku, item.quantity, item.box_no || '').run();
    }
  }

  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(transferId, 'CREATE', operator, '创建调拨单').run();

  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(transferId).first();
  const transferItems = await db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').bind(transferId).all();
  const transferLogs = await db.prepare('SELECT * FROM transfer_logs WHERE transfer_id = ? ORDER BY created_at').bind(transferId).all();

  return success({ ...transfer, items: transferItems.results, logs: transferLogs.results });
}

async function handleTransferUpdate(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  if (!transfer) return error('Transfer not found', 404);

  const {
    transfer_order_no, outbound_order_no, third_party_inbound_no,
    team_id, product_name, box_count, planned_qty, shelved_qty,
    is_customs_declared, customs_factory, sla_days, order_remark,
    transport_type, carrier_id, carrier_order_no, tracking_no,
    is_reconciled, is_paid, remark, items, operator = '系统'
  } = body;

  const fields: string[] = [];
  const values: any[] = [];

  if (transfer_order_no !== undefined) { fields.push('transfer_order_no = ?'); values.push(transfer_order_no); }
  if (outbound_order_no !== undefined) { fields.push('outbound_order_no = ?'); values.push(outbound_order_no); }
  if (third_party_inbound_no !== undefined) { fields.push('third_party_inbound_no = ?'); values.push(third_party_inbound_no); }
  if (team_id !== undefined) { fields.push('team_id = ?'); values.push(team_id || null); }
  if (product_name !== undefined) { fields.push('product_name = ?'); values.push(product_name); }
  if (box_count !== undefined) { fields.push('box_count = ?'); values.push(box_count); }
  if (planned_qty !== undefined) { fields.push('planned_qty = ?'); values.push(planned_qty); }
  if (shelved_qty !== undefined) { fields.push('shelved_qty = ?'); values.push(shelved_qty); }
  if (is_customs_declared !== undefined) { fields.push('is_customs_declared = ?'); values.push(is_customs_declared); }
  if (customs_factory !== undefined) { fields.push('customs_factory = ?'); values.push(customs_factory); }
  if (sla_days !== undefined) { fields.push('sla_days = ?'); values.push(sla_days); }
  if (order_remark !== undefined) { fields.push('order_remark = ?'); values.push(order_remark); }
  if (transport_type !== undefined) { fields.push('transport_type = ?'); values.push(transport_type); }
  if (carrier_id !== undefined) { fields.push('carrier_id = ?'); values.push(carrier_id || null); }
  if (carrier_order_no !== undefined) { fields.push('carrier_order_no = ?'); values.push(carrier_order_no); }
  if (tracking_no !== undefined) { fields.push('tracking_no = ?'); values.push(tracking_no); }
  if (is_reconciled !== undefined) { fields.push('is_reconciled = ?'); values.push(is_reconciled); }
  if (is_paid !== undefined) { fields.push('is_paid = ?'); values.push(is_paid); }
  if (remark !== undefined) { fields.push('remark = ?'); values.push(remark); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  if (items && Array.isArray(items)) {
    await db.prepare('DELETE FROM transfer_items WHERE transfer_id = ?').bind(id).run();
    for (const item of items) {
      await db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
        .bind(Number(id), item.sku, item.quantity, item.box_no || '').run();
    }
  }

  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'UPDATE', operator, '更新调拨单').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleBatchImport(db: D1Database, body: any) {
  const { transfers, operator = '系统' } = body;
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return error('transfers array is required and must not be empty', 400);
  }

  const results: any[] = [];

  for (const t of transfers) {
    let slaDays = t.sla_days || 0;
    if (!slaDays && t.dest_warehouse_id && t.transport_type) {
      const rule = await db.prepare(
        'SELECT sla_days FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
      ).bind(t.dest_warehouse_id, t.transport_type).first<{ sla_days: number }>();
      if (rule) slaDays = rule.sla_days;
    }

    let estimatedDelivery = t.estimated_delivery || null;
    let estimatedShelve = t.estimated_shelve || null;
    if (slaDays && t.pickup_time && !estimatedDelivery) {
      estimatedDelivery = addDays(t.pickup_time, slaDays);
      estimatedShelve = addDays(estimatedDelivery, 2);
    }

    const result = await db.prepare(`
      INSERT INTO transfers (biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
        source, origin_warehouse_id, dest_warehouse_id, team_id, product_name,
        box_count, planned_qty, logistics_status,
        is_customs_declared, customs_factory, sla_days, order_remark,
        transport_type, carrier_id, carrier_order_no, tracking_no,
        pickup_time, estimated_delivery, estimated_shelve,
        estimated_unit_price, estimated_freight, box_spec, declared_value, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      t.biz_order_no, t.transfer_order_no || '', t.outbound_order_no || '', t.third_party_inbound_no || '',
      t.source || 'MANUAL', t.origin_warehouse_id, t.dest_warehouse_id, t.team_id || null, t.product_name || '',
      t.box_count || 0, t.planned_qty || 0, t.logistics_status || 'PENDING',
      t.is_customs_declared || 0, t.customs_factory || '', slaDays, t.order_remark || '',
      t.transport_type || '', t.carrier_id || null, t.carrier_order_no || '', t.tracking_no || '',
      t.pickup_time || null, estimatedDelivery, estimatedShelve,
      t.estimated_unit_price || 0, t.estimated_freight || 0, t.box_spec || '', t.declared_value || 0, t.remark || ''
    ).run();

    const transferId = result.meta.last_row_id;

    if (t.items && Array.isArray(t.items)) {
      for (const item of t.items) {
        await db.prepare('INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)')
          .bind(transferId, item.sku, item.quantity, item.box_no || '').run();
      }
    }

    await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
      .bind(transferId, 'CREATE', operator, '批量导入创建调拨单').run();

    results.push({ id: transferId, biz_order_no: t.biz_order_no });
  }

  return success(results);
}

async function handleLogisticsNodes(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first() as any;
  if (!transfer) return error('Transfer not found', 404);

  const {
    pickup_time, depart_time, arrive_port_time, clearance_time,
    last_mile_time, delivery_time, unload_time, shelve_time,
    logistics_status, operator = '系统'
  } = body;

  const fields: string[] = [];
  const values: any[] = [];

  if (pickup_time !== undefined) { fields.push('pickup_time = ?'); values.push(pickup_time); }
  if (depart_time !== undefined) { fields.push('depart_time = ?'); values.push(depart_time); }
  if (arrive_port_time !== undefined) { fields.push('arrive_port_time = ?'); values.push(arrive_port_time); }
  if (clearance_time !== undefined) { fields.push('clearance_time = ?'); values.push(clearance_time); }
  if (last_mile_time !== undefined) { fields.push('last_mile_time = ?'); values.push(last_mile_time); }
  if (delivery_time !== undefined) { fields.push('delivery_time = ?'); values.push(delivery_time); }
  if (unload_time !== undefined) { fields.push('unload_time = ?'); values.push(unload_time); }
  if (shelve_time !== undefined) { fields.push('shelve_time = ?'); values.push(shelve_time); }
  if (logistics_status !== undefined) { fields.push('logistics_status = ?'); values.push(logistics_status); }

  const finalLogisticsStatus = logistics_status || transfer.logistics_status;
  const finalPickupTime = pickup_time !== undefined ? pickup_time : transfer.pickup_time;
  const finalDeliveryTime = delivery_time !== undefined ? delivery_time : transfer.delivery_time;

  if (transfer.sla_days && finalPickupTime) {
    const expectedDelivery = addDays(finalPickupTime, transfer.sla_days);
    const now = new Date().toISOString().split('T')[0];

    if (finalDeliveryTime && expectedDelivery && finalDeliveryTime > expectedDelivery) {
      fields.push('is_logistics_abnormal = 1');
      fields.push("logistics_abnormal_type = 'DELAY'");
      fields.push('logistics_abnormal_remark = ?');
      values.push(`物流超时，预计送达日期：${expectedDelivery}，实际送达日期：${finalDeliveryTime}`);
    } else if (!finalDeliveryTime && !['DELIVERED', 'UNLOADED', 'SHELVED'].includes(finalLogisticsStatus) && expectedDelivery && now > expectedDelivery) {
      fields.push('is_logistics_abnormal = 1');
      fields.push("logistics_abnormal_type = 'OVERDUE'");
      fields.push('logistics_abnormal_remark = ?');
      values.push(`物流超时，预计送达日期：${expectedDelivery}`);
    }
  }

  if (shelve_time !== undefined && transfer.estimated_shelve && shelve_time > transfer.estimated_shelve) {
    fields.push('is_shelve_abnormal = 1');
    fields.push("shelve_abnormal_type = 'DELAY'");
    fields.push('shelve_abnormal_remark = ?');
    values.push(`上架超时，预计上架日期：${transfer.estimated_shelve}，实际上架日期：${shelve_time}`);
  }

  if (finalLogisticsStatus === 'SHELVED') {
    fields.push("status = 'COMPLETED'");
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'LOGISTICS_UPDATE', operator, '更新物流节点').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleAbnormal(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  if (!transfer) return error('Transfer not found', 404);

  const {
    is_logistics_abnormal, logistics_abnormal_type, logistics_abnormal_remark,
    is_shelve_abnormal, shelve_abnormal_type, shelve_abnormal_remark,
    operator = '系统'
  } = body;

  const fields: string[] = [];
  const values: any[] = [];

  if (is_logistics_abnormal !== undefined) { fields.push('is_logistics_abnormal = ?'); values.push(is_logistics_abnormal); }
  if (logistics_abnormal_type !== undefined) { fields.push('logistics_abnormal_type = ?'); values.push(logistics_abnormal_type); }
  if (logistics_abnormal_remark !== undefined) { fields.push('logistics_abnormal_remark = ?'); values.push(logistics_abnormal_remark); }
  if (is_shelve_abnormal !== undefined) { fields.push('is_shelve_abnormal = ?'); values.push(is_shelve_abnormal); }
  if (shelve_abnormal_type !== undefined) { fields.push('shelve_abnormal_type = ?'); values.push(shelve_abnormal_type); }
  if (shelve_abnormal_remark !== undefined) { fields.push('shelve_abnormal_remark = ?'); values.push(shelve_abnormal_remark); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'ABNORMAL_UPDATE', operator, '更新异常信息').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleFreight(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  if (!transfer) return error('Transfer not found', 404);

  const { estimated_unit_price, estimated_freight, box_spec, declared_value, final_freight, operator = '系统' } = body;

  const fields: string[] = [];
  const values: any[] = [];

  if (estimated_unit_price !== undefined) { fields.push('estimated_unit_price = ?'); values.push(estimated_unit_price); }
  if (estimated_freight !== undefined) { fields.push('estimated_freight = ?'); values.push(estimated_freight); }
  if (box_spec !== undefined) { fields.push('box_spec = ?'); values.push(box_spec); }
  if (declared_value !== undefined) { fields.push('declared_value = ?'); values.push(declared_value); }
  if (final_freight !== undefined) { fields.push('final_freight = ?'); values.push(final_freight); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE transfers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'FREIGHT_UPDATE', operator, '更新运费信息').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleReconcile(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  if (!transfer) return error('Transfer not found', 404);

  const { operator = '系统' } = body;

  await db.prepare("UPDATE transfers SET is_reconciled = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'RECONCILE', operator, '对账确认').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handlePay(db: D1Database, id: string, body: any) {
  const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  if (!transfer) return error('Transfer not found', 404);

  const { operator = '系统' } = body;

  await db.prepare("UPDATE transfers SET is_paid = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  await db.prepare('INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)')
    .bind(id, 'PAY', operator, '付款确认').run();

  const updated = await db.prepare('SELECT * FROM transfers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleTransitOverview(db: D1Database) {
  const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',');

  const inTransitCount = await db.prepare(
    `SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})`
  ).bind(...IN_TRANSIT_STATUSES).first<{ count: number }>();

  const inTransitBoxes = await db.prepare(
    `SELECT COALESCE(SUM(box_count), 0) as total FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})`
  ).bind(...IN_TRANSIT_STATUSES).first<{ total: number }>();

  const statusDistribution = await db.prepare(`
    SELECT logistics_status as status, COUNT(*) as count
    FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})
    GROUP BY logistics_status
  `).bind(...IN_TRANSIT_STATUSES).all();

  const abnormalCount = await db.prepare(
    "SELECT COUNT(*) as count FROM transfers WHERE status = 'ACTIVE' AND (is_logistics_abnormal = 1 OR is_shelve_abnormal = 1)"
  ).first<{ count: number }>();

  return success({
    inTransitCount: inTransitCount!.count,
    inTransitBoxes: inTransitBoxes!.total,
    statusDistribution: statusDistribution.results,
    abnormalCount: abnormalCount!.count,
  });
}

async function handleTransitList(db: D1Database, url: string) {
  const q = getQueryParams(url);
  const { keyword, logisticsStatus, carrierId, originWarehouseId, destWarehouseId, teamId, startDate, endDate, page = '1', pageSize = '20' } = q;
  const pageNum = parseInt(page, 10);
  const sizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * sizeNum;

  let where = "WHERE t.status = 'ACTIVE'";
  const params: any[] = [];

  if (keyword) {
    where += ' AND (t.biz_order_no LIKE ? OR t.tracking_no LIKE ? OR t.product_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (logisticsStatus) { where += ' AND t.logistics_status = ?'; params.push(logisticsStatus); }
  if (carrierId) { where += ' AND t.carrier_id = ?'; params.push(carrierId); }
  if (originWarehouseId) { where += ' AND t.origin_warehouse_id = ?'; params.push(originWarehouseId); }
  if (destWarehouseId) { where += ' AND t.dest_warehouse_id = ?'; params.push(destWarehouseId); }
  if (teamId) { where += ' AND t.team_id = ?'; params.push(teamId); }
  if (startDate) { where += ' AND t.created_at >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND t.created_at <= ?'; params.push(endDate); }

  const totalRow = await db.prepare(`SELECT COUNT(*) as total FROM transfers t ${where}`).bind(...params).first<{ total: number }>();
  const rows = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, ow.code as origin_warehouse_code,
      dw.name as dest_warehouse_name, dw.code as dest_warehouse_code,
      c.name as carrier_name, tm.name as team_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    ${where}
    ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).bind(...params, sizeNum, offset).all();

  return success({ list: rows.results, total: totalRow!.total, page: pageNum, pageSize: sizeNum });
}

async function handleTransitByWarehouse(db: D1Database) {
  const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT dw.id as warehouse_id, dw.name as warehouse_name, dw.code as warehouse_code,
      COUNT(t.id) as transfer_count, COALESCE(SUM(t.box_count), 0) as total_boxes, COALESCE(SUM(t.planned_qty), 0) as total_qty
    FROM warehouses dw
    LEFT JOIN transfers t ON t.dest_warehouse_id = dw.id AND t.status = 'ACTIVE' AND t.logistics_status IN (${statusPlaceholders})
    WHERE dw.enabled = 1 GROUP BY dw.id HAVING transfer_count > 0 ORDER BY transfer_count DESC
  `).bind(...IN_TRANSIT_STATUSES).all();
  return success(rows.results);
}

async function handleTransitByCarrier(db: D1Database) {
  const statusPlaceholders = IN_TRANSIT_STATUSES.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT c.id as carrier_id, c.name as carrier_name,
      COUNT(t.id) as transfer_count, COALESCE(SUM(t.box_count), 0) as total_boxes, COALESCE(SUM(t.planned_qty), 0) as total_qty
    FROM carriers c
    LEFT JOIN transfers t ON t.carrier_id = c.id AND t.status = 'ACTIVE' AND t.logistics_status IN (${statusPlaceholders})
    WHERE c.active = 1 GROUP BY c.id HAVING transfer_count > 0 ORDER BY transfer_count DESC
  `).bind(...IN_TRANSIT_STATUSES).all();
  return success(rows.results);
}

async function handleTransitAbnormal(db: D1Database, url: string) {
  const q = getQueryParams(url);
  const { type, page = '1', pageSize = '20' } = q;
  const pageNum = parseInt(page, 10);
  const sizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * sizeNum;

  let where = "WHERE t.status = 'ACTIVE' AND (t.is_logistics_abnormal = 1 OR t.is_shelve_abnormal = 1)";
  const params: any[] = [];

  if (type === 'logistics') {
    where = "WHERE t.status = 'ACTIVE' AND t.is_logistics_abnormal = 1";
  } else if (type === 'shelve') {
    where = "WHERE t.status = 'ACTIVE' AND t.is_shelve_abnormal = 1";
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as total FROM transfers t ${where}`).bind(...params).first<{ total: number }>();
  const rows = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, dw.name as dest_warehouse_name,
      c.name as carrier_name, tm.name as team_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    ${where}
    ORDER BY t.updated_at DESC LIMIT ? OFFSET ?
  `).bind(...params, sizeNum, offset).all();

  return success({ list: rows.results, total: totalRow!.total, page: pageNum, pageSize: sizeNum });
}

async function handleTransitExport(db: D1Database, url: string) {
  const q = getQueryParams(url);
  const { logisticsStatus, carrierId, destWarehouseId } = q;

  let where = "WHERE t.status = 'ACTIVE'";
  const params: any[] = [];

  if (logisticsStatus) { where += ' AND t.logistics_status = ?'; params.push(logisticsStatus); }
  if (carrierId) { where += ' AND t.carrier_id = ?'; params.push(carrierId); }
  if (destWarehouseId) { where += ' AND t.dest_warehouse_id = ?'; params.push(destWarehouseId); }

  const rows = await db.prepare(`
    SELECT t.*, ow.name as origin_warehouse_name, dw.name as dest_warehouse_name,
      c.name as carrier_name, tm.name as team_name
    FROM transfers t
    LEFT JOIN warehouses ow ON t.origin_warehouse_id = ow.id
    LEFT JOIN warehouses dw ON t.dest_warehouse_id = dw.id
    LEFT JOIN carriers c ON t.carrier_id = c.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    ${where} ORDER BY t.created_at DESC
  `).bind(...params).all();

  const headers = [
    '业务单号', '调拨单号', '第三方入库单号', '来源', '始发仓', '目的仓',
    '团队', '产品名称', '箱数', '计划数量', '已上架数量', '物流状态',
    '运输方式', '物流商', '物流单号', '提货时间', '离港时间', '到港时间',
    '清关时间', '尾程时间', '签收时间', '卸货时间', '上架时间',
    '预计送达', '预计上架', '是否物流异常', '物流异常类型', '是否上架异常', '创建时间'
  ];

  const csvRows = [headers.join(',')];
  for (const r of rows.results as any[]) {
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
      r.is_shelve_abnormal ? '是' : '否', r.created_at
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }

  return new Response('\uFEFF' + csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=transit_export.csv',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleCarriersList(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM carriers ORDER BY created_at DESC').all();
  return success(rows.results);
}

async function handleCarrierCreate(db: D1Database, body: any) {
  const { name, type, contact_person, contact_phone, service_routes } = body;
  if (!name) return error('name is required', 400);

  const result = await db.prepare(
    'INSERT INTO carriers (name, type, contact_person, contact_phone, service_routes) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, type || '', contact_person || '', contact_phone || '', service_routes || '').run();

  const carrier = await db.prepare('SELECT * FROM carriers WHERE id = ?').bind(result.meta.last_row_id).first();
  return success(carrier);
}

async function handleCarrierUpdate(db: D1Database, id: string, body: any) {
  const carrier = await db.prepare('SELECT * FROM carriers WHERE id = ?').bind(id).first();
  if (!carrier) return error('Carrier not found', 404);

  const { name, type, contact_person, contact_phone, service_routes, active } = body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (contact_person !== undefined) { fields.push('contact_person = ?'); values.push(contact_person); }
  if (contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(contact_phone); }
  if (service_routes !== undefined) { fields.push('service_routes = ?'); values.push(service_routes); }
  if (active !== undefined) { fields.push('active = ?'); values.push(active); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE carriers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await db.prepare('SELECT * FROM carriers WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleWarehousesList(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM warehouses ORDER BY created_at DESC').all();
  return success(rows.results);
}

async function handleWarehouseCreate(db: D1Database, body: any) {
  const { code, name, type, country, address, contact, phone } = body;
  if (!code || !name || !type) return error('code, name, type are required', 400);

  const result = await db.prepare(
    'INSERT INTO warehouses (code, name, type, country, address, contact, phone) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(code, name, type, country || '', address || '', contact || '', phone || '').run();

  const warehouse = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(result.meta.last_row_id).first();
  return success(warehouse);
}

async function handleWarehouseUpdate(db: D1Database, id: string, body: any) {
  const warehouse = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(id).first();
  if (!warehouse) return error('Warehouse not found', 404);

  const { code, name, type, country, address, contact, phone, enabled } = body;
  const fields: string[] = [];
  const values: any[] = [];

  if (code !== undefined) { fields.push('code = ?'); values.push(code); }
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (country !== undefined) { fields.push('country = ?'); values.push(country); }
  if (address !== undefined) { fields.push('address = ?'); values.push(address); }
  if (contact !== undefined) { fields.push('contact = ?'); values.push(contact); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE warehouses SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(id).first();
  return success(updated);
}

async function handleTeamsList(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM teams ORDER BY created_at').all();
  return success(rows.results);
}

async function handleTeamCreate(db: D1Database, body: any) {
  const { name } = body;
  if (!name) return error('name is required', 400);

  const result = await db.prepare('INSERT INTO teams (name) VALUES (?)').bind(name).run();
  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(result.meta.last_row_id).first();
  return success(team);
}

async function handleSlaRulesList(db: D1Database) {
  const rows = await db.prepare(`
    SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
    FROM sla_rules sr LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id
    ORDER BY w.name, sr.transport_type
  `).all();
  return success(rows.results);
}

async function handleSlaRuleCreate(db: D1Database, body: any) {
  const { dest_warehouse_id, transport_type, sla_days } = body;
  if (!dest_warehouse_id || !transport_type || !sla_days) {
    return error('dest_warehouse_id, transport_type, sla_days are required', 400);
  }

  const existing = await db.prepare(
    'SELECT id FROM sla_rules WHERE dest_warehouse_id = ? AND transport_type = ?'
  ).bind(dest_warehouse_id, transport_type).first<{ id: number }>();

  if (existing) {
    await db.prepare('UPDATE sla_rules SET sla_days = ? WHERE id = ?').bind(sla_days, existing.id).run();
    const updated = await db.prepare(`
      SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
      FROM sla_rules sr LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id WHERE sr.id = ?
    `).bind(existing.id).first();
    return success(updated);
  }

  const result = await db.prepare(
    'INSERT INTO sla_rules (dest_warehouse_id, transport_type, sla_days) VALUES (?, ?, ?)'
  ).bind(dest_warehouse_id, transport_type, sla_days).run();

  const rule = await db.prepare(`
    SELECT sr.*, w.name as warehouse_name, w.code as warehouse_code
    FROM sla_rules sr LEFT JOIN warehouses w ON sr.dest_warehouse_id = w.id WHERE sr.id = ?
  `).bind(result.meta.last_row_id).first();
  return success(rule);
}

async function handleSlaRuleDelete(db: D1Database, id: string) {
  const rule = await db.prepare('SELECT * FROM sla_rules WHERE id = ?').bind(id).first();
  if (!rule) return error('SLA rule not found', 404);

  await db.prepare('DELETE FROM sla_rules WHERE id = ?').bind(id).run();
  return success(null);
}

async function handleUsersList(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM users ORDER BY created_at').all();
  return success(rows.results);
}

async function handleUserCreate(db: D1Database, body: any) {
  const { username, name, phone, role } = body;
  if (!username || !name) return error('username, name are required', 400);

  const result = await db.prepare(
    'INSERT INTO users (username, name, phone, role) VALUES (?, ?, ?, ?)'
  ).bind(username, name, phone || '', role || 'OPERATOR').run();

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first();
  return success(user);
}

async function handleUserUpdate(db: D1Database, id: string, body: any) {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!user) return error('User not found', 404);

  const { name, phone, role, enabled } = body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return success(updated);
}

function matchRoute(path: string, method: string): { handler: string; params: Record<string, string> } | null {
  const segments = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const resource = segments[0];

  if (resource === 'dashboard' && method === 'GET') return { handler: 'dashboard', params: {} };

  if (resource === 'transfers') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'transfersList', params: {} };
      if (method === 'POST') return { handler: 'transferCreate', params: {} };
    }
    if (segments.length === 2) {
      if (segments[1] === 'batch-import' && method === 'POST') return { handler: 'batchImport', params: {} };
      const id = segments[1];
      if (method === 'GET') return { handler: 'transferDetail', params: { id } };
      if (method === 'PUT') return { handler: 'transferUpdate', params: { id } };
    }
    if (segments.length === 3) {
      const id = segments[1];
      const action = segments[2];
      if (action === 'logistics-nodes' && method === 'POST') return { handler: 'logisticsNodes', params: { id } };
      if (action === 'abnormal' && method === 'POST') return { handler: 'abnormal', params: { id } };
      if (action === 'freight' && method === 'POST') return { handler: 'freight', params: { id } };
      if (action === 'reconcile' && method === 'PUT') return { handler: 'reconcile', params: { id } };
      if (action === 'pay' && method === 'PUT') return { handler: 'pay', params: { id } };
    }
  }

  if (resource === 'transit') {
    if (segments.length === 1) return null;
    const sub = segments[1];
    if (method === 'GET') {
      if (sub === 'overview') return { handler: 'transitOverview', params: {} };
      if (sub === 'list') return { handler: 'transitList', params: {} };
      if (sub === 'by-warehouse') return { handler: 'transitByWarehouse', params: {} };
      if (sub === 'by-carrier') return { handler: 'transitByCarrier', params: {} };
      if (sub === 'abnormal') return { handler: 'transitAbnormal', params: {} };
      if (sub === 'export') return { handler: 'transitExport', params: {} };
    }
  }

  if (resource === 'carriers') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'carriersList', params: {} };
      if (method === 'POST') return { handler: 'carrierCreate', params: {} };
    }
    if (segments.length === 2 && method === 'PUT') return { handler: 'carrierUpdate', params: { id: segments[1] } };
  }

  if (resource === 'warehouses') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'warehousesList', params: {} };
      if (method === 'POST') return { handler: 'warehouseCreate', params: {} };
    }
    if (segments.length === 2 && method === 'PUT') return { handler: 'warehouseUpdate', params: { id: segments[1] } };
  }

  if (resource === 'teams') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'teamsList', params: {} };
      if (method === 'POST') return { handler: 'teamCreate', params: {} };
    }
  }

  if (resource === 'sla-rules') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'slaRulesList', params: {} };
      if (method === 'POST') return { handler: 'slaRuleCreate', params: {} };
    }
    if (segments.length === 2 && method === 'DELETE') return { handler: 'slaRuleDelete', params: { id: segments[1] } };
  }

  if (resource === 'users') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'usersList', params: {} };
      if (method === 'POST') return { handler: 'userCreate', params: {} };
    }
    if (segments.length === 2 && method === 'PUT') return { handler: 'userUpdate', params: { id: segments[1] } };
  }

  if (resource === 'health' && method === 'GET') return { handler: 'health', params: {} };

  return null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const route = matchRoute(url.pathname, method);
  if (!route) return error('API not found', 404);

  const db = env.DB;

  try {
    let body: any = {};
    if (method === 'POST' || method === 'PUT') {
      body = await request.json();
    }

    switch (route.handler) {
      case 'health': return success({ message: 'ok' });
      case 'dashboard': return await handleDashboard(db, url.toString());
      case 'transfersList': return await handleTransfersList(db, url.toString());
      case 'transferDetail': return await handleTransferDetail(db, route.params.id);
      case 'transferCreate': return await handleTransferCreate(db, body);
      case 'transferUpdate': return await handleTransferUpdate(db, route.params.id, body);
      case 'batchImport': return await handleBatchImport(db, body);
      case 'logisticsNodes': return await handleLogisticsNodes(db, route.params.id, body);
      case 'abnormal': return await handleAbnormal(db, route.params.id, body);
      case 'freight': return await handleFreight(db, route.params.id, body);
      case 'reconcile': return await handleReconcile(db, route.params.id, body);
      case 'pay': return await handlePay(db, route.params.id, body);
      case 'transitOverview': return await handleTransitOverview(db);
      case 'transitList': return await handleTransitList(db, url.toString());
      case 'transitByWarehouse': return await handleTransitByWarehouse(db);
      case 'transitByCarrier': return await handleTransitByCarrier(db);
      case 'transitAbnormal': return await handleTransitAbnormal(db, url.toString());
      case 'transitExport': return await handleTransitExport(db, url.toString());
      case 'carriersList': return await handleCarriersList(db);
      case 'carrierCreate': return await handleCarrierCreate(db, body);
      case 'carrierUpdate': return await handleCarrierUpdate(db, route.params.id, body);
      case 'warehousesList': return await handleWarehousesList(db);
      case 'warehouseCreate': return await handleWarehouseCreate(db, body);
      case 'warehouseUpdate': return await handleWarehouseUpdate(db, route.params.id, body);
      case 'teamsList': return await handleTeamsList(db);
      case 'teamCreate': return await handleTeamCreate(db, body);
      case 'slaRulesList': return await handleSlaRulesList(db);
      case 'slaRuleCreate': return await handleSlaRuleCreate(db, body);
      case 'slaRuleDelete': return await handleSlaRuleDelete(db, route.params.id);
      case 'usersList': return await handleUsersList(db);
      case 'userCreate': return await handleUserCreate(db, body);
      case 'userUpdate': return await handleUserUpdate(db, route.params.id, body);
      default: return error('Not found', 404);
    }
  } catch (e: any) {
    return error(e.message || 'Internal server error');
  }
};
