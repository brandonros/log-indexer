const split = require('split')
const BatchStream = require('batch-stream')
const traverse = require('traverse')
const hash = require('object-hash')
const Database = require('better-sqlite3')

const database = new Database('db.sqlite')

const executeQuery = (sql, bindings) => {
  console.log({
    sql,
    bindings
  })
  database.prepare(sql).run(bindings)
}

const indexMessage = (message) => {
  const messageHash = hash(message)
  const messageIndex = {}
  traverse(message).forEach(function (x) {
    if (!this.isLeaf) {
      return
    }
    messageIndex[this.path.join('.')] = (typeof x === 'object' || typeof x === 'boolean') ? JSON.stringify(x) : x
  })
  return {
    messageHash,
    messageIndex
  }
}

const insertMessage = (hash, line) => {
  const sql = `INSERT INTO logs (hash, line) VALUES ($hash, $line)`
  const values = { hash, line }
  try {
    executeQuery(sql, values)
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint failed')) {
      throw err
    }
  }
}

const insertMessageIndex = (hash, messageIndex) => {
  const sql = `INSERT INTO log_fields (hash, path, value) VALUES ${Object.keys(messageIndex).map((key, index) => `($hash, $path${index}, $value${index})`).join(', ')}`
  const values = Object.keys(messageIndex).reduce((prev, key, index) => Object.assign(prev, { [`path${index}`]: key, [`value${index}`]: messageIndex[key]  }), { hash: hash })
  try {
    executeQuery(sql, values)
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint failed') && !err.message.includes('too many SQL variables')) {
      throw err
    }
  }
}

const processBatch = (lines) => {
  lines.forEach(line => {
    try {
      const message = JSON.parse(line)
      const { messageHash, messageIndex } = indexMessage(message)
      insertMessage(messageHash, line)
      insertMessageIndex(messageHash, messageIndex)
    } catch (err) {
      console.error(`Invalid log line: ${line}`)
    }
  })
}

const run = () => {
  database.pragma('journal_mode = WAL')

  process.stdin
    .pipe(split())
    .pipe(new BatchStream({ size: 2 }))
    .on('data', processBatch)
}

run()
