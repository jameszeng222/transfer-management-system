import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../data/transfer.db')
const dataDir = path.join(__dirname, '../data')

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
const shmPath = dbPath + '-shm'
if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
const walPath = dbPath + '-wal'
if (fs.existsSync(walPath)) fs.unlinkSync(walPath)

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('DOMESTIC', 'FBA', 'OVERSEAS')),
    country TEXT DEFAULT '',
    address TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE carriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT '',
    contact_person TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    service_routes TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    biz_order_no TEXT UNIQUE NOT NULL,
    transfer_order_no TEXT DEFAULT '',
    outbound_order_no TEXT DEFAULT '',
    third_party_inbound_no TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK(source IN ('API_WANYITONG', 'API_AMAZON', 'MANUAL', 'OTHER')),
    origin_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    dest_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    team_id INTEGER REFERENCES teams(id),
    product_name TEXT DEFAULT '',
    box_count INTEGER DEFAULT 0,
    planned_qty INTEGER DEFAULT 0,
    shelved_qty INTEGER DEFAULT 0,
    logistics_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(logistics_status IN ('PENDING', 'PICKED_UP', 'DEPARTED', 'ARRIVED_PORT', 'CLEARED', 'LAST_MILE', 'DELIVERED', 'UNLOADED', 'SHELVED')),
    is_customs_declared INTEGER DEFAULT 0,
    customs_factory TEXT DEFAULT '',
    sla_days INTEGER DEFAULT 0,
    order_remark TEXT DEFAULT '',
    transport_type TEXT DEFAULT '' CHECK(transport_type IN ('', 'SEA', 'AIR', 'RAIL', 'EXPRESS', 'TRUCK')),
    carrier_id INTEGER REFERENCES carriers(id),
    carrier_order_no TEXT DEFAULT '',
    tracking_no TEXT DEFAULT '',
    pickup_time TEXT,
    depart_time TEXT,
    arrive_port_time TEXT,
    clearance_time TEXT,
    last_mile_time TEXT,
    delivery_time TEXT,
    unload_time TEXT,
    shelve_time TEXT,
    estimated_delivery TEXT,
    estimated_shelve TEXT,
    is_logistics_abnormal INTEGER DEFAULT 0,
    logistics_abnormal_type TEXT DEFAULT '',
    logistics_abnormal_remark TEXT DEFAULT '',
    is_shelve_abnormal INTEGER DEFAULT 0,
    shelve_abnormal_type TEXT DEFAULT '',
    shelve_abnormal_remark TEXT DEFAULT '',
    estimated_unit_price REAL DEFAULT 0,
    estimated_freight REAL DEFAULT 0,
    box_spec TEXT DEFAULT '',
    declared_value REAL DEFAULT 0,
    final_freight REAL DEFAULT 0,
    is_reconciled INTEGER DEFAULT 0,
    is_paid INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    box_no TEXT DEFAULT ''
  );

  CREATE TABLE transfer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    operator TEXT DEFAULT '系统',
    remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE sla_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dest_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    transport_type TEXT NOT NULL,
    sla_days INTEGER NOT NULL,
    UNIQUE(dest_warehouse_id, transport_type)
  );

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK(role IN ('ADMIN', 'OPERATOR', 'WAREHOUSE')),
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`)

const warehouseCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get() as { count: number }

if (warehouseCount.count === 0) {
  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (code, name, type, country, address, contact, phone, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  db.transaction((rows: (string | number)[][]) => {
    for (const row of rows) insertWarehouse.run(...row as [string, string, string, string, string, string, string, number])
  })([
    ['SZ-WH', '深圳仓', 'DOMESTIC', '中国', '深圳市宝安区福永街道XX路XX号', '张明', '13800138001', 1],
    ['YW-WH', '义乌仓', 'DOMESTIC', '中国', '义乌市稠江街道XX路XX号', '李华', '13800138002', 1],
    ['NB-WH', '宁波仓', 'DOMESTIC', '中国', '宁波市北仑区XX路XX号', '王强', '13800138003', 1],
    ['US-LAX9', '美国-LAX9', 'FBA', '美国', '2050 E. Maple Ave, Fontana, CA 92336', 'John Smith', '+1-909-555-0001', 1],
    ['US-ONT8', '美国-ONT8', 'FBA', '美国', '24200 S. Main St, Carson, CA 90745', 'Mike Johnson', '+1-310-555-0002', 1],
    ['UK-BHM', '英国-伯明翰', 'OVERSEAS', '英国', '15 Industrial Park, Birmingham B1 1AA', 'James Brown', '+44-121-555-0001', 1],
    ['DE-BER', '德国-柏林', 'OVERSEAS', '德国', 'Hamburger Str. 25, 10115 Berlin', 'Hans Mueller', '+49-30-555-0001', 1],
    ['JP-TKY', '日本-东京', 'OVERSEAS', '日本', '東京都江東区XX町1-2-3', '田中太郎', '+81-3-5555-0001', 1],
    ['ZA-JHB', '南非-约翰内斯堡', 'OVERSEAS', '南非', 'Sandton, Johannesburg, Gauteng', 'David Nkosi', '+27-11-555-0001', 1],
  ])

  const insertCarrier = db.prepare(`
    INSERT INTO carriers (name, type, contact_person, contact_phone, service_routes, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  db.transaction((rows: (string | number)[][]) => {
    for (const row of rows) insertCarrier.run(...row as [string, string, string, string, string, number])
  })([
    ['万邑通', 'OCEAN', '赵磊', '13900139001', '中国-美国,中国-欧洲', 1],
    ['中外运', 'OCEAN', '刘洋', '13900139002', '中国-欧洲,中国-非洲', 1],
    ['马士基', 'OCEAN', '陈海', '13900139003', '全球', 1],
    ['DHL', 'AIR', '陈飞', '13900139004', '全球', 1],
    ['顺丰国际', 'EXPRESS', '周杰', '13900139005', '中国-日本,中国-东南亚', 1],
    ['云途物流', 'AIR', '孙鹏', '13900139006', '中国-欧洲,中国-美洲', 1],
  ])

  const insertTeam = db.prepare(`INSERT INTO teams (name) VALUES (?)`)

  db.transaction((names: string[]) => {
    for (const name of names) insertTeam.run(name)
  })(['团队A', '团队B', '团队C'])

  const insertUser = db.prepare(`
    INSERT INTO users (username, name, phone, role, enabled)
    VALUES (?, ?, ?, ?, ?)
  `)

  db.transaction((rows: (string | number)[][]) => {
    for (const row of rows) insertUser.run(...row as [string, string, string, string, number])
  })([
    ['admin', '管理员', '13700137001', 'ADMIN', 1],
    ['operator', '操作员', '13700137002', 'OPERATOR', 1],
    ['warehouse', '仓管员', '13700137003', 'WAREHOUSE', 1],
  ])

  const insertSlaRule = db.prepare(`
    INSERT INTO sla_rules (dest_warehouse_id, transport_type, sla_days)
    VALUES (?, ?, ?)
  `)

  db.transaction((rows: (string | number)[][]) => {
    for (const row of rows) insertSlaRule.run(...row as [number, string, number])
  })([
    [4, 'SEA', 30],
    [4, 'AIR', 10],
    [6, 'SEA', 25],
    [7, 'RAIL', 20],
    [8, 'EXPRESS', 7],
  ])

  const insertTransfer = db.prepare(`
    INSERT INTO transfers (
      biz_order_no, transfer_order_no, outbound_order_no, third_party_inbound_no,
      source, origin_warehouse_id, dest_warehouse_id, team_id, product_name,
      box_count, planned_qty, shelved_qty, logistics_status,
      is_customs_declared, customs_factory, sla_days, order_remark,
      transport_type, carrier_id, carrier_order_no, tracking_no,
      pickup_time, depart_time, arrive_port_time, clearance_time,
      last_mile_time, delivery_time, unload_time, shelve_time,
      estimated_delivery, estimated_shelve,
      is_logistics_abnormal, logistics_abnormal_type, logistics_abnormal_remark,
      is_shelve_abnormal, shelve_abnormal_type, shelve_abnormal_remark,
      estimated_unit_price, estimated_freight, box_spec, declared_value, final_freight,
      is_reconciled, is_paid, status, remark
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `)

  const insertItem = db.prepare(`
    INSERT INTO transfer_items (transfer_id, sku, quantity, box_no) VALUES (?, ?, ?, ?)
  `)

  const insertLog = db.prepare(`
    INSERT INTO transfer_logs (transfer_id, action, operator, remark) VALUES (?, ?, ?, ?)
  `)

  const seedTransfers = db.transaction(() => {
    const t1 = insertTransfer.run(
      'WYT-20260401-001', 'WYT-TF-20260401', 'WYT-OB-20260401', '',
      'API_WANYITONG', 1, 4, 1, '蓝牙耳机/充电宝/手机壳',
      50, 1000, 0, 'DELIVERED',
      1, '深圳报关行', 30, '万邑通海运调拨',
      'SEA', 1, 'WYT-CO-20260401', 'WYT20260401001',
      '2026-04-20', '2026-04-22', '2026-05-10', '2026-05-12',
      '2026-05-15', '2026-05-18', null, null,
      '2026-05-20', '2026-05-22',
      0, '', '',
      0, '', '',
      15.0, 15000, '60x40x40cm', 50000, 14500,
      1, 1, 'ACTIVE', '深圳发往美国LAX9'
    )
    insertItem.run(t1.lastInsertRowid, 'SKU-BT-001', 500, 'B1-B25')
    insertItem.run(t1.lastInsertRowid, 'SKU-BT-002', 300, 'B26-B40')
    insertItem.run(t1.lastInsertRowid, 'SKU-BT-003', 200, 'B41-B50')
    insertLog.run(t1.lastInsertRowid, 'CREATE', '系统', '万邑通API同步创建调拨单')
    insertLog.run(t1.lastInsertRowid, 'PICK_UP', '系统', '已提货')
    insertLog.run(t1.lastInsertRowid, 'DEPART', '系统', '已离港')
    insertLog.run(t1.lastInsertRowid, 'ARRIVE_PORT', '系统', '已到港')
    insertLog.run(t1.lastInsertRowid, 'CLEARANCE', '系统', '已清关')
    insertLog.run(t1.lastInsertRowid, 'LAST_MILE', '系统', '尾程派送中')
    insertLog.run(t1.lastInsertRowid, 'DELIVER', '系统', '已签收')

    const t2 = insertTransfer.run(
      'WYT-20260403-002', 'WYT-TF-20260403', 'WYT-OB-20260403', '',
      'API_WANYITONG', 2, 6, 2, 'LED灯带/电源适配器',
      30, 600, 0, 'CLEARED',
      1, '义乌报关行', 25, '万邑通海运调拨至英国',
      'SEA', 1, 'WYT-CO-20260403', 'WYT20260403002',
      '2026-04-25', '2026-04-27', '2026-05-15', '2026-05-18',
      null, null, null, null,
      '2026-05-20', '2026-05-22',
      0, '', '',
      0, '', '',
      20.0, 12000, '50x40x35cm', 30000, 0,
      0, 0, 'ACTIVE', '义乌发往英国伯明翰'
    )
    insertItem.run(t2.lastInsertRowid, 'SKU-LED-001', 300, 'B1-B15')
    insertItem.run(t2.lastInsertRowid, 'SKU-LED-002', 300, 'B16-B30')
    insertLog.run(t2.lastInsertRowid, 'CREATE', '系统', '万邑通API同步创建调拨单')
    insertLog.run(t2.lastInsertRowid, 'PICK_UP', '系统', '已提货')
    insertLog.run(t2.lastInsertRowid, 'DEPART', '系统', '已离港')
    insertLog.run(t2.lastInsertRowid, 'ARRIVE_PORT', '系统', '已到港')
    insertLog.run(t2.lastInsertRowid, 'CLEARANCE', '系统', '已清关')

    const t3 = insertTransfer.run(
      'AMZ-FBA-20260501-003', '', '', 'FBA15ABC123',
      'API_AMAZON', 1, 5, 1, '笔记本电脑支架/USB集线器',
      20, 400, 400, 'SHELVED',
      1, '深圳报关行', 10, '亚马逊FBA空运调拨',
      'AIR', 4, 'DHL-CO-20260510', 'DHL20260510003',
      '2026-05-10', '2026-05-11', '2026-05-14', '2026-05-15',
      '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19',
      '2026-05-20', '2026-05-22',
      0, '', '',
      0, '', '',
      40.0, 8000, '45x35x30cm', 80000, 8200,
      1, 0, 'COMPLETED', '深圳发往美国ONT8'
    )
    insertItem.run(t3.lastInsertRowid, 'SKU-NB-001', 200, 'B1-B10')
    insertItem.run(t3.lastInsertRowid, 'SKU-NB-002', 150, 'B11-B15')
    insertItem.run(t3.lastInsertRowid, 'SKU-NB-003', 50, 'B16-B20')
    insertLog.run(t3.lastInsertRowid, 'CREATE', '系统', '亚马逊API同步创建调拨单')
    insertLog.run(t3.lastInsertRowid, 'PICK_UP', '系统', '已提货')
    insertLog.run(t3.lastInsertRowid, 'DEPART', '系统', '已离港')
    insertLog.run(t3.lastInsertRowid, 'ARRIVE_PORT', '系统', '已到港')
    insertLog.run(t3.lastInsertRowid, 'CLEARANCE', '系统', '已清关')
    insertLog.run(t3.lastInsertRowid, 'LAST_MILE', '系统', '尾程派送中')
    insertLog.run(t3.lastInsertRowid, 'DELIVER', '系统', '已签收')
    insertLog.run(t3.lastInsertRowid, 'UNLOAD', '系统', '已卸货')
    insertLog.run(t3.lastInsertRowid, 'SHELVE', '系统', '已上架')

    const t4 = insertTransfer.run(
      'TF-20260508-004', '', '', '',
      'MANUAL', 3, 7, 3, '电动工具配件/五金件',
      40, 800, 0, 'DEPARTED',
      0, '', 20, '铁路运输至德国',
      'RAIL', 2, 'ZBW-CO-20260428', 'ZBW20260428004',
      '2026-04-28', '2026-04-30', null, null,
      null, null, null, null,
      '2026-05-18', '2026-05-20',
      1, 'DELAY', '铁路运输延误，预计延迟5天',
      0, '', '',
      12.5, 10000, '55x45x40cm', 40000, 0,
      0, 0, 'ACTIVE', '宁波发往德国柏林'
    )
    insertItem.run(t4.lastInsertRowid, 'SKU-TL-001', 400, 'B1-B20')
    insertItem.run(t4.lastInsertRowid, 'SKU-TL-002', 400, 'B21-B40')
    insertLog.run(t4.lastInsertRowid, 'CREATE', 'operator', '手工创建调拨单')
    insertLog.run(t4.lastInsertRowid, 'PICK_UP', 'warehouse', '已提货')
    insertLog.run(t4.lastInsertRowid, 'DEPART', 'warehouse', '已发车')
    insertLog.run(t4.lastInsertRowid, 'ABNORMAL', '系统', '物流异常：铁路运输延误，预计延迟5天')

    const t5 = insertTransfer.run(
      'TF-20260510-005', '', '', '',
      'MANUAL', 1, 8, 1, '化妆品套装/护肤品',
      10, 200, 0, 'LAST_MILE',
      1, '深圳报关行', 7, '快递至日本',
      'EXPRESS', 5, 'SF-CO-20260515', 'SF20260515005',
      '2026-05-15', '2026-05-16', '2026-05-18', '2026-05-19',
      '2026-05-20', null, null, null,
      '2026-05-22', '2026-05-24',
      0, '', '',
      0, '', '',
      30.0, 3000, '40x30x25cm', 20000, 0,
      0, 0, 'ACTIVE', '深圳发往日本东京'
    )
    insertItem.run(t5.lastInsertRowid, 'SKU-CM-001', 100, 'B1-B5')
    insertItem.run(t5.lastInsertRowid, 'SKU-CM-002', 100, 'B6-B10')
    insertLog.run(t5.lastInsertRowid, 'CREATE', 'operator', '手工创建调拨单')
    insertLog.run(t5.lastInsertRowid, 'PICK_UP', 'warehouse', '已提货')
    insertLog.run(t5.lastInsertRowid, 'DEPART', 'warehouse', '已发车')
    insertLog.run(t5.lastInsertRowid, 'ARRIVE_PORT', 'warehouse', '已到港')
    insertLog.run(t5.lastInsertRowid, 'CLEARANCE', 'warehouse', '已清关')
    insertLog.run(t5.lastInsertRowid, 'LAST_MILE', 'warehouse', '尾程派送中')

    const t6 = insertTransfer.run(
      'OT-20260512-006', '', 'OT-OB-20260401', '',
      'OTHER', 2, 9, 2, '纺织品/服装面料',
      60, 1200, 0, 'ARRIVED_PORT',
      0, '', 35, '海运至南非',
      'SEA', 3, 'MSK-CO-20260420', 'MSK20260420006',
      '2026-04-20', '2026-04-22', '2026-05-18', null,
      null, null, null, null,
      '2026-05-25', '2026-05-27',
      0, '', '',
      0, '', '',
      16.7, 20000, '65x50x45cm', 60000, 0,
      0, 0, 'ACTIVE', '义乌发往南非约翰内斯堡'
    )
    insertItem.run(t6.lastInsertRowid, 'SKU-TX-001', 500, 'B1-B20')
    insertItem.run(t6.lastInsertRowid, 'SKU-TX-002', 400, 'B21-B40')
    insertItem.run(t6.lastInsertRowid, 'SKU-TX-003', 300, 'B41-B60')
    insertLog.run(t6.lastInsertRowid, 'CREATE', 'operator', '其他来源创建调拨单')
    insertLog.run(t6.lastInsertRowid, 'PICK_UP', 'warehouse', '已提货')
    insertLog.run(t6.lastInsertRowid, 'DEPART', 'warehouse', '已离港')
    insertLog.run(t6.lastInsertRowid, 'ARRIVE_PORT', 'warehouse', '已到港')

    const t7 = insertTransfer.run(
      'WYT-20260515-007', 'WYT-TF-20260515', 'WYT-OB-20260515', '',
      'API_WANYITONG', 1, 4, 1, '智能手表/运动手环',
      45, 900, 0, 'PICKED_UP',
      0, '', 30, '万邑通海运调拨',
      'SEA', 1, 'WYT-CO-20260515', 'WYT20260515007',
      '2026-05-20', null, null, null,
      null, null, null, null,
      '2026-06-19', '2026-06-21',
      0, '', '',
      0, '', '',
      22.0, 14000, '50x40x35cm', 45000, 0,
      0, 0, 'ACTIVE', '深圳发往美国LAX9'
    )
    insertItem.run(t7.lastInsertRowid, 'SKU-SW-001', 500, 'B1-B23')
    insertItem.run(t7.lastInsertRowid, 'SKU-SW-002', 400, 'B24-B45')
    insertLog.run(t7.lastInsertRowid, 'CREATE', '系统', '万邑通API同步创建调拨单')
    insertLog.run(t7.lastInsertRowid, 'PICK_UP', '系统', '已提货')

    const t8 = insertTransfer.run(
      'TF-20260518-008', '', '', '',
      'MANUAL', 3, 6, 3, '家居用品/厨房用品',
      35, 700, 0, 'PENDING',
      0, '', 25, '海运至英国',
      'SEA', 2, 'ZBW-CO-20260518', '',
      null, null, null, null,
      null, null, null, null,
      null, null,
      0, '', '',
      0, '', '',
      18.0, 11000, '55x45x40cm', 35000, 0,
      0, 0, 'ACTIVE', '宁波发往英国伯明翰'
    )
    insertItem.run(t8.lastInsertRowid, 'SKU-HO-001', 300, 'B1-B15')
    insertItem.run(t8.lastInsertRowid, 'SKU-HO-002', 250, 'B16-B25')
    insertItem.run(t8.lastInsertRowid, 'SKU-HO-003', 150, 'B26-B35')
    insertLog.run(t8.lastInsertRowid, 'CREATE', 'operator', '手工创建调拨单')
  })

  seedTransfers()
}

export default db
