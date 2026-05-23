interface Env {
  DB: D1Database;
  winit_app_key: string;
  winit_token: string;
  winit_client_id: string;
  winit_client_secret: string;
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

function md5Hex(str: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    return md5blks;
  }
  function rhex(n: number) {
    const hex_chr = '0123456789abcdef';
    let s = '';
    for (let j = 0; j < 4; j++) s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0F) + hex_chr.charAt((n >> (j * 8)) & 0x0F);
    return s;
  }
  function hex(x: number[]) { return x.map(rhex).join(''); }
  let n = str.length;
  let state = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;
  for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(str.substring(i - 64, i)));
  str = str.substring(i - 64);
  const tail = new Array(16).fill(0);
  for (i = 0; i < str.length; i++) tail[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
  tail[14] = n * 8;
  md5cycle(state, tail);
  return hex(state);
}

async function callWinitApi(env: Env, action: string, data: any) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const params: Record<string, string> = {
    action,
    app_key: env.winit_app_key || '',
    client_id: env.winit_client_id || '',
    data: JSON.stringify(data),
    format: 'json',
    language: 'zh_CN',
    platform: 'OWNERERP',
    sign_method: 'md5',
    timestamp,
    version: '1.0',
  };
  const clientSign = md5Hex(params.client_id + (env.winit_client_secret || ''));
  params.client_sign = clientSign;
  const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('') + (env.winit_client_secret || '');
  params.sign = md5Hex(signStr);
  const response = await fetch('https://openapi.winit.com.cn/openapi/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const result = await response.json() as any;
  if (result.code !== '0' && result.code !== 0) {
    throw new Error(result.msg || `Winit API error: ${result.code}`);
  }
  return result.data;
}

const IN_TRANSIT_STATUSES = ['PICKED_UP', 'DEPARTED', 'ARRIVED_PORT', 'CLEARED', 'LAST_MILE', 'DELIVERED', 'UNLOADED'];

async function handleWinitInboundList(env: Env, url: string) {
  const params = getQueryParams(url);
  const data: any = {
    pageParams: {
      pageNo: params.pageNo || '1',
      pageSize: params.pageSize || '20',
    },
  };
  if (params.destinationWarehouseCode) data.destinationWarehouseCode = params.destinationWarehouseCode;
  if (params.orderCreateDateStart) data.orderCreateDateStart = params.orderCreateDateStart;
  if (params.orderCreateDateEnd) data.orderCreateDateEnd = params.orderCreateDateEnd;
  try {
    const result = await callWinitApi(env, 'winit.wh.inbound.getOrderList', data);
    return success(result);
  } catch (e: any) {
    return error(e.message || '查询万邑通入库单失败', 500);
  }
}

async function handleWinitInboundDetail(env: Env, url: string) {
  const params = getQueryParams(url);
  const orderNo = params.orderNo;
  if (!orderNo) return error('orderNo is required', 400);
  try {
    const result = await callWinitApi(env, 'winit.wh.inbound.getOrderDetail', {
      orderNo,
      isIncludePackage: 'Y',
    });
    return success(result);
  } catch (e: any) {
    return error(e.message || '查询万邑通入库单详情失败', 500);
  }
}

