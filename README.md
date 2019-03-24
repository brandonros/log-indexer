# log-indexer
Stream JSON logs into queryable paths stored in SQLite

## Setup

1. Create database + tables

`sqlite3 db.sqlite`

```sql
CREATE TABLE logs(
  hash TEXT PRIMARY KEY,
  line TEXT NOT NULL
);

CREATE TABLE log_fields(
  hash TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT NOT NULL,

  PRIMARY KEY (hash, path, value)
);
```

## Usage

`tail -f /app/logs/*.log | node index.js`

## Query examples

```sql
SELECT logs.line
FROM logs
WHERE logs.hash IN
    (SELECT DISTINCT log_fields.hash
     FROM log_fields
     WHERE log_fields.path = 'level'
       AND log_fields.value='error')
```