async function handleWinitInboundSync(env: Env, db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS winit_inbound_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE,
        seller_order_no TEXT,
        status TEXT,
        order_type TEXT,
        destination_warehouse_code TEXT,
        destination_warehouse_name TEXT,
        inspection_warehouse_code TEXT,
        inspection_warehouse_name TEXT,
        winit_product_code TEXT,
        winit_product_name TEXT,
        total_package_qty INTEGER DEFAULT 0,
        total_merchandise_qty INTEGER DEFAULT 0,
        total_item_qty INTEGER DEFAULT 0,
        is_completed TEXT DEFAULT 'N',
        created_date TEXT,
        plan_shelf_completed_date TEXT,
        shelve_completed_date TEXT,
        raw_data TEXT,
        synced_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS winit_inbound_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT,
        package_no TEXT,
        seller_case_no TEXT,
        status TEXT,
        unloading_time TEXT,
        shelves_time TEXT,
        weight REAL,
        length REAL,
        width REAL,
        height REAL,
        raw_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS winit_inbound_merchandise (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT,
        package_no TEXT,
        sku TEXT,
        merchandise_code TEXT,
        specification TEXT,
        quantity INTEGER DEFAULT 0,
        inspection_qty INTEGER DEFAULT 0,
        actual_quantity INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    let pageNo = 1;
    let totalSynced = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await callWinitApi(env, 'winit.wh.inbound.getOrderList', {
        pageParams: { pageNo: String(pageNo), pageSize: '50' },
      });

      const orders = result?.list || [];
      if (orders.length === 0) { hasMore = false; break; }

      for (const order of orders) {
        const orderNo = order.orderNo;
        const detail = await callWinitApi(env, 'winit.wh.inbound.getOrderDetail', {
          orderNo,
          isIncludePackage: 'Y',
        });

        await db.prepare(`
          INSERT INTO winit_inbound_orders (order_no, seller_order_no, status, order_type, destination_warehouse_code, destination_warehouse_name, inspection_warehouse_code, inspection_warehouse_name, winit_product_code, winit_product_name, total_package_qty, total_merchandise_qty, total_item_qty, is_completed, created_date, plan_shelf_completed_date, shelve_completed_date, raw_data, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(order_no) DO UPDATE SET
            status=excluded.status, is_completed=excluded.is_completed, total_package_qty=excluded.total_package_qty, total_merchandise_qty=excluded.total_merchandise_qty, total_item_qty=excluded.total_item_qty, plan_shelf_completed_date=excluded.plan_shelf_completed_date, shelve_completed_date=excluded.shelve_completed_date, raw_data=excluded.raw_data, synced_at=datetime('now')
        `).bind(
          orderNo, detail?.sellerOrderNo || '', detail?.status || '', detail?.orderType || '',
          detail?.destinationWarehouseCode || '', detail?.destinationWarehouseName || '',
          detail?.inspectionWarehouseCode || '', detail?.inspectionWarehouseName || '',
          detail?.winitProductCode || '', detail?.winitProductName || '',
          detail?.totalPackageQty || 0, detail?.totalMerchandiseQty || 0, detail?.totalItemQty || 0,
          detail?.isCompleted || 'N', detail?.createdDate || '', detail?.planShelfCompletedDate || '',
          detail?.shelveCompletedDate || '', JSON.stringify(detail)
        ).run();

        const packages = detail?.packageList || [];
        for (const pkg of packages) {
          await db.prepare(`DELETE FROM winit_inbound_packages WHERE order_no = ? AND package_no = ?`).bind(orderNo, pkg.packageNo).run();
          await db.prepare(`INSERT INTO winit_inbound_packages (order_no, package_no, seller_case_no, status, unloading_time, shelves_time, weight, length, width, height, raw_data) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(
            orderNo, pkg.packageNo || '', pkg.sellerCaseNo || '', pkg.status || '',
            pkg.unloadingTime || '', pkg.shelvesTime || '', pkg.weight || 0, pkg.length || 0, pkg.width || 0, pkg.height || 0,
            JSON.stringify(pkg)
          ).run();

          const merchList = pkg.merchandiseList || [];
          for (const m of merchList) {
            await db.prepare(`INSERT INTO winit_inbound_merchandise (order_no, package_no, sku, merchandise_code, specification, quantity, inspection_qty, actual_quantity) VALUES (?,?,?,?,?,?,?,?)`).bind(
              orderNo, pkg.packageNo || '', m.sku || '', m.merchandiseCode || '', m.specification || '',
              m.quantity || 0, m.inspectionQty || 0, m.actualQuantity || 0
            ).run();
          }
        }

        const orderMerch = detail?.merchandiseList || [];
        for (const m of orderMerch) {
          await db.prepare(`INSERT INTO winit_inbound_merchandise (order_no, package_no, sku, merchandise_code, specification, quantity, inspection_qty, actual_quantity) VALUES (?, '', ?, ?, ?, ?, ?, ?)`).bind(
            orderNo, m.productBarcode || m.sku || '', m.merchandiseCode || '', m.specification || '',
            m.quantity || 0, m.inspectionQty || 0, m.actualQuantity || 0
          ).run();
        }

        totalSynced++;
      }

      const totalResults = result?.pageParams?.totalResults || 0;
      if (pageNo * 50 >= totalResults) { hasMore = false; }
      pageNo++;
    }

    return success({ synced: totalSynced });
  } catch (e: any) {
    return error(e.message || '同步万邑通入库单失败', 500);
  }
}

async function handleWinitInboundOrders(db: D1Database, url: string) {
  const params = getQueryParams(url);
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '20');
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  const binds: any[] = [];
  if (params.status) { where += ' AND status = ?'; binds.push(params.status); }
  if (params.warehouse) { where += ' AND destination_warehouse_name LIKE ?'; binds.push(`%${params.warehouse}%`); }
  if (params.orderNo) { where += ' AND order_no LIKE ?'; binds.push(`%${params.orderNo}%`); }

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM winit_inbound_orders WHERE ${where}`).bind(...binds).first<{ total: number }>();
  const orders = await db.prepare(`SELECT * FROM winit_inbound_orders WHERE ${where} ORDER BY created_date DESC LIMIT ? OFFSET ?`).bind(...binds, pageSize, offset).all();

  return success({
    list: orders.results,
    total: countResult!.total,
    page,
    pageSize,
  });
}

async function handleWinitInboundOrderDetail(db: D1Database, orderNo: string) {
  const order = await db.prepare('SELECT * FROM winit_inbound_orders WHERE order_no = ?').bind(orderNo).first();
  if (!order) return error('Order not found', 404);
  const packages = await db.prepare('SELECT * FROM winit_inbound_packages WHERE order_no = ?').bind(orderNo).all();
  const merchandise = await db.prepare('SELECT * FROM winit_inbound_merchandise WHERE order_no = ?').bind(orderNo).all();
  return success({ ...order, packages: packages.results, merchandise: merchandise.results });
}

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

  const overviewRow = await db.prepare(`
    SELECT
      COUNT(*) as in_transit_count,
      COALESCE(SUM(box_count), 0) as in_transit_boxes,
      SUM(CASE WHEN is_logistics_abnormal = 1 OR is_shelve_abnormal = 1 THEN 1 ELSE 0 END) as abnormal_count
    FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})
  `).bind(...IN_TRANSIT_STATUSES).first<{ in_transit_count: number; in_transit_boxes: number; abnormal_count: number }>();

  const statusDistribution = await db.prepare(`
    SELECT logistics_status as status, COUNT(*) as count
    FROM transfers WHERE status = 'ACTIVE' AND logistics_status IN (${statusPlaceholders})
    GROUP BY logistics_status
  `).bind(...IN_TRANSIT_STATUSES).all();

  return success({
    inTransitCount: overviewRow!.in_transit_count,
    inTransitBoxes: overviewRow!.in_transit_boxes,
    abnormalCount: overviewRow!.abnormal_count,
    statusDistribution: statusDistribution.results,
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

  const transfers = rows.results as any[];
  const transferIds = transfers.map((t) => t.id);

  const itemsMap: Record<number, any[]> = {};
  if (transferIds.length > 0) {
    const itemsRows = await db.prepare(
      `SELECT * FROM transfer_items WHERE transfer_id IN (${transferIds.map(() => '?').join(',')})`
    ).bind(...transferIds).all();
    for (const item of itemsRows.results as any[]) {
      if (!itemsMap[item.transfer_id]) itemsMap[item.transfer_id] = [];
      itemsMap[item.transfer_id].push(item);
    }
  }

  const list = transfers.map((t) => ({
    ...t,
    sku_items: itemsMap[t.id] || [],
  }));

  return success({ list, total: totalRow!.total, page: pageNum, pageSize: sizeNum });
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

async function handleWarehouseDelete(db: D1Database, id: string) {
  const warehouse = await db.prepare('SELECT * FROM warehouses WHERE id = ?').bind(id).first();
  if (!warehouse) return error('Warehouse not found', 404);

  const refCount = await db.prepare('SELECT COUNT(*) as count FROM transfers WHERE origin_warehouse_id = ? OR dest_warehouse_id = ?').bind(id, id).first<{ count: number }>();
  if (refCount!.count > 0) return error('该仓库已被调拨单引用，无法删除', 400);

  await db.prepare('DELETE FROM warehouses WHERE id = ?').bind(id).run();
  return success(null);
}

async function handleCarrierDelete(db: D1Database, id: string) {
  const carrier = await db.prepare('SELECT * FROM carriers WHERE id = ?').bind(id).first();
  if (!carrier) return error('Carrier not found', 404);

  const refCount = await db.prepare('SELECT COUNT(*) as count FROM transfers WHERE carrier_id = ?').bind(id).first<{ count: number }>();
  if (refCount!.count > 0) return error('该物流商已被调拨单引用，无法删除', 400);

  await db.prepare('DELETE FROM carriers WHERE id = ?').bind(id).run();
  return success(null);
}

async function handleTeamDelete(db: D1Database, id: string) {
  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first();
  if (!team) return error('Team not found', 404);

  const refCount = await db.prepare('SELECT COUNT(*) as count FROM transfers WHERE team_id = ?').bind(id).first<{ count: number }>();
  if (refCount!.count > 0) return error('该团队已被调拨单引用，无法删除', 400);

  await db.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
  return success(null);
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
    if (segments.length === 2) {
      if (method === 'PUT') return { handler: 'carrierUpdate', params: { id: segments[1] } };
      if (method === 'DELETE') return { handler: 'carrierDelete', params: { id: segments[1] } };
    }
  }

  if (resource === 'warehouses') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'warehousesList', params: {} };
      if (method === 'POST') return { handler: 'warehouseCreate', params: {} };
    }
    if (segments.length === 2) {
      if (method === 'PUT') return { handler: 'warehouseUpdate', params: { id: segments[1] } };
      if (method === 'DELETE') return { handler: 'warehouseDelete', params: { id: segments[1] } };
    }
  }

  if (resource === 'teams') {
    if (segments.length === 1) {
      if (method === 'GET') return { handler: 'teamsList', params: {} };
      if (method === 'POST') return { handler: 'teamCreate', params: {} };
    }
    if (segments.length === 2 && method === 'DELETE') return { handler: 'teamDelete', params: { id: segments[1] } };
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

  if (segments[0] === 'winit' && segments[1] === 'inbound') {
    if (segments.length === 2) {
      if (method === 'GET') return { handler: 'winitInboundList', params: {} };
    }
    if (segments.length === 3) {
      if (segments[2] === 'detail' && method === 'GET') return { handler: 'winitInboundDetail', params: {} };
      if (segments[2] === 'sync' && method === 'POST') return { handler: 'winitInboundSync', params: {} };
      if (segments[2] === 'orders' && method === 'GET') return { handler: 'winitInboundOrders', params: {} };
    }
    if (segments.length === 4 && segments[2] === 'orders' && method === 'GET') {
      return { handler: 'winitInboundOrderDetail', params: { orderNo: segments[3] } };
    }
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
      case 'winitInboundList': return await handleWinitInboundList(env, url.toString());
      case 'winitInboundDetail': return await handleWinitInboundDetail(env, url.toString());
      case 'winitInboundSync': return await handleWinitInboundSync(env, db);
      case 'winitInboundOrders': return await handleWinitInboundOrders(db, url.toString());
      case 'winitInboundOrderDetail': return await handleWinitInboundOrderDetail(db, route.params.orderNo);
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
      case 'carrierDelete': return await handleCarrierDelete(db, route.params.id);
      case 'warehousesList': return await handleWarehousesList(db);
      case 'warehouseCreate': return await handleWarehouseCreate(db, body);
      case 'warehouseUpdate': return await handleWarehouseUpdate(db, route.params.id, body);
      case 'warehouseDelete': return await handleWarehouseDelete(db, route.params.id);
      case 'teamsList': return await handleTeamsList(db);
      case 'teamCreate': return await handleTeamCreate(db, body);
      case 'teamDelete': return await handleTeamDelete(db, route.params.id);
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
